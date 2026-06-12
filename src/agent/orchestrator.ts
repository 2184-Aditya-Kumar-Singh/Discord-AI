import { Prisma, type AgentTask, type RiskLevel } from "@prisma/client";
import type { Guild, Message } from "discord.js";
import type { AgentPlan, AiPlan, AiToolCall } from "../ai/types.js";
import { grokChat } from "../ai/grokClient.js";
import { config } from "../config.js";
import { createApprovalRequest } from "../approvals/approvalService.js";
import { prisma } from "../database/prisma.js";
import { upsertMemory } from "../memory/memoryService.js";
import { getServerContext } from "../services/serverContextService.js";
import { executeToolCalls } from "../tools/executor.js";
import { toolRegistry } from "../tools/registry.js";
import { observeTaskExecution } from "./observation.js";
import { parseJsonObject } from "./json.js";
import { buildPlannerPrompt } from "./prompts.js";
import { reflectOnTask } from "./reflection.js";
import { recordTaskHistory } from "./history.js";
import { selectTemplateHints } from "./templates.js";

export async function runAutonomousGoal(message: Message) {
  const guild = message.guild!;
  const goal = stripBotMention(message.content, message.client.user?.id);
  const task = await prisma.agentTask.create({
    data: {
      guildId: guild.id,
      channelId: message.channelId,
      requesterId: message.author.id,
      goal,
      status: "PLANNING",
      maxCycles: config.DAIOS_MAX_AGENT_CYCLES
    }
  });
  await recordTaskHistory(task.id, "goal.received", "Goal received from Discord.", { goal });

  const plan = await buildPlan(guild, goal);
  await persistPlan(task.id, plan);

  for (const memory of plan.memoryWrites ?? []) {
    await upsertMemory(guild.id, memory.key, memory.value, memory.source ?? "agent_planner");
  }

  if (plan.needsApproval || isHighRisk(plan.riskLevel) || hasHighRiskTool(plan)) {
    await prisma.agentTask.update({ where: { id: task.id }, data: { status: "AWAITING_APPROVAL" } });
    const approval = await createApprovalRequest(message, toAiPlan(plan), task.id);
    await recordTaskHistory(task.id, "approval.requested", "Approval requested from owner.", { approvalId: approval.id });
    return {
      taskId: task.id,
      content: `${plan.response}\n\nI created autonomous task \`${task.id}\` and requested owner approval. Approval ID: ${approval.id}`
    };
  }

  const execution = await executePersistedTask(task.id, guild);
  return {
    taskId: task.id,
    content: formatTaskResult(plan.response, execution.results, execution.reflection?.critique)
  };
}

export async function completeApprovedTask(taskId: string, guild: Guild, approvalId: string) {
  const execution = await executePersistedTask(taskId, guild, approvalId);
  return formatTaskResult(`Approved task \`${taskId}\` executed.`, execution.results, execution.reflection?.critique);
}

async function buildPlan(guild: Guild, goal: string): Promise<AgentPlan> {
  const [context, storedTemplates] = await Promise.all([
    getServerContext(guild),
    prisma.serverTemplate.findMany({ where: { OR: [{ guildId: guild.id }, { guildId: null }] }, take: 8 })
  ]);
  const templateHints = selectTemplateHints(goal);
  const raw = await grokChat([
    { role: "system", content: buildPlannerPrompt() },
    {
      role: "user",
      content: JSON.stringify({
        goal,
        serverContext: context,
        templateHints,
        storedTemplates: storedTemplates.map((template) => ({
          slug: template.slug,
          name: template.name,
          description: template.description,
          content: template.content
        }))
      })
    }
  ]);

  const parsed = parseJsonObject<Partial<AgentPlan>>(raw, {});
  return {
    response: parsed.response ?? "I planned the requested Discord server work.",
    planSummary: parsed.planSummary ?? parsed.response ?? "Autonomous Discord server task.",
    needsApproval: Boolean(parsed.needsApproval),
    riskLevel: parsed.riskLevel ?? "LOW",
    impact: parsed.impact ?? "Server configuration may change.",
    steps: Array.isArray(parsed.steps) ? parsed.steps : [],
    memoryWrites: Array.isArray(parsed.memoryWrites) ? parsed.memoryWrites : []
  };
}

async function persistPlan(taskId: string, plan: AgentPlan) {
  await prisma.agentTask.update({
    where: { id: taskId },
    data: {
      planSummary: plan.planSummary,
      impact: plan.impact,
      riskLevel: plan.riskLevel,
      status: "QUEUED"
    }
  });

  await prisma.agentTaskStep.deleteMany({ where: { taskId } });
  const validSteps = plan.steps.filter((step) => !step.tool || toolRegistry.get(step.tool));
  for (const [index, step] of validSteps.entries()) {
    await prisma.agentTaskStep.create({
      data: {
        taskId,
        position: index + 1,
        title: step.title || step.tool || `Step ${index + 1}`,
        toolName: step.tool,
        parameters: step.parameters === undefined ? undefined : (step.parameters as Prisma.InputJsonValue),
        reason: step.reason ?? "Required to complete the goal."
      }
    });
  }
  await recordTaskHistory(taskId, "plan.created", plan.planSummary, { riskLevel: plan.riskLevel, steps: validSteps });
}

async function executePersistedTask(taskId: string, guild: Guild, approvalId?: string) {
  const task = await prisma.agentTask.update({
    where: { id: taskId },
    data: { status: "EXECUTING" },
    include: { steps: { where: { status: "PENDING", toolName: { not: null } }, orderBy: { position: "asc" } } }
  });

  const results = [];
  for (const step of task.steps) {
    await prisma.agentTaskStep.update({ where: { id: step.id }, data: { status: "RUNNING", startedAt: new Date() } });
    const calls: AiToolCall[] = [
      {
        tool: step.toolName!,
        parameters: (step.parameters ?? {}) as Record<string, unknown>,
        reason: step.reason
      }
    ];
    const [result] = await executeToolCalls({
      guild,
      channelId: task.channelId ?? undefined,
      userId: task.requesterId,
      approvalId,
      toolCalls: calls
    });
    results.push(result);
    await prisma.agentTaskStep.update({
      where: { id: step.id },
      data: {
        status: result.ok ? "SUCCEEDED" : "FAILED",
        result: result.data === undefined ? undefined : (result.data as Prisma.InputJsonValue),
        error: result.ok ? null : result.summary,
        completedAt: new Date()
      }
    });
    if (!result.ok) break;
  }

  const observation = await observeTaskExecution(taskId, guild, results);
  const reflection = observation.failed.length === 0 ? await reflectOnTask(task as AgentTask, guild) : undefined;
  return { results, reflection };
}

function toAiPlan(plan: AgentPlan): AiPlan {
  return {
    response: plan.response,
    needsApproval: true,
    riskLevel: plan.riskLevel,
    impact: plan.impact,
    toolCalls: plan.steps
      .filter((step) => step.tool)
      .map((step) => ({
        tool: step.tool!,
        parameters: step.parameters ?? {},
        reason: step.reason
      })),
    memoryWrites: plan.memoryWrites
  };
}

function isHighRisk(riskLevel: RiskLevel) {
  return riskLevel === "HIGH" || riskLevel === "CRITICAL";
}

function hasHighRiskTool(plan: AgentPlan) {
  return plan.steps.some((step) => {
    if (!step.tool) return false;
    const tool = toolRegistry.get(step.tool);
    return tool?.riskLevel === "HIGH" || tool?.riskLevel === "CRITICAL";
  });
}

function stripBotMention(content: string, botUserId?: string) {
  if (!botUserId) return content.trim();
  return content.replace(new RegExp(`<@!?${botUserId}>`, "g"), "").trim();
}

function formatTaskResult(intro: string, results: Array<{ ok: boolean; summary: string }>, critique?: string) {
  const lines = [intro, "", ...results.map((result, index) => `${index + 1}. ${result.ok ? "OK" : "FAILED"} - ${result.summary}`)];
  if (critique) lines.push("", `Reflection: ${critique}`);
  return lines.join("\n").slice(0, 1900);
}
