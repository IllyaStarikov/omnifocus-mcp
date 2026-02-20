import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OmniFocusClient } from "../omnifocus/client.js";
import { formatMcpError } from "../utils/errors.js";

const repetitionRuleSchema = z.object({
  ruleString: z.string().describe("ICS RRULE string e.g. 'FREQ=WEEKLY;INTERVAL=1'"),
  method: z.enum(["fixed", "startAfterCompletion", "dueAfterCompletion"]).describe("Repetition method"),
}).optional().describe("Repetition rule for recurring tasks");

const batchTaskItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string().describe("Task name"),
    note: z.string().optional().describe("Task note"),
    flagged: z.boolean().optional().describe("Whether to flag"),
    deferDate: z.string().optional().describe("Defer date (ISO 8601)"),
    dueDate: z.string().optional().describe("Due date (ISO 8601)"),
    estimatedMinutes: z.number().min(0).optional().describe("Estimated duration in minutes"),
    completedByChildren: z.boolean().optional().describe("Auto-complete when children complete"),
    tags: z.array(z.string()).optional().describe("Tag names"),
    repetitionRule: repetitionRuleSchema,
    children: z.array(batchTaskItemSchema).optional().describe("Subtasks"),
  }),
);

export function registerTaskTools(server: McpServer, client: OmniFocusClient): void {
  server.tool(
    "list_tasks",
    "List tasks from OmniFocus with optional filters for status, flags, tags, projects, date ranges, and text search",
    {
      completed: z.boolean().optional().describe("Filter by completion status"),
      flagged: z.boolean().optional().describe("Filter by flagged status"),
      available: z.boolean().optional().describe("Only show available (actionable) tasks"),
      inInbox: z.boolean().optional().describe("Only show inbox tasks"),
      projectId: z.string().optional().describe("Filter by project ID"),
      projectName: z.string().optional().describe("Filter by project name"),
      tagNames: z.array(z.string()).optional().describe("Filter by tag names (all must match)"),
      dueAfter: z.string().optional().describe("Filter tasks due after this ISO date"),
      dueBefore: z.string().optional().describe("Filter tasks due before this ISO date"),
      deferAfter: z.string().optional().describe("Filter tasks deferred after this ISO date"),
      deferBefore: z.string().optional().describe("Filter tasks deferred before this ISO date"),
      search: z.string().optional().describe("Full-text search in task name and note"),
      taskStatus: z.enum(["available", "remaining", "completed", "dropped"]).optional().describe("Filter by task status"),
      limit: z.number().min(1).max(1000).optional().describe("Maximum results (default 100)"),
      offset: z.number().min(0).optional().describe("Skip this many results"),
    },
    async (args) => {
      try {
        const tasks = await client.listTasks(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(tasks, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "get_task",
    "Get detailed information about a specific task by its ID, optionally including subtask hierarchy",
    {
      id: z.string().describe("The task ID"),
      includeChildren: z.boolean().optional().describe("Include subtask tree (default false)"),
      maxDepth: z.number().min(0).optional().describe("Max subtask depth (0 = unlimited)"),
    },
    async (args) => {
      try {
        const task = await client.getTask(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "create_task",
    "Create a new task in OmniFocus. By default creates in inbox; specify projectId or projectName to add to a project.",
    {
      name: z.string().describe("Task name"),
      note: z.string().optional().describe("Task note/description"),
      flagged: z.boolean().optional().describe("Whether to flag the task"),
      deferDate: z.string().optional().describe("Defer date (ISO 8601)"),
      dueDate: z.string().optional().describe("Due date (ISO 8601)"),
      estimatedMinutes: z.number().min(0).optional().describe("Estimated duration in minutes"),
      completedByChildren: z.boolean().optional().describe("Auto-complete when all children are completed"),
      projectId: z.string().optional().describe("Project ID to add task to"),
      projectName: z.string().optional().describe("Project name to add task to"),
      tags: z.array(z.string()).optional().describe("Tag names to apply (created if they don't exist)"),
      repetitionRule: repetitionRuleSchema,
    },
    async (args) => {
      try {
        const task = await client.createTask(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "update_task",
    "Update properties of an existing task",
    {
      id: z.string().describe("The task ID to update"),
      name: z.string().optional().describe("New task name"),
      note: z.string().optional().describe("New task note"),
      flagged: z.boolean().optional().describe("New flagged status"),
      deferDate: z.string().nullable().optional().describe("New defer date (ISO 8601) or null to clear"),
      dueDate: z.string().nullable().optional().describe("New due date (ISO 8601) or null to clear"),
      estimatedMinutes: z.number().min(0).nullable().optional().describe("New estimated minutes or null to clear"),
      sequential: z.boolean().optional().describe("Whether subtasks must be completed in order"),
      completedByChildren: z.boolean().optional().describe("Auto-complete when all children are completed"),
      repetitionRule: z.object({
        ruleString: z.string().describe("ICS RRULE string"),
        method: z.enum(["fixed", "startAfterCompletion", "dueAfterCompletion"]).describe("Repetition method"),
      }).nullable().optional().describe("Repetition rule or null to clear"),
    },
    async (args) => {
      try {
        const task = await client.updateTask(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "complete_task",
    "Mark a task as completed",
    {
      id: z.string().describe("The task ID to complete"),
    },
    async ({ id }) => {
      try {
        const task = await client.completeTask(id);
        return { content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "uncomplete_task",
    "Mark a completed task as incomplete (re-open it)",
    {
      id: z.string().describe("The task ID to uncomplete"),
    },
    async ({ id }) => {
      try {
        const task = await client.uncompleteTask(id);
        return { content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "drop_task",
    "Mark a task as dropped (cancelled)",
    {
      id: z.string().describe("The task ID to drop"),
    },
    async ({ id }) => {
      try {
        const task = await client.dropTask(id);
        return { content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "delete_task",
    "Permanently delete a task from OmniFocus",
    {
      id: z.string().describe("The task ID to delete"),
    },
    async ({ id }) => {
      try {
        const result = await client.deleteTask(id);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "move_tasks",
    "Move one or more tasks to a different project or parent task. Omit destination to move to inbox.",
    {
      taskIds: z.array(z.string()).describe("Task IDs to move"),
      projectId: z.string().optional().describe("Destination project ID"),
      projectName: z.string().optional().describe("Destination project name"),
      parentTaskId: z.string().optional().describe("Destination parent task ID (for subtasks)"),
    },
    async (args) => {
      try {
        const tasks = await client.moveTasks(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(tasks, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "duplicate_tasks",
    "Duplicate one or more tasks, optionally into a different project",
    {
      taskIds: z.array(z.string()).describe("Task IDs to duplicate"),
      projectId: z.string().optional().describe("Destination project ID"),
      projectName: z.string().optional().describe("Destination project name"),
    },
    async (args) => {
      try {
        const tasks = await client.duplicateTasks(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(tasks, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "set_task_tags",
    "Set, add, or remove tags on a task",
    {
      taskId: z.string().describe("The task ID"),
      tagNames: z.array(z.string()).describe("Tag names to set/add/remove"),
      mode: z.enum(["replace", "add", "remove"]).describe("How to modify tags: replace all, add to existing, or remove specific tags"),
    },
    async (args) => {
      try {
        const task = await client.setTaskTags(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "add_task_notification",
    "Add a notification/reminder to a task",
    {
      taskId: z.string().describe("The task ID"),
      type: z.enum(["absolute", "dueRelative"]).describe("Notification type"),
      absoluteDate: z.string().optional().describe("For 'absolute' type: ISO 8601 date for notification"),
      relativeOffset: z.number().optional().describe("For relative types: offset in seconds (negative = before)"),
    },
    async (args) => {
      try {
        const task = await client.addTaskNotification(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "get_inbox_tasks",
    "Get all tasks currently in the OmniFocus inbox (not yet assigned to a project)",
    {},
    async () => {
      try {
        const tasks = await client.listTasks({ inInbox: true, taskStatus: "available" });
        return { content: [{ type: "text" as const, text: JSON.stringify(tasks, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "get_flagged_tasks",
    "Get all available flagged tasks",
    {},
    async () => {
      try {
        const tasks = await client.listTasks({ flagged: true, taskStatus: "available" });
        return { content: [{ type: "text" as const, text: JSON.stringify(tasks, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "get_today_completed_tasks",
    "Get all tasks completed today",
    {},
    async () => {
      try {
        const tasks = await client.getTodayCompletedTasks();
        return { content: [{ type: "text" as const, text: JSON.stringify(tasks, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "append_task_note",
    "Append text to an existing task's note",
    {
      taskId: z.string().describe("The task ID"),
      text: z.string().describe("Text to append to the note"),
    },
    async ({ taskId, text }) => {
      try {
        const task = await client.appendTaskNote(taskId, text);
        return { content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "batch_create_tasks",
    "Create multiple tasks at once, with support for subtask hierarchies. Much more efficient than creating tasks one by one.",
    {
      tasks: z.array(batchTaskItemSchema).min(1).describe("Array of tasks to create (can include nested children)"),
      projectId: z.string().optional().describe("Project ID to add tasks to"),
      projectName: z.string().optional().describe("Project name to add tasks to"),
      parentTaskId: z.string().optional().describe("Parent task ID for subtasks"),
    },
    async (args) => {
      try {
        const tasks = await client.batchCreateTasks(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(tasks, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "list_task_notifications",
    "List all notifications/reminders on a task",
    {
      taskId: z.string().describe("The task ID"),
    },
    async ({ taskId }) => {
      try {
        const notifications = await client.listTaskNotifications(taskId);
        return { content: [{ type: "text" as const, text: JSON.stringify(notifications, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "remove_task_notification",
    "Remove a specific notification from a task",
    {
      taskId: z.string().describe("The task ID"),
      notificationId: z.string().describe("The notification ID to remove"),
    },
    async ({ taskId, notificationId }) => {
      try {
        const result = await client.removeTaskNotification(taskId, notificationId);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "convert_task_to_project",
    "Convert an existing task into a new project, preserving subtasks",
    {
      taskId: z.string().describe("The task ID to convert"),
    },
    async ({ taskId }) => {
      try {
        const project = await client.convertTaskToProject(taskId);
        return { content: [{ type: "text" as const, text: JSON.stringify(project, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "batch_delete_tasks",
    "Delete multiple tasks at once. More efficient than deleting one by one.",
    {
      taskIds: z.array(z.string()).min(1).describe("Array of task IDs to delete"),
    },
    async (args) => {
      try {
        const results = await client.batchDeleteTasks(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "batch_complete_tasks",
    "Complete multiple tasks at once. More efficient than completing one by one.",
    {
      taskIds: z.array(z.string()).min(1).describe("Array of task IDs to complete"),
    },
    async (args) => {
      try {
        const results = await client.batchCompleteTasks(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );

  server.tool(
    "get_task_count",
    "Get count of tasks matching filters without fetching full data. Faster than list_tasks when you only need the count.",
    {
      completed: z.boolean().optional().describe("Filter by completion status"),
      flagged: z.boolean().optional().describe("Filter by flagged status"),
      available: z.boolean().optional().describe("Only count available (actionable) tasks"),
      inInbox: z.boolean().optional().describe("Only count inbox tasks"),
      projectId: z.string().optional().describe("Filter by project ID"),
      projectName: z.string().optional().describe("Filter by project name"),
      tagNames: z.array(z.string()).optional().describe("Filter by tag names (all must match)"),
      dueAfter: z.string().optional().describe("Filter tasks due after this ISO date"),
      dueBefore: z.string().optional().describe("Filter tasks due before this ISO date"),
      deferAfter: z.string().optional().describe("Filter tasks deferred after this ISO date"),
      deferBefore: z.string().optional().describe("Filter tasks deferred before this ISO date"),
      search: z.string().optional().describe("Full-text search in task name and note"),
      taskStatus: z.enum(["available", "remaining", "completed", "dropped"]).optional().describe("Filter by task status"),
    },
    async (args) => {
      try {
        const result = await client.getTaskCount(args);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const { message } = formatMcpError(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    },
  );
}
