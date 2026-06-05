import type { Guild, Message, PartialMessage, VoiceState } from "discord.js";
import { logEvent } from "../services/eventLogService.js";

export async function handleMessageAuditEvent(type: string, message: Message | PartialMessage) {
  if (!message.guild) return;
  await logEvent(message.guild.id, type, {
    actorId: message.author?.id,
    subjectId: message.id,
    payload: { channelId: message.channelId, contentLength: message.content?.length ?? 0 }
  });
}

export async function handleGuildStructureEvent(type: string, guild: Guild, subjectId: string, payload: Record<string, unknown>) {
  await logEvent(guild.id, type, { subjectId, payload });
}

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  await logEvent(newState.guild.id, "voiceStateUpdate", {
    actorId: newState.member?.id,
    subjectId: newState.channelId ?? oldState.channelId ?? undefined,
    payload: { oldChannelId: oldState.channelId, newChannelId: newState.channelId }
  });
}
