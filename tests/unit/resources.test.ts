import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../src/server.js";
import { mockDatabaseSummary } from "../fixtures/database.js";
import { mockPerspectiveList } from "../fixtures/perspectives.js";

vi.mock("../../src/omnifocus/executor.js", () => ({
  runOmniJS: vi.fn(),
  runOmniJSJson: vi.fn(),
  runJXA: vi.fn(),
  runJXAJson: vi.fn(),
}));

import { runOmniJSJson } from "../../src/omnifocus/executor.js";
const mockRunOmniJSJson = vi.mocked(runOmniJSJson);

describe("MCP Resources", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("should list registered resources", async () => {
    const result = await client.listResources();
    const uris = result.resources.map((r) => r.uri);
    expect(uris).toContain("omnifocus://database/summary");
    expect(uris).toContain("omnifocus://perspectives");
  });

  it("should read database-summary resource", async () => {
    mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
    const result = await client.readResource({ uri: "omnifocus://database/summary" });
    const content = result.contents[0] as { uri: string; text: string; mimeType?: string };
    expect(content.uri).toBe("omnifocus://database/summary");
    expect(content.mimeType).toBe("application/json");
    const parsed = JSON.parse(content.text);
    expect(parsed.inboxCount).toBe(5);
    expect(parsed.projectCount).toBe(12);
  });

  it("should read perspectives resource", async () => {
    mockRunOmniJSJson.mockResolvedValue(mockPerspectiveList);
    const result = await client.readResource({ uri: "omnifocus://perspectives" });
    const content = result.contents[0] as { uri: string; text: string; mimeType?: string };
    expect(content.uri).toBe("omnifocus://perspectives");
    expect(content.mimeType).toBe("application/json");
    const parsed = JSON.parse(content.text);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].name).toBe("Due Soon");
  });
});
