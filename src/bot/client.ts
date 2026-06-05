import { Client, GatewayIntentBits, Partials } from "discord.js";
import { config } from "../config.js";
import { registerApprovalEvents } from "../approvals/approvalEvents.js";
import { setAutomationClient } from "../automations/automationEngine.js";
import { registerDiscordEvents } from "../events/registerEvents.js";
import { registerSlashCommandEvents, registerSlashCommands } from "./slashCommands.js";
import { logger } from "../utils/logger.js";
import { syncGuildKnowledge } from "../services/guildKnowledgeService.js";

export function createDiscordClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
  });

  client.once("ready", async () => {
    logger.info(`DAIOS online as ${client.user?.tag ?? "unknown bot"}`);
    await registerSlashCommands(client);
    for (const guild of client.guilds.cache.values()) {
      await syncGuildKnowledge(guild).catch((error) =>
        logger.warn("Failed to sync guild on startup", { guildId: guild.id, error: error instanceof Error ? error.message : String(error) })
      );
    }
  });

  registerDiscordEvents(client);
  registerApprovalEvents(client);
  registerSlashCommandEvents(client);
  setAutomationClient(client);

  const originalLogin = client.login.bind(client);
  client.login = () => originalLogin(config.DISCORD_TOKEN);

  return client;
}
