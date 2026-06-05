import {
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import { config } from "../config.js";
import { prisma } from "../database/prisma.js";
import { extendSubscription, getSubscriptionSummary } from "../services/subscriptionService.js";
import { syncGuildKnowledge } from "../services/guildKnowledgeService.js";

const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Configure the free assistant channel and paid administrator command channel.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((option) =>
    option
      .setName("assistant_channel")
      .setDescription("Free channel where DAIOS answers assistant questions.")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addChannelOption((option) =>
    option
      .setName("admin_channel")
      .setDescription("Paid channel where DAIOS can execute administrator tasks.")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  );

const continueCommand = new SlashCommandBuilder()
  .setName("continue")
  .setDescription("Extend a server's paid administrator subscription. Bot owner only.")
  .addIntegerOption((option) =>
    option.setName("days").setDescription("Number of paid days to add.").setRequired(true).setMinValue(1).setMaxValue(365)
  );

const statusCommand = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Show this server's DAIOS setup and paid administrator subscription status.");

export async function registerSlashCommands(client: Client) {
  const commands = [setupCommand, continueCommand, statusCommand];
  if (config.COMMAND_GUILD_ID) {
    const guild = await client.guilds.fetch(config.COMMAND_GUILD_ID);
    await guild.commands.set(commands);
    return;
  }
  await client.application?.commands.set(commands);
}

export function registerSlashCommandEvents(client: Client) {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === "setup") await handleSetup(interaction);
    if (interaction.commandName === "continue") await handleContinue(interaction);
    if (interaction.commandName === "status") await handleStatus(interaction);
  });
}

async function handleSetup(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "Setup can only be run inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const isOwner = interaction.user.id === config.BOT_OWNER_ID || interaction.user.id === interaction.guild.ownerId;
  const hasManageGuild = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
  if (!isOwner && !hasManageGuild) {
    await interaction.reply({ content: "You need Manage Server permission to configure DAIOS.", flags: MessageFlags.Ephemeral });
    return;
  }

  const assistantChannel = interaction.options.getChannel("assistant_channel", true);
  const adminChannel = interaction.options.getChannel("admin_channel", true);
  await syncGuildKnowledge(interaction.guild);
  await prisma.guild.update({
    where: { id: interaction.guild.id },
    data: {
      assistantChannelId: assistantChannel.id,
      adminChannelId: adminChannel.id
    }
  });

  const subscription = await getSubscriptionSummary(interaction.guild.id);
  await interaction.reply({
    content: [
      `DAIOS setup complete.`,
      `Assistant channel: <#${assistantChannel.id}> (free).`,
      `Administrator command channel: <#${adminChannel.id}> (requires paid subscription).`,
      subscription.active
        ? `Admin subscription active until ${subscription.endsAt?.toISOString()}.`
        : "Admin subscription has 0 days remaining. Contact the bot owner to start the $50/month plan."
    ].join("\n"),
    flags: MessageFlags.Ephemeral
  });
}

async function handleContinue(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command must be run inside the server whose subscription should be extended.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (interaction.user.id !== config.BOT_OWNER_ID) {
    await interaction.reply({ content: "Only the bot owner can extend paid administrator subscriptions.", flags: MessageFlags.Ephemeral });
    return;
  }

  const days = interaction.options.getInteger("days", true);
  await syncGuildKnowledge(interaction.guild);
  const summary = await extendSubscription(interaction.guild.id, days, interaction.user.id);

  await interaction.reply({
    content: `Paid administrator subscription extended by ${days} day(s). It is now active until ${summary.endsAt?.toISOString()}.`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleStatus(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({ content: "Status can only be checked inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  await syncGuildKnowledge(interaction.guild);
  const guild = await prisma.guild.findUnique({ where: { id: interaction.guild.id } });
  const subscription = await getSubscriptionSummary(interaction.guild.id);

  await interaction.reply({
    content: [
      `DAIOS status for ${interaction.guild.name}`,
      `Assistant channel: ${guild?.assistantChannelId ? `<#${guild.assistantChannelId}>` : "not configured"}`,
      `Administrator command channel: ${guild?.adminChannelId ? `<#${guild.adminChannelId}>` : "not configured"}`,
      subscription.active
        ? `Paid administrator subscription: active, ${subscription.daysRemaining} day(s) remaining, ends ${subscription.endsAt?.toISOString()}`
        : "Paid administrator subscription: inactive, 0 days remaining. Contact the bot owner to start the $50 USD/month administrator plan."
    ].join("\n"),
    flags: MessageFlags.Ephemeral
  });
}
