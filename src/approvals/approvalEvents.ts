import type { ButtonInteraction, Client } from "discord.js";
import { config } from "../config.js";
import { prisma } from "../database/prisma.js";
import { getSubscriptionSummary } from "../services/subscriptionService.js";
import { executeToolCalls } from "../tools/executor.js";

export function registerApprovalEvents(client: Client) {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith("approval:")) return;
    await handleApprovalButton(interaction);
  });
}

async function handleApprovalButton(interaction: ButtonInteraction) {
  const [, action, approvalId] = interaction.customId.split(":");
  const approval = await prisma.approvalRequest.findUnique({ where: { id: approvalId } });
  if (!approval) {
    await interaction.reply({ content: "Approval request not found.", ephemeral: true });
    return;
  }

  const guild = await interaction.client.guilds.fetch(approval.guildId);
  const isAllowed = interaction.user.id === config.BOT_OWNER_ID || interaction.user.id === guild.ownerId;
  if (!isAllowed) {
    await interaction.reply({ content: "Only the bot owner or server owner can approve this.", ephemeral: true });
    return;
  }

  if (approval.status !== "PENDING" || approval.expiresAt < new Date()) {
    await prisma.approvalRequest.update({ where: { id: approval.id }, data: { status: "EXPIRED" } }).catch(() => null);
    await interaction.reply({ content: "This approval is no longer pending.", ephemeral: true });
    return;
  }

  if (action === "reject") {
    await prisma.approvalRequest.update({ where: { id: approval.id }, data: { status: "REJECTED", approverId: interaction.user.id } });
    await interaction.reply({ content: "Rejected. No actions were executed.", ephemeral: true });
    return;
  }

  const subscription = await getSubscriptionSummary(guild.id);
  if (!subscription.active) {
    await interaction.reply({
      content: "This server's paid administrator subscription is inactive, so approved administrator actions cannot execute. Contact the bot owner to start the $50 USD/month plan.",
      ephemeral: true
    });
    return;
  }

  await prisma.approvalRequest.update({ where: { id: approval.id }, data: { status: "APPROVED", approverId: interaction.user.id } });
  const results = await executeToolCalls({
    guild,
    channelId: approval.channelId ?? undefined,
    userId: approval.requesterId,
    approvalId: approval.id,
    toolCalls: approval.tools as never
  });
  await prisma.approvalRequest.update({ where: { id: approval.id }, data: { status: "EXECUTED" } });
  await interaction.reply({ content: `Approved and executed:\n${results.map((result) => result.summary).join("\n")}`, ephemeral: true });
}
