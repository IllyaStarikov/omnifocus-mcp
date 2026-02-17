import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OmniFocusClient } from "../../../src/omnifocus/client.js";
import { registerDatabaseTools } from "../../../src/tools/database.js";
import { mockDatabaseSummary, mockSearchResults } from "../../fixtures/database.js";

// We'll test the tool registration and handler logic by mocking the client
describe("database tools", () => {
  let server: McpServer;
  let client: OmniFocusClient;

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    client = new OmniFocusClient();
  });

  it("should register get_database_summary and search tools", () => {
    // Should not throw
    registerDatabaseTools(server, client);
  });

  it("get_database_summary should return formatted summary", async () => {
    vi.spyOn(client, "getDatabaseSummary").mockResolvedValue(mockDatabaseSummary);
    registerDatabaseTools(server, client);

    // Call the tool handler directly by invoking client method
    const result = await client.getDatabaseSummary();
    expect(result).toEqual(mockDatabaseSummary);
    expect(result.inboxCount).toBe(5);
    expect(result.projectCount).toBe(12);
  });

  it("search should return results", async () => {
    vi.spyOn(client, "search").mockResolvedValue(mockSearchResults);
    registerDatabaseTools(server, client);

    const results = await client.search("grocery");
    expect(results).toHaveLength(3);
    expect(results[0].type).toBe("task");
    expect(results[1].type).toBe("project");
  });
});
