#!/usr/bin/env node
/**
 * Smoke test for all OmniFocus MCP tools (read-only + mutation).
 * Creates items with __MCPTEST__ prefix, verifies, then cleans up.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const VERBOSE = process.argv.includes("--verbose") || process.argv.includes("-v");

// ─── OmniJS executor (same as executor.ts) ──────────────────────────────

const OMNIJS_PRELUDE = `function byId(collection, id) {
  for (var i = 0; i < collection.length; i++) {
    if (collection[i].id && collection[i].id.primaryKey === id) return collection[i];
  }
  return null;
}`;

async function runOmniJS(omniScript) {
  const fullScript = OMNIJS_PRELUDE + '\n' + omniScript;
  const jxaScript = `(() => {
  const app = Application("OmniFocus");
  return app.evaluateJavascript(${JSON.stringify(fullScript)});
})()`;

  const { stdout } = await execFileAsync("osascript", ["-l", "JavaScript", "-e", jxaScript], {
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

async function runOmniJSJson(omniScript) {
  const raw = await runOmniJS(omniScript);
  const parsed = JSON.parse(raw);
  if (VERBOSE) {
    console.log("    ↳ " + JSON.stringify(parsed, null, 2).split("\n").join("\n      "));
  }
  return parsed;
}

// ─── Import script builders ─────────────────────────────────────────────

const tags = await import("../dist/omnifocus/scripts/tags.js");
const folders = await import("../dist/omnifocus/scripts/folders.js");
const projects = await import("../dist/omnifocus/scripts/projects.js");
const tasks = await import("../dist/omnifocus/scripts/tasks.js");
const database = await import("../dist/omnifocus/scripts/database.js");
const perspectives = await import("../dist/omnifocus/scripts/perspectives.js");

// ─── Test framework ─────────────────────────────────────────────────────

const results = [];
let testNum = 0;

async function test(name, fn) {
  testNum++;
  const label = `#${testNum} ${name}`;
  try {
    await fn();
    results.push({ num: testNum, name, pass: true });
    console.log(`  ✅ ${label}`);
  } catch (err) {
    results.push({ num: testNum, name, pass: false, error: err.message });
    console.error(`  ❌ ${label}: ${err.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

// ─── IDs tracked across tests ────────────────────────────────────────────

const ids = {};

// ═══════════════════════════════════════════════════════════════════════════
//  PHASE 0: Pre-test snapshot
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n🔍 Phase 0: Pre-test snapshot");
const preSnapshot = await runOmniJSJson(database.buildDatabaseSummaryScript());
console.log("  Pre-test counts:", JSON.stringify(preSnapshot));

// ═══════════════════════════════════════════════════════════════════════════
//  PHASE 1: Create Foundation
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n🏗️  Phase 1: Create Foundation (Tags, Folders, Projects)");

await test("create_tag: TagA", async () => {
  const result = await runOmniJSJson(tags.buildCreateTagScript({ name: "__MCPTEST__TagA" }));
  ids.tagA = result.id;
  assert(result.name === "__MCPTEST__TagA", `name=${result.name}`);
});

await test("create_tag: TagB", async () => {
  const result = await runOmniJSJson(tags.buildCreateTagScript({ name: "__MCPTEST__TagB" }));
  ids.tagB = result.id;
  assert(result.name === "__MCPTEST__TagB", `name=${result.name}`);
});

await test("create_tag: NestedTag under TagA", async () => {
  const result = await runOmniJSJson(tags.buildCreateTagScript({ name: "__MCPTEST__NestedTag", parentTagName: "__MCPTEST__TagA" }));
  ids.nestedTag = result.id;
  assert(result.name === "__MCPTEST__NestedTag", `name=${result.name}`);
  // Verify via get_tag on parent
  const parent = await runOmniJSJson(tags.buildGetTagScript(ids.tagA));
  const childNames = (parent.childTags || []).map(c => c.name);
  assert(childNames.includes("__MCPTEST__NestedTag"), `childTags=${JSON.stringify(childNames)}`);
});

await test("create_folder: Folder", async () => {
  const result = await runOmniJSJson(folders.buildCreateFolderScript({ name: "__MCPTEST__Folder" }));
  ids.folder = result.id;
  assert(result.name === "__MCPTEST__Folder", `name=${result.name}`);
});

await test("create_folder: SubFolder under Folder", async () => {
  const result = await runOmniJSJson(folders.buildCreateFolderScript({ name: "__MCPTEST__SubFolder", parentFolderName: "__MCPTEST__Folder" }));
  ids.subFolder = result.id;
  assert(result.name === "__MCPTEST__SubFolder", `name=${result.name}`);
  // Verify parent shows child
  const parent = await runOmniJSJson(folders.buildGetFolderScript(ids.folder));
  const childNames = (parent.childFolders || []).map(c => c.name);
  assert(childNames.includes("__MCPTEST__SubFolder"), `childFolders=${JSON.stringify(childNames)}`);
});

await test("create_project: Project in Folder, sequential, with TagA", async () => {
  const result = await runOmniJSJson(projects.buildCreateProjectScript({
    name: "__MCPTEST__Project",
    folderName: "__MCPTEST__Folder",
    sequential: true,
    tags: ["__MCPTEST__TagA"],
  }));
  ids.project = result.id;
  assert(result.name === "__MCPTEST__Project", `name=${result.name}`);
  assert(result.sequential === true, `sequential=${result.sequential}`);
  assert(result.containingFolderName === "__MCPTEST__Folder", `containingFolderName=${result.containingFolderName}`);
  const tagNames = (result.tags || []).map(t => t.name);
  assert(tagNames.includes("__MCPTEST__TagA"), `tags=${JSON.stringify(tagNames)}`);
});

await test("create_project: Project with reviewInterval", async () => {
  const result = await runOmniJSJson(projects.buildCreateProjectScript({
    name: "__MCPTEST__ReviewedProject",
    folderName: "__MCPTEST__Folder",
    reviewInterval: { steps: 2, unit: "week" },
  }));
  ids.reviewedProject = result.id;
  assert(result.name === "__MCPTEST__ReviewedProject", `name=${result.name}`);
  assert(result.reviewInterval !== null, `reviewInterval should be set`);
  assert(result.reviewInterval.steps === 2, `reviewInterval.steps expected 2, got ${result.reviewInterval.steps}`);
  assert(result.reviewInterval.unit === "weeks", `reviewInterval.unit expected "weeks", got ${result.reviewInterval.unit}`);
});

await test("create_project: SAL in SubFolder, singleActionList", async () => {
  const result = await runOmniJSJson(projects.buildCreateProjectScript({
    name: "__MCPTEST__SAL",
    folderName: "__MCPTEST__SubFolder",
    singleActionList: true,
  }));
  ids.sal = result.id;
  assert(result.name === "__MCPTEST__SAL", `name=${result.name}`);
  assert(result.singleActionList === true, `singleActionList=${result.singleActionList}`);
});

// ═══════════════════════════════════════════════════════════════════════════
//  PHASE 1.5: Read-Only Tools
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n📖 Phase 1.5: Read-Only Tools");

await test("list_tags: returns array including __MCPTEST__ tags", async () => {
  const result = await runOmniJSJson(tags.buildListTagsScript());
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
  const names = result.map(t => t.name);
  assert(names.includes("__MCPTEST__TagA"), `missing __MCPTEST__TagA: ${JSON.stringify(names.filter(n => n.includes("MCPTEST")))}`);
  assert(names.includes("__MCPTEST__TagB"), `missing __MCPTEST__TagB`);
});

await test("list_folders: returns array including __MCPTEST__ folder", async () => {
  const result = await runOmniJSJson(folders.buildListFoldersScript());
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
  const names = result.map(f => f.name);
  assert(names.includes("__MCPTEST__Folder"), `missing __MCPTEST__Folder`);
});

await test("list_projects: returns array including __MCPTEST__ project", async () => {
  const result = await runOmniJSJson(projects.buildListProjectsScript({ limit: 200 }));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
  const names = result.map(p => p.name);
  assert(names.includes("__MCPTEST__Project"), `missing __MCPTEST__Project`);
});

await test("get_project: by ID", async () => {
  const result = await runOmniJSJson(projects.buildGetProjectScript(ids.project));
  assert(result.name === "__MCPTEST__Project", `name=${result.name}`);
  assert(result.id === ids.project, `id=${result.id}`);
});

await test("get_project: by name", async () => {
  const result = await runOmniJSJson(projects.buildGetProjectScript("__MCPTEST__Project"));
  assert(result.id === ids.project, `id mismatch: expected ${ids.project}, got ${result.id}`);
  assert(result.name === "__MCPTEST__Project", `name=${result.name}`);
});

await test("list_tasks: returns array with limit", async () => {
  const result = await runOmniJSJson(tasks.buildListTasksScript({ limit: 3 }));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
  assert(result.length <= 3, `expected at most 3, got ${result.length}`);
});

await test("get_task_count: returns count > 0", async () => {
  const result = await runOmniJSJson(tasks.buildGetTaskCountScript({}));
  assert(result.count > 0, `expected count > 0, got ${result.count}`);
});

await test("list_perspectives: returns non-empty array of custom perspectives", async () => {
  const result = await runOmniJSJson(perspectives.buildListPerspectivesScript({}));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
  assert(result.length > 0, `expected non-empty array`);
  assert(result[0].name, `expected perspective to have name`);
});

await test("get_perspective_tasks: works with first custom perspective", async () => {
  const allPersp = await runOmniJSJson(perspectives.buildListPerspectivesScript({}));
  assert(allPersp.length > 0, `no custom perspectives found`);
  try {
    const result = await runOmniJSJson(perspectives.buildGetPerspectiveTasksScript(allPersp[0].name));
    assert(Array.isArray(result), `expected array, got ${typeof result}`);
  } catch (e) {
    if (e.message.includes("Cannot change perspectives while a sheet is presented")) {
      console.log("    ⚠️  Skipped: OmniFocus has a sheet open. Close all dialogs and retry.");
      return; // pass — not a code bug
    }
    throw e;
  }
});

await test("get_inbox_tasks: returns array (empty inbox expected)", async () => {
  const result = await runOmniJSJson(tasks.buildListTasksScript({ inInbox: true }));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
});

await test("get_flagged_tasks: returns array", async () => {
  const result = await runOmniJSJson(tasks.buildListTasksScript({ flagged: true }));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
});

await test("get_review_queue: returns array", async () => {
  const result = await runOmniJSJson(projects.buildGetReviewQueueScript());
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
});

await test("get_today_completed_tasks: returns array", async () => {
  const result = await runOmniJSJson(tasks.buildGetTodayCompletedTasksScript());
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
});

await test("dump_database: returns structure with projects, folders, tags", async () => {
  const result = await runOmniJSJson(database.buildDumpDatabaseScript({ maxTasks: 1, maxProjects: 1 }));
  assert(result.projects !== undefined, `missing projects key`);
  assert(result.folders !== undefined, `missing folders key`);
  assert(result.tags !== undefined, `missing tags key`);
});

await test("save_database: completes without error", async () => {
  const result = await runOmniJS(database.buildSaveDatabaseScript());
  // save_database returns nothing meaningful, just verify no error
  assert(true, "save completed");
});

await test("list_tasks: with taskStatus 'available'", async () => {
  const result = await runOmniJSJson(tasks.buildListTasksScript({ taskStatus: "available", limit: 5 }));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
});

await test("list_tasks: with taskStatus 'remaining'", async () => {
  const result = await runOmniJSJson(tasks.buildListTasksScript({ taskStatus: "remaining", limit: 5 }));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
});

await test("list_tasks: with search text", async () => {
  const result = await runOmniJSJson(tasks.buildListTasksScript({ search: "__MCPTEST__", limit: 10 }));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
});

await test("list_tasks: with date filters (dueAfter/dueBefore)", async () => {
  const result = await runOmniJSJson(tasks.buildListTasksScript({
    dueAfter: "2020-01-01T00:00:00Z",
    dueBefore: "2030-12-31T23:59:59Z",
    limit: 5,
  }));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
});

await test("list_tasks: dueBefore surfaces task with inherited project due date", async () => {
  // Set the project's due date to 2 days ago so its child task is effectively overdue.
  const pastDue = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  await runOmniJSJson(projects.buildUpdateProjectScript({ id: ids.project, dueDate: pastDue }));

  // Create a child task with NO own due date — it inherits the project's due date.
  const childTask = await runOmniJSJson(tasks.buildCreateTaskScript({
    name: "__MCPTEST__InheritedDueChild",
    projectId: ids.project,
  }));
  ids.inheritedDueChild = childTask.id;
  assert(childTask.dueDate === null, `child own dueDate should be null, got ${childTask.dueDate}`);
  assert(childTask.effectiveDueDate !== null, `child effectiveDueDate should inherit, got null`);

  // Filter dueBefore = tomorrow. The inherited-overdue child must appear.
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const filtered = await runOmniJSJson(tasks.buildListTasksScript({ dueBefore: tomorrow, limit: 500 }));
  const names = filtered.map(t => t.name);
  assert(
    names.includes("__MCPTEST__InheritedDueChild"),
    `child with inherited overdue date should be in dueBefore results; MCPTEST matches: ${JSON.stringify(names.filter(n => n.includes("MCPTEST")))}`
  );
});

await test("get_database_summary: overdueTaskCount counts tasks with inherited project due dates", async () => {
  const summary = await runOmniJSJson(database.buildDatabaseSummaryScript());
  assert(typeof summary.overdueTaskCount === "number", `overdueTaskCount must be number, got ${typeof summary.overdueTaskCount}`);
  assert(
    summary.overdueTaskCount > preSnapshot.overdueTaskCount,
    `overdueTaskCount should have increased after adding inherited-overdue task; pre=${preSnapshot.overdueTaskCount}, now=${summary.overdueTaskCount}`
  );
});

await test("list_tasks: with planned date filters (plannedAfter/plannedBefore)", async () => {
  const result = await runOmniJSJson(tasks.buildListTasksScript({
    plannedAfter: "2020-01-01T00:00:00Z",
    plannedBefore: "2030-12-31T23:59:59Z",
    limit: 5,
  }));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
});

await test("list_tasks: with projectId filter", async () => {
  const result = await runOmniJSJson(tasks.buildListTasksScript({ projectId: ids.project, limit: 10 }));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
});

await test("get_task_count: with flagged filter", async () => {
  const result = await runOmniJSJson(tasks.buildGetTaskCountScript({ flagged: true }));
  assert(typeof result.count === "number", `expected count to be number, got ${typeof result.count}`);
});

await test("get_task_count: with projectName filter", async () => {
  const result = await runOmniJSJson(tasks.buildGetTaskCountScript({ projectName: "__MCPTEST__Project" }));
  assert(typeof result.count === "number", `expected count to be number, got ${typeof result.count}`);
});

await test("list_projects: with search filter", async () => {
  const result = await runOmniJSJson(projects.buildListProjectsScript({ search: "__MCPTEST__" }));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
  assert(result.length > 0, `expected at least 1 matching project`);
});

await test("list_projects: with offset", async () => {
  const result = await runOmniJSJson(projects.buildListProjectsScript({ limit: 5, offset: 0 }));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
});

await test("dump_database: with includeCompleted", async () => {
  const result = await runOmniJSJson(database.buildDumpDatabaseScript({ includeCompleted: true }));
  assert(result.projects !== undefined, `missing projects key`);
});

await test("dump_database: with maxDepth", async () => {
  const result = await runOmniJSJson(database.buildDumpDatabaseScript({ maxDepth: 1 }));
  assert(result.tags !== undefined, `missing tags key`);
});

await test("dump_database: with hideRecurringDuplicates", async () => {
  const result = await runOmniJSJson(database.buildDumpDatabaseScript({ hideRecurringDuplicates: true }));
  assert(result.inbox !== undefined, `missing inbox key`);
});

// ═══════════════════════════════════════════════════════════════════════════
//  PHASE 2: Single Task CRUD
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n✏️  Phase 2: Single Task CRUD");

await test("create_task: Task1 with all fields", async () => {
  const result = await runOmniJSJson(tasks.buildCreateTaskScript({
    name: "__MCPTEST__Task1",
    note: "Test note for Task1",
    flagged: true,
    deferDate: "2026-03-01T09:00:00Z",
    dueDate: "2026-03-15T17:00:00Z",
    plannedDate: "2026-03-10T12:00:00Z",
    estimatedMinutes: 30,
    projectName: "__MCPTEST__Project",
    tags: ["__MCPTEST__TagA", "__MCPTEST__TagB"],
  }));
  ids.task1 = result.id;
  assert(result.name === "__MCPTEST__Task1", `name=${result.name}`);
  assert(result.note === "Test note for Task1", `note=${result.note}`);
  assert(result.flagged === true, `flagged=${result.flagged}`);
  assert(result.estimatedMinutes === 30, `estimatedMinutes=${result.estimatedMinutes}`);
  assert(result.plannedDate !== null, `plannedDate should be set, got ${result.plannedDate}`);
  const tagNames = (result.tags || []).map(t => t.name);
  assert(tagNames.includes("__MCPTEST__TagA"), `tags missing TagA: ${JSON.stringify(tagNames)}`);
  assert(tagNames.includes("__MCPTEST__TagB"), `tags missing TagB: ${JSON.stringify(tagNames)}`);
});

await test("create_task: Task2 minimal", async () => {
  const result = await runOmniJSJson(tasks.buildCreateTaskScript({
    name: "__MCPTEST__Task2",
    projectName: "__MCPTEST__Project",
  }));
  ids.task2 = result.id;
  assert(result.name === "__MCPTEST__Task2", `name=${result.name}`);
  assert(result.flagged === false, `flagged should be false: ${result.flagged}`);
});

await test("create_task: InboxTask (no project)", async () => {
  const result = await runOmniJSJson(tasks.buildCreateTaskScript({
    name: "__MCPTEST__InboxTask",
  }));
  ids.inboxTask = result.id;
  assert(result.name === "__MCPTEST__InboxTask", `name=${result.name}`);
  assert(result.inInbox === true, `inInbox=${result.inInbox}`);
});

await test("create_task: Task with repetitionRule", async () => {
  const result = await runOmniJSJson(tasks.buildCreateTaskScript({
    name: "__MCPTEST__RecurringTask",
    projectName: "__MCPTEST__Project",
    repetitionRule: { ruleString: "FREQ=WEEKLY;INTERVAL=1", method: "fixed" },
    dueDate: "2026-06-01T17:00:00Z",
  }));
  ids.recurringTask = result.id;
  assert(result.name === "__MCPTEST__RecurringTask", `name=${result.name}`);
  assert(result.repetitionRule !== null, `repetitionRule should be set`);
  assert(result.repetitionRule.ruleString === "FREQ=WEEKLY;INTERVAL=1", `ruleString=${result.repetitionRule.ruleString}`);
  assert(result.repetitionRule.method === "fixed", `method=${result.repetitionRule.method}`);
});

await test("get_task: with maxDepth", async () => {
  const result = await runOmniJSJson(tasks.buildGetTaskScript({ id: ids.task1, includeChildren: true, maxDepth: 2 }));
  assert(result.id === ids.task1, `id mismatch`);
  assert(result.children !== undefined, `children should be present`);
});

await test("get_inbox_tasks: verify InboxTask appears", async () => {
  const result = await runOmniJSJson(tasks.buildListTasksScript({ inInbox: true }));
  const names = result.map(t => t.name);
  assert(names.includes("__MCPTEST__InboxTask"), `missing InboxTask in inbox: ${JSON.stringify(names)}`);
});

await test("get_flagged_tasks: verify Task1 appears (flagged)", async () => {
  const result = await runOmniJSJson(tasks.buildListTasksScript({ flagged: true }));
  const names = result.map(t => t.name);
  assert(names.includes("__MCPTEST__Task1"), `missing flagged Task1: ${JSON.stringify(names.filter(n => n.includes("MCPTEST")))}`);
});

await test("get_project_tasks: verify tasks in __MCPTEST__Project", async () => {
  const result = await runOmniJSJson(projects.buildGetProjectTasksScript({ projectId: ids.project }));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
  const names = result.map(t => t.name);
  assert(names.includes("__MCPTEST__Task1"), `missing Task1 in project tasks`);
  assert(names.includes("__MCPTEST__Task2"), `missing Task2 in project tasks`);
});

await test("get_project_tasks: with includeCompleted=true", async () => {
  const result = await runOmniJSJson(projects.buildGetProjectTasksScript({ projectId: ids.project, includeCompleted: true }));
  assert(Array.isArray(result), `expected array, got ${typeof result}`);
});

await test("update_task: Task1 — change name, note, clear dueDate + plannedDate, set estimatedMinutes", async () => {
  const result = await runOmniJSJson(tasks.buildUpdateTaskScript({
    id: ids.task1,
    name: "__MCPTEST__Task1Updated",
    note: "Updated note",
    dueDate: null,
    plannedDate: null,
    estimatedMinutes: 60,
  }));
  assert(result.name === "__MCPTEST__Task1Updated", `name=${result.name}`);
  assert(result.note === "Updated note", `note=${result.note}`);
  assert(result.dueDate === null, `dueDate=${result.dueDate}`);
  assert(result.plannedDate === null, `plannedDate=${result.plannedDate}`);
  assert(result.estimatedMinutes === 60, `estimatedMinutes=${result.estimatedMinutes}`);
});

await test("update_task: Task2 — set sequential, completedByChildren", async () => {
  const result = await runOmniJSJson(tasks.buildUpdateTaskScript({
    id: ids.task2,
    sequential: true,
    completedByChildren: true,
  }));
  assert(result.sequential === true, `sequential=${result.sequential}`);
  assert(result.completedByChildren === true, `completedByChildren=${result.completedByChildren}`);
});

await test("set_task_tags: Task1 replace with [TagB]", async () => {
  const result = await runOmniJSJson(tasks.buildSetTaskTagsScript({
    taskId: ids.task1,
    tagNames: ["__MCPTEST__TagB"],
    mode: "replace",
  }));
  const tagNames = (result.tags || []).map(t => t.name);
  assert(tagNames.length === 1, `expected 1 tag, got ${tagNames.length}: ${JSON.stringify(tagNames)}`);
  assert(tagNames[0] === "__MCPTEST__TagB", `tag=${tagNames[0]}`);
});

await test("set_task_tags: Task1 add [TagA]", async () => {
  const result = await runOmniJSJson(tasks.buildSetTaskTagsScript({
    taskId: ids.task1,
    tagNames: ["__MCPTEST__TagA"],
    mode: "add",
  }));
  const tagNames = (result.tags || []).map(t => t.name);
  assert(tagNames.includes("__MCPTEST__TagA"), `missing TagA: ${JSON.stringify(tagNames)}`);
  assert(tagNames.includes("__MCPTEST__TagB"), `missing TagB: ${JSON.stringify(tagNames)}`);
});

await test("set_task_tags: Task1 remove [TagA]", async () => {
  const result = await runOmniJSJson(tasks.buildSetTaskTagsScript({
    taskId: ids.task1,
    tagNames: ["__MCPTEST__TagA"],
    mode: "remove",
  }));
  const tagNames = (result.tags || []).map(t => t.name);
  assert(!tagNames.includes("__MCPTEST__TagA"), `TagA should be removed: ${JSON.stringify(tagNames)}`);
  assert(tagNames.includes("__MCPTEST__TagB"), `missing TagB: ${JSON.stringify(tagNames)}`);
});

await test("append_task_note: Task1", async () => {
  const result = await runOmniJSJson(tasks.buildAppendTaskNoteScript(ids.task1, " — appended"));
  assert(result.note.endsWith(" — appended"), `note=${result.note}`);
});

await test("add_task_notification: Task1 absolute", async () => {
  await runOmniJSJson(tasks.buildAddTaskNotificationScript({
    taskId: ids.task1,
    type: "absolute",
    absoluteDate: "2026-04-01T10:00:00Z",
  }));
  const notifs = await runOmniJSJson(tasks.buildListTaskNotificationsScript(ids.task1));
  assert(notifs.length > 0, `expected notifications, got ${notifs.length}`);
  ids.notificationId = notifs[0].id;
});

await test("remove_task_notification: Task1 (absolute)", async () => {
  const result = await runOmniJSJson(tasks.buildRemoveTaskNotificationScript(ids.task1, ids.notificationId));
  assert(result.removed === true, `removed=${result.removed}`);
  const notifs = await runOmniJSJson(tasks.buildListTaskNotificationsScript(ids.task1));
  assert(notifs.length === 0, `expected 0 notifications, got ${notifs.length}`);
});

await test("add_task_notification: Task1 dueRelative (-3600s = 1hr before due)", async () => {
  // Task1's dueDate was cleared; re-set it so dueRelative works
  await runOmniJSJson(tasks.buildUpdateTaskScript({ id: ids.task1, dueDate: "2026-04-15T17:00:00Z" }));
  await runOmniJSJson(tasks.buildAddTaskNotificationScript({
    taskId: ids.task1,
    type: "dueRelative",
    relativeOffset: -3600,
  }));
  const notifs = await runOmniJSJson(tasks.buildListTaskNotificationsScript(ids.task1));
  assert(notifs.length > 0, `expected dueRelative notification, got ${notifs.length}`);
  const dueRelNotif = notifs.find(n => n.kind === "dueRelative");
  assert(dueRelNotif, `expected a dueRelative notification, got kinds: ${JSON.stringify(notifs.map(n => n.kind))}`);
  assert(dueRelNotif.relativeFireOffset === -3600, `expected relativeFireOffset=-3600, got ${dueRelNotif.relativeFireOffset}`);
  ids.dueRelNotifId = dueRelNotif.id;
});

await test("remove_task_notification: Task1 (dueRelative)", async () => {
  const result = await runOmniJSJson(tasks.buildRemoveTaskNotificationScript(ids.task1, ids.dueRelNotifId));
  assert(result.removed === true, `removed=${result.removed}`);
  // Clear dueDate again to restore state
  await runOmniJSJson(tasks.buildUpdateTaskScript({ id: ids.task1, dueDate: null }));
});

await test("complete_task: Task2", async () => {
  const result = await runOmniJSJson(tasks.buildCompleteTaskScript(ids.task2));
  assert(result.completed === true, `completed=${result.completed}`);
});

await test("get_today_completed_tasks: verify Task2 appears", async () => {
  const result = await runOmniJSJson(tasks.buildGetTodayCompletedTasksScript());
  const names = result.map(t => t.name);
  assert(names.includes("__MCPTEST__Task2"), `missing Task2 in today's completed: ${JSON.stringify(names.filter(n => n.includes("MCPTEST")))}`);
});

await test("uncomplete_task: Task2", async () => {
  const result = await runOmniJSJson(tasks.buildUncompleteTaskScript(ids.task2));
  assert(result.completed === false, `completed=${result.completed}`);
});

await test("drop_task: InboxTask", async () => {
  const result = await runOmniJSJson(tasks.buildDropTaskScript(ids.inboxTask));
  assert(result.dropped === true, `dropped=${result.dropped}`);
});

// ═══════════════════════════════════════════════════════════════════════════
//  PHASE 3: Subtasks, Batch, Move, Duplicate
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n🔀 Phase 3: Subtasks, Batch, Move, Duplicate");

await test("batch_create_tasks: with parentTaskId", async () => {
  // Create a parent task first, then add subtasks via parentTaskId
  const parentResult = await runOmniJSJson(tasks.buildCreateTaskScript({
    name: "__MCPTEST__BatchParent",
    projectName: "__MCPTEST__Project",
  }));
  ids.batchParent = parentResult.id;
  const subtaskResult = await runOmniJSJson(tasks.buildBatchCreateTasksScript({
    tasks: [{ name: "__MCPTEST__BatchSub1" }, { name: "__MCPTEST__BatchSub2" }],
    parentTaskId: ids.batchParent,
  }));
  assert(subtaskResult.length >= 2, `expected at least 2 tasks, got ${subtaskResult.length}`);
  // Verify parent has children
  const parentDetail = await runOmniJSJson(tasks.buildGetTaskScript({ id: ids.batchParent, includeChildren: true }));
  assert(parentDetail.children && parentDetail.children.length >= 2, `expected at least 2 children, got ${(parentDetail.children || []).length}`);
  // Clean up: delete batchParent (will also remove children)
  await runOmniJSJson(tasks.buildDeleteTaskScript(ids.batchParent));
});

await test("move_tasks: with projectId destination", async () => {
  // Move recurringTask to SAL by project ID
  await runOmniJSJson(tasks.buildMoveTasksScript({
    taskIds: [ids.recurringTask],
    projectId: ids.sal,
  }));
  const moved = await runOmniJSJson(tasks.buildGetTaskScript({ id: ids.recurringTask }));
  assert(moved.containingProjectName === "__MCPTEST__SAL", `expected SAL, got ${moved.containingProjectName}`);
  // Move back to Project
  await runOmniJSJson(tasks.buildMoveTasksScript({
    taskIds: [ids.recurringTask],
    projectName: "__MCPTEST__Project",
  }));
});

await test("batch_create_tasks: Parent with 2 children", async () => {
  const result = await runOmniJSJson(tasks.buildBatchCreateTasksScript({
    tasks: [{
      name: "__MCPTEST__Parent",
      children: [
        { name: "__MCPTEST__Child1" },
        { name: "__MCPTEST__Child2" },
      ],
    }],
    projectName: "__MCPTEST__Project",
  }));
  assert(result.length >= 1, `expected at least 1 task, got ${result.length}`);
  ids.parent = result[0].id;
  // Verify children
  const parentDetail = await runOmniJSJson(tasks.buildGetTaskScript({ id: ids.parent, includeChildren: true }));
  assert(parentDetail.children && parentDetail.children.length === 2, `expected 2 children, got ${(parentDetail.children || []).length}`);
  ids.child1 = parentDetail.children[0].id;
  ids.child2 = parentDetail.children[1].id;
});

await test("move_tasks: Task2 under Parent (subtask)", async () => {
  const result = await runOmniJSJson(tasks.buildMoveTasksScript({
    taskIds: [ids.task2],
    parentTaskId: ids.parent,
  }));
  // Verify parent has 3 children now
  const parentDetail = await runOmniJSJson(tasks.buildGetTaskScript({ id: ids.parent, includeChildren: true }));
  assert(parentDetail.children && parentDetail.children.length === 3, `expected 3 children, got ${(parentDetail.children || []).length}`);
});

await test("move_tasks: Task2 to SAL project", async () => {
  const result = await runOmniJSJson(tasks.buildMoveTasksScript({
    taskIds: [ids.task2],
    projectName: "__MCPTEST__SAL",
  }));
  // Verify Task2 is in SAL
  const task2 = await runOmniJSJson(tasks.buildGetTaskScript({ id: ids.task2 }));
  assert(task2.containingProjectName === "__MCPTEST__SAL", `project=${task2.containingProjectName}`);
});

await test("move_tasks: Task2 to inbox", async () => {
  const result = await runOmniJSJson(tasks.buildMoveTasksScript({
    taskIds: [ids.task2],
  }));
  const task2 = await runOmniJSJson(tasks.buildGetTaskScript({ id: ids.task2 }));
  assert(task2.inInbox === true, `inInbox=${task2.inInbox}`);
});

await test("duplicate_tasks: Child1 into SAL", async () => {
  const result = await runOmniJSJson(tasks.buildDuplicateTasksScript({
    taskIds: [ids.child1],
    projectName: "__MCPTEST__SAL",
  }));
  assert(result.length === 1, `expected 1 duplicate, got ${result.length}`);
  ids.duplicatedChild = result[0].id;
  assert(result[0].name === "__MCPTEST__Child1", `name=${result[0].name}`);
});

await test("batch_complete_tasks: [Child1, Child2]", async () => {
  const result = await runOmniJSJson(tasks.buildBatchCompleteTasksScript({
    taskIds: [ids.child1, ids.child2],
  }));
  assert(result.length === 2, `expected 2 results, got ${result.length}`);
  result.forEach(t => assert(t.completed === true, `task ${t.id} completed=${t.completed}`));
});

await test("batch_delete_tasks: [Child1, Child2, duplicatedChild]", async () => {
  const result = await runOmniJSJson(tasks.buildBatchDeleteTasksScript({
    taskIds: [ids.child1, ids.child2, ids.duplicatedChild],
  }));
  assert(result.length === 3, `expected 3 results, got ${result.length}`);
  result.forEach(r => assert(r.deleted === true, `deleted=${r.deleted}`));
});

// ═══════════════════════════════════════════════════════════════════════════
//  PHASE 4: Project Mutations
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n📁 Phase 4: Project Mutations");

await test("update_project: rename, note, flagged, deferDate, dueDate, plannedDate", async () => {
  const result = await runOmniJSJson(projects.buildUpdateProjectScript({
    id: ids.project,
    name: "__MCPTEST__ProjectRenamed",
    note: "Project test note",
    flagged: true,
    deferDate: "2026-03-01T09:00:00Z",
    dueDate: "2026-06-01T17:00:00Z",
    plannedDate: "2026-04-15T12:00:00Z",
  }));
  assert(result.name === "__MCPTEST__ProjectRenamed", `name=${result.name}`);
  assert(result.note === "Project test note", `note=${result.note}`);
  assert(result.flagged === true, `flagged=${result.flagged}`);
  assert(result.deferDate !== null, `deferDate should be set`);
  assert(result.dueDate !== null, `dueDate should be set`);
  assert(result.plannedDate !== null, `plannedDate should be set, got ${result.plannedDate}`);
});

await test("update_project: clear dueDate + plannedDate, set sequential=false", async () => {
  const result = await runOmniJSJson(projects.buildUpdateProjectScript({
    id: ids.project,
    dueDate: null,
    plannedDate: null,
    sequential: false,
  }));
  assert(result.dueDate === null, `dueDate=${result.dueDate}`);
  assert(result.plannedDate === null, `plannedDate=${result.plannedDate}`);
  assert(result.sequential === false, `sequential=${result.sequential}`);
});

await test("move_project: SAL to SubFolder, then back to Folder", async () => {
  // Move to SubFolder
  let result = await runOmniJSJson(projects.buildMoveProjectScript(ids.sal, ids.subFolder));
  assert(result.containingFolderName === "__MCPTEST__SubFolder", `containingFolderName=${result.containingFolderName}`);
  // Move back to Folder
  result = await runOmniJSJson(projects.buildMoveProjectScript(ids.sal, ids.folder));
  assert(result.containingFolderName === "__MCPTEST__Folder", `containingFolderName=${result.containingFolderName}`);
});

await test("complete_project: SAL", async () => {
  const result = await runOmniJSJson(projects.buildCompleteProjectScript(ids.sal));
  assert(result.status === "done", `status=${result.status}`);
});

await test("update_project: reactivate SAL", async () => {
  const result = await runOmniJSJson(projects.buildUpdateProjectScript({
    id: ids.sal,
    status: "active",
  }));
  assert(result.status === "active", `status=${result.status}`);
});

await test("mark_reviewed: Project", async () => {
  const result = await runOmniJSJson(projects.buildMarkReviewedScript(ids.project));
  assert(result.lastReviewDate !== null, `lastReviewDate should be set`);
});

await test("drop_project: SAL", async () => {
  const result = await runOmniJSJson(projects.buildDropProjectScript(ids.sal));
  assert(result.status === "dropped", `status=${result.status}`);
});

// ═══════════════════════════════════════════════════════════════════════════
//  PHASE 5: Folder & Tag Mutations
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n🏷️  Phase 5: Folder & Tag Mutations");

await test("update_folder: rename SubFolder", async () => {
  const result = await runOmniJSJson(folders.buildUpdateFolderScript({
    id: ids.subFolder,
    name: "__MCPTEST__SubFolderRenamed",
  }));
  assert(result.name === "__MCPTEST__SubFolderRenamed", `name=${result.name}`);
});

await test("update_tag: TagB rename, allowsNextAction=false, status=onHold", async () => {
  const result = await runOmniJSJson(tags.buildUpdateTagScript({
    id: ids.tagB,
    name: "__MCPTEST__TagBRenamed",
    allowsNextAction: false,
    status: "onHold",
  }));
  assert(result.name === "__MCPTEST__TagBRenamed", `name=${result.name}`);
  assert(result.allowsNextAction === false, `allowsNextAction=${result.allowsNextAction}`);
  assert(result.status === "onHold", `status=${result.status}`);
});

// ═══════════════════════════════════════════════════════════════════════════
//  PHASE 6: Convert Task to Project
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n🔄 Phase 6: Convert Task to Project");

await test("batch_create + convert_task_to_project", async () => {
  // Create task with children
  const created = await runOmniJSJson(tasks.buildBatchCreateTasksScript({
    tasks: [{
      name: "__MCPTEST__ConvertMe",
      children: [
        { name: "__MCPTEST__ConvertChild1" },
        { name: "__MCPTEST__ConvertChild2" },
      ],
    }],
  }));
  ids.convertTask = created[0].id;

  // Convert to project
  const result = await runOmniJSJson(tasks.buildConvertTaskToProjectScript(ids.convertTask));
  ids.convertedProject = result.id;
  assert(result.name === "__MCPTEST__ConvertMe", `name=${result.name}`);

  // Verify project has tasks
  const projectTasks = await runOmniJSJson(projects.buildGetProjectTasksScript({ projectId: ids.convertedProject }));
  const childNames = projectTasks.map(t => t.name);
  assert(childNames.includes("__MCPTEST__ConvertChild1"), `missing ConvertChild1: ${JSON.stringify(childNames)}`);
  assert(childNames.includes("__MCPTEST__ConvertChild2"), `missing ConvertChild2: ${JSON.stringify(childNames)}`);
});

// ═══════════════════════════════════════════════════════════════════════════
//  PHASE 7: Cleanup
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n🧹 Phase 7: Cleanup");

// Search for all remaining __MCPTEST__ items
const remaining = await runOmniJSJson(database.buildSearchScript("__MCPTEST__", 100));
console.log(`  Found ${remaining.length} __MCPTEST__ items to clean up`);

// Delete standalone tasks first (inbox task, task2, parent, task1)
const remainingTaskIds = remaining.filter(r => r.type === "task").map(r => r.id);
if (remainingTaskIds.length > 0) {
  await test("cleanup: delete remaining tasks", async () => {
    // Delete in small batches to avoid issues
    for (let i = 0; i < remainingTaskIds.length; i += 5) {
      const batch = remainingTaskIds.slice(i, i + 5);
      try {
        await runOmniJSJson(tasks.buildBatchDeleteTasksScript({ taskIds: batch }));
      } catch (e) {
        console.log(`    Warning: batch delete of tasks failed (may already be deleted): ${e.message}`);
      }
    }
  });
}

// Delete projects
const projectsToDelete = [ids.project, ids.sal, ids.convertedProject, ids.reviewedProject].filter(Boolean);
for (const pid of projectsToDelete) {
  await test(`cleanup: delete project ${pid}`, async () => {
    try {
      await runOmniJSJson(projects.buildDeleteProjectScript(pid));
    } catch (e) {
      console.log(`    Warning: project delete failed (may already be deleted): ${e.message}`);
    }
  });
}

// Delete folder (cascades to subfolder)
await test("cleanup: delete folder", async () => {
  try {
    await runOmniJSJson(folders.buildDeleteFolderScript(ids.folder));
  } catch (e) {
    console.log(`    Warning: folder delete failed: ${e.message}`);
  }
});

// Delete tags
const tagsToDelete = [ids.tagA, ids.tagB].filter(Boolean);
for (const tid of tagsToDelete) {
  await test(`cleanup: delete tag ${tid}`, async () => {
    try {
      await runOmniJSJson(tags.buildDeleteTagScript(tid));
    } catch (e) {
      console.log(`    Warning: tag delete failed: ${e.message}`);
    }
  });
}

// Final verification
await test("cleanup: verify no __MCPTEST__ items remain", async () => {
  const finalSearch = await runOmniJSJson(database.buildSearchScript("__MCPTEST__", 100));
  if (finalSearch.length > 0) {
    console.log(`    ⚠️  Remaining items: ${JSON.stringify(finalSearch.map(r => `${r.type}:${r.name}`))}`);
    // Try to clean up any stragglers
    for (const item of finalSearch) {
      try {
        if (item.type === "task") await runOmniJSJson(tasks.buildDeleteTaskScript(item.id));
        else if (item.type === "project") await runOmniJSJson(projects.buildDeleteProjectScript(item.id));
        else if (item.type === "folder") await runOmniJSJson(folders.buildDeleteFolderScript(item.id));
        else if (item.type === "tag") await runOmniJSJson(tags.buildDeleteTagScript(item.id));
      } catch (e) { /* ignore */ }
    }
    // Check again
    const finalSearch2 = await runOmniJSJson(database.buildSearchScript("__MCPTEST__", 100));
    assert(finalSearch2.length === 0, `Still ${finalSearch2.length} items remaining: ${JSON.stringify(finalSearch2.map(r => `${r.type}:${r.name}`))}`);
  }
});

// Post-test snapshot
const postSnapshot = await runOmniJSJson(database.buildDatabaseSummaryScript());
console.log("  Post-test counts:", JSON.stringify(postSnapshot));

// ═══════════════════════════════════════════════════════════════════════════
//  SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n" + "═".repeat(60));
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${results.length} total\n`);

if (failed > 0) {
  console.log("Failed tests:");
  results.filter(r => !r.pass).forEach(r => {
    console.log(`  ❌ #${r.num} ${r.name}: ${r.error}`);
  });
  process.exit(1);
} else {
  console.log("🎉 All tools passed smoke test!");
  process.exit(0);
}
