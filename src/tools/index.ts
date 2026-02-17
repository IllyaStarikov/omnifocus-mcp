import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OmniFocusClient } from "../omnifocus/client.js";
import { registerDatabaseTools } from "./database.js";
import { registerTaskTools } from "./tasks.js";
import { registerProjectTools } from "./projects.js";

export function registerAllTools(server: McpServer, client: OmniFocusClient): void {
  registerDatabaseTools(server, client);
  registerTaskTools(server, client);
  registerProjectTools(server, client);
}
