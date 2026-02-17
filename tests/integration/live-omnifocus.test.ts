/**
 * Live integration tests that run against a real OmniFocus instance.
 * Skipped by default. Run with: OMNIFOCUS_LIVE=1 npm run test:integration
 *
 * These tests create test items prefixed with [TEST-{timestamp}] and clean up after.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { OmniFocusClient } from "../../src/omnifocus/client.js";

const LIVE = process.env.OMNIFOCUS_LIVE === "1";
const PREFIX = `[TEST-${Date.now()}]`;

describe.skipIf(!LIVE)("Live OmniFocus Tests", () => {
  let client: OmniFocusClient;
  const createdTaskIds: string[] = [];
  const createdProjectIds: string[] = [];
  const createdTagIds: string[] = [];
  const createdFolderIds: string[] = [];

  beforeAll(() => {
    client = new OmniFocusClient();
  });

  afterAll(async () => {
    // Clean up in reverse order
    for (const id of createdTaskIds) {
      try { await client.deleteTask(id); } catch { /* ignore */ }
    }
    for (const id of createdProjectIds) {
      try { await client.deleteProject(id); } catch { /* ignore */ }
    }
    for (const id of createdTagIds) {
      try { await client.deleteTag(id); } catch { /* ignore */ }
    }
    for (const id of createdFolderIds) {
      try { await client.deleteFolder(id); } catch { /* ignore */ }
    }
  });

  it("should get database summary", async () => {
    const summary = await client.getDatabaseSummary();
    expect(summary).toHaveProperty("inboxCount");
    expect(summary).toHaveProperty("projectCount");
    expect(typeof summary.inboxCount).toBe("number");
  });

  it("should create and get a task", async () => {
    const task = await client.createTask({ name: `${PREFIX} Test task` });
    createdTaskIds.push(task.id);

    expect(task.name).toContain(PREFIX);
    expect(task.inInbox).toBe(true);

    const fetched = await client.getTask(task.id);
    expect(fetched.id).toBe(task.id);
  });

  it("should create and get a project", async () => {
    const project = await client.createProject({ name: `${PREFIX} Test project` });
    createdProjectIds.push(project.id);

    expect(project.name).toContain(PREFIX);

    const fetched = await client.getProject(project.id);
    expect(fetched.id).toBe(project.id);
  });

  it("should create a task with tags", async () => {
    const tagName = `${PREFIX}-tag`;
    const task = await client.createTask({
      name: `${PREFIX} Tagged task`,
      tags: [tagName],
    });
    createdTaskIds.push(task.id);

    expect(task.tags.length).toBeGreaterThan(0);
    expect(task.tags[0].name).toBe(tagName);

    // Clean up the auto-created tag
    createdTagIds.push(task.tags[0].id);
  });

  it("should search for items", async () => {
    const results = await client.search(PREFIX);
    expect(results.length).toBeGreaterThan(0);
  });

  it("should list tags", async () => {
    const tags = await client.listTags();
    expect(Array.isArray(tags)).toBe(true);
  });

  it("should list folders", async () => {
    const folders = await client.listFolders();
    expect(Array.isArray(folders)).toBe(true);
  });

  it("should list perspectives", async () => {
    const perspectives = await client.listPerspectives();
    expect(Array.isArray(perspectives)).toBe(true);
  });
});
