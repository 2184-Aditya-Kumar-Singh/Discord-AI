import type { Guild } from "discord.js";
import { prisma } from "../database/prisma.js";
import { syncGuildKnowledge } from "./guildKnowledgeService.js";

export async function getServerContext(guild: Guild) {
  await syncGuildKnowledge(guild);

  const [storedGuild, channels, roles, members, memories, automations] = await Promise.all([
    prisma.guild.findUniqueOrThrow({ where: { id: guild.id } }),
    prisma.channelSnapshot.findMany({ where: { guildId: guild.id }, orderBy: { position: "asc" }, take: 35 }),
    prisma.roleSnapshot.findMany({ where: { guildId: guild.id }, orderBy: { position: "desc" }, take: 35 }),
    prisma.memberSnapshot.findMany({ where: { guildId: guild.id }, orderBy: { messageCount: "desc" }, take: 10 }),
    prisma.memory.findMany({ where: { OR: [{ guildId: guild.id }, { guildId: null }] }, take: 12 }),
    prisma.automation.findMany({ where: { guildId: guild.id, status: "ACTIVE" }, take: 8 })
  ]);

  return {
    guild: storedGuild,
    channels: channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type
    })),
    roles: roles.map((role) => ({ id: role.id, name: role.name })),
    activeMembers: members.map((member) => ({
      id: member.id,
      username: member.username,
      messageCount: member.messageCount
    })),
    memories: memories.map((memory) => ({ key: memory.key, value: memory.value })),
    automations: automations.map((automation) => ({
      id: automation.id,
      name: automation.name,
      description: automation.description
    }))
  };
}
