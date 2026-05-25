import { describe, it, expect } from "vitest";
import {
  buildListProjectsScript,
  buildGetProjectScript,
  buildCreateProjectScript,
  buildUpdateProjectScript,
  buildCompleteProjectScript,
  buildDropProjectScript,
  buildMoveProjectScript,
  buildDeleteProjectScript,
  buildGetReviewQueueScript,
  buildMarkReviewedScript,
  buildGetProjectTasksScript,
} from "../../../../src/omnifocus/scripts/projects.js";

describe("project script builders", () => {
  describe("buildListProjectsScript", () => {
    it("should generate valid script with no filters", () => {
      const script = buildListProjectsScript({});
      expect(script).toContain("flattenedProjects");
      expect(script).toContain("serializeProject");
      expect(script).toContain("JSON.stringify");
    });

    it("should include status filter", () => {
      const script = buildListProjectsScript({ status: "active" });
      expect(script).toContain("active");
      expect(script).toContain("Project.Status.Active");
      expect(script).toContain("!projectIsEffectivelyDropped(p)");
    });

    it("should include onHold status filter", () => {
      const script = buildListProjectsScript({ status: "onHold" });
      expect(script).toContain("Project.Status.OnHold");
    });

    it("should include done status filter", () => {
      const script = buildListProjectsScript({ status: "done" });
      expect(script).toContain("Project.Status.Done");
    });

    it("should include dropped status filter", () => {
      const script = buildListProjectsScript({ status: "dropped" });
      expect(script).toContain("Project.Status.Dropped");
      expect(script).toContain("projectIsEffectivelyDropped(p)");
    });

    it("should include folder filter by ID", () => {
      const script = buildListProjectsScript({ folderId: "folder-123" });
      expect(script).toContain("folder-123");
    });

    it("should include folder filter by name", () => {
      const script = buildListProjectsScript({ folderName: "Work" });
      expect(script).toContain("Work");
    });

    it("should include search filter with null note guard (Bug 1 regression)", () => {
      const script = buildListProjectsScript({ search: "test" });
      expect(script).toContain("test");
      expect(script).toContain('(p.note || "")');
    });

    it("should include pagination", () => {
      const script = buildListProjectsScript({ limit: 25, offset: 5 });
      expect(script).toContain("25");
      expect(script).toContain("5");
    });
  });

  describe("buildGetProjectScript", () => {
    it("should look up by ID first, then by name", () => {
      const script = buildGetProjectScript("proj-123");
      expect(script).toContain("proj-123");
      expect(script).toContain("byId");
      expect(script).toContain("p.name");
    });
  });

  describe("buildCreateProjectScript", () => {
    it("should create project with name", () => {
      const script = buildCreateProjectScript({ name: "New Project" });
      expect(script).toContain("New Project");
      expect(script).toContain("new Project");
      expect(script).toContain("serializeProject");
    });

    it("should handle folder assignment by ID", () => {
      const script = buildCreateProjectScript({ name: "Test", folderId: "folder-1" });
      expect(script).toContain("folder-1");
      expect(script).toContain("byId(flattenedFolders");
    });

    it("should handle folder assignment by name", () => {
      const script = buildCreateProjectScript({ name: "Test", folderName: "Work" });
      expect(script).toContain("Work");
    });

    it("should handle optional properties", () => {
      const script = buildCreateProjectScript({
        name: "Test",
        note: "Some notes",
        sequential: true,
        singleActionList: true,
        flagged: true,
        deferDate: "2024-01-01T00:00:00Z",
        dueDate: "2024-12-31T23:59:59Z",
        plannedDate: "2024-06-15T12:00:00Z",
      });
      expect(script).toContain("Some notes");
      expect(script).toContain("sequential");
      expect(script).toContain("containsSingletonActions");
      expect(script).toContain("flagged");
      expect(script).toContain("plannedDate");
    });

    it("should handle review interval", () => {
      const script = buildCreateProjectScript({
        name: "Test",
        reviewInterval: { steps: 2, unit: "weeks" },
      });
      expect(script).toContain("reviewInterval");
      expect(script).toContain("ri.steps = args.reviewInterval.steps");
    });

    it("should handle tags", () => {
      const script = buildCreateProjectScript({ name: "Test", tags: ["work", "urgent"] });
      expect(script).toContain("work");
      expect(script).toContain("urgent");
      expect(script).toContain("addTag");
    });

    it("should handle completedByChildren", () => {
      const script = buildCreateProjectScript({ name: "Test", completedByChildren: true });
      expect(script).toContain("completedByChildren");
    });
  });

  describe("buildUpdateProjectScript", () => {
    it("should update project by ID", () => {
      const script = buildUpdateProjectScript({ id: "proj-123", name: "Renamed" });
      expect(script).toContain("proj-123");
      expect(script).toContain("Renamed");
    });

    it("should handle status update", () => {
      const script = buildUpdateProjectScript({ id: "proj-123", status: "onHold" });
      expect(script).toContain("Project.Status.OnHold");
    });

    it("should handle all status transitions", () => {
      expect(buildUpdateProjectScript({ id: "proj-123", status: "active" })).toContain("Project.Status.Active");
      expect(buildUpdateProjectScript({ id: "proj-123", status: "done" })).toContain("Project.Status.Done");
      expect(buildUpdateProjectScript({ id: "proj-123", status: "dropped" })).toContain("Project.Status.Dropped");
    });

    it("should handle review interval update", () => {
      const script = buildUpdateProjectScript({
        id: "proj-123",
        reviewInterval: { steps: 1, unit: "months" },
      });
      expect(script).toContain("ri.steps = args.reviewInterval.steps");
    });

    it("should handle clearing dates with null", () => {
      const script = buildUpdateProjectScript({ id: "proj-123", dueDate: null, deferDate: null, plannedDate: null });
      expect(script).toContain("dueDate");
      expect(script).toContain("deferDate");
      expect(script).toContain("plannedDate");
    });

    it("should handle singleActionList update", () => {
      const script = buildUpdateProjectScript({ id: "proj-123", singleActionList: true });
      expect(script).toContain("containsSingletonActions");
    });
  });

  describe("buildCompleteProjectScript", () => {
    it("should set project status to done", () => {
      const script = buildCompleteProjectScript("proj-123");
      expect(script).toContain("proj-123");
      expect(script).toContain("Project.Status.Done");
      expect(script).toContain("serializeProject");
    });
  });

  describe("buildDropProjectScript", () => {
    it("should set project status to dropped", () => {
      const script = buildDropProjectScript("proj-123");
      expect(script).toContain("proj-123");
      expect(script).toContain("Project.Status.Dropped");
    });
  });

  describe("buildMoveProjectScript", () => {
    it("should move project to folder", () => {
      const script = buildMoveProjectScript("proj-123", "folder-456");
      expect(script).toContain("proj-123");
      expect(script).toContain("folder-456");
      expect(script).toContain("moveSections");
    });
  });

  describe("buildDeleteProjectScript", () => {
    it("should delete project by ID", () => {
      const script = buildDeleteProjectScript("proj-123");
      expect(script).toContain("proj-123");
      expect(script).toContain("deleteObject");
    });
  });

  describe("buildGetReviewQueueScript", () => {
    it("includes both Active and OnHold projects with past review dates so OnHold projects appear in review", () => {
      const script = buildGetReviewQueueScript();
      expect(script).toContain("Project.Status.Active");
      expect(script).toContain("Project.Status.OnHold");
      expect(script).toContain("nextReviewDate");
      expect(script).toContain("serializeProject");
      expect(script).toContain("!projectIsEffectivelyDropped(p)");
      // The filter must allow either status; pinning the disjunction protects against accidental Active-only narrowing.
      expect(script).toMatch(/Project\.Status\.Active\s*\|\|\s*p\.status\s*===\s*Project\.Status\.OnHold/);
    });
  });

  describe("buildMarkReviewedScript", () => {
    it("should set lastReviewDate on the project", () => {
      const script = buildMarkReviewedScript("proj-123");
      expect(script).toContain("proj-123");
      expect(script).toContain("lastReviewDate");
    });
  });

  describe("buildGetProjectTasksScript", () => {
    it("should get tasks for a project", () => {
      const script = buildGetProjectTasksScript({ projectId: "proj-123" });
      expect(script).toContain("proj-123");
      expect(script).toContain("flattenedTasks");
      expect(script).toContain("serializeTask");
    });

    it("should filter out completed tasks by default", () => {
      const script = buildGetProjectTasksScript({ projectId: "proj-123" });
      expect(script).toContain("Task.Status.Completed");
      expect(script).toContain("taskIsEffectivelyDropped");
    });

    it("should include completed tasks when requested", () => {
      const script = buildGetProjectTasksScript({ projectId: "proj-123", includeCompleted: true });
      expect(script).toContain("includeCompleted");
    });
  });
});
