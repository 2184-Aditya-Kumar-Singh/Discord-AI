import { config } from "../config.js";
import { logger } from "../utils/logger.js";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export class GrokApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string
  ) {
    super(message);
    this.name = "GrokApiError";
  }
}

export async function grokChat(messages: ChatMessage[]) {
  const provider = resolveProvider();
  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.GROK_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error("AI provider API failed", { provider: provider.name, status: response.status, body });
    throw new GrokApiError(`${provider.name} API failed with ${response.status}`, response.status, body);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "{}";
}

function resolveProvider() {
  const provider = config.AI_PROVIDER === "auto" ? (config.GROK_API_KEY.startsWith("gsk_") ? "groq" : "xai") : config.AI_PROVIDER;
  if (provider === "groq") {
    return {
      name: "Groq",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      model: config.GROQ_MODEL
    };
  }

  return {
    name: "xAI",
    endpoint: "https://api.x.ai/v1/chat/completions",
    model: config.GROK_MODEL
  };
}
