import { describe, it, expect, vi, beforeEach } from "vitest";
import { OmniFocusClient } from "../../../src/omnifocus/client.js";
import { mockDatabaseSummary, mockSearchResults, mockDatabaseDump } from "../../fixtures/database.js";
import { mockTask, mockFlaggedTask, mockCompletedTask, mockTaskList } from "../../fixtures/tasks.js";
import { mockProject, mockProjectList } from "../../fixtures/projects.js";
import { mockFolder, mockFolderWithChildren } from "../../fixtures/folders.js";
import { mockTag, mockTagWithChildren } from "../../fixtures/tags.js";
import { mockAbsoluteNotification, mockDueRelativeNotification } from "../../fixtures/notifications.js";
import { mockPerspectiveList } from "../../fixtures/perspectives.js";

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

  // ─── Database ─────────────────────────────────────────────────────

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

  describe("dumpDatabase", () => {
    it("should return full database dump", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseDump);
      const result = await client.dumpDatabase();
      expect(result).toEqual(mockDatabaseDump);
    });

    it("should pass options to script", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseDump);
      await client.dumpDatabase({ includeCompleted: true, maxDepth: 3 });
      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("includeCompleted");
      expect(scriptArg).toContain("3");
    });
  });

  describe("saveDatabase", () => {
    it("should return saved status", async () => {
      mockRunOmniJSJson.mockResolvedValue({ saved: true });
      const result = await client.saveDatabase();
      expect(result.saved).toBe(true);
    });
  });

  // ─── Tasks ────────────────────────────────────────────────────────

  describe("uncompleteTask", () => {
    it("should uncomplete and return task", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockCompletedTask, completed: false });
      const result = await client.uncompleteTask("task-completed-1");
      expect(result.completed).toBe(false);
    });
  });

  describe("dropTask", () => {
    it("should drop and return task", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockTask, dropped: true });
      const result = await client.dropTask("task-abc-123");
      expect(result.dropped).toBe(true);
    });
  });

  describe("duplicateTasks", () => {
    it("should duplicate and return tasks", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTask]);
      const result = await client.duplicateTasks({ taskIds: ["task-abc-123"] });
      expect(result).toHaveLength(1);
    });
  });

  describe("addTaskNotification", () => {
    it("should add notification and return task", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      const result = await client.addTaskNotification({
        taskId: "task-abc-123",
        type: "absolute",
        absoluteDate: "2024-12-20T09:00:00Z",
      });
      expect(result.id).toBe("task-abc-123");
    });
  });

  describe("appendTaskNote", () => {
    it("should append note and return task", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      const result = await client.appendTaskNote("task-abc-123", "Extra text");
      expect(result.id).toBe("task-abc-123");
    });
  });

  describe("convertTaskToProject", () => {
    it("should convert task to project and return it", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProject);
      const result = await client.convertTaskToProject("task-abc-123");
      expect(result.id).toBe("proj-abc-123");
    });
  });

  describe("getTodayCompletedTasks", () => {
    it("should return today's completed tasks", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockCompletedTask]);
      const result = await client.getTodayCompletedTasks();
      expect(result).toHaveLength(1);
      expect(result[0].completed).toBe(true);
    });
  });

  describe("listTaskNotifications", () => {
    it("should return notifications for a task", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockAbsoluteNotification, mockDueRelativeNotification]);
      const result = await client.listTaskNotifications("task-abc-123");
      expect(result).toHaveLength(2);
      expect(result[0].kind).toBe("absolute");
      expect(result[1].kind).toBe("dueRelative");
    });
  });

  describe("removeTaskNotification", () => {
    it("should remove notification and return confirmation", async () => {
      mockRunOmniJSJson.mockResolvedValue({
        removed: true,
        taskId: "task-abc-123",
        notificationId: "notif-1",
      });
      const result = await client.removeTaskNotification("task-abc-123", "notif-1");
      expect(result.removed).toBe(true);
    });
  });

  describe("batchCreateTasks", () => {
    it("should batch create and return tasks", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTask, mockFlaggedTask]);
      const result = await client.batchCreateTasks({
        tasks: [{ name: "Task 1" }, { name: "Task 2" }],
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("batchDeleteTasks", () => {
    it("should batch delete and return confirmations", async () => {
      mockRunOmniJSJson.mockResolvedValue([
        { deleted: true, id: "task-1" },
        { deleted: true, id: "task-2" },
      ]);
      const result = await client.batchDeleteTasks({ taskIds: ["task-1", "task-2"] });
      expect(result).toHaveLength(2);
      expect(result[0].deleted).toBe(true);
    });
  });

  describe("batchCompleteTasks", () => {
    it("should batch complete and return tasks", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockCompletedTask]);
      const result = await client.batchCompleteTasks({ taskIds: ["task-1"] });
      expect(result).toHaveLength(1);
      expect(result[0].completed).toBe(true);
    });
  });

  describe("getTaskCount", () => {
    it("should return task count", async () => {
      mockRunOmniJSJson.mockResolvedValue({ count: 42 });
      const result = await client.getTaskCount({ flagged: true });
      expect(result.count).toBe(42);
    });

    it("should pass filter args to script", async () => {
      mockRunOmniJSJson.mockResolvedValue({ count: 5 });
      await client.getTaskCount({ taskStatus: "available", projectName: "Work" });
      const scriptArg = mockRunOmniJSJson.mock.calls[0][0];
      expect(scriptArg).toContain("available");
      expect(scriptArg).toContain("Work");
    });
  });

  // ─── Projects ─────────────────────────────────────────────────────

  describe("dropProject", () => {
    it("should drop and return project", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockProject, status: "dropped" });
      const result = await client.dropProject("proj-abc-123");
      expect(result.status).toBe("dropped");
    });
  });

  describe("moveProject", () => {
    it("should move and return project", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProject);
      const result = await client.moveProject("proj-abc-123", "folder-2");
      expect(result.id).toBe("proj-abc-123");
    });
  });

  describe("getProjectTasks", () => {
    it("should return project tasks", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      const result = await client.getProjectTasks({ projectId: "proj-abc-123" });
      expect(result).toHaveLength(3);
    });
  });

  // ─── Folders ──────────────────────────────────────────────────────

  describe("getFolder", () => {
    it("should return folder with children", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockFolderWithChildren);
      const result = await client.getFolder("folder-1");
      expect(result.id).toBe("folder-1");
      expect(result.childFolders).toHaveLength(1);
    });
  });

  // ─── Tags ─────────────────────────────────────────────────────────

  describe("getTag", () => {
    it("should return tag with children", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTagWithChildren);
      const result = await client.getTag("tag-1");
      expect(result.id).toBe("tag-1");
      expect(result.childTags).toHaveLength(1);
    });
  });

  // ─── Cache invalidation (Bug 4 regression) ────────────────────────

  describe("database cache invalidation after mutations", () => {
    it("should invalidate database cache after createTask", async () => {
      // Prime the database summary cache
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(1);

      // Create a task — should invalidate database: cache
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      await client.createTask({ name: "New task" });

      // getDatabaseSummary should call executor again (not cached)
      mockRunOmniJSJson.mockResolvedValue({ ...mockDatabaseSummary, availableTaskCount: 43 });
      const result = await client.getDatabaseSummary();
      expect(result.availableTaskCount).toBe(43);
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });

    it("should invalidate database cache after deleteTask", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();

      mockRunOmniJSJson.mockResolvedValue({ deleted: true, id: "task-1" });
      await client.deleteTask("task-1");

      mockRunOmniJSJson.mockResolvedValue({ ...mockDatabaseSummary, availableTaskCount: 41 });
      const result = await client.getDatabaseSummary();
      expect(result.availableTaskCount).toBe(41);
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });

    it("should invalidate database cache after completeTask", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();

      mockRunOmniJSJson.mockResolvedValue(mockCompletedTask);
      await client.completeTask("task-1");

      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });

    it("should invalidate database cache after deleteProject", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();

      mockRunOmniJSJson.mockResolvedValue({ deleted: true, id: "proj-1" });
      await client.deleteProject("proj-1");

      mockRunOmniJSJson.mockResolvedValue({ ...mockDatabaseSummary, projectCount: 11 });
      const result = await client.getDatabaseSummary();
      expect(result.projectCount).toBe(11);
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });

    it("should invalidate database cache after createProject", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();

      mockRunOmniJSJson.mockResolvedValue(mockProject);
      await client.createProject({ name: "New project" });

      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });

    it("should invalidate database cache after batchCreateTasks", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();

      mockRunOmniJSJson.mockResolvedValue([mockTask]);
      await client.batchCreateTasks({ tasks: [{ name: "Task" }] });

      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });

    it("should invalidate database cache after batchDeleteTasks", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();

      mockRunOmniJSJson.mockResolvedValue([{ deleted: true, id: "task-1" }]);
      await client.batchDeleteTasks({ taskIds: ["task-1"] });

      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });

    it("should invalidate database cache after batchCompleteTasks", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();

      mockRunOmniJSJson.mockResolvedValue([mockCompletedTask]);
      await client.batchCompleteTasks({ taskIds: ["task-1"] });

      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });

    it("should not invalidate database cache after setTaskTags", async () => {
      // setTaskTags only changes tag assignments, not counts — database cache should survive
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();

      mockRunOmniJSJson.mockResolvedValue(mockTask);
      await client.setTaskTags({ taskId: "task-1", tagNames: ["new"], mode: "add" });

      // getDatabaseSummary should still be cached (2 calls total, not 3)
      await client.getDatabaseSummary();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(2);
    });

    it("should invalidate database cache after createFolder", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();

      mockRunOmniJSJson.mockResolvedValue(mockFolder);
      await client.createFolder({ name: "New folder" });

      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });

    it("should invalidate database cache after createTag", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();

      mockRunOmniJSJson.mockResolvedValue(mockTag);
      await client.createTag({ name: "New tag" });

      mockRunOmniJSJson.mockResolvedValue(mockDatabaseSummary);
      await client.getDatabaseSummary();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });
  });

  // ─── Caching behavior ───────────────────────────────────────────

  describe("listTasks caching", () => {
    it("should cache results for same args", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.listTasks({ flagged: true });
      await client.listTasks({ flagged: true });
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(1);
    });

    it("should not share cache between different args", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.listTasks({ flagged: true });
      await client.listTasks({ flagged: false });
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(2);
    });
  });

  describe("getTask caching", () => {
    it("should cache results for same id", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      await client.getTask("task-abc-123");
      await client.getTask("task-abc-123");
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(1);
    });

    it("should cache results for same args object", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTask);
      await client.getTask({ id: "task-abc-123", includeChildren: true });
      await client.getTask({ id: "task-abc-123", includeChildren: true });
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(1);
    });
  });

  describe("listFolders caching", () => {
    it("should cache results", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockFolder]);
      await client.listFolders();
      await client.listFolders();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(1);
    });
  });

  describe("listTags caching", () => {
    it("should cache results", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTag]);
      await client.listTags();
      await client.listTags();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(1);
    });
  });

  describe("listPerspectives caching", () => {
    it("should cache results for same args", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockPerspectiveList);
      await client.listPerspectives({ includeBuiltIn: true });
      await client.listPerspectives({ includeBuiltIn: true });
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(1);
    });
  });

  describe("getPerspectiveTasks caching", () => {
    it("should cache results for same perspective name", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.getPerspectiveTasks("Forecast");
      await client.getPerspectiveTasks("Forecast");
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(1);
    });

    it("should not share cache between different perspectives", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.getPerspectiveTasks("Forecast");
      await client.getPerspectiveTasks("Flagged");
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(2);
    });
  });

  describe("getTaskCount caching", () => {
    it("should cache results for same args", async () => {
      mockRunOmniJSJson.mockResolvedValue({ count: 42 });
      await client.getTaskCount({ flagged: true });
      await client.getTaskCount({ flagged: true });
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Mutation cache invalidation ────────────────────────────────

  describe("updateProject cache invalidation", () => {
    it("should invalidate projects cache", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProjectList);
      await client.listProjects();

      mockRunOmniJSJson.mockResolvedValue(mockProject);
      await client.updateProject({ id: "proj-abc-123", name: "Updated" });

      mockRunOmniJSJson.mockResolvedValue(mockProjectList);
      await client.listProjects();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });
  });

  describe("updateFolder cache invalidation", () => {
    it("should invalidate folders cache", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockFolder]);
      await client.listFolders();

      mockRunOmniJSJson.mockResolvedValue(mockFolder);
      await client.updateFolder({ id: "folder-1", name: "Updated" });

      mockRunOmniJSJson.mockResolvedValue([mockFolder]);
      await client.listFolders();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });
  });

  describe("updateTag cache invalidation", () => {
    it("should invalidate tags cache", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTag]);
      await client.listTags();

      mockRunOmniJSJson.mockResolvedValue(mockTag);
      await client.updateTag({ id: "tag-1", name: "Updated" });

      mockRunOmniJSJson.mockResolvedValue([mockTag]);
      await client.listTags();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });
  });

  describe("updateTask cache invalidation", () => {
    it("should invalidate tasks cache", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.listTasks();

      mockRunOmniJSJson.mockResolvedValue(mockTask);
      await client.updateTask({ id: "task-abc-123", name: "Updated" });

      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.listTasks();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });
  });

  describe("moveTasks cache invalidation", () => {
    it("should invalidate tasks and projects cache", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.listTasks();

      mockRunOmniJSJson.mockResolvedValue([mockTask]);
      await client.moveTasks({ taskIds: ["task-abc-123"], projectName: "Other" });

      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.listTasks();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });
  });

  describe("batchCreateTasks cache invalidation", () => {
    it("should invalidate tasks cache", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.listTasks();

      mockRunOmniJSJson.mockResolvedValue([mockTask]);
      await client.batchCreateTasks({ tasks: [{ name: "New" }] });

      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.listTasks();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });
  });

  describe("batchDeleteTasks cache invalidation", () => {
    it("should invalidate tasks cache", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.listTasks();

      mockRunOmniJSJson.mockResolvedValue([{ deleted: true, id: "task-1" }]);
      await client.batchDeleteTasks({ taskIds: ["task-1"] });

      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.listTasks();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });
  });

  describe("batchCompleteTasks cache invalidation", () => {
    it("should invalidate tasks cache", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.listTasks();

      mockRunOmniJSJson.mockResolvedValue([mockCompletedTask]);
      await client.batchCompleteTasks({ taskIds: ["task-1"] });

      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.listTasks();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });
  });

  // ─── Error propagation ──────────────────────────────────────────

  describe("error propagation", () => {
    it("should propagate executor errors from listTasks", async () => {
      mockRunOmniJSJson.mockRejectedValue(new Error("OmniFocus not running"));
      await expect(client.listTasks()).rejects.toThrow("OmniFocus not running");
    });

    it("should propagate executor errors from getTask", async () => {
      mockRunOmniJSJson.mockRejectedValue(new Error("OmniFocus not running"));
      await expect(client.getTask("task-1")).rejects.toThrow("OmniFocus not running");
    });

    it("should propagate executor errors from createTask", async () => {
      mockRunOmniJSJson.mockRejectedValue(new Error("Permission denied"));
      await expect(client.createTask({ name: "Test" })).rejects.toThrow("Permission denied");
    });

    it("should propagate executor errors from listProjects", async () => {
      mockRunOmniJSJson.mockRejectedValue(new Error("Script error"));
      await expect(client.listProjects()).rejects.toThrow("Script error");
    });

    it("should propagate executor errors from listFolders", async () => {
      mockRunOmniJSJson.mockRejectedValue(new Error("Timeout"));
      await expect(client.listFolders()).rejects.toThrow("Timeout");
    });
  });

  // ─── Inline cache invalidation for non-database caches ──────────

  describe("setTaskTags cache invalidation", () => {
    it("should invalidate tags cache", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockTag]);
      await client.listTags();

      mockRunOmniJSJson.mockResolvedValue(mockTask);
      await client.setTaskTags({ taskId: "task-1", tagNames: ["new"], mode: "add" });

      mockRunOmniJSJson.mockResolvedValue([mockTag]);
      await client.listTags();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });
  });

  describe("completeProject cache invalidation", () => {
    it("should invalidate projects, tasks, and database caches", async () => {
      // Prime all three caches
      mockRunOmniJSJson.mockResolvedValue(mockProjectList);
      await client.listProjects();
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.listTasks();

      // Complete project
      mockRunOmniJSJson.mockResolvedValue({ ...mockProject, completed: true });
      await client.completeProject("proj-abc-123");

      // Both caches should be invalidated
      mockRunOmniJSJson.mockResolvedValue(mockProjectList);
      await client.listProjects();
      mockRunOmniJSJson.mockResolvedValue(mockTaskList);
      await client.listTasks();
      // 2 primes + 1 mutation + 2 re-fetches = 5
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(5);
    });
  });
});
