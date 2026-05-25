import { effectiveStatusFn, serializeTaskFn, serializeTaskWithChildrenFn, serializeProjectFn, serializeFolderFn, serializeFolderWithChildrenFn, serializeTagFn, serializeTagWithChildrenFn, serializePerspectiveFn } from "../serializers.js";
import type { DumpDatabaseArgs } from "../../types/omnifocus.js";

export function buildDatabaseSummaryScript(): string {
  return `(() => {
  ${effectiveStatusFn}

  var inboxItems = inbox.filter(function(t) { return t.taskStatus === Task.Status.Available; });
  var projects = flattenedProjects.filter(function(p) { return p.status === Project.Status.Active && !projectIsEffectivelyDropped(p); });
  var tagsList = flattenedTags;
  var folders = flattenedFolders;

  var allTasks = flattenedTasks.filter(function(t) { return !taskIsEffectivelyDropped(t); });
  var available = allTasks.filter(function(t) { return t.taskStatus === Task.Status.Available; });
  // Task.Status is mutually exclusive: a past-due task's status is Overdue, not Available.
  var dueSoon = allTasks.filter(function(t) { return t.taskStatus === Task.Status.DueSoon; });
  var overdue = allTasks.filter(function(t) { return t.taskStatus === Task.Status.Overdue; });
  // Match OmniFocus's Flagged perspective and list_tasks(flagged=true): use effectiveFlagged
  // so children of flagged projects count, and span all non-Completed/Dropped statuses
  // so flagged Overdue/DueSoon/Blocked/Next tasks aren't silently dropped.
  var flagged = allTasks.filter(function(t) {
    return t.effectiveFlagged
      && t.taskStatus !== Task.Status.Completed
      && t.taskStatus !== Task.Status.Dropped;
  });

  return JSON.stringify({
    inboxCount: inboxItems.length,
    projectCount: projects.length,
    tagCount: tagsList.length,
    folderCount: folders.length,
    availableTaskCount: available.length,
    dueSoonTaskCount: dueSoon.length,
    overdueTaskCount: overdue.length,
    flaggedTaskCount: flagged.length
  });
})()`;
}

export function buildSearchScript(query: string, limit: number): string {
  const argsJson = JSON.stringify({ query, limit });
  return `(() => {
  var args = JSON.parse(${JSON.stringify(argsJson)});
  var query = args.query.toLowerCase();
  var limit = args.limit;

  var results = [];

  var tasks = flattenedTasks;
  for (var i = 0; i < tasks.length && results.length < limit; i++) {
    var t = tasks[i];
    if (t.name.toLowerCase().indexOf(query) !== -1 || (t.note || "").toLowerCase().indexOf(query) !== -1) {
      results.push({ type: "task", id: t.id.primaryKey, name: t.name, note: (t.note || "").substring(0, 200) });
    }
  }

  var projects = flattenedProjects;
  for (var i = 0; i < projects.length && results.length < limit; i++) {
    var p = projects[i];
    if (p.name.toLowerCase().indexOf(query) !== -1 || (p.note || "").toLowerCase().indexOf(query) !== -1) {
      results.push({ type: "project", id: p.id.primaryKey, name: p.name, note: (p.note || "").substring(0, 200) });
    }
  }

  var folders = flattenedFolders;
  for (var i = 0; i < folders.length && results.length < limit; i++) {
    var f = folders[i];
    if (f.name.toLowerCase().indexOf(query) !== -1) {
      results.push({ type: "folder", id: f.id.primaryKey, name: f.name });
    }
  }

  var tags = flattenedTags;
  for (var i = 0; i < tags.length && results.length < limit; i++) {
    var tg = tags[i];
    if (tg.name.toLowerCase().indexOf(query) !== -1) {
      results.push({ type: "tag", id: tg.id.primaryKey, name: tg.name });
    }
  }

  return JSON.stringify(results.slice(0, limit));
})()`;
}

export function buildDumpDatabaseScript(args: DumpDatabaseArgs = {}): string {
  const argsJson = JSON.stringify(args);
  return `(() => {
  var args = JSON.parse(${JSON.stringify(argsJson)});
  ${serializeTaskFn}
  ${serializeTaskWithChildrenFn}
  ${serializeProjectFn}
  ${serializeFolderFn}
  ${serializeFolderWithChildrenFn}
  ${serializeTagFn}
  ${serializeTagWithChildrenFn}
  ${serializePerspectiveFn}

  var maxDepth = args.maxDepth || 0;
  var includeCompleted = args.includeCompleted || false;

  var hideRecurringDuplicates = args.hideRecurringDuplicates || false;

  // Inbox tasks
  var inboxTasks = inbox.slice();
  if (!includeCompleted) {
    inboxTasks = inboxTasks.filter(function(t) { return t.taskStatus !== Task.Status.Completed && t.taskStatus !== Task.Status.Dropped; });
  }
  if (hideRecurringDuplicates) {
    var now2 = new Date();
    inboxTasks = inboxTasks.filter(function(t) {
      if (!t.repetitionRule) return true;
      return !t.deferDate || t.deferDate <= now2;
    });
  }
  var inboxSerialized = inboxTasks.map(function(t) { return serializeTaskWithChildren(t, 0, maxDepth); });

  // Projects
  var projects = flattenedProjects.slice();
  if (!includeCompleted) {
    projects = projects.filter(function(p) { return p.status !== Project.Status.Done && !projectIsEffectivelyDropped(p); });
  }
  var projectsSerialized = projects.map(serializeProject);

  // Folders (top-level with recursive children)
  var topFolders = Array.from(library).filter(function(x) { return x instanceof Folder; });
  var foldersSerialized = topFolders.map(function(f) { return serializeFolderWithChildren(f, 0, maxDepth); });

  // Tags (top-level with recursive children)
  var topTags = tags.slice();
  var tagsSerialized = topTags.map(function(t) { return serializeTagWithChildren(t, 0, maxDepth); });

  // Perspectives
  var perspectives = Perspective.Custom.all.slice();
  var perspectivesSerialized = perspectives.map(serializePerspective);

  // Summary
  var allTasks = flattenedTasks.filter(function(t) { return !taskIsEffectivelyDropped(t); });
  var available = allTasks.filter(function(t) { return t.taskStatus === Task.Status.Available; });
  // Task.Status is mutually exclusive: a past-due task's status is Overdue, not Available.
  var dueSoon = allTasks.filter(function(t) { return t.taskStatus === Task.Status.DueSoon; });
  var overdue = allTasks.filter(function(t) { return t.taskStatus === Task.Status.Overdue; });
  // Match OmniFocus's Flagged perspective and list_tasks(flagged=true): use effectiveFlagged
  // so children of flagged projects count, and span all non-Completed/Dropped statuses
  // so flagged Overdue/DueSoon/Blocked/Next tasks aren't silently dropped.
  var flagged = allTasks.filter(function(t) {
    return t.effectiveFlagged
      && t.taskStatus !== Task.Status.Completed
      && t.taskStatus !== Task.Status.Dropped;
  });

  var summary = {
    inboxCount: inbox.filter(function(t) { return t.taskStatus === Task.Status.Available; }).length,
    projectCount: flattenedProjects.filter(function(p) { return p.status === Project.Status.Active && !projectIsEffectivelyDropped(p); }).length,
    tagCount: flattenedTags.length,
    folderCount: flattenedFolders.length,
    availableTaskCount: available.length,
    dueSoonTaskCount: dueSoon.length,
    overdueTaskCount: overdue.length,
    flaggedTaskCount: flagged.length
  };

  return JSON.stringify({
    inbox: inboxSerialized,
    projects: projectsSerialized,
    folders: foldersSerialized,
    tags: tagsSerialized,
    perspectives: perspectivesSerialized,
    summary: summary
  });
})()`;
}

export function buildSaveDatabaseScript(): string {
  return `(() => {
  document.save();
  return JSON.stringify({ saved: true });
})()`;
}

/**
 * Returns a raw JXA script (NOT OmniJS) that triggers an OmniFocus sync.
 * Must be executed via runJXA, not runOmniJS — `synchronize()` is an
 * application-level Apple Events command that doesn't exist in the OmniJS
 * sandbox. Sync runs asynchronously; this returns immediately.
 */
export function buildSyncDatabaseScript(): string {
  return `(() => {
  const app = Application("OmniFocus");
  app.synchronize();
  return JSON.stringify({ syncTriggered: true });
})()`;
}
