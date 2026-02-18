import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock child_process at module level before importing executor
const mockExecFileAsync = vi.fn();

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("node:util", () => ({
  promisify: () => mockExecFileAsync,
}));

// Import after mocking
const { runOmniJS, runOmniJSJson } = await import("../../../src/omnifocus/executor.js");

describe("runOmniJS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return trimmed stdout on success", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "  hello world  \n", stderr: "" });
    const result = await runOmniJS("some script");
    expect(result).toBe("hello world");
  });

  it("should call osascript with JXA flag", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "ok", stderr: "" });
    await runOmniJS("test()");
    expect(mockExecFileAsync).toHaveBeenCalledWith(
      "osascript",
      ["-l", "JavaScript", "-e", expect.stringContaining("evaluateJavascript")],
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it("should wrap script via JSON.stringify for safe embedding", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "ok", stderr: "" });
    const script = 'var x = "hello \\"world\\""';
    await runOmniJS(script);
    const jxaScript = mockExecFileAsync.mock.calls[0][1][3]; // -e value (after -l, JavaScript, -e)
    expect(jxaScript).toContain("evaluateJavascript");
    // The omni script is embedded via JSON.stringify so quotes are properly escaped
    expect(jxaScript).toContain("evaluateJavascript(");
  });

  it("should throw NotRunningError when OmniFocus is not running", async () => {
    mockExecFileAsync.mockRejectedValue({
      stderr: "execution error: Error: Application is not running (-600)",
      code: 1,
      killed: false,
    });
    await expect(runOmniJS("test")).rejects.toThrow("not running");
  });

  it("should throw PermissionError when not authorized", async () => {
    mockExecFileAsync.mockRejectedValue({
      stderr: "execution error: Not authorized (-1743)",
      code: 1,
      killed: false,
    });
    await expect(runOmniJS("test")).rejects.toThrow("Permission denied");
  });

  it("should throw TimeoutError when killed", async () => {
    mockExecFileAsync.mockRejectedValue({
      stderr: "",
      code: null,
      killed: true,
    });
    await expect(runOmniJS("test")).rejects.toThrow("timed out");
  });

  it("should throw ScriptError for generic failures", async () => {
    mockExecFileAsync.mockRejectedValue({
      stderr: "something went wrong",
      code: 1,
      killed: false,
    });
    await expect(runOmniJS("test")).rejects.toThrow("something went wrong");
  });
});

describe("runOmniJSJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should parse valid JSON responses", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: '{"id":"abc","name":"Test"}', stderr: "" });
    const result = await runOmniJSJson<{ id: string; name: string }>("test");
    expect(result).toEqual({ id: "abc", name: "Test" });
  });

  it("should parse JSON array responses", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "[1,2,3]", stderr: "" });
    const result = await runOmniJSJson<number[]>("test");
    expect(result).toEqual([1, 2, 3]);
  });

  it("should throw on invalid JSON", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "not json at all", stderr: "" });
    await expect(runOmniJSJson("test")).rejects.toThrow("Failed to parse");
  });

  it("should include JSON parse error details in thrown error", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "{invalid json", stderr: "" });
    await expect(runOmniJSJson("test")).rejects.toThrow(/Unexpected|Expected/);
  });

  it("should include raw response preview in thrown error", async () => {
    mockExecFileAsync.mockResolvedValue({ stdout: "not-json-data", stderr: "" });
    await expect(runOmniJSJson("test")).rejects.toThrow("not-json-data");
  });
});
