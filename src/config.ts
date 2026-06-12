import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  GROQ_API_KEY: z.string().optional(),
  GROK_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  BOT_OWNER_ID: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().optional(),
  COMMAND_GUILD_ID: z.string().optional(),
  AI_PROVIDER: z.enum(["xai", "groq", "auto"]).default("groq"),
  GROK_MODEL: z.string().default("grok-4"),
  GROQ_MODEL: z.string().default("groq/compound"),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(700),
  AI_HISTORY_MESSAGES: z.coerce.number().int().min(0).max(10).default(4),
  AI_CHANNEL_IDS: z.string().default(""),
  APPROVAL_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(60),
  DAIOS_DRY_RUN: z.coerce.boolean().default(false),
  DAIOS_MAX_AGENT_CYCLES: z.coerce.number().int().min(1).max(6).default(3)
}).refine((env) => Boolean(env.GROQ_API_KEY || env.GROK_API_KEY), {
  message: "GROQ_API_KEY is required. GROK_API_KEY is accepted only as a legacy alias."
});

export const config = envSchema.parse(process.env);

export const aiChannelIds = new Set(
  config.AI_CHANNEL_IDS.split(",")
    .map((id) => id.trim())
    .filter(Boolean)
);
