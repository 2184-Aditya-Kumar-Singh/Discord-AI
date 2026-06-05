import type { Guild } from "discord.js";
import type { RiskLevel } from "@prisma/client";

export type ToolContext = {
  guild: Guild;
  channelId?: string;
  userId: string;
  approvalId?: string;
};

export type ToolResult = {
  ok: boolean;
  summary: string;
  data?: unknown;
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  riskLevel: RiskLevel;
  execute(parameters: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
};
