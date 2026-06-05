import { prisma } from "../database/prisma.js";

export async function upsertMemory(guildId: string | null, key: string, value: string, source: string) {
  const existing = await prisma.memory.findFirst({ where: { guildId, key } });
  if (existing) {
    return prisma.memory.update({ where: { id: existing.id }, data: { value, source } });
  }
  return prisma.memory.create({ data: { guildId, key, value, source } });
}
