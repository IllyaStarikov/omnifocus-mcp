import { serializePerspectiveFn, serializeTaskFn } from "../serializers.js";

export function buildListPerspectivesScript(): string {
  return `(() => {
  ${serializePerspectiveFn}

  // Only custom perspectives are exposed by OmniJS via Perspective.Custom.all.
  // Built-in perspectives (Inbox, Forecast, Flagged, Review, etc.) are not enumerable here —
  // callers use the dedicated tools (get_inbox_tasks, get_flagged_tasks, get_review_queue, etc.).
  var perspectives = Perspective.Custom.all.slice();
  return JSON.stringify(perspectives.map(serializePerspective));
})()`;
}

export function buildGetPerspectiveTasksScript(name: string): string {
  const argsJson = JSON.stringify({ name });
  return `(() => {
  var args = JSON.parse(${JSON.stringify(argsJson)});
  ${serializeTaskFn}

  var perspectives = Perspective.Custom.all.filter(function(p) { return p.name === args.name; });
  if (perspectives.length === 0) throw new Error("Perspective not found: " + args.name);

  var win = document.windows[0];
  if (!win) throw new Error("No OmniFocus window available");

  // NOTE: This mutates the user's active OmniFocus window by changing its perspective.
  // Save and restore the original perspective to minimize disruption.
  var originalPerspective = win.perspective;
  try {
    win.perspective = perspectives[0];

    // Read content after perspective switch
    var content = win.content;
    if (!content || !content.trees || content.trees.length === 0) {
      return JSON.stringify([]);
    }

    var tasks = [];
    function collectTasks(trees) {
      for (var i = 0; i < trees.length; i++) {
        var node = trees[i];
        if (node.value && node.value.constructor === Task) {
          tasks.push(serializeTask(node.value));
        }
        if (node.children && node.children.length > 0) {
          collectTasks(node.children);
        }
      }
    }
    collectTasks(content.trees);

    return JSON.stringify(tasks);
  } finally {
    win.perspective = originalPerspective;
  }
})()`;
}
