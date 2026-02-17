export function buildDatabaseSummaryScript(): string {
  return `(() => {
  var doc = document;
  var inbox = doc.inboxTasks.filter(function(t) { return t.taskStatus === Task.Status.Available; });
  var projects = doc.flattenedProjects.filter(function(p) { return p.status === Project.Status.Active; });
  var tags = doc.flattenedTags;
  var folders = doc.flattenedFolders;

  var now = new Date();
  var soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  var allTasks = doc.flattenedTasks;
  var available = allTasks.filter(function(t) { return t.taskStatus === Task.Status.Available; });
  var dueSoon = available.filter(function(t) { return t.dueDate && t.dueDate <= soon && t.dueDate >= now; });
  var overdue = available.filter(function(t) { return t.dueDate && t.dueDate < now; });
  var flagged = available.filter(function(t) { return t.flagged; });

  return JSON.stringify({
    inboxCount: inbox.length,
    projectCount: projects.length,
    tagCount: tags.length,
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

  ${searchSerializeFn}

  var results = [];

  var tasks = document.flattenedTasks;
  for (var i = 0; i < tasks.length && results.length < limit; i++) {
    var t = tasks[i];
    if (t.name.toLowerCase().indexOf(query) !== -1 || t.note.toLowerCase().indexOf(query) !== -1) {
      results.push({ type: "task", id: t.id.primaryKey, name: t.name, note: t.note.substring(0, 200) });
    }
  }

  var projects = document.flattenedProjects;
  for (var i = 0; i < projects.length && results.length < limit; i++) {
    var p = projects[i];
    if (p.name.toLowerCase().indexOf(query) !== -1 || p.note.toLowerCase().indexOf(query) !== -1) {
      results.push({ type: "project", id: p.id.primaryKey, name: p.name, note: p.note.substring(0, 200) });
    }
  }

  var folders = document.flattenedFolders;
  for (var i = 0; i < folders.length && results.length < limit; i++) {
    var f = folders[i];
    if (f.name.toLowerCase().indexOf(query) !== -1) {
      results.push({ type: "folder", id: f.id.primaryKey, name: f.name });
    }
  }

  var tags = document.flattenedTags;
  for (var i = 0; i < tags.length && results.length < limit; i++) {
    var tg = tags[i];
    if (tg.name.toLowerCase().indexOf(query) !== -1) {
      results.push({ type: "tag", id: tg.id.primaryKey, name: tg.name });
    }
  }

  return JSON.stringify(results.slice(0, limit));
})()`;
}

const searchSerializeFn = `
  // minimal serialization for search results
`;
