import { runOmniJSJson } from "./executor.js";
import { Cache } from "./cache.js";
import { config } from "../config.js";
import { buildDatabaseSummaryScript, buildSearchScript } from "./scripts/database.js";
import type { DatabaseSummaryJSON } from "../types/omnifocus.js";

export class OmniFocusClient {
  private cache = new Cache();

  // ─── Database ──────────────────────────────────────────────────────

  async getDatabaseSummary(): Promise<DatabaseSummaryJSON> {
    const cacheKey = "database:summary";
    const cached = this.cache.get<DatabaseSummaryJSON>(cacheKey);
    if (cached) return cached;

    const result = await runOmniJSJson<DatabaseSummaryJSON>(buildDatabaseSummaryScript());
    this.cache.set(cacheKey, result, config.cacheTTL.database);
    return result;
  }

  async search(query: string, limit = 50): Promise<Array<{ type: string; id: string; name: string; note?: string }>> {
    return runOmniJSJson(buildSearchScript(query, limit));
  }

  // ─── Cache management ─────────────────────────────────────────────

  invalidateCache(prefix?: string): void {
    if (prefix) {
      this.cache.invalidatePrefix(prefix);
    } else {
      this.cache.invalidateAll();
    }
  }
}
