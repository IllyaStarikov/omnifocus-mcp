import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OmniFocusClient } from "./omnifocus/client.js";
import { registerAllTools } from "./tools/index.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

export function createServer(): { server: McpServer; client: OmniFocusClient } {
  const server = new McpServer({
    name: "omnifocus-mcp-server",
    version,
  });

  const client = new OmniFocusClient();
  registerAllTools(server, client);
  registerResources(server, client);
  registerPrompts(server);

  return { server, client };
}
