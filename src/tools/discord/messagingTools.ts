import { ChannelType, type TextBasedChannel } from "discord.js";
import type { ToolDefinition } from "../types.js";

export const messagingTools: ToolDefinition[] = [
  {
    name: "send_message",
    description: "Send a message to a channel.",
    riskLevel: "LOW",
    parameters: { channelId: "string", content: "string" },
    async execute(params, context) {
      const channel = (await context.guild.channels.fetch(String(params.channelId))) as TextBasedChannel | null;
      if (!channel || !("send" in channel)) return { ok: false, summary: "Channel not found or cannot receive messages." };
      const message = await channel.send(String(params.content).slice(0, 2000));
      return { ok: true, summary: `Sent message in <#${params.channelId}>.`, data: { messageId: message.id } };
    }
  },
  {
    name: "edit_message",
    description: "Edit a bot-authored message.",
    riskLevel: "MEDIUM",
    parameters: { channelId: "string", messageId: "string", content: "string" },
    async execute(params, context) {
      const channel = (await context.guild.channels.fetch(String(params.channelId))) as TextBasedChannel | null;
      if (!channel || !("messages" in channel)) return { ok: false, summary: "Channel not found." };
      const message = await channel.messages.fetch(String(params.messageId));
      await message.edit(String(params.content).slice(0, 2000));
      return { ok: true, summary: "Edited message." };
    }
  },
  {
    name: "delete_message",
    description: "Delete a message.",
    riskLevel: "HIGH",
    parameters: { channelId: "string", messageId: "string", reason: "optional reason" },
    async execute(params, context) {
      const channel = (await context.guild.channels.fetch(String(params.channelId))) as TextBasedChannel | null;
      if (!channel || !("messages" in channel)) return { ok: false, summary: "Channel not found." };
      const message = await channel.messages.fetch(String(params.messageId));
      await message.delete();
      return { ok: true, summary: "Deleted message." };
    }
  },
  {
    name: "create_thread",
    description: "Create a public thread from a text channel.",
    riskLevel: "MEDIUM",
    parameters: { channelId: "string", name: "string" },
    async execute(params, context) {
      const channel = await context.guild.channels.fetch(String(params.channelId));
      if (!channel || channel.type !== ChannelType.GuildText || !("threads" in channel)) {
        return { ok: false, summary: "Channel cannot create text threads." };
      }
      const thread = await channel.threads.create({ name: String(params.name), reason: "DAIOS requested thread creation" });
      return { ok: true, summary: `Created thread ${thread.name}.`, data: { threadId: thread.id } };
    }
  },
  {
    name: "archive_thread",
    description: "Archive an existing thread.",
    riskLevel: "MEDIUM",
    parameters: { threadId: "string" },
    async execute(params, context) {
      const channel = await context.guild.channels.fetch(String(params.threadId));
      if (!channel || !("setArchived" in channel)) return { ok: false, summary: "Thread not found." };
      await channel.setArchived(true, "DAIOS requested thread archive");
      return { ok: true, summary: "Archived thread." };
    }
  }
];
