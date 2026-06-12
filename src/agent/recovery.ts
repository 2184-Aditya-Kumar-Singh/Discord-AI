import { prisma } from "../database/prisma.js";
import { logger } from "../utils/logger.js";
import { recordTaskHistory } from "./history.js";

export async function recoverInterruptedTasks() {
  const interrupted = await prisma.agentTask.findMany({
    where: { status: { in: ["PLANNING", "EXECUTING", "OBSERVING", "REFLECTING"] } },
    select: { id: true, status: true }
  });

  for (const task of interrupted) {
    await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        status: "FAILED",
        lastError: `Task was interrupted while ${task.status.toLowerCase()}. Review task history before retrying to avoid duplicate Discord changes.`
      }
    });
    await prisma.agentTaskStep.updateMany({
      where: { taskId: task.id, status: "RUNNING" },
      data: { status: "FAILED", error: "Interrupted by process shutdown.", completedAt: new Date() }
    });
    await recordTaskHistory(task.id, "recovery.interrupted", "Marked interrupted task as failed for manual review.", { previousStatus: task.status });
  }

  if (interrupted.length > 0) {
    logger.warn("Recovered interrupted autonomous tasks", { count: interrupted.length });
  }
}
