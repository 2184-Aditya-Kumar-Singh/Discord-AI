import type { ToolDefinition } from "./types.js";
import { channelTools } from "./discord/channelTools.js";
import { roleTools } from "./discord/roleTools.js";
import { moderationTools } from "./discord/moderationTools.js";
import { messagingTools } from "./discord/messagingTools.js";
import { informationTools } from "./discord/informationTools.js";
import { automationTools } from "./discord/automationTools.js";
import { workflowTools } from "./discord/workflowTools.js";

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition) {
    if (this.tools.has(tool.name)) throw new Error(`Duplicate tool registered: ${tool.name}`);
    this.tools.set(tool.name, tool);
  }

  get(name: string) {
    return this.tools.get(name);
  }

  list() {
    return [...this.tools.values()];
  }
}

export const toolRegistry = new ToolRegistry();

[...channelTools, ...roleTools, ...moderationTools, ...messagingTools, ...informationTools, ...automationTools, ...workflowTools].forEach((tool) =>
  toolRegistry.register(tool)
);
