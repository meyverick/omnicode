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
    assert.ok(script.includes("graymatter not found; skipping"));
    assert.ok(script.includes("openspec not found; skipping"));
  });

  it("runs omniroute with --no-open", () => {
    const script = readFileSync(runtimePath, "utf8");
    assert.ok(script.includes("omniroute --no-open"));
  });
});
