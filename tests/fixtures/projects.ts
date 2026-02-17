import type { ProjectJSON } from "../../src/types/omnifocus.js";

export const mockProject: ProjectJSON = {
  id: "proj-abc-123",
  name: "Household",
  note: "Things around the house",
  status: "active",
  flagged: false,
  completed: false,
  deferDate: null,
  dueDate: null,
  completionDate: null,
  estimatedMinutes: null,
  containingFolderId: "folder-1",
  containingFolderName: "Personal",
  tags: [],
  sequential: false,
  taskCount: 5,
  remainingTaskCount: 3,
  lastReviewDate: "2024-12-01T00:00:00.000Z",
  nextReviewDate: "2024-12-15T00:00:00.000Z",
  reviewInterval: { steps: 2, unit: "week" },
};

export const mockSequentialProject: ProjectJSON = {
  id: "proj-def-456",
  name: "Book Writing ✍️",
  note: "Write the book chapter by chapter",
  status: "active",
  flagged: true,
  completed: false,
  deferDate: "2024-01-01T00:00:00.000Z",
  dueDate: "2024-12-31T23:59:59.000Z",
  completionDate: null,
  estimatedMinutes: 6000,
  containingFolderId: "folder-2",
  containingFolderName: "Work",
  tags: [{ id: "tag-1", name: "writing" }],
  sequential: true,
  taskCount: 20,
  remainingTaskCount: 15,
  lastReviewDate: null,
  nextReviewDate: null,
  reviewInterval: null,
};

export const mockProjectList: ProjectJSON[] = [mockProject, mockSequentialProject];
