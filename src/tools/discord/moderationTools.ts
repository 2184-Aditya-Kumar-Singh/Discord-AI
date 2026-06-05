import type { ToolDefinition } from "../types.js";

export const moderationTools: ToolDefinition[] = [
  {
    name: "ban_member",
    description: "Ban a member from the server.",
    riskLevel: "CRITICAL",
    parameters: { memberId: "string", reason: "string", deleteMessageSeconds: "optional number" },
    async execute(params, context) {
      await context.guild.members.ban(String(params.memberId), {
        reason: String(params.reason ?? "DAIOS approved ban"),
        deleteMessageSeconds: Number(params.deleteMessageSeconds ?? 0)
      });
      return { ok: true, summary: `Banned member ${params.memberId}.` };
    }
  },
  {
    name: "kick_member",
    description: "Kick a member from the server.",
    riskLevel: "HIGH",
    parameters: { memberId: "string", reason: "string" },
    async execute(params, context) {
      const member = await context.guild.members.fetch(String(params.memberId));
      await member.kick(String(params.reason ?? "DAIOS approved kick"));
      return { ok: true, summary: `Kicked member ${params.memberId}.` };
    }
  },
  {
    name: "timeout_member",
    description: "Temporarily timeout a member.",
    riskLevel: "HIGH",
    parameters: { memberId: "string", durationMinutes: "number", reason: "string" },
    async execute(params, context) {
      const member = await context.guild.members.fetch(String(params.memberId));
      await member.timeout(Number(params.durationMinutes) * 60_000, String(params.reason ?? "DAIOS approved timeout"));
      return { ok: true, summary: `Timed out ${member.displayName} for ${params.durationMinutes} minutes.` };
    }
  }
];
