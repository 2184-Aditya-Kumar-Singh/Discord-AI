import { ChannelType, PermissionFlagsBits } from "discord.js";
import type { ToolDefinition } from "../types.js";

export const workflowTools: ToolDefinition[] = [
  {
    name: "create_server_architecture",
    description: "Create a complete Discord server architecture with roles, categories, text channels, permission overwrites, and starter messages.",
    riskLevel: "HIGH",
    parameters: {
      roles: "array of { name, color?, hoist? }",
      categories: "array of { name, channels: [{ name, topic?, starterMessage?, privateToRoles? }] }",
      reason: "optional audit log reason"
    },
    async execute(params, context) {
      const reason = String(params.reason ?? "DAIOS approved autonomous server architecture");
      const createdRoles = new Map<string, string>();
      const roleInputs = Array.isArray(params.roles) ? params.roles : [];

      for (const roleInput of roleInputs) {
        if (!isObject(roleInput) || !roleInput.name) continue;
        const name = String(roleInput.name);
        const existing = context.guild.roles.cache.find((role) => role.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          createdRoles.set(name, existing.id);
          continue;
        }
        const role = await context.guild.roles.create({
          name,
          color: roleInput.color as never,
          hoist: typeof roleInput.hoist === "boolean" ? roleInput.hoist : undefined,
          reason
        });
        createdRoles.set(name, role.id);
      }

      const createdCategories: Array<{ name: string; id: string }> = [];
      const createdChannels: Array<{ name: string; id: string }> = [];
      const categoryInputs = Array.isArray(params.categories) ? params.categories : [];

      for (const categoryInput of categoryInputs) {
        if (!isObject(categoryInput) || !categoryInput.name) continue;
        const categoryName = String(categoryInput.name);
        const category = await context.guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
          reason
        });
        createdCategories.push({ name: category.name, id: category.id });

        const channels = Array.isArray(categoryInput.channels) ? categoryInput.channels : [];
        for (const channelInput of channels) {
          if (!isObject(channelInput) || !channelInput.name) continue;
          const privateToRoles = Array.isArray(channelInput.privateToRoles) ? channelInput.privateToRoles.map(String) : [];
          const permissionOverwrites =
            privateToRoles.length > 0
              ? [
                  { id: context.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                  ...privateToRoles
                    .map((roleName) => createdRoles.get(roleName))
                    .filter((roleId): roleId is string => Boolean(roleId))
                    .map((roleId) => ({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }))
                ]
              : undefined;
          const channel = await context.guild.channels.create({
            name: String(channelInput.name),
            type: ChannelType.GuildText,
            parent: category.id,
            topic: channelInput.topic ? String(channelInput.topic).slice(0, 1024) : undefined,
            permissionOverwrites,
            reason
          });
          createdChannels.push({ name: channel.name, id: channel.id });
          if (channelInput.starterMessage) {
            await channel.send(String(channelInput.starterMessage).slice(0, 1900));
          }
        }
      }

      return {
        ok: true,
        summary: `Created architecture with ${createdRoles.size} role(s), ${createdCategories.length} categor(ies), and ${createdChannels.length} channel(s).`,
        data: { roles: Object.fromEntries(createdRoles), categories: createdCategories, channels: createdChannels }
      };
    }
  },
  {
    name: "create_staff_application_system",
    description: "Create channels and roles for a staff application review workflow.",
    riskLevel: "HIGH",
    parameters: { categoryName: "optional string", applicantRoleName: "optional string", reviewerRoleName: "optional string" },
    async execute(params, context) {
      const reviewerRole = await context.guild.roles.create({
        name: String(params.reviewerRoleName ?? "Staff Reviewer"),
        reason: "DAIOS approved staff application system"
      });
      const applicantRole = await context.guild.roles.create({
        name: String(params.applicantRoleName ?? "Staff Applicant"),
        reason: "DAIOS approved staff application system"
      });
      const category = await context.guild.channels.create({
        name: String(params.categoryName ?? "Staff Applications"),
        type: ChannelType.GuildCategory,
        reason: "DAIOS approved staff application system"
      });
      const apply = await context.guild.channels.create({
        name: "apply-for-staff",
        type: ChannelType.GuildText,
        parent: category.id,
        reason: "DAIOS approved staff application system"
      });
      const review = await context.guild.channels.create({
        name: "staff-application-review",
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          { id: context.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: reviewerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ],
        reason: "DAIOS approved staff application system"
      });
      await apply.send("Staff applications are open. Share your experience, timezone, and why you want to help.");
      await review.send("New applications can be reviewed here. Use your normal staff process for accept/reject decisions.");
      return {
        ok: true,
        summary: `Created staff application system with ${apply.name}, ${review.name}, ${reviewerRole.name}, and ${applicantRole.name}.`,
        data: { categoryId: category.id, applyChannelId: apply.id, reviewChannelId: review.id, reviewerRoleId: reviewerRole.id, applicantRoleId: applicantRole.id }
      };
    }
  },
  {
    name: "create_verification_system",
    description: "Create a basic verification channel and member role.",
    riskLevel: "HIGH",
    parameters: { verifiedRoleName: "optional string", channelName: "optional string" },
    async execute(params, context) {
      const verifiedRole = await context.guild.roles.create({
        name: String(params.verifiedRoleName ?? "Verified"),
        reason: "DAIOS approved verification system"
      });
      const channel = await context.guild.channels.create({
        name: String(params.channelName ?? "verify"),
        type: ChannelType.GuildText,
        reason: "DAIOS approved verification system"
      });
      await channel.send("Welcome. A staff member or automation can verify you here and assign the Verified role.");
      return { ok: true, summary: `Created verification channel ${channel.name} and role ${verifiedRole.name}.`, data: { channelId: channel.id, roleId: verifiedRole.id } };
    }
  },
  {
    name: "create_support_system",
    description: "Create support category, ticket request channel, and support team role.",
    riskLevel: "HIGH",
    parameters: { categoryName: "optional string", supportRoleName: "optional string" },
    async execute(params, context) {
      const supportRole = await context.guild.roles.create({
        name: String(params.supportRoleName ?? "Support Team"),
        reason: "DAIOS approved support system"
      });
      const category = await context.guild.channels.create({
        name: String(params.categoryName ?? "Support"),
        type: ChannelType.GuildCategory,
        reason: "DAIOS approved support system"
      });
      const channel = await context.guild.channels.create({
        name: "open-a-ticket",
        type: ChannelType.GuildText,
        parent: category.id,
        reason: "DAIOS approved support system"
      });
      await channel.send("Need help? Describe your issue here and the support team will follow up.");
      return { ok: true, summary: `Created support system with ${channel.name} and ${supportRole.name}.`, data: { categoryId: category.id, channelId: channel.id, roleId: supportRole.id } };
    }
  },
  {
    name: "create_onboarding_system",
    description: "Create onboarding channels for rules, welcome, announcements, and introductions.",
    riskLevel: "HIGH",
    parameters: { categoryName: "optional string" },
    async execute(params, context) {
      const category = await context.guild.channels.create({
        name: String(params.categoryName ?? "Onboarding"),
        type: ChannelType.GuildCategory,
        reason: "DAIOS approved onboarding system"
      });
      const names = ["welcome", "rules", "announcements", "introductions"];
      const channels = [];
      for (const name of names) {
        channels.push(
          await context.guild.channels.create({
            name,
            type: ChannelType.GuildText,
            parent: category.id,
            reason: "DAIOS approved onboarding system"
          })
        );
      }
      await channels[0].send("Welcome to the server.");
      await channels[1].send("Please keep discussion respectful, avoid spam, and follow Discord's Terms of Service.");
      return { ok: true, summary: `Created onboarding system with ${channels.length} channels.`, data: { categoryId: category.id, channelIds: channels.map((channel) => channel.id) } };
    }
  },
  {
    name: "create_moderation_system",
    description: "Create moderation logs, staff alerts, and muted role.",
    riskLevel: "HIGH",
    parameters: { categoryName: "optional string", mutedRoleName: "optional string" },
    async execute(params, context) {
      const mutedRole = await context.guild.roles.create({
        name: String(params.mutedRoleName ?? "Muted"),
        reason: "DAIOS approved moderation system"
      });
      const category = await context.guild.channels.create({
        name: String(params.categoryName ?? "Moderation"),
        type: ChannelType.GuildCategory,
        permissionOverwrites: [{ id: context.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }],
        reason: "DAIOS approved moderation system"
      });
      const logs = await context.guild.channels.create({ name: "mod-logs", type: ChannelType.GuildText, parent: category.id });
      const alerts = await context.guild.channels.create({ name: "staff-alerts", type: ChannelType.GuildText, parent: category.id });
      await logs.send("Moderation logs will appear here.");
      await alerts.send("Staff alerts will appear here.");
      return { ok: true, summary: `Created moderation system with ${logs.name}, ${alerts.name}, and ${mutedRole.name}.`, data: { categoryId: category.id, logsChannelId: logs.id, alertsChannelId: alerts.id, mutedRoleId: mutedRole.id } };
    }
  },
  {
    name: "create_event_management_system",
    description: "Create event planning channels and event ping role.",
    riskLevel: "HIGH",
    parameters: { categoryName: "optional string", eventRoleName: "optional string" },
    async execute(params, context) {
      const eventRole = await context.guild.roles.create({
        name: String(params.eventRoleName ?? "Event Ping"),
        reason: "DAIOS approved event management system"
      });
      const category = await context.guild.channels.create({
        name: String(params.categoryName ?? "Events"),
        type: ChannelType.GuildCategory,
        reason: "DAIOS approved event management system"
      });
      const planning = await context.guild.channels.create({ name: "event-planning", type: ChannelType.GuildText, parent: category.id });
      const announcements = await context.guild.channels.create({ name: "event-announcements", type: ChannelType.GuildText, parent: category.id });
      return { ok: true, summary: `Created event management system with ${planning.name}, ${announcements.name}, and ${eventRole.name}.`, data: { categoryId: category.id, planningChannelId: planning.id, announcementsChannelId: announcements.id, roleId: eventRole.id } };
    }
  }
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
