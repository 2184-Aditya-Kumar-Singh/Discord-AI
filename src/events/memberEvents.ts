import type { GuildMember, PartialGuildMember } from "discord.js";
import { prisma } from "../database/prisma.js";
import { logEvent } from "../services/eventLogService.js";
import { syncGuildKnowledge } from "../services/guildKnowledgeService.js";

export async function handleGuildMemberAdd(member: GuildMember) {
  await syncGuildKnowledge(member.guild);
  await prisma.memberSnapshot.upsert({
    where: { id_guildId: { id: member.id, guildId: member.guild.id } },
    create: {
      id: member.id,
      guildId: member.guild.id,
      username: member.user.username,
      displayName: member.displayName,
      joinedAt: member.joinedAt
    },
    update: { leftAt: null, lastSeenAt: new Date(), username: member.user.username, displayName: member.displayName }
  });
  await logEvent(member.guild.id, "guildMemberAdd", { actorId: member.id, subjectId: member.id, payload: {} });
}

export async function handleGuildMemberRemove(member: GuildMember | PartialGuildMember) {
  await prisma.memberSnapshot.updateMany({
    where: { id: member.id, guildId: member.guild.id },
    data: { leftAt: new Date(), lastSeenAt: new Date() }
  });
  await logEvent(member.guild.id, "guildMemberRemove", { actorId: member.id, subjectId: member.id, payload: {} });
}
