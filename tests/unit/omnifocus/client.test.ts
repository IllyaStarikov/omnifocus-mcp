import { describe, it, expect, vi, beforeEach } from "vitest";
import { OmniFocusClient } from "../../../src/omnifocus/client.js";
import { mockDatabaseSummary, mockSearchResults } from "../../fixtures/database.js";

// Mock the executor module
vi.mock("../../../src/omnifocus/executor.js", () => ({
  runOmniJS: vi.fn(),
  runOmniJSJson: vi.fn(),
}));

import { runOmniJSJson } from "../../../src/omnifocus/executor.js";
const mockRunOmniJSJson = vi.mocked(runOmniJSJson);

describe("OmniFocusClient", () => {
  let client: OmniFocusClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OmniFocusClient();
  });

  describe("getDatabaseSummary", () => {
    it("should return database summary from executor", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      const result = await client.getDatabaseSummary();
      expect(result).toEqual(mockDatabaseSummary);
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(1);
    });

    it("should cache database summary", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();
      await client.getDatabaseSummary();
      // Should only call executor once due to caching
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(1);
    });

    it("should refresh after cache invalidation", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();
      client.invalidateCache("database:");
      await client.getDatabaseSummary();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(2);
    });
  });

  describe("search", () => {
    it("should return search results", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockSearchResults);
      const results = await client.search("grocery");
      expect(results).toHaveLength(3);
    });

    it("should pass limit to executor", async () => {
      mockRunOmniJSJson.mockResolvedValue([]);
      await client.search("test", 10);
      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("10");
    });
  });
});
