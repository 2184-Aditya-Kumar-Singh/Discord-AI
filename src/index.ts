import { createDiscordClient } from "./bot/client.js";
import { prisma } from "./database/prisma.js";
import { logger } from "./utils/logger.js";

const client = createDiscordClient();

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection", { error: error instanceof Error ? error.message : String(error) });
});
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error: error.message, stack: error.stack });
  process.exit(1);
});

await start();

async function start() {
  try {
    logger.info("Starting DAIOS Discord bot");
    await prisma.$connect();
    logger.info("Database connected");
    await client.login();
    logger.info("Discord gateway login started");
  } catch (error) {
    logger.error("DAIOS startup failed", { error: error instanceof Error ? error.message : String(error) });
    await prisma.$disconnect().catch(() => null);
    process.exit(1);
  }
}

async function shutdown() {
  logger.info("Shutting down DAIOS");
  client.destroy();
  await prisma.$disconnect();
  process.exit(0);
}
