import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../../src/server.js";
import { mockTask, mockTaskList, mockInboxTask, mockCompletedTask } from "../../fixtures/tasks.js";
import { mockDatabaseDump, mockDatabaseSummary, mockSearchResults } from "../../fixtures/database.js";
import { mockProject, mockProjectList } from "../../fixtures/projects.js";
import { mockFolder, mockFolderWithChildren } from "../../fixtures/folders.js";
import { mockTag, mockTagWithChildren } from "../../fixtures/tags.js";
import { mockAbsoluteNotification, mockDueRelativeNotification } from "../../fixtures/notifications.js";
import { mockPerspectiveList } from "../../fixtures/perspectives.js";
import { NotRunningError, ScriptError, TimeoutError } from "../../../src/utils/errors.js";

// Mock the executor module so no real OmniFocus calls are made
vi.mock("../../../src/omnifocus/executor.js", () => ({
  runOmniJS: vi.fn(),
  runOmniJSJson: vi.fn(),
}));

import { runOmniJSJson } from "../../../src/omnifocus/executor.js";
const mockRunOmniJSJson = vi.mocked(runOmniJSJson);

describe("Tool handler tests via MCP protocol", () => {
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

  // ─── Helper ───────────────────────────────────────────────────────

  function parseResult(result: any) {
    const content = result.content as Array<{ type: string; text: string }>;
    expect(result.isError).toBeFalsy();
    expect(content[0].type).toBe("text");
    return JSON.parse(content[0].text);
  }

  // ─── Database tools ───────────────────────────────────────────────

  describe("get_database_summary", () => {
    it("should return database summary", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      const result = await client.callTool({ name: "get_database_summary", arguments: {} });
      const parsed = parseResult(result);
      expect(parsed.inboxCount).toBe(5);
      expect(parsed.availableTaskCount).toBe(42);
    });
  });

  describe("search", () => {
    it("should search with query and limit", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockSearchResults);
      const result = await client.callTool({
        name: "search",
        arguments: { query: "grocery", limit: 10 },
      });
      const parsed = parseResult(result);
      expect(parsed).toHaveLength(3);
      expect(parsed[0].type).toBe("task");

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("grocery");
      expect(scriptArg).toContain("10");
    });
  });

  describe("save_database", () => {
    it("should return saved status", async () => {
      mockRunOmniJSJson.mockResolvedValue({ saved: true });
      const result = await client.callTool({ name: "save_database", arguments: {} });
      const parsed = parseResult(result);
      expect(parsed.saved).toBe(true);
    });
  });

  describe("dump_database", () => {
    it("should pass includeCompleted option", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseDump);
      await client.callTool({
        name: "dump_database",
        arguments: { includeCompleted: true },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("includeCompleted");
    });

    it("should pass hideRecurringDuplicates option", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseDump);
      await client.callTool({
        name: "dump_database",
        arguments: { hideRecurringDuplicates: true },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("hideRecurringDuplicates");
    });

    it("should pass maxDepth option", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseDump);
      await client.callTool({
        name: "dump_database",
        arguments: { maxDepth: 2 },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("maxDepth");
    });
  });

  // ─── Task tools ───────────────────────────────────────────────────

  describe("list_tasks", () => {
    it("should list tasks with date filters", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      const result = await client.callTool({
        name: "list_tasks",
        arguments: {
          dueAfter: "2024-01-01T00:00:00Z",
          dueBefore: "2024-12-31T23:59:59Z",
          deferAfter: "2024-01-01T00:00:00Z",
          deferBefore: "2024-06-01T00:00:00Z",
          plannedAfter: "2024-01-01T00:00:00Z",
          plannedBefore: "2024-06-01T00:00:00Z",
        },
      });
      const parsed = parseResult(result);
      expect(Array.isArray(parsed)).toBe(true);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("dueAfter");
      expect(scriptArg).toContain("dueBefore");
      expect(scriptArg).toContain("deferAfter");
      expect(scriptArg).toContain("deferBefore");
      expect(scriptArg).toContain("plannedAfter");
      expect(scriptArg).toContain("plannedBefore");
    });

    it("should list tasks with taskStatus filter", async () => {
      mockRunOmniJSJson.mockResolvedValue([]);
      await client.callTool({
        name: "list_tasks",
        arguments: { taskStatus: "remaining" },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("remaining");
    });

    it("should list tasks with search text", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTask]);
      await client.callTool({
        name: "list_tasks",
        arguments: { search: "groceries" },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("groceries");
    });

    it("should list tasks with projectId filter", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTask]);
      await client.callTool({
        name: "list_tasks",
        arguments: { projectId: "proj-123" },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("proj-123");
    });

    it("should list tasks with tagNames filter", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTask]);
      await client.callTool({
        name: "list_tasks",
        arguments: { tagNames: ["work", "urgent"] },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("work");
      expect(scriptArg).toContain("urgent");
    });

    it("should list tasks with pagination", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTask]);
      await client.callTool({
        name: "list_tasks",
        arguments: { limit: 10, offset: 5 },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("10");
      expect(scriptArg).toContain("5");
    });
  });

  describe("get_task", () => {
    it("should get task by ID", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      const result = await client.callTool({
        name: "get_task",
        arguments: { id: "task-abc-123" },
      });
      const parsed = parseResult(result);
      expect(parsed.id).toBe("task-abc-123");
    });

    it("should get task with children", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockTask, children: [] });
      await client.callTool({
        name: "get_task",
        arguments: { id: "task-abc-123", includeChildren: true },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("serializeTaskWithChildren");
    });

    it("should get task with maxDepth", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockTask, children: [] });
      await client.callTool({
        name: "get_task",
        arguments: { id: "task-abc-123", includeChildren: true, maxDepth: 3 },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("3");
    });
  });

  describe("get_inbox_tasks", () => {
    it("should pass taskStatus 'available' to filter out completed/dropped (Bug 5 regression)", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockInboxTask]);
      const result = await client.callTool({ name: "get_inbox_tasks", arguments: {} });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("taskStatus");
      expect(scriptArg).toContain("available");
      expect(scriptArg).toContain("inInbox");

      const parsed = parseResult(result);
      expect(parsed).toHaveLength(1);
    });
  });

  describe("get_flagged_tasks", () => {
    it("should pass flagged: true and taskStatus: 'available'", async () => {
      mockRunOmniJSJson.mockResolvedValue([]);
      await client.callTool({ name: "get_flagged_tasks", arguments: {} });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("flagged");
      expect(scriptArg).toContain("taskStatus");
      expect(scriptArg).toContain("available");
    });
  });

  describe("get_today_completed_tasks", () => {
    it("should return today's completed tasks", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockCompletedTask]);
      const result = await client.callTool({ name: "get_today_completed_tasks", arguments: {} });
      const parsed = parseResult(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].completed).toBe(true);
    });
  });

  describe("create_task", () => {
    it("should create task with all optional params", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      const result = await client.callTool({
        name: "create_task",
        arguments: {
          name: "Test task",
          note: "Some notes",
          flagged: true,
          deferDate: "2024-01-01T00:00:00Z",
          dueDate: "2024-12-31T23:59:59Z",
          plannedDate: "2024-06-15T12:00:00Z",
          estimatedMinutes: 30,
          projectId: "proj-1",
          tags: ["work", "urgent"],
        },
      });

      const parsed = parseResult(result);
      expect(parsed.id).toBe("task-abc-123");
      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("plannedDate");
    });

    it("should create task with repetitionRule", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      await client.callTool({
        name: "create_task",
        arguments: {
          name: "Weekly review",
          repetitionRule: { ruleString: "FREQ=WEEKLY;INTERVAL=1", method: "fixed" },
        },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("FREQ=WEEKLY");
      expect(scriptArg).toContain("RepetitionRule");
    });
  });

  describe("update_task", () => {
    it("should update task fields", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockTask, name: "Updated" });
      const result = await client.callTool({
        name: "update_task",
        arguments: { id: "task-abc-123", name: "Updated", flagged: true },
      });
      const parsed = parseResult(result);
      expect(parsed.name).toBe("Updated");
    });

    it("should update task with repetitionRule", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      await client.callTool({
        name: "update_task",
        arguments: {
          id: "task-abc-123",
          repetitionRule: { ruleString: "FREQ=DAILY", method: "startAfterCompletion" },
        },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("FREQ=DAILY");
      expect(scriptArg).toContain("startAfterCompletion");
    });

    it("should clear dates with null", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockTask, dueDate: null });
      await client.callTool({
        name: "update_task",
        arguments: { id: "task-abc-123", dueDate: null },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("dueDate");
    });

    it("should clear plannedDate with null", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockTask, plannedDate: null });
      await client.callTool({
        name: "update_task",
        arguments: { id: "task-abc-123", plannedDate: null },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("plannedDate");
    });
  });

  describe("complete_task", () => {
    it("should complete a task", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockCompletedTask);
      const result = await client.callTool({
        name: "complete_task",
        arguments: { id: "task-abc-123" },
      });
      const parsed = parseResult(result);
      expect(parsed.completed).toBe(true);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("markComplete");
    });
  });

  describe("uncomplete_task", () => {
    it("should uncomplete a task", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockCompletedTask, completed: false });
      const result = await client.callTool({
        name: "uncomplete_task",
        arguments: { id: "task-completed-1" },
      });
      const parsed = parseResult(result);
      expect(parsed.completed).toBe(false);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("markIncomplete");
    });
  });

  describe("drop_task", () => {
    it("should drop a task", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockTask, dropped: true });
      const result = await client.callTool({
        name: "drop_task",
        arguments: { id: "task-abc-123" },
      });
      const parsed = parseResult(result);
      expect(parsed.dropped).toBe(true);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("drop(false)");
    });
  });

  describe("delete_task", () => {
    it("should delete a task", async () => {
      mockRunOmniJSJson.mockResolvedValue({ deleted: true, id: "task-abc-123" });
      const result = await client.callTool({
        name: "delete_task",
        arguments: { id: "task-abc-123" },
      });
      const parsed = parseResult(result);
      expect(parsed.deleted).toBe(true);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("deleteObject");
    });
  });

  describe("move_tasks", () => {
    it("should move tasks to a project by ID", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTask]);
      const result = await client.callTool({
        name: "move_tasks",
        arguments: { taskIds: ["task-1"], projectId: "proj-123" },
      });
      parseResult(result);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("proj-123");
      expect(scriptArg).toContain("moveTasks");
    });

    it("should move tasks to a parent task", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTask]);
      await client.callTool({
        name: "move_tasks",
        arguments: { taskIds: ["task-1"], parentTaskId: "task-parent" },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("task-parent");
    });

    it("should move tasks to inbox when no destination", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTask]);
      await client.callTool({
        name: "move_tasks",
        arguments: { taskIds: ["task-1"] },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("inbox.ending");
    });
  });

  describe("duplicate_tasks", () => {
    it("should duplicate tasks", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTask]);
      const result = await client.callTool({
        name: "duplicate_tasks",
        arguments: { taskIds: ["task-1"], projectId: "proj-123" },
      });
      const parsed = parseResult(result);
      expect(parsed).toHaveLength(1);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("duplicateTasks");
      expect(scriptArg).toContain("proj-123");
    });
  });

  describe("set_task_tags", () => {
    it("should replace tags", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      await client.callTool({
        name: "set_task_tags",
        arguments: { taskId: "task-1", tagNames: ["work"], mode: "replace" },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("clearTags");
      expect(scriptArg).toContain("addTag");
    });

    it("should add tags", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      await client.callTool({
        name: "set_task_tags",
        arguments: { taskId: "task-1", tagNames: ["new-tag"], mode: "add" },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("addTag");
      expect(scriptArg).toContain("findOrCreateTag");
    });

    it("should remove tags", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      await client.callTool({
        name: "set_task_tags",
        arguments: { taskId: "task-1", tagNames: ["old-tag"], mode: "remove" },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("removeTag");
    });
  });

  describe("add_task_notification", () => {
    it("should add absolute notification", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      const result = await client.callTool({
        name: "add_task_notification",
        arguments: {
          taskId: "task-abc-123",
          type: "absolute",
          absoluteDate: "2024-12-20T09:00:00Z",
        },
      });
      parseResult(result);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("absolute");
      expect(scriptArg).toContain("addNotification");
    });

    it("should add dueRelative notification", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      await client.callTool({
        name: "add_task_notification",
        arguments: {
          taskId: "task-abc-123",
          type: "dueRelative",
          relativeOffset: -3600,
        },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("dueRelative");
      expect(scriptArg).toContain("-3600");
    });
  });

  describe("append_task_note", () => {
    it("should append text to task note", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      const result = await client.callTool({
        name: "append_task_note",
        arguments: { taskId: "task-abc-123", text: "Extra text" },
      });
      parseResult(result);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("Extra text");
      expect(scriptArg).toContain("appendStringToNote");
    });
  });

  describe("list_task_notifications", () => {
    it("should list notifications for a task", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockAbsoluteNotification, mockDueRelativeNotification]);
      const result = await client.callTool({
        name: "list_task_notifications",
        arguments: { taskId: "task-abc-123" },
      });
      const parsed = parseResult(result);
      expect(parsed).toHaveLength(2);
    });
  });

  describe("remove_task_notification", () => {
    it("should remove a notification", async () => {
      mockRunOmniJSJson.mockResolvedValue({ removed: true, taskId: "task-abc-123", notificationId: "notif-1" });
      const result = await client.callTool({
        name: "remove_task_notification",
        arguments: { taskId: "task-abc-123", notificationId: "notif-1" },
      });
      const parsed = parseResult(result);
      expect(parsed.removed).toBe(true);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("removeNotification");
    });
  });

  describe("convert_task_to_project", () => {
    it("should convert task to project", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProject);
      const result = await client.callTool({
        name: "convert_task_to_project",
        arguments: { taskId: "task-abc-123" },
      });
      const parsed = parseResult(result);
      expect(parsed.id).toBe("proj-abc-123");

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("convertTasksToProjects");
    });
  });

  describe("batch_create_tasks", () => {
    it("should create nested task hierarchy", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      const result = await client.callTool({
        name: "batch_create_tasks",
        arguments: {
          tasks: [
            {
              name: "Parent task",
              children: [
                { name: "Child 1" },
                { name: "Child 2" },
              ],
            },
          ],
          projectId: "proj-1",
        },
      });

      expect(result.isError).toBeFalsy();
      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("createTaskFromItem");
      expect(scriptArg).toContain("proj-1");
    });

    it("should create tasks under parent task", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTask]);
      await client.callTool({
        name: "batch_create_tasks",
        arguments: {
          tasks: [{ name: "Subtask" }],
          parentTaskId: "task-parent",
        },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("task-parent");
    });
  });

  describe("batch_delete_tasks", () => {
    it("should delete multiple tasks", async () => {
      mockRunOmniJSJson.mockResolvedValue([
        { deleted: true, id: "task-1" },
        { deleted: true, id: "task-2" },
      ]);
      const result = await client.callTool({
        name: "batch_delete_tasks",
        arguments: { taskIds: ["task-1", "task-2"] },
      });

      const parsed = parseResult(result);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].deleted).toBe(true);
    });
  });

  describe("batch_complete_tasks", () => {
    it("should complete multiple tasks", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockCompletedTask]);
      const result = await client.callTool({
        name: "batch_complete_tasks",
        arguments: { taskIds: ["task-1"] },
      });

      expect(result.isError).toBeFalsy();
      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("markComplete");
    });
  });

  describe("get_task_count", () => {
    it("should return count matching filters", async () => {
      mockRunOmniJSJson.mockResolvedValue({ count: 15 });
      const result = await client.callTool({
        name: "get_task_count",
        arguments: { flagged: true, taskStatus: "available" },
      });

      const parsed = parseResult(result);
      expect(parsed.count).toBe(15);
    });

    it("should return count with date filters", async () => {
      mockRunOmniJSJson.mockResolvedValue({ count: 3 });
      await client.callTool({
        name: "get_task_count",
        arguments: { dueAfter: "2024-01-01T00:00:00Z", dueBefore: "2024-12-31T23:59:59Z" },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("dueAfter");
      expect(scriptArg).toContain("dueBefore");
    });

    it("should return count with planned date filters", async () => {
      mockRunOmniJSJson.mockResolvedValue({ count: 2 });
      await client.callTool({
        name: "get_task_count",
        arguments: { plannedAfter: "2024-01-01T00:00:00Z", plannedBefore: "2024-12-31T23:59:59Z" },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("plannedAfter");
      expect(scriptArg).toContain("plannedBefore");
    });
  });

  // ─── Project tools ────────────────────────────────────────────────

  describe("list_projects", () => {
    it("should list projects with no filters", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProjectList);
      const result = await client.callTool({ name: "list_projects", arguments: {} });
      const parsed = parseResult(result);
      expect(parsed).toHaveLength(2);
    });

    it("should list projects with status filter", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockProject]);
      await client.callTool({
        name: "list_projects",
        arguments: { status: "active" },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("Project.Status.Active");
    });

    it("should list projects with search and offset", async () => {
      mockRunOmniJSJson.mockResolvedValue([]);
      await client.callTool({
        name: "list_projects",
        arguments: { search: "test", offset: 10, limit: 5 },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("test");
      expect(scriptArg).toContain("10");
      expect(scriptArg).toContain("5");
    });
  });

  describe("get_project", () => {
    it("should get project by ID or name", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProject);
      const result = await client.callTool({
        name: "get_project",
        arguments: { idOrName: "proj-abc-123" },
      });
      const parsed = parseResult(result);
      expect(parsed.id).toBe("proj-abc-123");
      expect(parsed.name).toBe("Household");
    });
  });

  describe("get_project_tasks", () => {
    it("should get tasks for a project", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      const result = await client.callTool({
        name: "get_project_tasks",
        arguments: { projectId: "proj-abc-123" },
      });
      const parsed = parseResult(result);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it("should include completed tasks when requested", async () => {
      mockRunOmniJSJson.mockResolvedValue([]);
      await client.callTool({
        name: "get_project_tasks",
        arguments: { projectId: "proj-abc-123", includeCompleted: true },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("includeCompleted");
    });
  });

  describe("get_review_queue", () => {
    it("should return projects due for review", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockProject]);
      const result = await client.callTool({ name: "get_review_queue", arguments: {} });
      const parsed = parseResult(result);
      expect(Array.isArray(parsed)).toBe(true);
    });
  });

  describe("create_project", () => {
    it("should create project with name", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProject);
      const result = await client.callTool({
        name: "create_project",
        arguments: { name: "New Project" },
      });
      const parsed = parseResult(result);
      expect(parsed.id).toBe("proj-abc-123");
    });

    it("should create project with reviewInterval", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProject);
      await client.callTool({
        name: "create_project",
        arguments: {
          name: "Reviewed Project",
          reviewInterval: { steps: 2, unit: "week" },
        },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("reviewInterval");
      expect(scriptArg).toContain("ri.steps = args.reviewInterval.steps");
    });

    it("should create project with all options", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProject);
      await client.callTool({
        name: "create_project",
        arguments: {
          name: "Full Project",
          note: "Notes",
          sequential: true,
          singleActionList: false,
          flagged: true,
          folderId: "folder-1",
          tags: ["work"],
        },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("Full Project");
      expect(scriptArg).toContain("sequential");
      expect(scriptArg).toContain("folder-1");
    });
  });

  describe("update_project", () => {
    it("should update project properties", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockProject, name: "Updated" });
      const result = await client.callTool({
        name: "update_project",
        arguments: { id: "proj-abc-123", name: "Updated", status: "onHold" },
      });
      const parsed = parseResult(result);
      expect(parsed.name).toBe("Updated");

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("Project.Status.OnHold");
    });
  });

  describe("complete_project", () => {
    it("should complete a project", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockProject, status: "done", completed: true });
      const result = await client.callTool({
        name: "complete_project",
        arguments: { id: "proj-abc-123" },
      });
      const parsed = parseResult(result);
      expect(parsed.status).toBe("done");

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("Project.Status.Done");
    });
  });

  describe("drop_project", () => {
    it("should drop a project", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockProject, status: "dropped" });
      const result = await client.callTool({
        name: "drop_project",
        arguments: { id: "proj-abc-123" },
      });
      const parsed = parseResult(result);
      expect(parsed.status).toBe("dropped");

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("Project.Status.Dropped");
    });
  });

  describe("move_project", () => {
    it("should move project to folder", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProject);
      const result = await client.callTool({
        name: "move_project",
        arguments: { projectId: "proj-abc-123", folderId: "folder-2" },
      });
      parseResult(result);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("proj-abc-123");
      expect(scriptArg).toContain("folder-2");
      expect(scriptArg).toContain("moveSections");
    });
  });

  describe("delete_project", () => {
    it("should delete a project", async () => {
      mockRunOmniJSJson.mockResolvedValue({ deleted: true, id: "proj-abc-123" });
      const result = await client.callTool({
        name: "delete_project",
        arguments: { id: "proj-abc-123" },
      });
      const parsed = parseResult(result);
      expect(parsed.deleted).toBe(true);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("deleteObject");
    });
  });

  describe("mark_reviewed", () => {
    it("should mark project as reviewed", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockProject, lastReviewDate: "2024-12-15T00:00:00.000Z" });
      const result = await client.callTool({
        name: "mark_reviewed",
        arguments: { id: "proj-abc-123" },
      });
      const parsed = parseResult(result);
      expect(parsed.lastReviewDate).toBeTruthy();

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("lastReviewDate");
    });
  });

  // ─── Folder tools ─────────────────────────────────────────────────

  describe("list_folders", () => {
    it("should list all folders", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockFolder]);
      const result = await client.callTool({ name: "list_folders", arguments: {} });
      const parsed = parseResult(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe("Personal");
    });
  });

  describe("get_folder", () => {
    it("should get folder with children", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockFolderWithChildren);
      const result = await client.callTool({
        name: "get_folder",
        arguments: { id: "folder-1" },
      });
      const parsed = parseResult(result);
      expect(parsed.id).toBe("folder-1");
      expect(parsed.childFolders).toHaveLength(1);
    });
  });

  describe("create_folder", () => {
    it("should create a folder", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockFolder);
      const result = await client.callTool({
        name: "create_folder",
        arguments: { name: "New Folder" },
      });
      const parsed = parseResult(result);
      expect(parsed.name).toBe("Personal");

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("New Folder");
      expect(scriptArg).toContain("new Folder");
    });

    it("should create folder with parent", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockFolder);
      await client.callTool({
        name: "create_folder",
        arguments: { name: "Sub", parentFolderId: "folder-1" },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("folder-1");
    });
  });

  describe("update_folder", () => {
    it("should update folder properties", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockFolder, name: "Renamed" });
      const result = await client.callTool({
        name: "update_folder",
        arguments: { id: "folder-1", name: "Renamed" },
      });
      const parsed = parseResult(result);
      expect(parsed.name).toBe("Renamed");
    });

    it("should update folder status", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockFolder);
      await client.callTool({
        name: "update_folder",
        arguments: { id: "folder-1", status: "dropped" },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("Folder.Status.Dropped");
    });
  });

  describe("delete_folder", () => {
    it("should delete a folder", async () => {
      mockRunOmniJSJson.mockResolvedValue({ deleted: true, id: "folder-1" });
      const result = await client.callTool({
        name: "delete_folder",
        arguments: { id: "folder-1" },
      });
      const parsed = parseResult(result);
      expect(parsed.deleted).toBe(true);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("deleteObject");
    });
  });

  // ─── Tag tools ────────────────────────────────────────────────────

  describe("list_tags", () => {
    it("should list all tags", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTag]);
      const result = await client.callTool({ name: "list_tags", arguments: {} });
      const parsed = parseResult(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe("errands");
    });
  });

  describe("get_tag", () => {
    it("should get tag with children", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTagWithChildren);
      const result = await client.callTool({
        name: "get_tag",
        arguments: { id: "tag-1" },
      });
      const parsed = parseResult(result);
      expect(parsed.id).toBe("tag-1");
      expect(parsed.childTags).toHaveLength(1);
    });
  });

  describe("create_tag", () => {
    it("should create a tag", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTag);
      const result = await client.callTool({
        name: "create_tag",
        arguments: { name: "New Tag" },
      });
      const parsed = parseResult(result);
      expect(parsed.name).toBe("errands");

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("New Tag");
      expect(scriptArg).toContain("new Tag");
    });

    it("should create tag with parent and options", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTag);
      await client.callTool({
        name: "create_tag",
        arguments: {
          name: "Sub",
          parentTagId: "tag-1",
          allowsNextAction: false,
          status: "onHold",
        },
      });

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("tag-1");
      expect(scriptArg).toContain("allowsNextAction");
      expect(scriptArg).toContain("Tag.Status.OnHold");
    });
  });

  describe("update_tag", () => {
    it("should update tag properties", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockTag, name: "Renamed" });
      const result = await client.callTool({
        name: "update_tag",
        arguments: { id: "tag-1", name: "Renamed", status: "dropped" },
      });
      const parsed = parseResult(result);
      expect(parsed.name).toBe("Renamed");

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("Tag.Status.Dropped");
    });
  });

  describe("delete_tag", () => {
    it("should delete a tag", async () => {
      mockRunOmniJSJson.mockResolvedValue({ deleted: true, id: "tag-1" });
      const result = await client.callTool({
        name: "delete_tag",
        arguments: { id: "tag-1" },
      });
      const parsed = parseResult(result);
      expect(parsed.deleted).toBe(true);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("deleteObject");
    });
  });

  // ─── Perspective tools ────────────────────────────────────────────

  describe("list_perspectives", () => {
    it("should list perspectives", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockPerspectiveList);
      const result = await client.callTool({ name: "list_perspectives", arguments: {} });
      const parsed = parseResult(result);
      expect(parsed).toHaveLength(3);
      expect(parsed[0].name).toBe("Due Soon");
    });

    it("does not accept legacy includeBuiltIn/includeCustom args", async () => {
      const tools = await client.listTools();
      const listPerspectives = tools.tools.find((t) => t.name === "list_perspectives");
      expect(listPerspectives).toBeDefined();
      const props = (listPerspectives!.inputSchema as { properties?: Record<string, unknown> }).properties ?? {};
      expect(Object.keys(props)).not.toContain("includeBuiltIn");
      expect(Object.keys(props)).not.toContain("includeCustom");
    });
  });

  describe("get_perspective_tasks", () => {
    it("should get tasks from a perspective", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      const result = await client.callTool({
        name: "get_perspective_tasks",
        arguments: { name: "Due Soon" },
      });
      const parsed = parseResult(result);
      expect(Array.isArray(parsed)).toBe(true);

      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("Due Soon");
      expect(scriptArg).toContain("win.perspective");
    });
  });

  // ─── Error handling tests ─────────────────────────────────────────

  describe("error handling", () => {
    it("should return isError with retryable message for NotRunningError", async () => {
      mockRunOmniJSJson.mockRejectedValue(new NotRunningError());
      const result = await client.callTool({
        name: "get_database_summary",
        arguments: {},
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain("not running");
      expect(content[0].text).toContain("Please ensure OmniFocus is running");
    });

    it("should return isError for ScriptError", async () => {
      mockRunOmniJSJson.mockRejectedValue(new ScriptError("Task not found: task-999"));
      const result = await client.callTool({
        name: "get_task",
        arguments: { id: "task-999" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain("Task not found");
    });

    it("should return isError with retryable message for TimeoutError", async () => {
      mockRunOmniJSJson.mockRejectedValue(new TimeoutError());
      const result = await client.callTool({
        name: "list_tasks",
        arguments: {},
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain("timed out");
    });

    it("should handle unexpected errors gracefully", async () => {
      mockRunOmniJSJson.mockRejectedValue(new Error("Something unexpected"));
      const result = await client.callTool({
        name: "search",
        arguments: { query: "test" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain("Something unexpected");
    });

    it("should handle errors in project tools", async () => {
      mockRunOmniJSJson.mockRejectedValue(new ScriptError("Project not found"));
      const result = await client.callTool({
        name: "get_project",
        arguments: { idOrName: "nonexistent" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain("Project not found");
    });

    it("should handle errors in folder tools", async () => {
      mockRunOmniJSJson.mockRejectedValue(new ScriptError("Folder not found"));
      const result = await client.callTool({
        name: "get_folder",
        arguments: { id: "folder-999" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain("Folder not found");
    });

    it("should handle errors in tag tools", async () => {
      mockRunOmniJSJson.mockRejectedValue(new ScriptError("Tag not found"));
      const result = await client.callTool({
        name: "get_tag",
        arguments: { id: "tag-999" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain("Tag not found");
    });

    it("should handle errors in perspective tools", async () => {
      mockRunOmniJSJson.mockRejectedValue(new ScriptError("Perspective not found"));
      const result = await client.callTool({
        name: "get_perspective_tasks",
        arguments: { name: "nonexistent" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain("Perspective not found");
    });

    it("should handle errors in mutation tools", async () => {
      mockRunOmniJSJson.mockRejectedValue(new ScriptError("Task not found: task-999"));
      const result = await client.callTool({
        name: "complete_task",
        arguments: { id: "task-999" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain("Task not found");
    });

    it("should handle errors in delete tools", async () => {
      mockRunOmniJSJson.mockRejectedValue(new NotRunningError());
      const result = await client.callTool({
        name: "delete_project",
        arguments: { id: "proj-999" },
      });

      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toContain("not running");
    });
  });
});
