import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const runtimePath = join(__dirname, "..", "src", "bin", "omnicode-runtime.sh");

describe("omnicode-runtime.sh", () => {
  it("is valid bash syntax", () => {
    execSync(`bash -n "${runtimePath}"`);
  });

  it("does not reference .opencode/session.id", () => {
    const script = readFileSync(runtimePath, "utf8");
    assert.ok(!script.includes(".opencode/session.id"));
    assert.ok(!script.includes("uuid"));
    assert.ok(!script.includes("session.id"));
  });

  it("launches opencode -s when given -s and a session ID", () => {
    const script = readFileSync(runtimePath, "utf8");
    assert.ok(script.includes('SESSION_FLAG" == "-s"'));
    assert.ok(script.includes('opencode -s "$SESSION_ID"'));
  });

  it("does not use the buggy opencode -c continue flag", () => {
    const script = readFileSync(runtimePath, "utf8");
    assert.ok(!script.includes('SESSION_FLAG" == "-c"'));
    assert.ok(!script.includes("opencode -c"));
  });

  it("launches plain opencode when no session flag is given", () => {
    const script = readFileSync(runtimePath, "utf8");
    assert.ok(/else\s*\n\s*echo.*new session/.test(script.replace(/\r/g, "")));
    assert.ok(script.includes("opencode\n") || script.includes("opencode \n") || script.match(/^opencode$/m));
  });

  it("conditionally runs graymatter and openspec", () => {
    const script = readFileSync(runtimePath, "utf8");
    assert.ok(script.includes("if command -v graymatter"));
    assert.ok(script.includes("if command -v openspec"));
    assert.ok(script.includes("graymatter: not installed, skipping"));
    assert.ok(script.includes("openspec: not installed, skipping"));
  });

  it("redirects graymatter and openspec init logs", () => {
    const script = readFileSync(runtimePath, "utf8");
    assert.ok(script.includes("GRAYMATTER_LOG"));
    assert.ok(script.includes("OPENSPEC_LOG"));
    assert.ok(script.includes('>"$GRAYMATTER_LOG" 2>&1'));
    assert.ok(script.includes('>"$OPENSPEC_LOG" 2>&1'));
  });

  it("runs omniroute with --no-open", () => {
    const script = readFileSync(runtimePath, "utf8");
    assert.ok(script.includes("omniroute --no-open"));
  });

  it("sets umask 0077 for log files", () => {
    const script = readFileSync(runtimePath, "utf8");
    assert.ok(script.includes("umask 0077"));
  });

  it("uses pgrep -x for exact process name matching", () => {
    const script = readFileSync(runtimePath, "utf8");
    assert.ok(script.includes("pgrep -x omniroute"));
    assert.ok(script.includes("pgrep -x opencode"));
    assert.ok(!script.includes("pgrep -f"));
  });

  it("prefers user-local PATH over system PATH", () => {
    const script = readFileSync(runtimePath, "utf8");
    const pathLine = script.split("\n").find((line) => line.startsWith("export PATH="));
    assert.ok(pathLine);
    assert.ok(pathLine.includes('"$HOME/.local/bin:$PATH"'));
  });

  it("protects PID file from symlink attacks", () => {
    const script = readFileSync(runtimePath, "utf8");
    assert.ok(script.includes("-L \"$PID_FILE\""));
    assert.ok(script.includes("rm -f \"$PID_FILE\""));
    assert.ok(script.includes("PID_FILE"));
  });
});
