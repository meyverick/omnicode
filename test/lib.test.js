import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { commandExists, getDataDir, getOpencodeDbPath } from "../src/installer/lib.js";

describe("lib helpers", () => {
  it("commandExists returns true for a known command", () => {
    const known = process.platform === "win32" ? "cmd" : "bash";
    assert.equal(commandExists(known), true);
  });

  it("commandExists returns false for a nonexistent command", () => {
    assert.equal(commandExists("omnicode-nonexistent-command-xyz"), false);
  });

  it("getDataDir returns a path under .local/share/omnicode", () => {
    const dir = getDataDir();
    assert.ok(dir.endsWith(".local/share/omnicode"));
    assert.ok(dir.startsWith("/") || dir.includes(":\\"));
  });

  it("getOpencodeDbPath returns null or a valid path ending in opencode.db", () => {
    const result = getOpencodeDbPath();
    assert.ok(result === null || (typeof result === "string" && result.endsWith("opencode.db")));
  });
});
