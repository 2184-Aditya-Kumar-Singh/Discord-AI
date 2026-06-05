import { prisma } from "../database/prisma.js";
import { Prisma } from "@prisma/client";
import { runAutomationsForEvent } from "../automations/automationEngine.js";

export async function logEvent(
  guildId: string,
  type: string,
  input: { actorId?: string; subjectId?: string; payload: Record<string, unknown> }
) {
  await prisma.eventLog.create({
    data: {
      guildId,
      type,
      actorId: input.actorId,
      subjectId: input.subjectId,
      payload: input.payload as Prisma.InputJsonValue
    }
  });
  await runAutomationsForEvent(guildId, type, input).catch(() => null);
}
