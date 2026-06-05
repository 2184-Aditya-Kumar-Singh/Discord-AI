import { ChannelType, PermissionFlagsBits } from "discord.js";
import type { ToolDefinition } from "../types.js";

export const channelTools: ToolDefinition[] = [
  {
    name: "create_channel",
    description: "Create a Discord text, voice, forum, or category channel.",
    riskLevel: "MEDIUM",
    parameters: {
      name: "string",
      type: "text | voice | forum | category",
      parentId: "optional category id",
      reason: "optional audit log reason"
    },
    async execute(params, context) {
      const typeMap = {
        text: ChannelType.GuildText,
        voice: ChannelType.GuildVoice,
        forum: ChannelType.GuildForum,
        category: ChannelType.GuildCategory
      } as const;
      const type = typeMap[String(params.type ?? "text") as keyof typeof typeMap] ?? ChannelType.GuildText;
      const channel = await context.guild.channels.create({
        name: String(params.name),
        type,
        parent: params.parentId ? String(params.parentId) : undefined,
        reason: String(params.reason ?? "DAIOS requested channel creation")
      });
      return { ok: true, summary: `Created channel ${channel.name}.`, data: { channelId: channel.id } };
    }
  },
  {
    name: "rename_channel",
    description: "Rename an existing Discord channel.",
    riskLevel: "MEDIUM",
    parameters: { channelId: "string", name: "string", reason: "optional audit log reason" },
    async execute(params, context) {
      const channel = await context.guild.channels.fetch(String(params.channelId));
      if (!channel || !("setName" in channel)) return { ok: false, summary: "Channel not found or cannot be renamed." };
      await channel.setName(String(params.name), String(params.reason ?? "DAIOS requested channel rename"));
      return { ok: true, summary: `Renamed channel to ${params.name}.` };
    }
  },
  {
    name: "delete_channel",
    description: "Delete a Discord channel. This is destructive and requires approval.",
    riskLevel: "HIGH",
    parameters: { channelId: "string", reason: "optional audit log reason" },
    async execute(params, context) {
      const channel = await context.guild.channels.fetch(String(params.channelId));
      if (!channel || !("delete" in channel)) return { ok: false, summary: "Channel not found or cannot be deleted." };
      const name = "name" in channel ? channel.name : String(params.channelId);
      await channel.delete(String(params.reason ?? "DAIOS approved channel deletion"));
      return { ok: true, summary: `Deleted channel ${name}.` };
    }
  },
  {
    name: "view_permissions",
    description: "Inspect bot permissions for the guild and an optional channel.",
    riskLevel: "LOW",
    parameters: { channelId: "optional channel id" },
    async execute(params, context) {
      const me = await context.guild.members.fetchMe();
      const permissions = params.channelId
        ? (await context.guild.channels.fetch(String(params.channelId)))?.permissionsFor(me)?.toArray() ?? []
        : me.permissions.toArray();
      const hasAdministrator = permissions.includes("Administrator");
      return { ok: true, summary: `I have ${hasAdministrator ? "administrator" : permissions.length} permissions in scope.`, data: { permissions } };
    }
  }
];
