/**
 * Shared OmniJS serialization functions as string templates.
 * These are embedded directly in OmniJS scripts to convert OmniFocus objects to JSON.
 *
 * Maps are hoisted outside serializer functions to avoid re-allocation per call.
 */

export const serializeTaskFn = `
var _taskMethodMap = {};
_taskMethodMap[Task.RepetitionMethod.Fixed] = "fixed";
_taskMethodMap[Task.RepetitionMethod.StartAfterCompletion] = "startAfterCompletion";
_taskMethodMap[Task.RepetitionMethod.DueAfterCompletion] = "dueAfterCompletion";

function serializeTask(task) {
  var rr = null;
  if (task.repetitionRule) {
    rr = {
      ruleString: task.repetitionRule.ruleString,
      method: _taskMethodMap[task.repetitionRule.method] || "fixed"
    };
  }
  var cp = task.containingProject;
  return {
    id: task.id.primaryKey,
    name: task.name,
    note: task.note,
    url: "omnifocus:///task/" + task.id.primaryKey,
    flagged: task.flagged,
    completed: task.taskStatus === Task.Status.Completed,
    dropped: task.taskStatus === Task.Status.Dropped,
    deferDate: task.deferDate ? task.deferDate.toISOString() : null,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    plannedDate: task.plannedDate ? task.plannedDate.toISOString() : null,
    completionDate: task.completionDate ? task.completionDate.toISOString() : null,
    droppedDate: task.droppedDate ? task.droppedDate.toISOString() : null,
    added: task.added ? task.added.toISOString() : null,
    modified: task.modified ? task.modified.toISOString() : null,
    effectiveDueDate: task.effectiveDueDate ? task.effectiveDueDate.toISOString() : null,
    effectiveDeferDate: task.effectiveDeferDate ? task.effectiveDeferDate.toISOString() : null,
    effectivePlannedDate: task.effectivePlannedDate ? task.effectivePlannedDate.toISOString() : null,
    effectiveFlagged: task.effectiveFlagged,
    estimatedMinutes: task.estimatedMinutes,
    containingProjectId: cp ? cp.id.primaryKey : null,
    containingProjectName: cp ? cp.name : null,
    parentTaskId: task.parent ? (task.parent.id ? task.parent.id.primaryKey : null) : null,
    tags: task.tags.map(function(t) { return { id: t.id.primaryKey, name: t.name }; }),
    hasChildren: task.hasChildren,
    sequential: task.sequential,
    completedByChildren: task.completedByChildren,
    inInbox: task.inInbox,
    repetitionRule: rr
  };
}`;

export const serializeTaskWithChildrenFn = `
function serializeTaskWithChildren(task, depth, maxDepth) {
  var result = serializeTask(task);
  result.children = [];
  if (task.hasChildren && (maxDepth === 0 || depth < maxDepth)) {
    var kids = task.children;
    for (var i = 0; i < kids.length; i++) {
      result.children.push(serializeTaskWithChildren(kids[i], depth + 1, maxDepth));
    }
  }
  return result;
}`;

export const serializeProjectFn = `
var _projectStatusMap = {};
_projectStatusMap[Project.Status.Active] = "active";
_projectStatusMap[Project.Status.OnHold] = "onHold";
_projectStatusMap[Project.Status.Done] = "done";
_projectStatusMap[Project.Status.Dropped] = "dropped";

function serializeProject(project) {
  var ri = null;
  if (project.reviewInterval) {
    ri = { steps: project.reviewInterval.steps, unit: project.reviewInterval.unit + "" };
  }

  var ft = project.flattenedTasks;
  return {
    id: project.id.primaryKey,
    name: project.name,
    note: project.note,
    url: "omnifocus:///task/" + project.id.primaryKey,
    status: _projectStatusMap[project.status] || "active",
    flagged: project.flagged,
    completed: project.status === Project.Status.Done,
    deferDate: project.deferDate ? project.deferDate.toISOString() : null,
    dueDate: project.dueDate ? project.dueDate.toISOString() : null,
    plannedDate: project.plannedDate ? project.plannedDate.toISOString() : null,
    completionDate: project.completionDate ? project.completionDate.toISOString() : null,
    droppedDate: project.droppedDate ? project.droppedDate.toISOString() : null,
    added: project.task.added ? project.task.added.toISOString() : null,
    modified: project.task.modified ? project.task.modified.toISOString() : null,
    estimatedMinutes: project.estimatedMinutes,
    containingFolderId: project.parentFolder ? project.parentFolder.id.primaryKey : null,
    containingFolderName: project.parentFolder ? project.parentFolder.name : null,
    tags: project.task.tags.map(function(t) { return { id: t.id.primaryKey, name: t.name }; }),
    sequential: project.sequential,
    singleActionList: project.containsSingletonActions,
    completedByChildren: project.completedByChildren,
    taskCount: ft.length,
    remainingTaskCount: ft.filter(function(t) { return t.taskStatus === Task.Status.Available || t.taskStatus === Task.Status.Blocked; }).length,
    lastReviewDate: project.lastReviewDate ? project.lastReviewDate.toISOString() : null,
    nextReviewDate: project.nextReviewDate ? project.nextReviewDate.toISOString() : null,
    reviewInterval: ri
  };
}`;

export const serializeFolderFn = `
function serializeFolder(folder) {
  var statusVal = "active";
  if (folder.status === Folder.Status.Dropped) statusVal = "dropped";
  return {
    id: folder.id.primaryKey,
    name: folder.name,
    url: "omnifocus:///folder/" + folder.id.primaryKey,
    status: statusVal,
    parentFolderId: folder.parent && folder.parent.constructor === Folder ? folder.parent.id.primaryKey : null,
    childFolderIds: folder.folders.map(function(f) { return f.id.primaryKey; }),
    projectIds: folder.projects.map(function(p) { return p.id.primaryKey; }),
    projectCount: folder.flattenedProjects.length,
    folderCount: folder.folders.length
  };
}`;

export const serializeFolderWithChildrenFn = `
function serializeFolderWithChildren(folder, depth, maxDepth) {
  var result = serializeFolder(folder);
  result.childFolders = [];
  result.projects = folder.projects.map(function(p) { return serializeProject(p); });
  if (maxDepth === 0 || depth < maxDepth) {
    result.childFolders = folder.folders.map(function(f) { return serializeFolderWithChildren(f, depth + 1, maxDepth); });
  }
  return result;
}`;

export const serializeTagFn = `
var _tagStatusMap = {};
_tagStatusMap[Tag.Status.Active] = "active";
_tagStatusMap[Tag.Status.OnHold] = "onHold";
_tagStatusMap[Tag.Status.Dropped] = "dropped";

function serializeTag(tag) {
  return {
    id: tag.id.primaryKey,
    name: tag.name,
    url: "omnifocus:///tag/" + tag.id.primaryKey,
    status: _tagStatusMap[tag.status] || "active",
    parentTagId: tag.parent && tag.parent.constructor === Tag ? tag.parent.id.primaryKey : null,
    childTagIds: tag.children.map(function(c) { return c.id.primaryKey; }),
    allowsNextAction: tag.allowsNextAction,
    availableTaskCount: tag.availableTasks.length,
    remainingTaskCount: tag.remainingTasks.length
  };
}`;

export const serializeTagWithChildrenFn = `
function serializeTagWithChildren(tag, depth, maxDepth) {
  var result = serializeTag(tag);
  result.childTags = [];
  if (maxDepth === 0 || depth < maxDepth) {
    result.childTags = tag.children.map(function(c) { return serializeTagWithChildren(c, depth + 1, maxDepth); });
  }
  return result;
}`;

export const serializePerspectiveFn = `
function serializePerspective(perspective) {
  return {
    id: perspective.id.primaryKey,
    name: perspective.name
  };
}`;

export const serializeTaskNotificationFn = `
var _notifKindMap = {};
_notifKindMap[Task.Notification.Kind.DueRelative] = "dueRelative";
_notifKindMap[Task.Notification.Kind.Absolute] = "absolute";

function serializeTaskNotification(notif) {
  var kind = _notifKindMap[notif.kind] || "unknown";
  var absDate = null;
  var relOffset = null;
  if (kind === "absolute") {
    try { absDate = notif.absoluteFireDate ? notif.absoluteFireDate.toISOString() : null; } catch(e) {}
  } else if (kind === "dueRelative") {
    try { relOffset = notif.relativeFireOffset !== null ? notif.relativeFireOffset : null; } catch(e) {}
  }
  return {
    id: notif.id.primaryKey,
    kind: kind,
    absoluteFireDate: absDate,
    relativeFireOffset: relOffset,
    nextFireDate: notif.nextFireDate ? notif.nextFireDate.toISOString() : null,
    isSnoozed: notif.isSnoozed
  };
}`;
