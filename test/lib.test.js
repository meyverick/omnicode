import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { commandExists, getDataDir, getOpencodeDbPath, isProcessRunning } from "../src/installer/lib.js";

describe("lib helpers", () => {
  it("commandExists returns true for a known command", async () => {
    const known = process.platform === "win32" ? "cmd" : "bash";
    assert.equal(await commandExists(known), true);
  });

  it("commandExists returns false for a nonexistent command", async () => {
    assert.equal(await commandExists("omnicode-nonexistent-command-xyz"), false);
  });

  it("isProcessRunning returns true for a known-running process", async () => {
    const known = process.platform === "win32" ? "cmd" : "bash";
    assert.equal(await isProcessRunning(known), true);
  });

  it("isProcessRunning returns false for a nonexistent process", async () => {
    assert.equal(await isProcessRunning("nonexistent-xyz-999"), false);
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
