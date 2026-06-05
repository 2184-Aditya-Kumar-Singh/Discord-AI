import type { Guild } from "discord.js";
import { prisma } from "../database/prisma.js";
import { syncGuildKnowledge } from "./guildKnowledgeService.js";

export async function getServerContext(guild: Guild) {
  await syncGuildKnowledge(guild);

  const [storedGuild, channels, roles, members, memories, automations] = await Promise.all([
    prisma.guild.findUniqueOrThrow({ where: { id: guild.id } }),
    prisma.channelSnapshot.findMany({ where: { guildId: guild.id }, orderBy: { position: "asc" }, take: 100 }),
    prisma.roleSnapshot.findMany({ where: { guildId: guild.id }, orderBy: { position: "desc" }, take: 100 }),
    prisma.memberSnapshot.findMany({ where: { guildId: guild.id }, orderBy: { messageCount: "desc" }, take: 25 }),
    prisma.memory.findMany({ where: { OR: [{ guildId: guild.id }, { guildId: null }] }, take: 50 }),
    prisma.automation.findMany({ where: { guildId: guild.id, status: "ACTIVE" }, take: 25 })
  ]);

  return {
    guild: storedGuild,
    channels: channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId,
      messageHint: channel.messageHint
    })),
    roles: roles.map((role) => ({ id: role.id, name: role.name, position: role.position, managed: role.managed })),
    activeMembers: members.map((member) => ({
      id: member.id,
      username: member.username,
      displayName: member.displayName,
      messageCount: member.messageCount,
      joinedAt: member.joinedAt,
      lastActiveAt: member.lastActiveAt
    })),
    memories: memories.map((memory) => ({ key: memory.key, value: memory.value, source: memory.source })),
    automations: automations.map((automation) => ({
      id: automation.id,
      name: automation.name,
      description: automation.description,
      trigger: automation.trigger,
      actions: automation.actions
    }))
  };
}
