import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OmniFocusClient } from "./omnifocus/client.js";
import { registerAllTools } from "./tools/index.js";

export function createServer(): { server: McpServer; client: OmniFocusClient } {
  const server = new McpServer({
    name: "omnifocus-mcp",
    version: "1.0.0",
  });

  const client = new OmniFocusClient();
  registerAllTools(server, client);

  return { server, client };
}
