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

  it("contains the expected commands", () => {
    const script = readFileSync(runtimePath, "utf8");
    assert.ok(script.includes("graymatter init --only opencode"));
    assert.ok(script.includes("openspec init --force --tools opencode"));
    assert.ok(script.includes("omniroute --no-open"));
    assert.ok(script.includes("opencode -s"));
    assert.ok(script.includes(".opencode/session.id"));
  });

  it("conditionally runs graymatter and openspec", () => {
    const script = readFileSync(runtimePath, "utf8");
    assert.ok(script.includes("if command -v graymatter"));
    assert.ok(script.includes("if command -v openspec"));
    assert.ok(script.includes("graymatter not found; skipping"));
    assert.ok(script.includes("openspec not found; skipping"));
  });
});
