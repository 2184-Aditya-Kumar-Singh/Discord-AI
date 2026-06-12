import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";

export async function recordTaskHistory(taskId: string, type: string, message: string, payload?: unknown) {
  await prisma.taskHistory.create({
    data: {
      taskId,
      type,
      message,
      payload: payload === undefined ? undefined : (payload as Prisma.InputJsonValue)
    }
  });
}
