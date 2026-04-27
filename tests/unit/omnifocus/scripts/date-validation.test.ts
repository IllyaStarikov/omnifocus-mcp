import { describe, it, expect } from "vitest";
import {
  buildCreateTaskScript,
  buildUpdateTaskScript,
  buildBatchCreateTasksScript,
  buildAddTaskNotificationScript,
} from "../../../../src/omnifocus/scripts/tasks.js";
import {
  buildCreateProjectScript,
  buildUpdateProjectScript,
} from "../../../../src/omnifocus/scripts/projects.js";

describe("date validation in script builders", () => {
  describe("buildCreateTaskScript", () => {
    it("should accept valid ISO date strings", () => {
      expect(() =>
        buildCreateTaskScript({
          name: "Test",
          deferDate: "2024-01-15T10:30:00.000Z",
          dueDate: "2024-12-31T23:59:59Z",
        }),
      ).not.toThrow();
    });

    it("should accept date-only strings", () => {
      expect(() =>
        buildCreateTaskScript({
          name: "Test",
          dueDate: "2024-06-01",
        }),
      ).not.toThrow();
    });

    it("should throw for invalid deferDate", () => {
      expect(() =>
        buildCreateTaskScript({
          name: "Test",
          deferDate: "not-a-date",
        }),
      ).toThrow("Invalid date for 'deferDate'");
    });

    it("should throw for invalid dueDate", () => {
      expect(() =>
        buildCreateTaskScript({
          name: "Test",
          dueDate: "tomorrow",
        }),
      ).toThrow("Invalid date for 'dueDate'");
    });

    it("should throw for invalid plannedDate", () => {
      expect(() =>
        buildCreateTaskScript({
          name: "Test",
          plannedDate: "next week",
        }),
      ).toThrow("Invalid date for 'plannedDate'");
    });

    it("should accept missing date fields (undefined)", () => {
      expect(() =>
        buildCreateTaskScript({ name: "Test" }),
      ).not.toThrow();
    });
  });

  describe("buildUpdateTaskScript", () => {
    it("should accept valid dates", () => {
      expect(() =>
        buildUpdateTaskScript({
          id: "task-123",
          dueDate: "2024-06-01T00:00:00Z",
        }),
      ).not.toThrow();
    });

    it("should accept null dates (clearing)", () => {
      expect(() =>
        buildUpdateTaskScript({
          id: "task-123",
          dueDate: null,
        }),
      ).not.toThrow();
    });

    it("should throw for invalid dates", () => {
      expect(() =>
        buildUpdateTaskScript({
          id: "task-123",
          deferDate: "invalid",
        }),
      ).toThrow("Invalid date for 'deferDate'");
    });

    it("should throw for invalid plannedDate", () => {
      expect(() =>
        buildUpdateTaskScript({
          id: "task-123",
          plannedDate: "not-an-iso-date",
        }),
      ).toThrow("Invalid date for 'plannedDate'");
    });

    it("should accept null plannedDate (clearing)", () => {
      expect(() =>
        buildUpdateTaskScript({
          id: "task-123",
          plannedDate: null,
        }),
      ).not.toThrow();
    });
  });

  describe("buildAddTaskNotificationScript", () => {
    it("should accept valid absoluteDate", () => {
      expect(() =>
        buildAddTaskNotificationScript({
          taskId: "task-123",
          type: "absolute",
          absoluteDate: "2024-12-20T09:00:00Z",
        }),
      ).not.toThrow();
    });

    it("should throw for invalid absoluteDate", () => {
      expect(() =>
        buildAddTaskNotificationScript({
          taskId: "task-123",
          type: "absolute",
          absoluteDate: "not-a-date",
        }),
      ).toThrow("Invalid date for 'absoluteDate'");
    });

    it("should accept missing absoluteDate for non-absolute types", () => {
      expect(() =>
        buildAddTaskNotificationScript({
          taskId: "task-123",
          type: "dueRelative",
          relativeOffset: -3600,
        }),
      ).not.toThrow();
    });
  });

  describe("buildBatchCreateTasksScript", () => {
    it("should accept valid dates in batch tasks", () => {
      expect(() =>
        buildBatchCreateTasksScript({
          tasks: [
            { name: "Task 1", dueDate: "2024-06-01T00:00:00Z" },
            { name: "Task 2", deferDate: "2024-01-01" },
          ],
        }),
      ).not.toThrow();
    });

    it("should throw for invalid dates in batch tasks", () => {
      expect(() =>
        buildBatchCreateTasksScript({
          tasks: [
            { name: "Task 1", dueDate: "bad-date" },
          ],
        }),
      ).toThrow("Invalid date for 'dueDate'");
    });

    it("should validate dates in nested children", () => {
      expect(() =>
        buildBatchCreateTasksScript({
          tasks: [{
            name: "Parent",
            children: [{ name: "Child", dueDate: "not-valid" }],
          }],
        }),
      ).toThrow("Invalid date for 'dueDate'");
    });

    it("should throw for invalid plannedDate in batch tasks", () => {
      expect(() =>
        buildBatchCreateTasksScript({
          tasks: [
            { name: "Task 1", plannedDate: "bad-planned" },
          ],
        }),
      ).toThrow("Invalid date for 'plannedDate'");
    });

    it("should validate plannedDate in nested children", () => {
      expect(() =>
        buildBatchCreateTasksScript({
          tasks: [{
            name: "Parent",
            children: [{ name: "Child", plannedDate: "nope" }],
          }],
        }),
      ).toThrow("Invalid date for 'plannedDate'");
    });

    it("should accept tasks with no dates", () => {
      expect(() =>
        buildBatchCreateTasksScript({
          tasks: [{ name: "Simple task" }],
        }),
      ).not.toThrow();
    });
  });

  describe("buildCreateProjectScript", () => {
    it("should accept valid dates", () => {
      expect(() =>
        buildCreateProjectScript({
          name: "Project",
          deferDate: "2024-01-01T00:00:00Z",
          dueDate: "2024-12-31T23:59:59Z",
        }),
      ).not.toThrow();
    });

    it("should throw for invalid dueDate", () => {
      expect(() =>
        buildCreateProjectScript({
          name: "Project",
          dueDate: "nope",
        }),
      ).toThrow("Invalid date for 'dueDate'");
    });

    it("should throw for invalid plannedDate", () => {
      expect(() =>
        buildCreateProjectScript({
          name: "Project",
          plannedDate: "soonish",
        }),
      ).toThrow("Invalid date for 'plannedDate'");
    });
  });

  describe("buildUpdateProjectScript", () => {
    it("should accept valid dates", () => {
      expect(() =>
        buildUpdateProjectScript({
          id: "proj-123",
          dueDate: "2024-06-01",
        }),
      ).not.toThrow();
    });

    it("should accept null dates", () => {
      expect(() =>
        buildUpdateProjectScript({
          id: "proj-123",
          dueDate: null,
        }),
      ).not.toThrow();
    });

    it("should throw for invalid deferDate", () => {
      expect(() =>
        buildUpdateProjectScript({
          id: "proj-123",
          deferDate: "yesterday",
        }),
      ).toThrow("Invalid date for 'deferDate'");
    });

    it("should throw for invalid plannedDate", () => {
      expect(() =>
        buildUpdateProjectScript({
          id: "proj-123",
          plannedDate: "next quarter",
        }),
      ).toThrow("Invalid date for 'plannedDate'");
    });

    it("should accept null plannedDate (clearing)", () => {
      expect(() =>
        buildUpdateProjectScript({
          id: "proj-123",
          plannedDate: null,
        }),
      ).not.toThrow();
    });
  });
});
