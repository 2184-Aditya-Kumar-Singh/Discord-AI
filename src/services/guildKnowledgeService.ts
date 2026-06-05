import type { Guild } from "discord.js";
import { prisma } from "../database/prisma.js";

export async function syncGuildKnowledge(guild: Guild) {
  await guild.members.fetch().catch(() => null);
  await guild.channels.fetch().catch(() => null);
  await guild.roles.fetch().catch(() => null);

  await prisma.guild.upsert({
    where: { id: guild.id },
    create: {
      id: guild.id,
      name: guild.name,
      ownerId: guild.ownerId,
      memberCount: guild.memberCount
    },
    update: {
      name: guild.name,
      ownerId: guild.ownerId,
      memberCount: guild.memberCount
    }
  });

  await Promise.all(
    guild.channels.cache.map((channel) =>
      prisma.channelSnapshot.upsert({
        where: { id: channel.id },
        create: {
          id: channel.id,
          guildId: guild.id,
          name: channelName(channel),
          type: String(channel.type),
          parentId: channelParentId(channel),
          position: channelPosition(channel)
        },
        update: {
          name: channelName(channel),
          type: String(channel.type),
          parentId: channelParentId(channel),
          position: channelPosition(channel),
          lastSeenAt: new Date()
        }
      })
    )
  );

  await Promise.all(
    guild.roles.cache.map((role) =>
      prisma.roleSnapshot.upsert({
        where: { id: role.id },
        create: {
          id: role.id,
          guildId: guild.id,
          name: role.name,
          color: role.color,
          position: role.position,
          permissions: role.permissions.bitfield.toString(),
          managed: role.managed
        },
        update: {
          name: role.name,
          color: role.color,
          position: role.position,
          permissions: role.permissions.bitfield.toString(),
          managed: role.managed,
          lastSeenAt: new Date()
        }
      })
    )
  );

  await Promise.all(
    guild.members.cache.map((member) =>
      prisma.memberSnapshot.upsert({
        where: { id_guildId: { id: member.id, guildId: guild.id } },
        create: {
          id: member.id,
          guildId: guild.id,
          username: member.user.username,
          displayName: member.displayName,
          joinedAt: member.joinedAt
        },
        update: {
          username: member.user.username,
          displayName: member.displayName,
          joinedAt: member.joinedAt,
          lastSeenAt: new Date()
        }
      })
    )
  );
}

function channelName(channel: { id: string; name?: string | null }) {
  return channel.name ?? channel.id;
}

function channelParentId(channel: { parentId?: string | null }) {
  return channel.parentId ?? null;
}

function channelPosition(channel: object) {
  return "position" in channel && typeof channel.position === "number" ? channel.position : null;
}
