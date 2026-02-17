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

  it("should list all 32 tools", async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name).sort();

    expect(toolNames).toEqual([
      "add_task_notification",
      "complete_project",
      "complete_task",
      "create_folder",
      "create_project",
      "create_tag",
      "create_task",
      "delete_folder",
      "delete_project",
      "delete_tag",
      "delete_task",
      "drop_task",
      "duplicate_tasks",
      "get_database_summary",
      "get_perspective_tasks",
      "get_project",
      "get_review_queue",
      "get_task",
      "list_folders",
      "list_perspectives",
      "list_projects",
      "list_tags",
      "list_tasks",
      "mark_reviewed",
      "move_tasks",
      "search",
      "set_task_tags",
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

    // Project tools
    expect(toolNames).toContain("list_projects");
    expect(toolNames).toContain("get_project");
    expect(toolNames).toContain("create_project");
    expect(toolNames).toContain("update_project");
    expect(toolNames).toContain("complete_project");
    expect(toolNames).toContain("delete_project");
    expect(toolNames).toContain("get_review_queue");
    expect(toolNames).toContain("mark_reviewed");

    // Folder tools
    expect(toolNames).toContain("list_folders");
    expect(toolNames).toContain("create_folder");
    expect(toolNames).toContain("update_folder");
    expect(toolNames).toContain("delete_folder");

    // Tag tools
    expect(toolNames).toContain("list_tags");
    expect(toolNames).toContain("create_tag");
    expect(toolNames).toContain("update_tag");
    expect(toolNames).toContain("delete_tag");

    // Perspective tools
    expect(toolNames).toContain("list_perspectives");
    expect(toolNames).toContain("get_perspective_tasks");
  });
});
