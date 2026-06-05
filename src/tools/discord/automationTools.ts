import type { ToolDefinition } from "../types.js";
import { prisma } from "../../database/prisma.js";

export const automationTools: ToolDefinition[] = [
  {
    name: "create_automation",
    description: "Create a persistent server automation from a natural language rule.",
    riskLevel: "HIGH",
    parameters: {
      name: "string",
      description: "string",
      trigger: "object",
      conditions: "object",
      actions: "array of future tool calls"
    },
    async execute(params, context) {
      const automation = await prisma.automation.create({
        data: {
          guildId: context.guild.id,
          name: String(params.name),
          description: String(params.description),
          trigger: (params.trigger ?? {}) as object,
          conditions: (params.conditions ?? {}) as object,
          actions: Array.isArray(params.actions) ? params.actions : [],
          approvalId: context.approvalId,
          createdById: context.userId
        }
      });
      return { ok: true, summary: `Created automation "${automation.name}".`, data: { automationId: automation.id } };
    }
  }
];
