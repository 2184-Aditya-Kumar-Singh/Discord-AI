import { config } from "../config.js";
import { logger } from "../utils/logger.js";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function grokChat(messages: ChatMessage[]) {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.GROK_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.GROK_MODEL,
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error("Grok API failed", { status: response.status, body });
    throw new Error(`Grok API failed with ${response.status}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "{}";
}
