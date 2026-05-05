import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "../config.js";
import { parseExecutorError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

const execFileAsync = promisify(execFile);

/** OmniJS helper functions prepended to every script */
const OMNIJS_PRELUDE = `function byId(collection, id) {
  for (var i = 0; i < collection.length; i++) {
    if (collection[i].id && collection[i].id.primaryKey === id) return collection[i];
  }
  return null;
}`;

/** Promise-based mutex: serializes osascript calls to avoid Apple Events races */
let pending: Promise<unknown> = Promise.resolve();

async function runOsascript(jxaScript: string, kind: "OmniJS" | "JXA", scriptLength: number): Promise<string> {
  const execute = async (): Promise<string> => {
    logger.debug(`Executing ${kind} script`, { scriptLength });

    try {
      const { stdout } = await execFileAsync("osascript", ["-l", "JavaScript", "-e", jxaScript], {
        timeout: config.executorTimeout,
        maxBuffer: config.maxBuffer,
      });

      return stdout.trim();
    } catch (error: unknown) {
      const execError = error as { stderr?: string; code?: number | null; killed?: boolean };
      const stderr = execError.stderr || "";
      const exitCode = execError.killed ? null : (execError.code ?? 1);

      logger.error(`${kind} execution failed`, { stderr, exitCode });
      logger.debug("Failed script preview", { script: jxaScript.substring(0, 500) });
      throw parseExecutorError(stderr, exitCode);
    }
  };

  pending = pending.then(execute, execute);
  return pending as Promise<string>;
}

/**
 * Executes an OmniJS script inside OmniFocus via osascript JXA bridge.
 * Returns the raw stdout string.
 * Calls are serialized via a mutex to prevent concurrent Apple Events races.
 */
export async function runOmniJS(omniScript: string): Promise<string> {
  const fullScript = OMNIJS_PRELUDE + '\n' + omniScript;
  const jxaScript = `(() => {
  const app = Application("OmniFocus");
  return app.evaluateJavascript(${JSON.stringify(fullScript)});
})()`;
  return runOsascript(jxaScript, "OmniJS", omniScript.length);
}

/**
 * Executes an OmniJS script and parses the result as JSON.
 */
export async function runOmniJSJson<T>(omniScript: string): Promise<T> {
  const raw = await runOmniJS(omniScript);

  try {
    return JSON.parse(raw) as T;
  } catch (parseError) {
    const parseMessage = parseError instanceof Error ? parseError.message : String(parseError);
    logger.error("Failed to parse OmniJS JSON response", { raw: raw.substring(0, 500), parseError: parseMessage });
    throw new Error(`Failed to parse OmniFocus response as JSON (${parseMessage}): ${raw.substring(0, 200)}`);
  }
}

/**
 * Executes a raw JXA script (NOT wrapped in evaluateJavascript). Use this for
 * application-level commands that aren't exposed through OmniJS, like
 * `Application("OmniFocus").synchronize()`. Shares the OmniJS mutex so
 * concurrent Apple Events races are still avoided.
 */
export async function runJXA(jxaScript: string): Promise<string> {
  return runOsascript(jxaScript, "JXA", jxaScript.length);
}

/**
 * Executes a raw JXA script and parses the result as JSON.
 */
export async function runJXAJson<T>(jxaScript: string): Promise<T> {
  const raw = await runJXA(jxaScript);

  try {
    return JSON.parse(raw) as T;
  } catch (parseError) {
    const parseMessage = parseError instanceof Error ? parseError.message : String(parseError);
    logger.error("Failed to parse JXA JSON response", { raw: raw.substring(0, 500), parseError: parseMessage });
    throw new Error(`Failed to parse OmniFocus response as JSON (${parseMessage}): ${raw.substring(0, 200)}`);
  }
}
