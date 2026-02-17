import { serializeProjectFn } from "../serializers.js";
import type { ListProjectsArgs, CreateProjectArgs, UpdateProjectArgs } from "../../types/omnifocus.js";

export function buildListProjectsScript(args: ListProjectsArgs): string {
  const argsJson = JSON.stringify(args);
  return `(() => {
  var args = JSON.parse(${JSON.stringify(argsJson)});
  ${serializeProjectFn}

  var projects = document.flattenedProjects.slice();

  // Filter by status
  if (args.status === "active") {
    projects = projects.filter(function(p) { return p.status === Project.Status.Active; });
  } else if (args.status === "onHold") {
    projects = projects.filter(function(p) { return p.status === Project.Status.OnHold; });
  } else if (args.status === "done") {
    projects = projects.filter(function(p) { return p.status === Project.Status.Done; });
  } else if (args.status === "dropped") {
    projects = projects.filter(function(p) { return p.status === Project.Status.Dropped; });
  }

  // Filter by folder
  if (args.folderId) {
    projects = projects.filter(function(p) {
      return p.parentFolder && p.parentFolder.id.primaryKey === args.folderId;
    });
  }
  if (args.folderName) {
    projects = projects.filter(function(p) {
      return p.parentFolder && p.parentFolder.name === args.folderName;
    });
  }

  // Search
  if (args.search) {
    var query = args.search.toLowerCase();
    projects = projects.filter(function(p) {
      return p.name.toLowerCase().indexOf(query) !== -1 || p.note.toLowerCase().indexOf(query) !== -1;
    });
  }

  // Pagination
  var offset = args.offset || 0;
  var limit = args.limit || 100;
  projects = projects.slice(offset, offset + limit);

  return JSON.stringify(projects.map(serializeProject));
})()`;
}

export function buildGetProjectScript(idOrName: string): string {
  const argsJson = JSON.stringify({ idOrName });
  return `(() => {
  var args = JSON.parse(${JSON.stringify(argsJson)});
  ${serializeProjectFn}

  var project = document.flattenedProjects.byId(args.idOrName);
  if (!project) {
    var matches = document.flattenedProjects.filter(function(p) { return p.name === args.idOrName; });
    if (matches.length > 0) project = matches[0];
  }
  if (!project) throw new Error("Project not found: " + args.idOrName);
  return JSON.stringify(serializeProject(project));
})()`;
}

export function buildCreateProjectScript(args: CreateProjectArgs): string {
  const argsJson = JSON.stringify(args);
  return `(() => {
  var args = JSON.parse(${JSON.stringify(argsJson)});
  ${serializeProjectFn}

  var folder = null;
  if (args.folderId) {
    folder = document.flattenedFolders.byId(args.folderId);
    if (!folder) throw new Error("Folder not found: " + args.folderId);
  } else if (args.folderName) {
    var folders = document.flattenedFolders.filter(function(f) { return f.name === args.folderName; });
    if (folders.length === 0) throw new Error("Folder not found: " + args.folderName);
    folder = folders[0];
  }

  var project = new Project(args.name, folder ? folder.ending : document.portfolios[0].ending);

  if (args.note !== undefined) project.note = args.note;
  if (args.sequential !== undefined) project.sequential = args.sequential;
  if (args.singleActionList === true) project.containsSingletonActions = true;
  if (args.deferDate) project.deferDate = new Date(args.deferDate);
  if (args.dueDate) project.dueDate = new Date(args.dueDate);
  if (args.flagged !== undefined) project.flagged = args.flagged;

  if (args.reviewInterval) {
    project.reviewInterval = new Project.ReviewInterval(args.reviewInterval.steps, args.reviewInterval.unit);
  }

  if (args.tags && args.tags.length > 0) {
    args.tags.forEach(function(tagName) {
      var matches = document.flattenedTags.filter(function(t) { return t.name === tagName; });
      if (matches.length > 0) {
        project.task.addTag(matches[0]);
      } else {
        var newTag = new Tag(tagName);
        document.tags.push(newTag);
        project.task.addTag(newTag);
      }
    });
  }

  return JSON.stringify(serializeProject(project));
})()`;
}

export function buildUpdateProjectScript(args: UpdateProjectArgs): string {
  const argsJson = JSON.stringify(args);
  return `(() => {
  var args = JSON.parse(${JSON.stringify(argsJson)});
  ${serializeProjectFn}

  var project = document.flattenedProjects.byId(args.id);
  if (!project) throw new Error("Project not found: " + args.id);

  if (args.name !== undefined) project.name = args.name;
  if (args.note !== undefined) project.note = args.note;
  if (args.sequential !== undefined) project.sequential = args.sequential;
  if (args.flagged !== undefined) project.flagged = args.flagged;
  if (args.deferDate !== undefined) project.deferDate = args.deferDate ? new Date(args.deferDate) : null;
  if (args.dueDate !== undefined) project.dueDate = args.dueDate ? new Date(args.dueDate) : null;

  if (args.status === "active") project.status = Project.Status.Active;
  else if (args.status === "onHold") project.status = Project.Status.OnHold;
  else if (args.status === "done") project.status = Project.Status.Done;
  else if (args.status === "dropped") project.status = Project.Status.Dropped;

  if (args.reviewInterval) {
    project.reviewInterval = new Project.ReviewInterval(args.reviewInterval.steps, args.reviewInterval.unit);
  }

  return JSON.stringify(serializeProject(project));
})()`;
}

export function buildCompleteProjectScript(id: string): string {
  const argsJson = JSON.stringify({ id });
  return `(() => {
  var args = JSON.parse(${JSON.stringify(argsJson)});
  ${serializeProjectFn}

  var project = document.flattenedProjects.byId(args.id);
  if (!project) throw new Error("Project not found: " + args.id);
  project.status = Project.Status.Done;
  return JSON.stringify(serializeProject(project));
})()`;
}

export function buildDeleteProjectScript(id: string): string {
  const argsJson = JSON.stringify({ id });
  return `(() => {
  var args = JSON.parse(${JSON.stringify(argsJson)});

  var project = document.flattenedProjects.byId(args.id);
  if (!project) throw new Error("Project not found: " + args.id);
  deleteObject(project);
  return JSON.stringify({ deleted: true, id: args.id });
})()`;
}

export function buildGetReviewQueueScript(): string {
  return `(() => {
  ${serializeProjectFn}

  var now = new Date();
  var projects = document.flattenedProjects.filter(function(p) {
    return p.status === Project.Status.Active && p.nextReviewDate && p.nextReviewDate <= now;
  });

  return JSON.stringify(projects.map(serializeProject));
})()`;
}

export function buildMarkReviewedScript(id: string): string {
  const argsJson = JSON.stringify({ id });
  return `(() => {
  var args = JSON.parse(${JSON.stringify(argsJson)});
  ${serializeProjectFn}

  var project = document.flattenedProjects.byId(args.id);
  if (!project) throw new Error("Project not found: " + args.id);
  project.markReviewed();
  return JSON.stringify(serializeProject(project));
})()`;
}
