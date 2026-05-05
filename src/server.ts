import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OmniFocusClient } from "./omnifocus/client.js";
import { registerAllTools } from "./tools/index.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const SERVER_INSTRUCTIONS = `OmniFocus MCP server. Reads and mutates the local OmniFocus database via Omni Automation; mutations are local-only until OmniFocus syncs.

Sync discipline:
- After ANY chain of mutations (creating, updating, completing, deleting, moving tasks/projects/folders/tags), call sync_database ONCE at the end of the chain to push changes to OmniSync and propagate them to other devices.
- This applies especially after batch_create_tasks, batch_complete_tasks, batch_delete_tasks, or any sequence of multiple individual mutations.
- Do NOT call sync_database after every single mutation — sync once at the end. Multiple back-to-back syncs are wasteful.
- Read-only operations (list_*, get_*, search, dump_database, get_*_summary) do NOT need a sync afterward.
- The batch_* tools also accept an optional 'sync: true' parameter as a shortcut that auto-syncs after the batch completes.`;

export function createServer(): { server: McpServer; client: OmniFocusClient } {
  const server = new McpServer(
    {
      name: "omnifocus-mcp-server",
      version,
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  const client = new OmniFocusClient();
  registerAllTools(server, client);
  registerResources(server, client);
  registerPrompts(server);

  return { server, client };
}
