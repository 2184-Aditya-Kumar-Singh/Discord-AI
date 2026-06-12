import type { Guild } from "discord.js";
import { Prisma } from "@prisma/client";
import type { AiToolCall } from "../ai/types.js";
import { config } from "../config.js";
import { prisma } from "../database/prisma.js";
import { toolRegistry } from "./registry.js";
import type { ToolResult } from "./types.js";

export async function executeToolCalls(input: {
  guild: Guild;
  channelId?: string;
  userId: string;
  approvalId?: string;
  toolCalls: AiToolCall[];
}) {
  const results: ToolResult[] = [];

  for (const call of input.toolCalls) {
    const tool = toolRegistry.get(call.tool);
    if (!tool) {
      results.push({ ok: false, summary: `Unknown tool: ${call.tool}` });
      continue;
    }

    try {
      const result = config.DAIOS_DRY_RUN
        ? {
            ok: true,
            summary: `[dry-run] Would execute ${tool.name}: ${call.reason}`,
            data: { parameters: call.parameters }
          }
        : await tool.execute(call.parameters, {
            guild: input.guild,
            channelId: input.channelId,
            userId: input.userId,
            approvalId: input.approvalId
          });
      await prisma.toolExecutionLog.create({
        data: {
          guildId: input.guild.id,
          userId: input.userId,
          toolName: tool.name,
          riskLevel: tool.riskLevel,
          parameters: call.parameters as Prisma.InputJsonValue,
          result: result.data === undefined ? undefined : (result.data as Prisma.InputJsonValue),
          success: result.ok,
          approvalId: input.approvalId
        }
      });
      results.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.toolExecutionLog.create({
        data: {
          guildId: input.guild.id,
          userId: input.userId,
          toolName: tool.name,
          riskLevel: tool.riskLevel,
          parameters: call.parameters as Prisma.InputJsonValue,
          success: false,
          error: message,
          approvalId: input.approvalId
        }
      });
      results.push({ ok: false, summary: `${tool.name} failed: ${message}` });
    }
  }

  return results;
}
