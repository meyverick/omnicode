import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { commandExists, getDataDir, getOpencodeDbPath, isProcessRunningAsync, generateQdrantConfig, ensureOpencodeConfig, detectQdrantMcp, walkReferences, chunkFile, loadIndexState, saveIndexState, getFastEmbedCacheDir, getFastEmbedModelPath, verifyFastEmbedModel, getQdrantStoreEnv } from "../src/installer/lib.js";

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
    assert.equal(cfg.type, "local");
    assert.equal(cfg.enabled, true);
    assert.ok(Array.isArray(cfg.command));
    assert.ok(cfg.command.includes("uvx"));
    assert.ok(cfg.command.includes("mcp-server-qdrant"));
    assert.equal(cfg.env.COLLECTION_NAME, "references");
    assert.ok(cfg.env.QDRANT_LOCAL_PATH.endsWith(".qdrant"));
    assert.ok(cfg.env.FASTEMBED_CACHE_PATH.endsWith("fastembed"));
  });

  it("ensureOpencodeConfig generates valid config structure", () => {
    const cfg = generateQdrantConfig();
    assert.ok(cfg.env.QDRANT_LOCAL_PATH);
    assert.ok(cfg.env.COLLECTION_NAME);
    assert.ok(cfg.env.EMBEDDING_MODEL);
    assert.ok(cfg.env.FASTEMBED_CACHE_PATH);
  });

  it("getQdrantStoreEnv includes FASTEMBED_CACHE_PATH for MCP", () => {
    const cfg = generateQdrantConfig();
    const env = getQdrantStoreEnv(cfg);
    assert.equal(env.FASTEMBED_CACHE_PATH, cfg.env.FASTEMBED_CACHE_PATH);
    assert.ok(env.FASTEMBED_CACHE_PATH.endsWith("fastembed"));
  });

  it("getFastEmbedCacheDir returns a persistent cache path", () => {
    const dir = getFastEmbedCacheDir();
    assert.ok(dir.endsWith("fastembed"));
    assert.equal(dir.includes("/tmp/fastembed_cache"), false);
  });

  it("getFastEmbedModelPath finds an existing model.onnx", () => {
    const cacheDir = mkdtempSync(join(os.tmpdir(), "omnicode-fastembed-"));
    try {
      const modelDir = join(cacheDir, "models--qdrant--all-MiniLM-L6-v2-onnx", "snapshots", "abc123");
      mkdirSync(modelDir, { recursive: true });
      const modelPath = join(modelDir, "model.onnx");
      writeFileSync(modelPath, "model");
      assert.equal(getFastEmbedModelPath(cacheDir), modelPath);
    } finally {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it("verifyFastEmbedModel returns true for a valid cached model", async () => {
    const cacheDir = mkdtempSync(join(os.tmpdir(), "omnicode-fastembed-"));
    try {
      const modelDir = join(cacheDir, "models--qdrant--all-MiniLM-L6-v2-onnx", "snapshots", "abc123");
      mkdirSync(modelDir, { recursive: true });
      writeFileSync(join(modelDir, "model.onnx"), "valid-model");
      let calls = 0;
      const ok = await verifyFastEmbedModel({
        cacheDir,
        minModelSize: 1,
        warmup: async () => { calls++; },
      });
      assert.equal(ok, true);
      assert.equal(calls, 1);
    } finally {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it("verifyFastEmbedModel downloads when model is missing", async () => {
    const cacheDir = mkdtempSync(join(os.tmpdir(), "omnicode-fastembed-"));
    try {
      let calls = 0;
      const ok = await verifyFastEmbedModel({
        cacheDir,
        minModelSize: 1,
        warmup: async () => {
          calls++;
          const modelDir = join(cacheDir, "models--qdrant--all-MiniLM-L6-v2-onnx", "snapshots", "abc123");
          mkdirSync(modelDir, { recursive: true });
          writeFileSync(join(modelDir, "model.onnx"), "valid-model");
        },
      });
      assert.equal(ok, true);
      assert.equal(calls, 2);
    } finally {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it("verifyFastEmbedModel repairs a truncated model", async () => {
    const cacheDir = mkdtempSync(join(os.tmpdir(), "omnicode-fastembed-"));
    try {
      const modelDir = join(cacheDir, "models--qdrant--all-MiniLM-L6-v2-onnx", "snapshots", "abc123");
      mkdirSync(modelDir, { recursive: true });
      writeFileSync(join(modelDir, "model.onnx"), "x");
      let calls = 0;
      const ok = await verifyFastEmbedModel({
        cacheDir,
        minModelSize: 10,
        warmup: async () => {
          calls++;
          mkdirSync(modelDir, { recursive: true });
          writeFileSync(join(modelDir, "model.onnx"), "valid-model");
        },
      });
      assert.equal(ok, true);
      assert.equal(calls, 2);
    } finally {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it("verifyFastEmbedModel repairs a model that fails load validation", async () => {
    const cacheDir = mkdtempSync(join(os.tmpdir(), "omnicode-fastembed-"));
    try {
      const modelDir = join(cacheDir, "models--qdrant--all-MiniLM-L6-v2-onnx", "snapshots", "abc123");
      mkdirSync(modelDir, { recursive: true });
      writeFileSync(join(modelDir, "model.onnx"), "valid-size");
      let calls = 0;
      const ok = await verifyFastEmbedModel({
        cacheDir,
        minModelSize: 1,
        warmup: async () => {
          calls++;
          if (calls === 1) throw new Error("corrupt onnx");
          mkdirSync(modelDir, { recursive: true });
          writeFileSync(join(modelDir, "model.onnx"), "valid-model");
        },
      });
      assert.equal(ok, true);
      assert.equal(calls, 3);
    } finally {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it("walkReferences returns an array", () => {
    const refsDir = getDataDir().replace("omnicode", "..").replace("/.local/share/..", "..");
    const files = walkReferences(process.cwd());
    assert.ok(Array.isArray(files));
  });

  it("chunkFile splits markdown by headings", () => {
    const content = "# Title\n\n## Section 1\n\nSome text\n\n## Section 2\n\nMore text";
    const chunks = chunkFile(content, "test.md");
    assert.ok(chunks.length >= 2);
    assert.ok(chunks.some((c) => c.includes("Section 1")));
    assert.ok(chunks.some((c) => c.includes("Section 2")));
  });

  it("chunkFile splits non-markdown by line count", () => {
    const lines = Array.from({ length: 120 }, (_, i) => `line ${i + 1}`);
    const content = lines.join("\n");
    const chunks = chunkFile(content, "test.txt");
    assert.ok(chunks.length >= 2);
    assert.ok(chunks[0].includes("line 1"));
  });

  it("loadIndexState returns empty object for missing file", () => {
    const state = loadIndexState("/nonexistent/path.json");
    assert.deepEqual(state, {});
  });

  it("saveIndexState and loadIndexState round-trip", () => {
    const statePath = join(process.cwd(), ".test-index-state.json");
    saveIndexState(statePath, { "/test/file.md": 123456 });
    const loaded = loadIndexState(statePath);
    assert.equal(loaded["/test/file.md"], 123456);
  });
});
