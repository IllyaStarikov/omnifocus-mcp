import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../src/server.js";

describe("MCP Protocol Integration", () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const { server } = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client({ name: "test-client", version: "1.0.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    cleanup = async () => {
      await client.close();
      await server.close();
    };
  });

  afterAll(async () => {
    await cleanup();
  });

  it("should list all 51 tools", async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name).sort();

    expect(toolNames).toEqual([
      "add_task_notification",
      "append_task_note",
      "batch_complete_tasks",
      "batch_create_tasks",
      "batch_delete_tasks",
      "complete_project",
      "complete_task",
      "convert_task_to_project",
      "create_folder",
      "create_project",
      "create_tag",
      "create_task",
      "delete_folder",
      "delete_project",
      "delete_tag",
      "delete_task",
      "drop_project",
      "drop_task",
      "dump_database",
      "duplicate_tasks",
      "get_database_summary",
      "get_flagged_tasks",
      "get_folder",
      "get_inbox_tasks",
      "get_perspective_tasks",
      "get_project",
      "get_project_tasks",
      "get_review_queue",
      "get_tag",
      "get_task",
      "get_task_count",
      "get_today_completed_tasks",
      "list_folders",
      "list_perspectives",
      "list_projects",
      "list_tags",
      "list_task_notifications",
      "list_tasks",
      "mark_reviewed",
      "move_project",
      "move_tasks",
      "remove_task_notification",
      "save_database",
      "search",
      "set_task_tags",
      "sync_database",
      "uncomplete_task",
      "update_folder",
      "update_project",
      "update_tag",
      "update_task",
    ]);
  });

  it("should have descriptions for all tools", async () => {
    const result = await client.listTools();
    for (const tool of result.tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.description!.length).toBeGreaterThan(10);
    }
  });

  it("should have input schemas for tools that require parameters", async () => {
    const result = await client.listTools();
    const toolsWithParams = result.tools.filter((t) => {
      const schema = t.inputSchema as { properties?: Record<string, unknown> };
      return schema.properties && Object.keys(schema.properties).length > 0;
    });

    // Most tools have parameters
    expect(toolsWithParams.length).toBeGreaterThan(20);
  });

  it("should group tools by domain", async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name);

    // Database tools
    expect(toolNames).toContain("get_database_summary");
    expect(toolNames).toContain("search");
    expect(toolNames).toContain("dump_database");
    expect(toolNames).toContain("save_database");
    expect(toolNames).toContain("sync_database");

    // Task tools
    expect(toolNames).toContain("list_tasks");
    expect(toolNames).toContain("get_task");
    expect(toolNames).toContain("create_task");
    expect(toolNames).toContain("update_task");
    expect(toolNames).toContain("complete_task");
    expect(toolNames).toContain("uncomplete_task");
    expect(toolNames).toContain("drop_task");
    expect(toolNames).toContain("delete_task");
    expect(toolNames).toContain("move_tasks");
    expect(toolNames).toContain("duplicate_tasks");
    expect(toolNames).toContain("set_task_tags");
    expect(toolNames).toContain("add_task_notification");
    expect(toolNames).toContain("get_inbox_tasks");
    expect(toolNames).toContain("get_flagged_tasks");
    expect(toolNames).toContain("get_today_completed_tasks");
    expect(toolNames).toContain("append_task_note");
    expect(toolNames).toContain("batch_create_tasks");
    expect(toolNames).toContain("batch_delete_tasks");
    expect(toolNames).toContain("batch_complete_tasks");
    expect(toolNames).toContain("get_task_count");
    expect(toolNames).toContain("list_task_notifications");
    expect(toolNames).toContain("remove_task_notification");
    expect(toolNames).toContain("convert_task_to_project");

    // Project tools
    expect(toolNames).toContain("list_projects");
    expect(toolNames).toContain("get_project");
    expect(toolNames).toContain("create_project");
    expect(toolNames).toContain("update_project");
    expect(toolNames).toContain("complete_project");
    expect(toolNames).toContain("drop_project");
    expect(toolNames).toContain("move_project");
    expect(toolNames).toContain("delete_project");
    expect(toolNames).toContain("get_review_queue");
    expect(toolNames).toContain("mark_reviewed");
    expect(toolNames).toContain("get_project_tasks");

    // Folder tools
    expect(toolNames).toContain("list_folders");
    expect(toolNames).toContain("get_folder");
    expect(toolNames).toContain("create_folder");
    expect(toolNames).toContain("update_folder");
    expect(toolNames).toContain("delete_folder");

    // Tag tools
    expect(toolNames).toContain("list_tags");
    expect(toolNames).toContain("get_tag");
    expect(toolNames).toContain("create_tag");
    expect(toolNames).toContain("update_tag");
    expect(toolNames).toContain("delete_tag");

    // Perspective tools
    expect(toolNames).toContain("list_perspectives");
    expect(toolNames).toContain("get_perspective_tasks");
  });
});
