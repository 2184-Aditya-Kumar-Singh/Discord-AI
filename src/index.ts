import { createDiscordClient } from "./bot/client.js";
import { prisma } from "./database/prisma.js";
import { logger } from "./utils/logger.js";

const client = createDiscordClient();

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

client.login();

async function shutdown() {
  logger.info("Shutting down DAIOS");
  client.destroy();
  await prisma.$disconnect();
  process.exit(0);
}
