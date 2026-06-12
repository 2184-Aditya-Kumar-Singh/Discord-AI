import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type Message } from "discord.js";
import { Prisma, type ApprovalRequest } from "@prisma/client";
import type { AiPlan } from "../ai/types.js";
import { config } from "../config.js";
import { prisma } from "../database/prisma.js";

export async function createApprovalRequest(message: Message, plan: AiPlan, taskId?: string): Promise<ApprovalRequest> {
  const guild = message.guild!;
  const expiresAt = new Date(Date.now() + config.APPROVAL_TIMEOUT_MINUTES * 60_000);
  const approval = await prisma.approvalRequest.create({
    data: {
      guildId: guild.id,
      taskId,
      channelId: message.channelId,
      requesterId: message.author.id,
      reason: plan.response,
      impact: plan.impact,
      tools: plan.toolCalls as Prisma.InputJsonValue,
      riskLevel: plan.riskLevel,
      expiresAt
    }
  });

  const embed = new EmbedBuilder()
    .setTitle("DAIOS Approval Request")
    .setDescription(plan.response)
    .addFields(
      { name: "Guild", value: `${guild.name} (${guild.id})` },
      { name: "Risk", value: plan.riskLevel, inline: true },
      { name: "Impact", value: plan.impact.slice(0, 1024) },
      { name: "Tools", value: plan.toolCalls.map((call) => `\`${call.tool}\`: ${call.reason}`).join("\n").slice(0, 1024) }
    )
    .setFooter({ text: `Approval ID: ${approval.id}` })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`approval:approve:${approval.id}`).setLabel("Approve").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`approval:reject:${approval.id}`).setLabel("Reject").setStyle(ButtonStyle.Danger)
  );

  const approverIds = [...new Set([guild.ownerId, config.BOT_OWNER_ID])];
  for (const approverId of approverIds) {
    const target = await message.client.users.fetch(approverId).catch(() => null);
    const dm = await target?.send({ embeds: [embed], components: [row] }).catch(() => null);
    if (dm && approverId === guild.ownerId) {
      await prisma.approvalRequest.update({ where: { id: approval.id }, data: { messageId: dm.id } });
    }
  }

  return approval;
}
