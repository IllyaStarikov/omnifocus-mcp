import { describe, it, expect } from "vitest";
import {
  serializeTaskFn,
  serializeTaskWithChildrenFn,
  serializeProjectFn,
  serializeFolderFn,
  serializeFolderWithChildrenFn,
  serializeTagFn,
  serializeTagWithChildrenFn,
  serializePerspectiveFn,
  serializeTaskNotificationFn,
} from "../../../src/omnifocus/serializers.js";

describe("serializer templates", () => {
  // ─── serializeTaskFn ────────────────────────────────────────────

  describe("serializeTaskFn", () => {
    it("should contain all required task field names", () => {
      const fields = [
        "id", "name", "note", "url", "flagged", "completed", "dropped",
        "deferDate", "dueDate", "completionDate", "droppedDate",
        "added", "modified", "effectiveDueDate", "effectiveDeferDate",
        "effectiveFlagged", "estimatedMinutes", "containingProjectId",
        "containingProjectName", "parentTaskId", "tags", "hasChildren",
        "sequential", "completedByChildren", "inInbox", "repetitionRule",
      ];
      for (const field of fields) {
        expect(serializeTaskFn).toContain(field);
      }
    });

    it("should use Task.RepetitionMethod enums", () => {
      expect(serializeTaskFn).toContain("Task.RepetitionMethod.Fixed");
      expect(serializeTaskFn).toContain("Task.RepetitionMethod.StartAfterCompletion");
      expect(serializeTaskFn).toContain("Task.RepetitionMethod.DueAfterCompletion");
    });

    it("should use Task.Status enums for completed/dropped", () => {
      expect(serializeTaskFn).toContain("Task.Status.Completed");
      expect(serializeTaskFn).toContain("Task.Status.Dropped");
    });

    it("should handle null dates with ternary operators", () => {
      expect(serializeTaskFn).toContain("task.deferDate ? task.deferDate.toISOString() : null");
      expect(serializeTaskFn).toContain("task.dueDate ? task.dueDate.toISOString() : null");
      expect(serializeTaskFn).toContain("task.completionDate ? task.completionDate.toISOString() : null");
    });

    it("should use id.primaryKey for ID extraction", () => {
      expect(serializeTaskFn).toContain("task.id.primaryKey");
    });

    it("should map repetitionRule method via _taskMethodMap", () => {
      expect(serializeTaskFn).toContain("_taskMethodMap");
      expect(serializeTaskFn).toContain('_taskMethodMap[task.repetitionRule.method] || "fixed"');
    });

    it("should serialize tags as array of {id, name}", () => {
      expect(serializeTaskFn).toContain("task.tags.map");
      expect(serializeTaskFn).toContain("t.id.primaryKey");
      expect(serializeTaskFn).toContain("t.name");
    });

    it("should define serializeTask as a function", () => {
      expect(serializeTaskFn).toContain("function serializeTask(task)");
    });
  });

  // ─── serializeTaskWithChildrenFn ────────────────────────────────

  describe("serializeTaskWithChildrenFn", () => {
    it("should call serializeTask", () => {
      expect(serializeTaskWithChildrenFn).toContain("serializeTask(task)");
    });

    it("should respect maxDepth recursion limit", () => {
      expect(serializeTaskWithChildrenFn).toContain("maxDepth");
      expect(serializeTaskWithChildrenFn).toContain("depth < maxDepth");
      expect(serializeTaskWithChildrenFn).toContain("maxDepth === 0");
    });

    it("should recurse into children", () => {
      expect(serializeTaskWithChildrenFn).toContain("serializeTaskWithChildren(kids[i], depth + 1, maxDepth)");
    });

    it("should check hasChildren before recursing", () => {
      expect(serializeTaskWithChildrenFn).toContain("task.hasChildren");
    });

    it("should initialize children as empty array", () => {
      expect(serializeTaskWithChildrenFn).toContain("result.children = []");
    });
  });

  // ─── serializeProjectFn ─────────────────────────────────────────

  describe("serializeProjectFn", () => {
    it("should contain all required project field names", () => {
      const fields = [
        "id", "name", "note", "url", "status", "flagged", "completed",
        "deferDate", "dueDate", "completionDate", "droppedDate",
        "added", "modified", "estimatedMinutes", "containingFolderId",
        "containingFolderName", "tags", "sequential", "singleActionList",
        "completedByChildren", "taskCount", "remainingTaskCount",
        "lastReviewDate", "nextReviewDate", "reviewInterval",
      ];
      for (const field of fields) {
        expect(serializeProjectFn).toContain(field);
      }
    });

    it("should map Project.Status enums correctly", () => {
      expect(serializeProjectFn).toContain("Project.Status.Active");
      expect(serializeProjectFn).toContain("Project.Status.OnHold");
      expect(serializeProjectFn).toContain("Project.Status.Done");
      expect(serializeProjectFn).toContain("Project.Status.Dropped");
    });

    it("should use _projectStatusMap", () => {
      expect(serializeProjectFn).toContain("_projectStatusMap");
      expect(serializeProjectFn).toContain('_projectStatusMap[project.status] || "active"');
    });

    it("should handle review interval", () => {
      expect(serializeProjectFn).toContain("project.reviewInterval");
      expect(serializeProjectFn).toContain("reviewInterval.steps");
    });

    it("should count tasks and remaining tasks", () => {
      expect(serializeProjectFn).toContain("flattenedTasks");
      expect(serializeProjectFn).toContain("Task.Status.Available");
      expect(serializeProjectFn).toContain("Task.Status.Blocked");
    });

    it("should use containsSingletonActions for SAL", () => {
      expect(serializeProjectFn).toContain("project.containsSingletonActions");
    });
  });

  // ─── serializeFolderFn ──────────────────────────────────────────

  describe("serializeFolderFn", () => {
    it("should contain all required folder field names", () => {
      const fields = [
        "id", "name", "url", "status", "parentFolderId",
        "childFolderIds", "projectIds", "projectCount", "folderCount",
      ];
      for (const field of fields) {
        expect(serializeFolderFn).toContain(field);
      }
    });

    it("should map Folder.Status.Dropped", () => {
      expect(serializeFolderFn).toContain("Folder.Status.Dropped");
    });

    it("should default status to active", () => {
      expect(serializeFolderFn).toContain('"active"');
    });

    it("should check parent constructor is Folder", () => {
      expect(serializeFolderFn).toContain("folder.parent.constructor === Folder");
    });
  });

  // ─── serializeFolderWithChildrenFn ──────────────────────────────

  describe("serializeFolderWithChildrenFn", () => {
    it("should call serializeFolder", () => {
      expect(serializeFolderWithChildrenFn).toContain("serializeFolder(folder)");
    });

    it("should recurse into child folders", () => {
      expect(serializeFolderWithChildrenFn).toContain("serializeFolderWithChildren(f, depth + 1, maxDepth)");
    });

    it("should serialize projects", () => {
      expect(serializeFolderWithChildrenFn).toContain("serializeProject(p)");
    });

    it("should respect maxDepth limit", () => {
      expect(serializeFolderWithChildrenFn).toContain("maxDepth === 0 || depth < maxDepth");
    });
  });

  // ─── serializeTagFn ─────────────────────────────────────────────

  describe("serializeTagFn", () => {
    it("should contain all required tag field names", () => {
      const fields = [
        "id", "name", "url", "status", "parentTagId",
        "childTagIds", "allowsNextAction",
        "availableTaskCount", "remainingTaskCount",
      ];
      for (const field of fields) {
        expect(serializeTagFn).toContain(field);
      }
    });

    it("should map Tag.Status enums correctly", () => {
      expect(serializeTagFn).toContain("Tag.Status.Active");
      expect(serializeTagFn).toContain("Tag.Status.OnHold");
      expect(serializeTagFn).toContain("Tag.Status.Dropped");
    });

    it("should use _tagStatusMap", () => {
      expect(serializeTagFn).toContain("_tagStatusMap");
      expect(serializeTagFn).toContain('_tagStatusMap[tag.status] || "active"');
    });

    it("should check parent constructor is Tag", () => {
      expect(serializeTagFn).toContain("tag.parent.constructor === Tag");
    });

    it("should count available and remaining tasks", () => {
      expect(serializeTagFn).toContain("tag.availableTasks.length");
      expect(serializeTagFn).toContain("tag.remainingTasks.length");
    });
  });

  // ─── serializeTagWithChildrenFn ─────────────────────────────────

  describe("serializeTagWithChildrenFn", () => {
    it("should call serializeTag", () => {
      expect(serializeTagWithChildrenFn).toContain("serializeTag(tag)");
    });

    it("should recurse into child tags", () => {
      expect(serializeTagWithChildrenFn).toContain("serializeTagWithChildren(c, depth + 1, maxDepth)");
    });

    it("should respect maxDepth limit", () => {
      expect(serializeTagWithChildrenFn).toContain("maxDepth === 0 || depth < maxDepth");
    });

    it("should initialize childTags as empty array", () => {
      expect(serializeTagWithChildrenFn).toContain("result.childTags = []");
    });
  });

  // ─── serializePerspectiveFn ─────────────────────────────────────

  describe("serializePerspectiveFn", () => {
    it("should contain id and name fields", () => {
      expect(serializePerspectiveFn).toContain("perspective.id.primaryKey");
      expect(serializePerspectiveFn).toContain("perspective.name");
    });

    it("should define serializePerspective as a function", () => {
      expect(serializePerspectiveFn).toContain("function serializePerspective(perspective)");
    });
  });

  // ─── serializeTaskNotificationFn ────────────────────────────────

  describe("serializeTaskNotificationFn", () => {
    it("should use Task.Notification.Kind (NOT Notification.Kind)", () => {
      expect(serializeTaskNotificationFn).toContain("Task.Notification.Kind.DueRelative");
      expect(serializeTaskNotificationFn).toContain("Task.Notification.Kind.Absolute");
      // Should NOT use plain Notification.Kind (web API)
      expect(serializeTaskNotificationFn).not.toMatch(/[^.]Notification\.Kind\./);
    });

    it("should contain all required notification field names", () => {
      const fields = [
        "id", "kind", "absoluteFireDate", "relativeFireOffset",
        "nextFireDate", "isSnoozed",
      ];
      for (const field of fields) {
        expect(serializeTaskNotificationFn).toContain(field);
      }
    });

    it("should handle absolute notification type", () => {
      expect(serializeTaskNotificationFn).toContain('kind === "absolute"');
      expect(serializeTaskNotificationFn).toContain("absoluteFireDate");
    });

    it("should handle dueRelative notification type", () => {
      expect(serializeTaskNotificationFn).toContain('kind === "dueRelative"');
      expect(serializeTaskNotificationFn).toContain("relativeFireDate");
    });

    it("should use _notifKindMap", () => {
      expect(serializeTaskNotificationFn).toContain("_notifKindMap");
      expect(serializeTaskNotificationFn).toContain('_notifKindMap[notif.kind] || "unknown"');
    });

    it("should use try/catch for date access", () => {
      expect(serializeTaskNotificationFn).toContain("try {");
      expect(serializeTaskNotificationFn).toContain("} catch(e) {}");
    });
  });
});
