import type { DatabaseSummaryJSON } from "../../src/types/omnifocus.js";

export const mockDatabaseSummary: DatabaseSummaryJSON = {
  inboxCount: 5,
  projectCount: 12,
  tagCount: 8,
  folderCount: 3,
  availableTaskCount: 42,
  dueSOonTaskCount: 3,
  overdueTaskCount: 1,
  flaggedTaskCount: 7,
};

export const mockSearchResults = [
  { type: "task", id: "task-1", name: "Buy groceries", note: "Milk, eggs, bread" },
  { type: "project", id: "proj-1", name: "Grocery shopping", note: "" },
  { type: "tag", id: "tag-1", name: "errands" },
];
