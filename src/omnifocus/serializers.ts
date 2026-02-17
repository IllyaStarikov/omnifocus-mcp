/**
 * Shared OmniJS serialization functions as string templates.
 * These are embedded directly in OmniJS scripts to convert OmniFocus objects to JSON.
 */

export const serializeTaskFn = `
function serializeTask(task) {
  return {
    id: task.id.primaryKey,
    name: task.name,
    note: task.note,
    flagged: task.flagged,
    completed: task.taskStatus === Task.Status.Completed,
    dropped: task.taskStatus === Task.Status.Dropped,
    deferDate: task.deferDate ? task.deferDate.toISOString() : null,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    completionDate: task.completionDate ? task.completionDate.toISOString() : null,
    droppedDate: task.droppedDate ? task.droppedDate.toISOString() : null,
    estimatedMinutes: task.estimatedMinutes,
    containingProjectId: task.containingProject ? task.containingProject.id.primaryKey : null,
    containingProjectName: task.containingProject ? task.containingProject.name : null,
    parentTaskId: task.parent ? (task.parent.id ? task.parent.id.primaryKey : null) : null,
    tags: task.tags.map(function(t) { return { id: t.id.primaryKey, name: t.name }; }),
    hasChildren: task.hasChildren,
    sequential: task.sequential,
    inInbox: task.inInbox
  };
}`;

export const serializeProjectFn = `
function serializeProject(project) {
  var statusMap = {};
  statusMap[Project.Status.Active] = "active";
  statusMap[Project.Status.OnHold] = "onHold";
  statusMap[Project.Status.Done] = "done";
  statusMap[Project.Status.Dropped] = "dropped";

  var ri = null;
  if (project.reviewInterval) {
    ri = { steps: project.reviewInterval.steps, unit: project.reviewInterval.unit + "" };
  }

  return {
    id: project.id.primaryKey,
    name: project.name,
    note: project.note,
    status: statusMap[project.status] || "active",
    flagged: project.flagged,
    completed: project.status === Project.Status.Done,
    deferDate: project.deferDate ? project.deferDate.toISOString() : null,
    dueDate: project.dueDate ? project.dueDate.toISOString() : null,
    completionDate: project.completionDate ? project.completionDate.toISOString() : null,
    estimatedMinutes: project.estimatedMinutes,
    containingFolderId: project.parentFolder ? project.parentFolder.id.primaryKey : null,
    containingFolderName: project.parentFolder ? project.parentFolder.name : null,
    tags: project.task.tags.map(function(t) { return { id: t.id.primaryKey, name: t.name }; }),
    sequential: project.sequential,
    taskCount: project.flattenedTasks.length,
    remainingTaskCount: project.flattenedTasks.filter(function(t) { return t.taskStatus === Task.Status.Available || t.taskStatus === Task.Status.Blocked; }).length,
    lastReviewDate: project.lastReviewDate ? project.lastReviewDate.toISOString() : null,
    nextReviewDate: project.nextReviewDate ? project.nextReviewDate.toISOString() : null,
    reviewInterval: ri
  };
}`;

export const serializeFolderFn = `
function serializeFolder(folder) {
  return {
    id: folder.id.primaryKey,
    name: folder.name,
    parentFolderId: folder.parent && folder.parent.constructor === Folder ? folder.parent.id.primaryKey : null,
    projectCount: folder.flattenedProjects.length,
    folderCount: folder.folders.length
  };
}`;

export const serializeTagFn = `
function serializeTag(tag) {
  return {
    id: tag.id.primaryKey,
    name: tag.name,
    parentTagId: tag.parent && tag.parent.constructor === Tag ? tag.parent.id.primaryKey : null,
    allowsNextAction: tag.allowsNextAction,
    availableTaskCount: tag.availableTasks.length,
    remainingTaskCount: tag.remainingTasks.length
  };
}`;

export const serializePerspectiveFn = `
function serializePerspective(perspective) {
  return {
    id: perspective.id.primaryKey,
    name: perspective.name
  };
}`;
