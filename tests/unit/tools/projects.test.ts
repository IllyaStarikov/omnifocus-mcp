import { describe, it, expect, vi, beforeEach } from "vitest";
import { OmniFocusClient } from "../../../src/omnifocus/client.js";
import { mockProject, mockProjectList } from "../../fixtures/projects.js";

vi.mock("../../../src/omnifocus/executor.js", () => ({
  runOmniJS: vi.fn(),
  runOmniJSJson: vi.fn(),
}));

import { runOmniJSJson } from "../../../src/omnifocus/executor.js";
const mockRunOmniJSJson = vi.mocked(runOmniJSJson);

describe("Project client methods", () => {
  let client: OmniFocusClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OmniFocusClient();
  });

  describe("listProjects", () => {
    it("should return project list", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProjectList);
      const projects = await client.listProjects();
      expect(projects).toHaveLength(2);
      expect(projects[0].name).toBe("Household");
    });

    it("should cache results", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProjectList);
      await client.listProjects();
      await client.listProjects();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(1);
    });

    it("should pass status filter", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockProject]);
      await client.listProjects({ status: "active" });
      const script = mockRunOmniJSJson.mock.calls[0][0];
      expect(script).toContain("active");
    });
  });

  describe("getProject", () => {
    it("should return a project by ID", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProject);
      const project = await client.getProject("proj-abc-123");
      expect(project.id).toBe("proj-abc-123");
    });

    it("should cache project", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProject);
      await client.getProject("proj-abc-123");
      await client.getProject("proj-abc-123");
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(1);
    });
  });

  describe("createProject", () => {
    it("should create and return a project", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProject);
      const result = await client.createProject({ name: "Household" });
      expect(result.name).toBe("Household");
    });

    it("should invalidate project cache", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProjectList);
      await client.listProjects();

      mockRunOmniJSJson.mockResolvedValue(mockProject);
      await client.createProject({ name: "New project" });

      mockRunOmniJSJson.mockResolvedValue(mockProjectList);
      await client.listProjects();
      expect(mockRunOmniJSJson).toHaveBeenCalledTimes(3);
    });
  });

  describe("completeProject", () => {
    it("should complete a project", async () => {
      mockRunOmniJSJson.mockResolvedValue({ ...mockProject, completed: true, status: "done" });
      const result = await client.completeProject("proj-abc-123");
      expect(result.completed).toBe(true);
    });
  });

  describe("deleteProject", () => {
    it("should delete a project", async () => {
      mockRunOmniJSJson.mockResolvedValue({ deleted: true, id: "proj-abc-123" });
      const result = await client.deleteProject("proj-abc-123");
      expect(result.deleted).toBe(true);
    });
  });

  describe("getReviewQueue", () => {
    it("should return projects due for review", async () => {
      mockRunOmniJSJson.mockResolvedValue([mockProject]);
      const result = await client.getReviewQueue();
      expect(result).toHaveLength(1);
    });
  });

  describe("markReviewed", () => {
    it("should mark project as reviewed", async () => {
      mockRunOmniJSJson.mockResolvedValue(mockProject);
      const result = await client.markReviewed("proj-abc-123");
      expect(result.id).toBe("proj-abc-123");
    });
  });
});
