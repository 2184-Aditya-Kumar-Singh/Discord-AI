import { prisma } from "../database/prisma.js";

export async function getSubscriptionSummary(guildId: string) {
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  const endsAt = guild?.subscriptionEndsAt ?? null;
  const active = Boolean(endsAt && endsAt.getTime() > Date.now());
  const daysRemaining = active ? Math.ceil((endsAt!.getTime() - Date.now()) / 86_400_000) : 0;
  return { active, endsAt, daysRemaining };
}

export async function extendSubscription(guildId: string, days: number, addedById: string) {
  const guild = await prisma.guild.findUniqueOrThrow({ where: { id: guildId } });
  const now = new Date();
  const startsAt = guild.subscriptionEndsAt && guild.subscriptionEndsAt > now ? guild.subscriptionEndsAt : now;
  const endsAt = new Date(startsAt.getTime() + days * 86_400_000);

  await prisma.$transaction([
    prisma.guild.update({ where: { id: guildId }, data: { subscriptionEndsAt: endsAt } }),
    prisma.subscriptionLedger.create({
      data: {
        guildId,
        daysAdded: days,
        addedById,
        startsAt,
        endsAt
      }
    })
  ]);

  return getSubscriptionSummary(guildId);
}
