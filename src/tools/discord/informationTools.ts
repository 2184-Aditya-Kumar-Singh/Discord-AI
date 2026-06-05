import type { ToolDefinition } from "../types.js";
import { getServerContext } from "../../services/serverContextService.js";
import { prisma } from "../../database/prisma.js";

export const informationTools: ToolDefinition[] = [
  {
    name: "view_server_info",
    description: "View summarized guild information, channels, roles, and statistics.",
    riskLevel: "LOW",
    parameters: {},
    async execute(_params, context) {
      const server = await getServerContext(context.guild);
      return { ok: true, summary: `Server ${context.guild.name} has ${server.guild.memberCount} members.`, data: server };
    }
  },
  {
    name: "view_member_info",
    description: "View information about one guild member.",
    riskLevel: "LOW",
    parameters: { memberId: "string" },
    async execute(params, context) {
      const member = await context.guild.members.fetch(String(params.memberId));
      return {
        ok: true,
        summary: `${member.displayName} joined ${member.joinedAt?.toISOString() ?? "at an unknown time"}.`,
        data: {
          id: member.id,
          username: member.user.username,
          displayName: member.displayName,
          roles: member.roles.cache.map((role) => ({ id: role.id, name: role.name })),
          joinedAt: member.joinedAt
        }
      };
    }
  },
  {
    name: "analyze_server",
    description: "Analyze activity, inactive channels, active members, growth, and moderation signals.",
    riskLevel: "LOW",
    parameters: {},
    async execute(_params, context) {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [topMembers, inactiveChannels, joins, leaves] = await Promise.all([
        prisma.memberSnapshot.findMany({
          where: { guildId: context.guild.id },
          orderBy: { messageCount: "desc" },
          take: 10
        }),
        prisma.channelSnapshot.findMany({
          where: { guildId: context.guild.id, messageHint: 0 },
          take: 20
        }),
        prisma.eventLog.count({ where: { guildId: context.guild.id, type: "guildMemberAdd", createdAt: { gte: since } } }),
        prisma.eventLog.count({ where: { guildId: context.guild.id, type: "guildMemberRemove", createdAt: { gte: since } } })
      ]);
      return {
        ok: true,
        summary: `Recent growth: ${joins} joined and ${leaves} left in the last 7 days.`,
        data: { topMembers, inactiveChannels, joins, leaves }
      };
    }
  },
  {
    name: "create_event",
    description: "Create a scheduled Discord event.",
    riskLevel: "MEDIUM",
    parameters: { name: "string", description: "string", startTime: "ISO date", location: "string" },
    async execute(params, context) {
      const event = await context.guild.scheduledEvents.create({
        name: String(params.name),
        description: String(params.description ?? ""),
        scheduledStartTime: new Date(String(params.startTime)),
        privacyLevel: 2,
        entityType: 3,
        entityMetadata: { location: String(params.location ?? "Discord") },
        reason: "DAIOS requested event creation"
      });
      return { ok: true, summary: `Created event ${event.name}.`, data: { eventId: event.id } };
    }
  }
];
