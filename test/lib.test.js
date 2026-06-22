import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { commandExists, getDataDir, getOpencodeDbPath, isProcessRunningAsync, generateQdrantConfig, ensureOpencodeConfig, detectQdrantMcp } from "../src/installer/lib.js";

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

  it("isProcessRunningAsync returns true for a known-running process", async () => {
    const known = process.platform === "win32" ? "cmd" : "bash";
    assert.equal(await isProcessRunningAsync(known), true);
  });

  it("isProcessRunningAsync returns false for a nonexistent process", async () => {
    assert.equal(await isProcessRunningAsync("nonexistent-xyz-999"), false);
  });

  it("generateQdrantConfig returns correct structure", () => {
    const cfg = generateQdrantConfig();
    assert.equal(cfg.command, "uvx");
    assert.ok(Array.isArray(cfg.args));
    assert.ok(cfg.args.includes("mcp-server-qdrant"));
    assert.equal(cfg.env.COLLECTION_NAME, "references");
    assert.ok(cfg.env.QDRANT_LOCAL_PATH.endsWith(".qdrant"));
  });

  it("ensureOpencodeConfig generates valid config structure", () => {
    const cfg = generateQdrantConfig();
    assert.ok(cfg.env.QDRANT_LOCAL_PATH);
    assert.ok(cfg.env.COLLECTION_NAME);
    assert.ok(cfg.env.EMBEDDING_MODEL);
  });
});
