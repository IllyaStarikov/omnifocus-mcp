// ─── Serialized JSON types returned from OmniJS scripts ─────────────

export interface TaskJSON {
  id: string;
  name: string;
  note: string;
  url: string;
  flagged: boolean;
  completed: boolean;
  dropped: boolean;
  deferDate: string | null;
  dueDate: string | null;
  completionDate: string | null;
  droppedDate: string | null;
  added: string | null;
  modified: string | null;
  effectiveDueDate: string | null;
  effectiveDeferDate: string | null;
  effectiveFlagged: boolean;
  estimatedMinutes: number | null;
  containingProjectId: string | null;
  containingProjectName: string | null;
  parentTaskId: string | null;
  tags: { id: string; name: string }[];
  hasChildren: boolean;
  sequential: boolean;
  completedByChildren: boolean;
  inInbox: boolean;
  repetitionRule: {
    ruleString: string;
    method: "fixed" | "startAfterCompletion" | "dueAfterCompletion";
  } | null;
}

export interface TaskWithChildrenJSON extends TaskJSON {
  children: TaskWithChildrenJSON[];
}

export interface ProjectJSON {
  id: string;
  name: string;
  note: string;
  url: string;
  status: "active" | "onHold" | "done" | "dropped";
  flagged: boolean;
  completed: boolean;
  deferDate: string | null;
  dueDate: string | null;
  completionDate: string | null;
  droppedDate: string | null;
  added: string | null;
  modified: string | null;
  estimatedMinutes: number | null;
  containingFolderId: string | null;
  containingFolderName: string | null;
  tags: { id: string; name: string }[];
  sequential: boolean;
  singleActionList: boolean;
  completedByChildren: boolean;
  taskCount: number;
  remainingTaskCount: number;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  reviewInterval: { steps: number; unit: string } | null;
}

export interface FolderJSON {
  id: string;
  name: string;
  url: string;
  status: "active" | "dropped";
  parentFolderId: string | null;
  childFolderIds: string[];
  projectIds: string[];
  projectCount: number;
  folderCount: number;
}

export interface FolderWithChildrenJSON extends FolderJSON {
  childFolders: FolderWithChildrenJSON[];
  projects: ProjectJSON[];
}

export interface TagJSON {
  id: string;
  name: string;
  url: string;
  status: "active" | "onHold" | "dropped";
  parentTagId: string | null;
  childTagIds: string[];
  allowsNextAction: boolean;
  availableTaskCount: number;
  remainingTaskCount: number;
}

export interface TagWithChildrenJSON extends TagJSON {
  childTags: TagWithChildrenJSON[];
}

export interface PerspectiveJSON {
  id: string;
  name: string;
}

export interface DatabaseSummaryJSON {
  inboxCount: number;
  projectCount: number;
  tagCount: number;
  folderCount: number;
  availableTaskCount: number;
  dueSoonTaskCount: number;
  overdueTaskCount: number;
  flaggedTaskCount: number;
}

export interface DatabaseDumpJSON {
  inbox: TaskWithChildrenJSON[];
  projects: ProjectJSON[];
  folders: FolderWithChildrenJSON[];
  tags: TagWithChildrenJSON[];
  perspectives: PerspectiveJSON[];
  summary: DatabaseSummaryJSON;
}

// ─── Argument types for script builders ─────────────────────────────

export interface ListTasksArgs {
  completed?: boolean;
  flagged?: boolean;
  available?: boolean;
  inInbox?: boolean;
  projectId?: string;
  projectName?: string;
  tagNames?: string[];
  dueAfter?: string;
  dueBefore?: string;
  deferAfter?: string;
  deferBefore?: string;
  search?: string;
  taskStatus?: "available" | "remaining" | "completed" | "dropped";
  limit?: number;
  offset?: number;
}

export interface CreateTaskArgs {
  name: string;
  note?: string;
  flagged?: boolean;
  deferDate?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  completedByChildren?: boolean;
  projectId?: string;
  projectName?: string;
  tags?: string[];
  repetitionRule?: {
    ruleString: string;
    method: "fixed" | "startAfterCompletion" | "dueAfterCompletion";
  };
}

export interface UpdateTaskArgs {
  id: string;
  name?: string;
  note?: string;
  flagged?: boolean;
  deferDate?: string | null;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  sequential?: boolean;
  completedByChildren?: boolean;
  repetitionRule?: {
    ruleString: string;
    method: "fixed" | "startAfterCompletion" | "dueAfterCompletion";
  } | null;
}

export interface GetTaskArgs {
  id: string;
  includeChildren?: boolean;
  maxDepth?: number;
}

export interface MoveTasksArgs {
  taskIds: string[];
  projectId?: string;
  projectName?: string;
  parentTaskId?: string;
}

export interface DuplicateTasksArgs {
  taskIds: string[];
  projectId?: string;
  projectName?: string;
}

export interface SetTaskTagsArgs {
  taskId: string;
  tagNames: string[];
  mode: "replace" | "add" | "remove";
}

export interface AddTaskNotificationArgs {
  taskId: string;
  type: "absolute" | "dueRelative";
  absoluteDate?: string;
  relativeOffset?: number;
}

export interface ListProjectsArgs {
  status?: "active" | "onHold" | "done" | "dropped";
  folderId?: string;
  folderName?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateProjectArgs {
  name: string;
  note?: string;
  folderId?: string;
  folderName?: string;
  sequential?: boolean;
  singleActionList?: boolean;
  completedByChildren?: boolean;
  deferDate?: string;
  dueDate?: string;
  flagged?: boolean;
  tags?: string[];
  reviewInterval?: { steps: number; unit: string };
}

export interface UpdateProjectArgs {
  id: string;
  name?: string;
  note?: string;
  status?: "active" | "onHold" | "done" | "dropped";
  sequential?: boolean;
  singleActionList?: boolean;
  completedByChildren?: boolean;
  deferDate?: string | null;
  dueDate?: string | null;
  flagged?: boolean;
  reviewInterval?: { steps: number; unit: string };
}

export interface GetProjectTasksArgs {
  projectId: string;
  includeCompleted?: boolean;
}

export interface CreateFolderArgs {
  name: string;
  parentFolderId?: string;
  parentFolderName?: string;
}

export interface UpdateFolderArgs {
  id: string;
  name?: string;
  status?: "active" | "dropped";
}

export interface CreateTagArgs {
  name: string;
  parentTagId?: string;
  parentTagName?: string;
  allowsNextAction?: boolean;
  status?: "active" | "onHold" | "dropped";
}

export interface UpdateTagArgs {
  id: string;
  name?: string;
  allowsNextAction?: boolean;
  status?: "active" | "onHold" | "dropped";
}

export interface SearchArgs {
  query: string;
  limit?: number;
}

export interface BatchCreateTaskItem {
  name: string;
  note?: string;
  flagged?: boolean;
  deferDate?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  completedByChildren?: boolean;
  tags?: string[];
  repetitionRule?: {
    ruleString: string;
    method: "fixed" | "startAfterCompletion" | "dueAfterCompletion";
  };
  children?: BatchCreateTaskItem[];
}

export interface BatchCreateTasksArgs {
  tasks: BatchCreateTaskItem[];
  projectId?: string;
  projectName?: string;
  parentTaskId?: string;
}

export interface BatchDeleteTasksArgs {
  taskIds: string[];
}

export interface BatchCompleteTasksArgs {
  taskIds: string[];
}

export interface ListPerspectivesArgs {
  includeBuiltIn?: boolean;
  includeCustom?: boolean;
}

export interface DumpDatabaseArgs {
  includeCompleted?: boolean;
  maxDepth?: number;
  hideRecurringDuplicates?: boolean;
}

export interface TaskNotificationJSON {
  id: string;
  kind: "absolute" | "dueRelative" | "unknown";
  absoluteFireDate: string | null;
  relativeFireOffset: number | null;
  nextFireDate: string | null;
  isSnoozed: boolean;
}
