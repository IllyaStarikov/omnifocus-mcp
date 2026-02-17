import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OmniFocusClient } from "../omnifocus/client.js";
import { formatMcpError } from "../utils/errors.js";

export function registerDatabaseTools(server: McpServer, client: OmniFocusClient): void {
  server.tool(
    "get_database_summary",
    "Get a summary of the OmniFocus database including counts of inbox items, projects, tags, folders, available/due-soon/overdue/flagged tasks",
    {},
    async () => {
      try {
        const summary = await client.getDatabaseSummary();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
        };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "search",
    "Search across all OmniFocus items (tasks, projects, folders, tags) by name or note content",
    {
      query: z.string().describe("Search query string"),
      limit: z.number().min(1).max(200).optional().describe("Maximum number of results (default 50)"),
    },
    async ({ query, limit }) => {
      try {
        const results = await client.search(query, limit);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
        };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );
}
