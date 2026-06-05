import type { Client } from "discord.js";
import type { AiToolCall } from "../ai/types.js";
import { prisma } from "../database/prisma.js";
import { getSubscriptionSummary } from "../services/subscriptionService.js";
import { executeToolCalls } from "../tools/executor.js";
import { toolRegistry } from "../tools/registry.js";
import { logger } from "../utils/logger.js";

type AutomationEvent = {
  actorId?: string;
  subjectId?: string;
  payload: Record<string, unknown>;
};

let automationClient: Client | null = null;

export function setAutomationClient(client: Client) {
  automationClient = client;
}

export async function runAutomationsForEvent(guildId: string, type: string, event: AutomationEvent) {
  if (!automationClient) return;

  const subscription = await getSubscriptionSummary(guildId);
  if (!subscription.active) return;

  const guild = automationClient.guilds.cache.get(guildId) ?? (await automationClient.guilds.fetch(guildId).catch(() => null));
  if (!guild) return;

  const automations = await prisma.automation.findMany({
    where: { guildId, status: "ACTIVE" }
  });

  for (const automation of automations) {
    const trigger = automation.trigger as { eventType?: string };
    if (trigger.eventType && trigger.eventType !== type) continue;
    if (!(await conditionsMatch(guildId, automation.conditions, event))) continue;

    const actions = normalizeActions(automation.actions);
    const executable = actions.filter((action) => {
      const tool = toolRegistry.get(action.tool);
      if (!tool) return false;
      if (tool.riskLevel === "HIGH" || tool.riskLevel === "CRITICAL") return Boolean(automation.approvalId);
      return true;
    });

    if (executable.length === 0) {
      logger.warn("Automation matched but had no safe executable actions", { guildId, automationId: automation.id, type });
      continue;
    }

    logger.info("Automation executing", { guildId, automationId: automation.id, type, actionCount: executable.length });
    await executeToolCalls({
      guild,
      userId: automation.createdById,
      toolCalls: executable.map((action) => ({
        ...action,
        parameters: interpolateParameters(action.parameters, event)
      }))
    });
  }
}

async function conditionsMatch(guildId: string, rawConditions: unknown, event: AutomationEvent) {
  const conditions = rawConditions as { contentIncludes?: string; actorId?: string; channelId?: string; minMessageCount?: number };
  if (conditions.actorId && conditions.actorId !== event.actorId) return false;
  if (conditions.channelId && conditions.channelId !== event.payload.channelId) return false;
  if (conditions.minMessageCount && event.actorId) {
    const member = await prisma.memberSnapshot.findUnique({ where: { id_guildId: { id: event.actorId, guildId } } });
    if (!member || member.messageCount < conditions.minMessageCount) return false;
  }
  if (conditions.contentIncludes) {
    const content = String(event.payload.content ?? event.payload.contentPreview ?? "").toLowerCase();
    if (!content.includes(conditions.contentIncludes.toLowerCase())) return false;
  }
  return true;
}

function normalizeActions(rawActions: unknown): AiToolCall[] {
  if (!Array.isArray(rawActions)) return [];
  return rawActions.filter((action): action is AiToolCall => {
    return Boolean(action && typeof action === "object" && "tool" in action && "parameters" in action);
  });
}

function interpolateParameters(parameters: Record<string, unknown>, event: AutomationEvent) {
  const json = JSON.stringify(parameters)
    .replaceAll("{{actorId}}", event.actorId ?? "")
    .replaceAll("{{subjectId}}", event.subjectId ?? "")
    .replaceAll("{{channelId}}", String(event.payload.channelId ?? ""));
  return JSON.parse(json) as Record<string, unknown>;
}
