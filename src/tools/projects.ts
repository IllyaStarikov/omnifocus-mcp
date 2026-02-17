import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OmniFocusClient } from "../omnifocus/client.js";
import { formatMcpError } from "../utils/errors.js";

export function registerProjectTools(server: McpServer, client: OmniFocusClient): void {
  server.tool(
    "list_projects",
    "List projects from OmniFocus with optional filters for status, folder, and text search",
    {
      status: z.enum(["active", "onHold", "done", "dropped"]).optional().describe("Filter by project status"),
      folderId: z.string().optional().describe("Filter by containing folder ID"),
      folderName: z.string().optional().describe("Filter by containing folder name"),
      search: z.string().optional().describe("Full-text search in project name and note"),
      limit: z.number().min(1).max(1000).optional().describe("Maximum results (default 100)"),
      offset: z.number().min(0).optional().describe("Skip this many results"),
    },
    async (args) => {
      try {
        const projects = await client.listProjects(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(projects, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "get_project",
    "Get detailed information about a specific project by ID or name",
    {
      idOrName: z.string().describe("The project ID or exact name"),
    },
    async ({ idOrName }) => {
      try {
        const project = await client.getProject(idOrName);
        return { content: [{ type: "text" as const, text: JSON.stringify(project, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "create_project",
    "Create a new project in OmniFocus",
    {
      name: z.string().describe("Project name"),
      note: z.string().optional().describe("Project note/description"),
      folderId: z.string().optional().describe("Parent folder ID"),
      folderName: z.string().optional().describe("Parent folder name"),
      sequential: z.boolean().optional().describe("Whether tasks must be completed in order"),
      singleActionList: z.boolean().optional().describe("Whether this is a single-action list"),
      deferDate: z.string().optional().describe("Defer date (ISO 8601)"),
      dueDate: z.string().optional().describe("Due date (ISO 8601)"),
      flagged: z.boolean().optional().describe("Whether to flag the project"),
      tags: z.array(z.string()).optional().describe("Tag names to apply"),
      reviewInterval: z
        .object({
          steps: z.number().describe("Number of units between reviews"),
          unit: z.string().describe("Unit: 'day', 'week', 'month', 'year'"),
        })
        .optional()
        .describe("Review interval"),
    },
    async (args) => {
      try {
        const project = await client.createProject(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(project, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "update_project",
    "Update properties of an existing project",
    {
      id: z.string().describe("The project ID"),
      name: z.string().optional().describe("New project name"),
      note: z.string().optional().describe("New project note"),
      status: z.enum(["active", "onHold", "done", "dropped"]).optional().describe("New project status"),
      sequential: z.boolean().optional().describe("Whether tasks must be completed in order"),
      deferDate: z.string().nullable().optional().describe("New defer date (ISO 8601) or null to clear"),
      dueDate: z.string().nullable().optional().describe("New due date (ISO 8601) or null to clear"),
      flagged: z.boolean().optional().describe("New flagged status"),
      reviewInterval: z
        .object({
          steps: z.number().describe("Number of units between reviews"),
          unit: z.string().describe("Unit: 'day', 'week', 'month', 'year'"),
        })
        .optional()
        .describe("New review interval"),
    },
    async (args) => {
      try {
        const project = await client.updateProject(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(project, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "complete_project",
    "Mark a project as completed (done)",
    {
      id: z.string().describe("The project ID to complete"),
    },
    async ({ id }) => {
      try {
        const project = await client.completeProject(id);
        return { content: [{ type: "text" as const, text: JSON.stringify(project, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "delete_project",
    "Permanently delete a project from OmniFocus",
    {
      id: z.string().describe("The project ID to delete"),
    },
    async ({ id }) => {
      try {
        const result = await client.deleteProject(id);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "get_review_queue",
    "Get projects that are due for review",
    {},
    async () => {
      try {
        const projects = await client.getReviewQueue();
        return { content: [{ type: "text" as const, text: JSON.stringify(projects, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "mark_reviewed",
    "Mark a project as reviewed, advancing its next review date",
    {
      id: z.string().describe("The project ID to mark as reviewed"),
    },
    async ({ id }) => {
      try {
        const project = await client.markReviewed(id);
        return { content: [{ type: "text" as const, text: JSON.stringify(project, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );
}
