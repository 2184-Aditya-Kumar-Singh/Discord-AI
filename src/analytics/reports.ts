import { prisma } from "../database/prisma.js";

export async function getActivityReport(guildId: string, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [messages, joins, leaves, topMembers] = await Promise.all([
    prisma.eventLog.count({ where: { guildId, type: "messageCreate", createdAt: { gte: since } } }),
    prisma.eventLog.count({ where: { guildId, type: "guildMemberAdd", createdAt: { gte: since } } }),
    prisma.eventLog.count({ where: { guildId, type: "guildMemberRemove", createdAt: { gte: since } } }),
    prisma.memberSnapshot.findMany({ where: { guildId }, orderBy: { messageCount: "desc" }, take: 10 })
  ]);

  return { days, messages, joins, leaves, topMembers };
}
