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

/**
 * Executes an OmniJS script inside OmniFocus via osascript JXA bridge.
 * Returns the raw stdout string.
 * Calls are serialized via a mutex to prevent concurrent Apple Events races.
 */
export async function runOmniJS(omniScript: string): Promise<string> {
  const execute = async (): Promise<string> => {
    const fullScript = OMNIJS_PRELUDE + '\n' + omniScript;
    const jxaScript = `(() => {
  const app = Application("OmniFocus");
  return app.evaluateJavascript(${JSON.stringify(fullScript)});
})()`;

    logger.debug("Executing OmniJS script", { scriptLength: omniScript.length });

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

      logger.error("OmniJS execution failed", { stderr, exitCode });
      logger.debug("Failed script preview", { script: omniScript.substring(0, 500) });
      throw parseExecutorError(stderr, exitCode);
    }
  };

  pending = pending.then(execute, execute);
  return pending as Promise<string>;
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
