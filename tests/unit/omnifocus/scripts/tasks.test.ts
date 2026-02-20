import { describe, it, expect } from "vitest";
import {
  buildListTasksScript,
  buildGetTaskScript,
  buildCreateTaskScript,
  buildUpdateTaskScript,
  buildCompleteTaskScript,
  buildUncompleteTaskScript,
  buildDropTaskScript,
  buildDeleteTaskScript,
  buildMoveTasksScript,
  buildDuplicateTasksScript,
  buildSetTaskTagsScript,
  buildAddTaskNotificationScript,
  buildAppendTaskNoteScript,
  buildConvertTaskToProjectScript,
  buildGetTodayCompletedTasksScript,
  buildListTaskNotificationsScript,
  buildRemoveTaskNotificationScript,
  buildBatchCreateTasksScript,
  buildBatchDeleteTasksScript,
  buildBatchCompleteTasksScript,
  buildGetTaskCountScript,
} from "../../../../src/omnifocus/scripts/tasks.js";

describe("task script builders", () => {
  describe("buildListTasksScript", () => {
    it("should generate valid script with no filters", () => {
      const script = buildListTasksScript({});
      expect(script).toContain("flattenedTasks");
      expect(script).toContain("serializeTask");
      expect(script).toContain("JSON.stringify");
    });

    it("should include inbox filter when inInbox is true", () => {
      const script = buildListTasksScript({ inInbox: true });
      expect(script).toContain("source = inbox");
    });

    it("should include flagged filter", () => {
      const script = buildListTasksScript({ flagged: true });
      expect(script).toContain("flagged");
    });

    it("should include tag filter", () => {
      const script = buildListTasksScript({ tagNames: ["work", "urgent"] });
      expect(script).toContain("tagNames");
    });

    it("should include date range filters", () => {
      const script = buildListTasksScript({
        dueAfter: "2024-01-01T00:00:00Z",
        dueBefore: "2024-12-31T23:59:59Z",
      });
      expect(script).toContain("dueAfter");
      expect(script).toContain("dueBefore");
    });

    it("should include defer date filters", () => {
      const script = buildListTasksScript({
        deferAfter: "2024-01-01T00:00:00Z",
        deferBefore: "2024-06-01T00:00:00Z",
      });
      expect(script).toContain("deferAfter");
      expect(script).toContain("deferBefore");
    });

    it("should include search filter", () => {
      const script = buildListTasksScript({ search: "groceries" });
      expect(script).toContain("groceries");
    });

    it("should guard against null notes in search (Bug 1 regression)", () => {
      const script = buildListTasksScript({ search: "foo" });
      expect(script).toContain('(t.note || "")');
    });

    it("should include pagination", () => {
      const script = buildListTasksScript({ limit: 50, offset: 10 });
      expect(script).toContain("50");
      expect(script).toContain("10");
    });

    it("should include taskStatus filter", () => {
      const script = buildListTasksScript({ taskStatus: "available" });
      expect(script).toContain("available");
    });

    it("should handle taskStatus 'remaining'", () => {
      const script = buildListTasksScript({ taskStatus: "remaining" });
      expect(script).toContain("remaining");
    });

    it("should handle taskStatus 'completed'", () => {
      const script = buildListTasksScript({ taskStatus: "completed" });
      expect(script).toContain("completed");
    });

    it("should handle taskStatus 'dropped'", () => {
      const script = buildListTasksScript({ taskStatus: "dropped" });
      expect(script).toContain("dropped");
    });

    it("should combine multiple filters", () => {
      const script = buildListTasksScript({
        flagged: true,
        taskStatus: "available",
        tagNames: ["work"],
        dueAfter: "2024-01-01T00:00:00Z",
        dueBefore: "2024-12-31T23:59:59Z",
        search: "test",
        limit: 50,
        offset: 10,
      });
      expect(script).toContain("flagged");
      expect(script).toContain("available");
      expect(script).toContain("work");
      expect(script).toContain("dueAfter");
      expect(script).toContain("test");
      expect(script).toContain("50");
      expect(script).toContain("10");
    });

    it("should include project ID filter", () => {
      const script = buildListTasksScript({ projectId: "proj-123" });
      expect(script).toContain("proj-123");
    });

    it("should include project name filter", () => {
      const script = buildListTasksScript({ projectName: "Work" });
      expect(script).toContain("Work");
    });

    it("should include completed filter", () => {
      const script = buildListTasksScript({ completed: true });
      expect(script).toContain("completed");
    });

    it("should include available filter", () => {
      const script = buildListTasksScript({ available: true });
      expect(script).toContain("Task.Status.Available");
    });
  });

  describe("buildGetTaskScript", () => {
    it("should include task ID", () => {
      const script = buildGetTaskScript("task-123");
      expect(script).toContain("task-123");
      expect(script).toContain("byId");
    });

    it("should accept object args", () => {
      const script = buildGetTaskScript({ id: "task-123" });
      expect(script).toContain("task-123");
    });

    it("should include children serializer when requested", () => {
      const script = buildGetTaskScript({ id: "task-123", includeChildren: true });
      expect(script).toContain("serializeTaskWithChildren");
    });

    it("should include maxDepth when specified", () => {
      const script = buildGetTaskScript({ id: "task-123", includeChildren: true, maxDepth: 3 });
      expect(script).toContain("3");
    });
  });

  describe("buildCreateTaskScript", () => {
    it("should safely embed task name with special chars via JSON.parse", () => {
      const script = buildCreateTaskScript({
        name: 'Task with "quotes" and `backticks`',
      });
      expect(script).toContain("JSON.parse");
      expect(script).toContain("args.name");
    });

    it("should include project assignment by ID", () => {
      const script = buildCreateTaskScript({
        name: "Test",
        projectId: "proj-123",
      });
      expect(script).toContain("proj-123");
    });

    it("should include project assignment by name", () => {
      const script = buildCreateTaskScript({
        name: "Test",
        projectName: "Work",
      });
      expect(script).toContain("Work");
    });

    it("should include tags", () => {
      const script = buildCreateTaskScript({
        name: "Test",
        tags: ["work", "urgent"],
      });
      expect(script).toContain("work");
      expect(script).toContain("urgent");
    });

    it("should handle emoji in task name", () => {
      const script = buildCreateTaskScript({
        name: "Buy groceries \u{1F6D2}",
      });
      expect(script).toContain("\u{1F6D2}");
    });

    it("should handle optional properties", () => {
      const script = buildCreateTaskScript({
        name: "Test",
        note: "Some notes",
        flagged: true,
        deferDate: "2024-01-01T00:00:00Z",
        dueDate: "2024-12-31T23:59:59Z",
        estimatedMinutes: 30,
        completedByChildren: true,
      });
      expect(script).toContain("Some notes");
      expect(script).toContain("flagged");
      expect(script).toContain("deferDate");
      expect(script).toContain("dueDate");
      expect(script).toContain("estimatedMinutes");
      expect(script).toContain("completedByChildren");
    });

    it("should handle repetition rule with fixed method", () => {
      const script = buildCreateTaskScript({
        name: "Weekly review",
        repetitionRule: { ruleString: "FREQ=WEEKLY;INTERVAL=1", method: "fixed" },
      });
      expect(script).toContain("FREQ=WEEKLY");
      expect(script).toContain("RepetitionMethod");
      expect(script).toContain("RepetitionRule");
    });

    it("should handle repetition rule with startAfterCompletion method", () => {
      const script = buildCreateTaskScript({
        name: "Daily habit",
        repetitionRule: { ruleString: "FREQ=DAILY;INTERVAL=1", method: "startAfterCompletion" },
      });
      expect(script).toContain("FREQ=DAILY");
      expect(script).toContain("startAfterCompletion");
    });

    it("should handle repetition rule with dueAfterCompletion method", () => {
      const script = buildCreateTaskScript({
        name: "Monthly review",
        repetitionRule: { ruleString: "FREQ=MONTHLY;INTERVAL=1", method: "dueAfterCompletion" },
      });
      expect(script).toContain("FREQ=MONTHLY");
      expect(script).toContain("dueAfterCompletion");
    });

    it("should handle empty tags array", () => {
      const script = buildCreateTaskScript({
        name: "Test",
        tags: [],
      });
      // Should still produce valid script (tags array embedded but empty)
      expect(script).toContain("JSON.parse");
    });
  });

  describe("buildUpdateTaskScript", () => {
    it("should update task by ID", () => {
      const script = buildUpdateTaskScript({ id: "task-123", name: "Renamed" });
      expect(script).toContain("task-123");
      expect(script).toContain("Renamed");
    });

    it("should handle clearing dates with null", () => {
      const script = buildUpdateTaskScript({ id: "task-123", dueDate: null });
      expect(script).toContain("dueDate");
    });

    it("should handle repetition rule update", () => {
      const script = buildUpdateTaskScript({
        id: "task-123",
        repetitionRule: { ruleString: "FREQ=DAILY", method: "startAfterCompletion" },
      });
      expect(script).toContain("FREQ=DAILY");
      expect(script).toContain("startAfterCompletion");
    });

    it("should handle clearing repetition rule", () => {
      const script = buildUpdateTaskScript({ id: "task-123", repetitionRule: null });
      expect(script).toContain("repetitionRule");
    });

    it("should handle clearing estimatedMinutes with null", () => {
      const script = buildUpdateTaskScript({ id: "task-123", estimatedMinutes: null });
      expect(script).toContain("estimatedMinutes");
    });

    it("should handle clearing deferDate with null", () => {
      const script = buildUpdateTaskScript({ id: "task-123", deferDate: null });
      expect(script).toContain("deferDate");
    });
  });

  describe("buildCompleteTaskScript", () => {
    it("should mark task complete", () => {
      const script = buildCompleteTaskScript("task-123");
      expect(script).toContain("task-123");
      expect(script).toContain("markComplete");
      expect(script).toContain("serializeTask");
    });
  });

  describe("buildUncompleteTaskScript", () => {
    it("should mark task incomplete", () => {
      const script = buildUncompleteTaskScript("task-123");
      expect(script).toContain("task-123");
      expect(script).toContain("markIncomplete");
    });
  });

  describe("buildDropTaskScript", () => {
    it("should drop task", () => {
      const script = buildDropTaskScript("task-123");
      expect(script).toContain("task-123");
      expect(script).toContain("drop(false)");
    });
  });

  describe("buildDeleteTaskScript", () => {
    it("should delete task by ID", () => {
      const script = buildDeleteTaskScript("task-123");
      expect(script).toContain("task-123");
      expect(script).toContain("deleteObject");
    });
  });

  describe("buildMoveTasksScript", () => {
    it("should move tasks to a project by ID", () => {
      const script = buildMoveTasksScript({
        taskIds: ["task-1", "task-2"],
        projectId: "proj-123",
      });
      expect(script).toContain("task-1");
      expect(script).toContain("task-2");
      expect(script).toContain("proj-123");
      expect(script).toContain("moveTasks");
    });

    it("should move tasks to a project by name", () => {
      const script = buildMoveTasksScript({
        taskIds: ["task-1"],
        projectName: "Work",
      });
      expect(script).toContain("Work");
    });

    it("should move tasks to a parent task", () => {
      const script = buildMoveTasksScript({
        taskIds: ["task-1"],
        parentTaskId: "task-parent",
      });
      expect(script).toContain("task-parent");
    });

    it("should move tasks to inbox when no destination specified", () => {
      const script = buildMoveTasksScript({ taskIds: ["task-1"] });
      expect(script).toContain("inbox.ending");
    });
  });

  describe("buildDuplicateTasksScript", () => {
    it("should duplicate tasks to a project", () => {
      const script = buildDuplicateTasksScript({
        taskIds: ["task-1", "task-2"],
        projectId: "proj-123",
      });
      expect(script).toContain("task-1");
      expect(script).toContain("task-2");
      expect(script).toContain("duplicateTasks");
    });

    it("should duplicate to inbox when no destination", () => {
      const script = buildDuplicateTasksScript({ taskIds: ["task-1"] });
      expect(script).toContain("inbox.ending");
    });

    it("should duplicate to project by name", () => {
      const script = buildDuplicateTasksScript({
        taskIds: ["task-1"],
        projectName: "Work",
      });
      expect(script).toContain("Work");
    });
  });

  describe("buildSetTaskTagsScript", () => {
    it("should replace tags", () => {
      const script = buildSetTaskTagsScript({
        taskId: "task-123",
        tagNames: ["work", "urgent"],
        mode: "replace",
      });
      expect(script).toContain("task-123");
      expect(script).toContain("clearTags");
      expect(script).toContain("addTag");
    });

    it("should add tags", () => {
      const script = buildSetTaskTagsScript({
        taskId: "task-123",
        tagNames: ["new-tag"],
        mode: "add",
      });
      expect(script).toContain("addTag");
      expect(script).toContain("findOrCreateTag");
    });

    it("should remove tags without creating them (Bug 3 regression)", () => {
      const script = buildSetTaskTagsScript({
        taskId: "task-123",
        tagNames: ["old-tag"],
        mode: "remove",
      });
      expect(script).toContain("removeTag");
      // The remove branch should NOT use findOrCreateTag — it should use a filter-based lookup
      expect(script).not.toMatch(/mode === "remove"[\s\S]*findOrCreateTag/);
      // It should NOT contain "new Tag" in the remove branch
      const removeSection = script.split('mode === "remove"')[1];
      expect(removeSection).not.toContain("new Tag(name)");
    });
  });

  describe("buildAddTaskNotificationScript", () => {
    it("should add absolute notification", () => {
      const script = buildAddTaskNotificationScript({
        taskId: "task-123",
        type: "absolute",
        absoluteDate: "2024-12-20T09:00:00Z",
      });
      expect(script).toContain("task-123");
      expect(script).toContain("absolute");
      expect(script).toContain("addNotification");
    });

    it("should add due-relative notification", () => {
      const script = buildAddTaskNotificationScript({
        taskId: "task-123",
        type: "dueRelative",
        relativeOffset: -3600,
      });
      expect(script).toContain("dueRelative");
      expect(script).toContain("-3600");
    });

    it("should handle defer-relative notification type", () => {
      const script = buildAddTaskNotificationScript({
        taskId: "task-123",
        type: "deferRelative",
        relativeOffset: 0,
      });
      expect(script).toContain("deferRelative");
    });
  });

  describe("buildAppendTaskNoteScript", () => {
    it("should append text to task note", () => {
      const script = buildAppendTaskNoteScript("task-123", "Additional notes");
      expect(script).toContain("task-123");
      expect(script).toContain("Additional notes");
      expect(script).toContain("appendStringToNote");
    });
  });

  describe("buildConvertTaskToProjectScript", () => {
    it("should convert task to project", () => {
      const script = buildConvertTaskToProjectScript("task-123");
      expect(script).toContain("task-123");
      expect(script).toContain("convertTasksToProjects");
    });

    it("should use shared serializeProject function (Bug 2 regression)", () => {
      const script = buildConvertTaskToProjectScript("task-123");
      expect(script).toContain("serializeProject");
      // Should use the function call, not inline serialization
      expect(script).toContain("serializeProject(projects[0])");
    });
  });

  describe("buildGetTodayCompletedTasksScript", () => {
    it("should filter tasks completed today", () => {
      const script = buildGetTodayCompletedTasksScript();
      expect(script).toContain("Task.Status.Completed");
      expect(script).toContain("completionDate");
      expect(script).toContain("startOfDay");
      expect(script).toContain("serializeTask");
    });
  });

  describe("buildListTaskNotificationsScript", () => {
    it("should list notifications for a task", () => {
      const script = buildListTaskNotificationsScript("task-123");
      expect(script).toContain("task-123");
      expect(script).toContain("notifications");
      expect(script).toContain("serializeTaskNotification");
    });
  });

  describe("buildRemoveTaskNotificationScript", () => {
    it("should remove notification by ID", () => {
      const script = buildRemoveTaskNotificationScript("task-123", "notif-456");
      expect(script).toContain("task-123");
      expect(script).toContain("notif-456");
      expect(script).toContain("removeNotification");
    });
  });

  describe("buildBatchCreateTasksScript", () => {
    it("should create multiple tasks", () => {
      const script = buildBatchCreateTasksScript({
        tasks: [{ name: "Task 1" }, { name: "Task 2" }],
      });
      expect(script).toContain("Task 1");
      expect(script).toContain("Task 2");
      expect(script).toContain("createTaskFromItem");
    });

    it("should handle project destination by ID", () => {
      const script = buildBatchCreateTasksScript({
        tasks: [{ name: "Task 1" }],
        projectId: "proj-123",
      });
      expect(script).toContain("proj-123");
    });

    it("should handle project destination by name", () => {
      const script = buildBatchCreateTasksScript({
        tasks: [{ name: "Task 1" }],
        projectName: "Work",
      });
      expect(script).toContain("Work");
    });

    it("should handle parent task destination", () => {
      const script = buildBatchCreateTasksScript({
        tasks: [{ name: "Subtask" }],
        parentTaskId: "task-parent",
      });
      expect(script).toContain("task-parent");
    });

    it("should handle nested children", () => {
      const script = buildBatchCreateTasksScript({
        tasks: [{
          name: "Parent",
          children: [{ name: "Child" }],
        }],
      });
      expect(script).toContain("children");
      expect(script).toContain("Child");
    });

    it("should handle tags in batch tasks", () => {
      const script = buildBatchCreateTasksScript({
        tasks: [{ name: "Tagged", tags: ["work"] }],
      });
      expect(script).toContain("findOrCreateTag");
      expect(script).toContain("work");
    });

    it("should handle repetition rules in batch tasks", () => {
      const script = buildBatchCreateTasksScript({
        tasks: [{
          name: "Recurring",
          repetitionRule: { ruleString: "FREQ=DAILY", method: "fixed" },
        }],
      });
      expect(script).toContain("FREQ=DAILY");
      expect(script).toContain("RepetitionRule");
    });
  });

  describe("buildBatchDeleteTasksScript", () => {
    it("should delete multiple tasks by ID", () => {
      const script = buildBatchDeleteTasksScript({ taskIds: ["task-1", "task-2"] });
      expect(script).toContain("task-1");
      expect(script).toContain("task-2");
      expect(script).toContain("deleteObject");
    });

    it("should throw on missing task", () => {
      const script = buildBatchDeleteTasksScript({ taskIds: ["task-1"] });
      expect(script).toContain("Task not found");
    });

    it("should return deleted status for each task", () => {
      const script = buildBatchDeleteTasksScript({ taskIds: ["task-1"] });
      expect(script).toContain("deleted");
      expect(script).toContain("JSON.stringify");
    });
  });

  describe("buildBatchCompleteTasksScript", () => {
    it("should complete multiple tasks by ID", () => {
      const script = buildBatchCompleteTasksScript({ taskIds: ["task-1", "task-2"] });
      expect(script).toContain("task-1");
      expect(script).toContain("task-2");
      expect(script).toContain("markComplete");
    });

    it("should serialize completed tasks", () => {
      const script = buildBatchCompleteTasksScript({ taskIds: ["task-1"] });
      expect(script).toContain("serializeTask");
      expect(script).toContain("JSON.stringify");
    });

    it("should throw on missing task", () => {
      const script = buildBatchCompleteTasksScript({ taskIds: ["task-1"] });
      expect(script).toContain("Task not found");
    });
  });

  describe("buildGetTaskCountScript", () => {
    it("should return count without serializing tasks", () => {
      const script = buildGetTaskCountScript({});
      expect(script).toContain("count");
      expect(script).toContain("tasks.length");
      expect(script).not.toContain("serializeTask");
    });

    it("should apply filter logic", () => {
      const script = buildGetTaskCountScript({ flagged: true, taskStatus: "available" });
      expect(script).toContain("flagged");
      expect(script).toContain("Task.Status.Available");
    });

    it("should apply date filters", () => {
      const script = buildGetTaskCountScript({
        dueAfter: "2024-01-01T00:00:00Z",
        dueBefore: "2024-12-31T23:59:59Z",
      });
      expect(script).toContain("dueAfter");
      expect(script).toContain("dueBefore");
    });

    it("should not include pagination", () => {
      const script = buildGetTaskCountScript({ flagged: true });
      expect(script).not.toContain("offset");
      expect(script).not.toContain("limit");
    });
  });
});
