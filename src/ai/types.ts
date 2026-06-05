import type { RiskLevel } from "@prisma/client";

export type AiToolCall = {
  tool: string;
  parameters: Record<string, unknown>;
  reason: string;
};

export type AiPlan = {
  response: string;
  needsApproval: boolean;
  riskLevel: RiskLevel;
  impact: string;
  toolCalls: AiToolCall[];
  memoryWrites?: Array<{ key: string; value: string; source?: string }>;
};
