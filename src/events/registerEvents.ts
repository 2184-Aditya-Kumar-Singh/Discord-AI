import type { Client } from "discord.js";
import { handleMessageCreate } from "./messageCreate.js";
import { handleGuildMemberAdd, handleGuildMemberRemove } from "./memberEvents.js";
import { handleGuildStructureEvent, handleMessageAuditEvent, handleVoiceStateUpdate } from "./auditEvents.js";
import { syncGuildKnowledge } from "../services/guildKnowledgeService.js";

export function registerDiscordEvents(client: Client) {
  client.on("guildCreate", (guild) => syncGuildKnowledge(guild));
  client.on("messageCreate", handleMessageCreate);
  client.on("messageDelete", (message) => handleMessageAuditEvent("messageDelete", message));
  client.on("messageUpdate", (_oldMessage, newMessage) => handleMessageAuditEvent("messageUpdate", newMessage));
  client.on("guildMemberAdd", handleGuildMemberAdd);
  client.on("guildMemberRemove", handleGuildMemberRemove);
  client.on("roleCreate", (role) => handleGuildStructureEvent("roleCreate", role.guild, role.id, { name: role.name }));
  client.on("roleDelete", (role) => handleGuildStructureEvent("roleDelete", role.guild, role.id, { name: role.name }));
  client.on("channelCreate", (channel) => {
    if ("guild" in channel) handleGuildStructureEvent("channelCreate", channel.guild, channel.id, { name: channel.name, type: channel.type });
  });
  client.on("channelDelete", (channel) => {
    if ("guild" in channel) handleGuildStructureEvent("channelDelete", channel.guild, channel.id, { name: channel.name, type: channel.type });
  });
  client.on("voiceStateUpdate", handleVoiceStateUpdate);
  client.on("threadCreate", (thread) => handleGuildStructureEvent("threadCreate", thread.guild, thread.id, { name: thread.name }));
  client.on("messageReactionAdd", (reaction, user) => {
    const guild = reaction.message.guild;
    if (guild) handleGuildStructureEvent("reactionAdd", guild, reaction.message.id, { emoji: reaction.emoji.name, userId: user.id });
  });
  client.on("inviteCreate", (invite) => {
    const guild = invite.guild ? client.guilds.cache.get(invite.guild.id) : null;
    if (guild) handleGuildStructureEvent("inviteCreate", guild, invite.code, { channelId: invite.channelId });
  });
}
