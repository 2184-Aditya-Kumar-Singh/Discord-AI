import type { Message } from "discord.js";
import type { Guild } from "@prisma/client";
import type { AiPlan } from "./types.js";
import { grokChat } from "./grokClient.js";
import { buildSystemPrompt } from "./systemPrompt.js";
import { prisma } from "../database/prisma.js";
import { createApprovalRequest } from "../approvals/approvalService.js";
import { executeToolCalls } from "../tools/executor.js";
import { getServerContext } from "../services/serverContextService.js";
import { upsertMemory } from "../memory/memoryService.js";
import { getSubscriptionSummary } from "../services/subscriptionService.js";
import { logger } from "../utils/logger.js";

type ChatMode = "assistant" | "admin";

export async function handleAiChat(message: Message, options: { mode: ChatMode; guildConfig: Guild | null }) {
  if ("sendTyping" in message.channel) await message.channel.sendTyping();

  try {
    const context = await getServerContext(message.guild!);
    const history = await prisma.conversationMessage.findMany({
      where: { guildId: message.guildId, channelId: message.channelId },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    await prisma.conversationMessage.create({
      data: { guildId: message.guildId, channelId: message.channelId, userId: message.author.id, role: "user", content: message.content }
    });

    const raw = await grokChat([
      { role: "system", content: buildSystemPrompt(options.mode) },
      { role: "system", content: `Current server context: ${JSON.stringify(context)}` },
      ...history.reverse().map((entry) => ({ role: entry.role as "user" | "assistant", content: entry.content })),
      { role: "user", content: `${message.author.username}: ${message.content}` }
    ]);

    const plan = parsePlan(raw);
    for (const memory of plan.memoryWrites ?? []) {
      await upsertMemory(message.guildId, memory.key, memory.value, memory.source ?? "ai_chat");
    }

    if (plan.toolCalls.length === 0) {
      await replyAndRemember(message, plan.response);
      return;
    }

    if (options.mode === "assistant") {
      const adminChannel = options.guildConfig?.adminChannelId ? `<#${options.guildConfig.adminChannelId}>` : "the administrator command channel";
      await replyAndRemember(
        message,
        `${plan.response}\n\nI can answer assistant questions here for free, but administrator actions must be requested in ${adminChannel}.`
      );
      return;
    }

    const subscription = await getSubscriptionSummary(message.guild!.id);
    if (!subscription.active) {
      await replyAndRemember(
        message,
        "Administrator command execution is not active for this server. This server has 0 days of paid subscription remaining. Please contact the bot owner to start the administrator plan ($50 USD per month)."
      );
      return;
    }

    if (plan.needsApproval || plan.riskLevel === "HIGH" || plan.riskLevel === "CRITICAL") {
      const approval = await createApprovalRequest(message, plan);
      await replyAndRemember(message, `${plan.response}\n\nApproval requested from the server owner. Request ID: ${approval.id}`);
      return;
    }

    const results = await executeToolCalls({
      guild: message.guild!,
      channelId: message.channelId,
      userId: message.author.id,
      toolCalls: plan.toolCalls
    });
    await replyAndRemember(message, `${plan.response}\n\n${results.map((result) => result.summary).join("\n")}`);
  } catch (error) {
    logger.error("AI chat failed", { error: error instanceof Error ? error.message : String(error) });
    await message.reply("I hit an internal error while reasoning about that. The action was not executed.");
  }
}

function parsePlan(raw: string): AiPlan {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Partial<AiPlan>;
  return {
    response: parsed.response ?? "I can help with that.",
    needsApproval: Boolean(parsed.needsApproval),
    riskLevel: parsed.riskLevel ?? "LOW",
    impact: parsed.impact ?? "No major impact expected.",
    toolCalls: Array.isArray(parsed.toolCalls) ? parsed.toolCalls : [],
    memoryWrites: Array.isArray(parsed.memoryWrites) ? parsed.memoryWrites : []
  };
}

async function replyAndRemember(message: Message, content: string) {
  const reply = await message.reply({ content: content.slice(0, 1900), allowedMentions: { repliedUser: false } });
  await prisma.conversationMessage.create({
    data: { guildId: message.guildId, channelId: message.channelId, userId: reply.author.id, role: "assistant", content }
  });
}
