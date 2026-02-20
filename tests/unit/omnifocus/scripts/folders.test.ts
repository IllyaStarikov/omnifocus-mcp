import { describe, it, expect } from "vitest";
import {
  buildListFoldersScript,
  buildGetFolderScript,
  buildCreateFolderScript,
  buildUpdateFolderScript,
  buildDeleteFolderScript,
} from "../../../../src/omnifocus/scripts/folders.js";

describe("folder script builders", () => {
  describe("buildListFoldersScript", () => {
    it("should generate valid list script", () => {
      const script = buildListFoldersScript();
      expect(script).toContain("flattenedFolders");
      expect(script).toContain("serializeFolder");
      expect(script).toContain("JSON.stringify");
    });
  });

  describe("buildGetFolderScript", () => {
    it("should look up folder by ID", () => {
      const script = buildGetFolderScript("folder-123");
      expect(script).toContain("folder-123");
      expect(script).toContain("byId");
    });

    it("should include folder with children serializer", () => {
      const script = buildGetFolderScript("folder-123");
      expect(script).toContain("serializeFolderWithChildren");
    });

    it("should include project serializer for nested data", () => {
      const script = buildGetFolderScript("folder-123");
      expect(script).toContain("serializeProject");
    });
  });

  describe("buildCreateFolderScript", () => {
    it("should create folder with name", () => {
      const script = buildCreateFolderScript({ name: "New Folder" });
      expect(script).toContain("New Folder");
      expect(script).toContain("new Folder");
      expect(script).toContain("serializeFolder");
    });

    it("should handle parent folder by ID", () => {
      const script = buildCreateFolderScript({ name: "Sub", parentFolderId: "folder-1" });
      expect(script).toContain("folder-1");
      expect(script).toContain("byId(flattenedFolders");
    });

    it("should handle parent folder by name", () => {
      const script = buildCreateFolderScript({ name: "Sub", parentFolderName: "Parent" });
      expect(script).toContain("Parent");
    });
  });

  describe("buildUpdateFolderScript", () => {
    it("should update folder by ID", () => {
      const script = buildUpdateFolderScript({ id: "folder-123", name: "Renamed" });
      expect(script).toContain("folder-123");
      expect(script).toContain("Renamed");
    });

    it("should handle dropped status", () => {
      const script = buildUpdateFolderScript({ id: "folder-123", status: "dropped" });
      expect(script).toContain("Folder.Status.Dropped");
    });

    it("should handle active status", () => {
      const script = buildUpdateFolderScript({ id: "folder-123", status: "active" });
      expect(script).toContain("Folder.Status.Active");
    });
  });

  describe("buildDeleteFolderScript", () => {
    it("should delete folder by ID", () => {
      const script = buildDeleteFolderScript("folder-123");
      expect(script).toContain("folder-123");
      expect(script).toContain("deleteObject");
    });
  });
});
