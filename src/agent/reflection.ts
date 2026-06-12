import { Prisma, type AgentTask } from "@prisma/client";
import type { Guild } from "discord.js";
import type { AiToolCall } from "../ai/types.js";
import { grokChat } from "../ai/grokClient.js";
import { prisma } from "../database/prisma.js";
import { getServerContext } from "../services/serverContextService.js";
import { executeToolCalls } from "../tools/executor.js";
import { parseJsonObject } from "./json.js";
import { buildReflectionPrompt } from "./prompts.js";
import { recordTaskHistory } from "./history.js";

type ReflectionResponse = {
  critique?: string;
  isComplete?: boolean;
  missingItems?: unknown[];
  followUpToolCalls?: AiToolCall[];
};

export async function reflectOnTask(task: AgentTask, guild: Guild) {
  await prisma.agentTask.update({ where: { id: task.id }, data: { status: "REFLECTING" } });
  const context = await getServerContext(guild);
  const raw = await grokChat([
    { role: "system", content: buildReflectionPrompt() },
    {
      role: "user",
      content: JSON.stringify({
        goal: task.goal,
        planSummary: task.planSummary,
        serverContext: context
      })
    }
  ]);
  const reflection = parseJsonObject<ReflectionResponse>(raw, { critique: "Reflection unavailable.", isComplete: true, missingItems: [] });
  const followUpToolCalls = Array.isArray(reflection.followUpToolCalls) ? reflection.followUpToolCalls : [];

  await prisma.reflectionLog.create({
    data: {
      guildId: guild.id,
      taskId: task.id,
      critique: reflection.critique ?? "No critique provided.",
      missingItems: (reflection.missingItems ?? []) as Prisma.InputJsonValue,
      followUpToolCalls: followUpToolCalls as Prisma.InputJsonValue
    }
  });

  await recordTaskHistory(task.id, "reflect", reflection.critique ?? "Reflection complete.", {
    isComplete: Boolean(reflection.isComplete),
    missingItems: reflection.missingItems ?? [],
    followUpToolCalls
  });

  if (followUpToolCalls.length > 0 && task.currentCycle + 1 < task.maxCycles) {
    await prisma.agentTask.update({ where: { id: task.id }, data: { currentCycle: { increment: 1 }, status: "EXECUTING" } });
    const results = await executeToolCalls({
      guild,
      channelId: task.channelId ?? undefined,
      userId: task.requesterId,
      toolCalls: followUpToolCalls
    });
    const failed = results.filter((result) => !result.ok);
    await recordTaskHistory(task.id, "reflect.execute", "Executed reflection follow-up tool calls.", { results });
    if (failed.length > 0) {
      await prisma.agentTask.update({
        where: { id: task.id },
        data: { status: "FAILED", lastError: failed.map((result) => result.summary).join("\n").slice(0, 2000) }
      });
      return { completed: false, critique: reflection.critique ?? "", followUpResults: results };
    }
  }

  await prisma.agentTask.update({ where: { id: task.id }, data: { status: "COMPLETED", completedAt: new Date() } });
  return { completed: true, critique: reflection.critique ?? "", followUpResults: [] };
}
