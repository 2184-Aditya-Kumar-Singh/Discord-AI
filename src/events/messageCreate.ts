import type { Message } from "discord.js";
import { aiChannelIds } from "../config.js";
import { handleAiChat } from "../ai/chatHandler.js";
import { prisma } from "../database/prisma.js";
import { logEvent } from "../services/eventLogService.js";

export async function handleMessageCreate(message: Message) {
  if (message.author.bot || !message.guild) return;

  await prisma.memberSnapshot.updateMany({
    where: { id: message.author.id, guildId: message.guild.id },
    data: { messageCount: { increment: 1 }, lastActiveAt: new Date(), lastSeenAt: new Date() }
  });

  await logEvent(message.guild.id, "messageCreate", {
    actorId: message.author.id,
    subjectId: message.id,
    payload: { channelId: message.channelId, content: message.content, contentLength: message.content.length }
  });

  const guildConfig = await prisma.guild.findUnique({ where: { id: message.guild.id } });
  const mentioned = message.mentions.has(message.client.user!);
  const repliedToBot = Boolean(
    message.reference?.messageId &&
      (await message.channel.messages.fetch(message.reference.messageId).catch(() => null))?.author.id === message.client.user?.id
  );
  const inAssistantChannel = guildConfig?.assistantChannelId === message.channelId || aiChannelIds.has(message.channelId);
  const inAdminChannel = guildConfig?.adminChannelId === message.channelId;

  if (!mentioned && !repliedToBot && !inAssistantChannel && !inAdminChannel) return;

  await handleAiChat(message, { mode: inAdminChannel ? "admin" : "assistant", guildConfig });
}
