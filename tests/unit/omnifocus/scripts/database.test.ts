import { describe, it, expect } from "vitest";
import {
  buildDatabaseSummaryScript,
  buildSearchScript,
  buildDumpDatabaseScript,
  buildSaveDatabaseScript,
  buildSyncDatabaseScript,
} from "../../../../src/omnifocus/scripts/database.js";

describe("database script builders", () => {
  describe("buildDatabaseSummaryScript", () => {
    it("should generate a valid summary script", () => {
      const script = buildDatabaseSummaryScript();
      expect(script).toContain("inbox");
      expect(script).toContain("flattenedProjects");
      expect(script).toContain("flattenedTags");
      expect(script).toContain("flattenedFolders");
      expect(script).toContain("JSON.stringify");
    });

    it("should count available tasks", () => {
      const script = buildDatabaseSummaryScript();
      expect(script).toContain("Task.Status.Available");
    });

    it("should count due soon and overdue tasks", () => {
      const script = buildDatabaseSummaryScript();
      expect(script).toContain("dueSoon");
      expect(script).toContain("overdue");
    });

    it("counts overdue and due-soon by Task.Status so tasks with inherited project due dates are included", () => {
      const script = buildDatabaseSummaryScript();
      expect(script).toContain("Task.Status.Overdue");
      expect(script).toContain("Task.Status.DueSoon");
      // Filtering Available-only first would miss Overdue/DueSoon (mutually exclusive statuses).
      expect(script).not.toMatch(/available\.filter\([^)]*dueDate/);
    });

    it("counts flagged by effectiveFlagged so children of a flagged project are included", () => {
      const script = buildDatabaseSummaryScript();
      expect(script).toContain("t.effectiveFlagged");
      // The buggy pattern was `return t.flagged;` — pin so it can't come back.
      expect(script).not.toMatch(/return\s+t\.flagged\b/);
    });

    it("counts flagged across all non-Completed/Dropped statuses, not just 'available'", () => {
      const script = buildDatabaseSummaryScript();
      // Scoping flagged from `available` would silently drop flagged Overdue/DueSoon/Blocked/Next.
      expect(script).not.toMatch(/available\.filter\([^)]*flagged/);
      expect(script).toContain("Task.Status.Completed");
      expect(script).toContain("Task.Status.Dropped");
    });
  });

  describe("buildSearchScript", () => {
    it("should embed query and limit", () => {
      const script = buildSearchScript("test query", 25);
      expect(script).toContain("test query");
      expect(script).toContain("25");
    });

    it("should search tasks, projects, folders, and tags", () => {
      const script = buildSearchScript("foo", 50);
      expect(script).toContain("flattenedTasks");
      expect(script).toContain("flattenedProjects");
      expect(script).toContain("flattenedFolders");
      expect(script).toContain("flattenedTags");
    });

    it("should use case-insensitive search", () => {
      const script = buildSearchScript("foo", 50);
      expect(script).toContain("toLowerCase");
    });

    it("should guard against null notes (Bug 1 regression)", () => {
      const script = buildSearchScript("foo", 50);
      expect(script).toContain('(t.note || "")');
      expect(script).toContain('(p.note || "")');
    });
  });

  describe("buildDumpDatabaseScript", () => {
    it("should generate dump script with defaults", () => {
      const script = buildDumpDatabaseScript();
      expect(script).toContain("serializeTaskWithChildren");
      expect(script).toContain("serializeProject");
      expect(script).toContain("serializeFolderWithChildren");
      expect(script).toContain("serializeTagWithChildren");
      expect(script).toContain("serializePerspective");
    });

    it("should pass includeCompleted option", () => {
      const script = buildDumpDatabaseScript({ includeCompleted: true });
      expect(script).toContain("includeCompleted");
    });

    it("should pass maxDepth option", () => {
      const script = buildDumpDatabaseScript({ maxDepth: 3 });
      expect(script).toContain("maxDepth");
      expect(script).toContain("3");
    });

    it("should include summary section", () => {
      const script = buildDumpDatabaseScript();
      expect(script).toContain("summary");
      expect(script).toContain("inboxCount");
      expect(script).toContain("projectCount");
    });

    it("dump summary counts overdue and due-soon by Task.Status", () => {
      const script = buildDumpDatabaseScript();
      expect(script).toContain("Task.Status.Overdue");
      expect(script).toContain("Task.Status.DueSoon");
      expect(script).not.toMatch(/available\.filter\([^)]*dueDate/);
    });

    it("dump summary counts flagged by effectiveFlagged so children of a flagged project are included", () => {
      const script = buildDumpDatabaseScript();
      expect(script).toContain("t.effectiveFlagged");
      expect(script).not.toMatch(/return\s+t\.flagged\b/);
    });

    it("dump summary counts flagged across all non-Completed/Dropped statuses, not just 'available'", () => {
      const script = buildDumpDatabaseScript();
      expect(script).not.toMatch(/available\.filter\([^)]*flagged/);
    });

    it("should pass hideRecurringDuplicates option", () => {
      const script = buildDumpDatabaseScript({ hideRecurringDuplicates: true });
      expect(script).toContain("hideRecurringDuplicates");
      expect(script).toContain("repetitionRule");
      expect(script).toContain("deferDate");
    });
  });

  describe("buildSaveDatabaseScript", () => {
    it("should call document.save()", () => {
      const script = buildSaveDatabaseScript();
      expect(script).toContain("document.save()");
    });

    it("should return saved status", () => {
      const script = buildSaveDatabaseScript();
      expect(script).toContain("saved");
    });
  });

  describe("buildSyncDatabaseScript", () => {
    it("should call Application.synchronize()", () => {
      const script = buildSyncDatabaseScript();
      expect(script).toContain('Application("OmniFocus")');
      expect(script).toContain("synchronize");
    });

    it("should return syncTriggered status", () => {
      const script = buildSyncDatabaseScript();
      expect(script).toContain("syncTriggered");
    });

    it("should be JXA, NOT OmniJS (no evaluateJavascript wrapper)", () => {
      // Sync is a Mac/JXA Apple Events command — not exposed in the OmniJS sandbox.
      // The script must run via runJXA, not runOmniJS.
      const script = buildSyncDatabaseScript();
      expect(script).not.toContain("evaluateJavascript");
      expect(script).not.toContain("document.save");
      expect(script).not.toContain("flattenedTasks");
    });
  });
});
