import type { Guild } from "discord.js";
import { prisma } from "../database/prisma.js";
import { syncGuildKnowledge } from "../services/guildKnowledgeService.js";
import type { ToolResult } from "../tools/types.js";
import { recordTaskHistory } from "./history.js";

export async function observeTaskExecution(taskId: string, guild: Guild, results: ToolResult[]) {
  await syncGuildKnowledge(guild);
  const failed = results.filter((result) => !result.ok);
  const task = await prisma.agentTask.update({
    where: { id: taskId },
    data: {
      status: failed.length > 0 ? "FAILED" : "OBSERVING",
      lastError: failed.length > 0 ? failed.map((result) => result.summary).join("\n").slice(0, 2000) : null
    },
    include: { steps: { orderBy: { position: "asc" } } }
  });

  await recordTaskHistory(taskId, "observe", failed.length > 0 ? "Observed failed tool results." : "Observed successful tool results.", {
    results: results.map((result) => ({ ok: result.ok, summary: result.summary }))
  });

  return { task, failed };
}
