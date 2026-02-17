import { runOmniJSJson } from "./executor.js";
import { Cache } from "./cache.js";
import { config } from "../config.js";
import { buildDatabaseSummaryScript, buildSearchScript } from "./scripts/database.js";
import {
  buildListProjectsScript,
  buildGetProjectScript,
  buildCreateProjectScript,
  buildUpdateProjectScript,
  buildCompleteProjectScript,
  buildDeleteProjectScript,
  buildGetReviewQueueScript,
  buildMarkReviewedScript,
} from "./scripts/projects.js";
import {
  buildListTasksScript,
  buildGetTaskScript,
  buildCreateTaskScript,
  buildUpdateTaskScript,
  buildCompleteTaskScript,
  buildUncompleteTaskScript,
  buildDropTaskScript,
  buildDeleteTaskScript,
  buildMoveTasksScript,
  buildDuplicateTasksScript,
  buildSetTaskTagsScript,
  buildAddTaskNotificationScript,
} from "./scripts/tasks.js";
import type {
  DatabaseSummaryJSON,
  TaskJSON,
  ProjectJSON,
  ListTasksArgs,
  CreateTaskArgs,
  UpdateTaskArgs,
  MoveTasksArgs,
  DuplicateTasksArgs,
  SetTaskTagsArgs,
  AddTaskNotificationArgs,
  ListProjectsArgs,
  CreateProjectArgs,
  UpdateProjectArgs,
} from "../types/omnifocus.js";

export class OmniFocusClient {
  private cache = new Cache();

  // ─── Database ──────────────────────────────────────────────────────

  async getDatabaseSummary(): Promise<DatabaseSummaryJSON> {
    const cacheKey = "database:summary";
    const cached = this.cache.get<DatabaseSummaryJSON>(cacheKey);
    if (cached) return cached;

    const result = await runOmniJSJson<DatabaseSummaryJSON>(buildDatabaseSummaryScript());
    this.cache.set(cacheKey, result, config.cacheTTL.database);
    return result;
  }

  async search(query: string, limit = 50): Promise<Array<{ type: string; id: string; name: string; note?: string }>> {
    return runOmniJSJson(buildSearchScript(query, limit));
  }

  // ─── Tasks ─────────────────────────────────────────────────────────

  async listTasks(args: ListTasksArgs = {}): Promise<TaskJSON[]> {
    const cacheKey = `tasks:list:${JSON.stringify(args)}`;
    const cached = this.cache.get<TaskJSON[]>(cacheKey);
    if (cached) return cached;

    const result = await runOmniJSJson<TaskJSON[]>(buildListTasksScript(args));
    this.cache.set(cacheKey, result, config.cacheTTL.tasks);
    return result;
  }

  async getTask(id: string): Promise<TaskJSON> {
    const cacheKey = `tasks:get:${id}`;
    const cached = this.cache.get<TaskJSON>(cacheKey);
    if (cached) return cached;

    const result = await runOmniJSJson<TaskJSON>(buildGetTaskScript(id));
    this.cache.set(cacheKey, result, config.cacheTTL.tasks);
    return result;
  }

  async createTask(args: CreateTaskArgs): Promise<TaskJSON> {
    const result = await runOmniJSJson<TaskJSON>(buildCreateTaskScript(args));
    this.cache.invalidatePrefix("tasks:");
    return result;
  }

  async updateTask(args: UpdateTaskArgs): Promise<TaskJSON> {
    const result = await runOmniJSJson<TaskJSON>(buildUpdateTaskScript(args));
    this.cache.invalidatePrefix("tasks:");
    return result;
  }

  async completeTask(id: string): Promise<TaskJSON> {
    const result = await runOmniJSJson<TaskJSON>(buildCompleteTaskScript(id));
    this.cache.invalidatePrefix("tasks:");
    this.cache.invalidatePrefix("projects:");
    return result;
  }

  async uncompleteTask(id: string): Promise<TaskJSON> {
    const result = await runOmniJSJson<TaskJSON>(buildUncompleteTaskScript(id));
    this.cache.invalidatePrefix("tasks:");
    this.cache.invalidatePrefix("projects:");
    return result;
  }

  async dropTask(id: string): Promise<TaskJSON> {
    const result = await runOmniJSJson<TaskJSON>(buildDropTaskScript(id));
    this.cache.invalidatePrefix("tasks:");
    this.cache.invalidatePrefix("projects:");
    return result;
  }

  async deleteTask(id: string): Promise<{ deleted: boolean; id: string }> {
    const result = await runOmniJSJson<{ deleted: boolean; id: string }>(buildDeleteTaskScript(id));
    this.cache.invalidatePrefix("tasks:");
    this.cache.invalidatePrefix("projects:");
    return result;
  }

  async moveTasks(args: MoveTasksArgs): Promise<TaskJSON[]> {
    const result = await runOmniJSJson<TaskJSON[]>(buildMoveTasksScript(args));
    this.cache.invalidatePrefix("tasks:");
    this.cache.invalidatePrefix("projects:");
    return result;
  }

  async duplicateTasks(args: DuplicateTasksArgs): Promise<TaskJSON[]> {
    const result = await runOmniJSJson<TaskJSON[]>(buildDuplicateTasksScript(args));
    this.cache.invalidatePrefix("tasks:");
    this.cache.invalidatePrefix("projects:");
    return result;
  }

  async setTaskTags(args: SetTaskTagsArgs): Promise<TaskJSON> {
    const result = await runOmniJSJson<TaskJSON>(buildSetTaskTagsScript(args));
    this.cache.invalidatePrefix("tasks:");
    this.cache.invalidatePrefix("tags:");
    return result;
  }

  async addTaskNotification(args: AddTaskNotificationArgs): Promise<TaskJSON> {
    const result = await runOmniJSJson<TaskJSON>(buildAddTaskNotificationScript(args));
    this.cache.invalidatePrefix("tasks:");
    return result;
  }

  // ─── Projects ─────────────────────────────────────────────────────

  async listProjects(args: ListProjectsArgs = {}): Promise<ProjectJSON[]> {
    const cacheKey = `projects:list:${JSON.stringify(args)}`;
    const cached = this.cache.get<ProjectJSON[]>(cacheKey);
    if (cached) return cached;

    const result = await runOmniJSJson<ProjectJSON[]>(buildListProjectsScript(args));
    this.cache.set(cacheKey, result, config.cacheTTL.projects);
    return result;
  }

  async getProject(idOrName: string): Promise<ProjectJSON> {
    const cacheKey = `projects:get:${idOrName}`;
    const cached = this.cache.get<ProjectJSON>(cacheKey);
    if (cached) return cached;

    const result = await runOmniJSJson<ProjectJSON>(buildGetProjectScript(idOrName));
    this.cache.set(cacheKey, result, config.cacheTTL.projects);
    return result;
  }

  async createProject(args: CreateProjectArgs): Promise<ProjectJSON> {
    const result = await runOmniJSJson<ProjectJSON>(buildCreateProjectScript(args));
    this.cache.invalidatePrefix("projects:");
    this.cache.invalidatePrefix("folders:");
    return result;
  }

  async updateProject(args: UpdateProjectArgs): Promise<ProjectJSON> {
    const result = await runOmniJSJson<ProjectJSON>(buildUpdateProjectScript(args));
    this.cache.invalidatePrefix("projects:");
    return result;
  }

  async completeProject(id: string): Promise<ProjectJSON> {
    const result = await runOmniJSJson<ProjectJSON>(buildCompleteProjectScript(id));
    this.cache.invalidatePrefix("projects:");
    this.cache.invalidatePrefix("tasks:");
    return result;
  }

  async deleteProject(id: string): Promise<{ deleted: boolean; id: string }> {
    const result = await runOmniJSJson<{ deleted: boolean; id: string }>(buildDeleteProjectScript(id));
    this.cache.invalidatePrefix("projects:");
    this.cache.invalidatePrefix("tasks:");
    this.cache.invalidatePrefix("folders:");
    return result;
  }

  async getReviewQueue(): Promise<ProjectJSON[]> {
    return runOmniJSJson<ProjectJSON[]>(buildGetReviewQueueScript());
  }

  async markReviewed(id: string): Promise<ProjectJSON> {
    const result = await runOmniJSJson<ProjectJSON>(buildMarkReviewedScript(id));
    this.cache.invalidatePrefix("projects:");
    return result;
  }

  // ─── Cache management ─────────────────────────────────────────────

  invalidateCache(prefix?: string): void {
    if (prefix) {
      this.cache.invalidatePrefix(prefix);
    } else {
      this.cache.invalidateAll();
    }
  }
}
