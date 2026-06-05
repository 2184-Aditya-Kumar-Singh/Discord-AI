import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  GROK_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  BOT_OWNER_ID: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().optional(),
  COMMAND_GUILD_ID: z.string().optional(),
  AI_PROVIDER: z.enum(["xai", "groq", "auto"]).default("auto"),
  GROK_MODEL: z.string().default("grok-4"),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  AI_CHANNEL_IDS: z.string().default(""),
  APPROVAL_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(60)
});

export const config = envSchema.parse(process.env);

export const aiChannelIds = new Set(
  config.AI_CHANNEL_IDS.split(",")
    .map((id) => id.trim())
    .filter(Boolean)
);
