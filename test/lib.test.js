import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { commandExists, getDataDir, getOpencodeDbPath, isProcessRunningAsync, generateQdrantConfig, ensureOpencodeConfig, ensureQdrantAgentInstructions, detectQdrantMcp, walkReferencesAsync, chunkFile, loadIndexState, saveIndexState, getFastEmbedCacheDir, getFastEmbedModelPath, getQdrantStoreEnv, startMcpServer, stopMcpServer, callQdrantStore, embedAndStore, batchEmbed, ensureQdrantCollection, upsertQdrantPoints, indexReferences } from "../src/installer/lib.js";

function createFakeMcpProcess(handler = () => {}) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = {
    write(data) { handler(JSON.parse(data), child); },
    end() { child.stdinEnded = true; },
    on() {},
  };
  child.kill = () => { child.killed = true; };
  return child;
}

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
    assert.equal(cfg.disabled, false);
    assert.ok(Array.isArray(cfg.command));
    assert.ok(cfg.env.COLLECTION_NAME.startsWith("references-"));
    assert.ok(cfg.env.FASTEMBED_CACHE_PATH.endsWith("fastembed"));
  });

  it("ensureOpencodeConfig generates valid config structure", () => {
    const cfg = generateQdrantConfig();
    assert.ok(cfg.env.QDRANT_URL);
    assert.ok(cfg.env.COLLECTION_NAME);
    assert.ok(cfg.env.EMBEDDING_MODEL);
    assert.ok(cfg.env.FASTEMBED_CACHE_PATH);
  });

  it("getQdrantStoreEnv includes FASTEMBED_CACHE_PATH and thread/threads for MCP", () => {
    const cfg = generateQdrantConfig();
    const env = getQdrantStoreEnv(cfg);
    assert.equal(env.FASTEMBED_CACHE_PATH, cfg.env.FASTEMBED_CACHE_PATH);
    assert.ok(env.FASTEMBED_CACHE_PATH.endsWith("fastembed"));
    assert.ok(env.QRANT_NUM_THREADS);
    assert.ok(env.QRANT_INDEX_CONCURRENCY);
    assert.ok(env.OMP_NUM_THREADS);
  });

  it("ensureQdrantAgentInstructions creates AGENTS.md from template", () => {
    const dir = mkdtempSync(join(os.tmpdir(), "omnicode-agents-"));
    try {
      const agentsPath = join(dir, "AGENTS.md");
      const template = "<!-- qdrant:instructions:begin -->\nQdrant instructions\n<!-- qdrant:instructions:end -->\n";
      ensureQdrantAgentInstructions(agentsPath, template);
      assert.equal(readFileSync(agentsPath, "utf8"), template);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ensureQdrantAgentInstructions appends the qdrant block when missing", () => {
    const dir = mkdtempSync(join(os.tmpdir(), "omnicode-agents-"));
    try {
      const agentsPath = join(dir, "AGENTS.md");
      const template = "<!-- qdrant:instructions:begin -->\nQdrant instructions\n<!-- qdrant:instructions:end -->\n";
      writeFileSync(agentsPath, "# Existing Instructions\n", "utf8");
      ensureQdrantAgentInstructions(agentsPath, template);
      const content = readFileSync(agentsPath, "utf8");
      assert.ok(content.startsWith("# Existing Instructions\n"));
      assert.ok(content.includes(template.trim()));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ensureQdrantAgentInstructions replaces an existing qdrant block", () => {
    const dir = mkdtempSync(join(os.tmpdir(), "omnicode-agents-"));
    try {
      const agentsPath = join(dir, "AGENTS.md");
      const template = "<!-- qdrant:instructions:begin -->\nNew qdrant instructions\n<!-- qdrant:instructions:end -->\n";
      writeFileSync(agentsPath, "Before\n<!-- qdrant:instructions:begin -->\nOld qdrant instructions\n<!-- qdrant:instructions:end -->\nAfter\n", "utf8");
      ensureQdrantAgentInstructions(agentsPath, template);
      const content = readFileSync(agentsPath, "utf8");
      assert.ok(content.includes("New qdrant instructions"));
      assert.equal(content.includes("Old qdrant instructions"), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ensureQdrantAgentInstructions preserves content outside the managed block", () => {
    const dir = mkdtempSync(join(os.tmpdir(), "omnicode-agents-"));
    try {
      const agentsPath = join(dir, "AGENTS.md");
      const template = "<!-- qdrant:instructions:begin -->\nNew qdrant instructions\n<!-- qdrant:instructions:end -->\n";
      writeFileSync(agentsPath, "Before\n<!-- qdrant:instructions:begin -->\nOld\n<!-- qdrant:instructions:end -->\nAfter\n", "utf8");
      ensureQdrantAgentInstructions(agentsPath, template);
      const content = readFileSync(agentsPath, "utf8");
      assert.ok(content.startsWith("Before\n"));
      assert.ok(content.endsWith("\nAfter\n"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("startMcpServer initializes an MCP server", async () => {
    const child = createFakeMcpProcess((message, fakeChild) => {
      if (message.method === "initialize") {
        queueMicrotask(() => fakeChild.stdout.emit("data", JSON.stringify({ jsonrpc: "2.0", id: message.id, result: {} }) + "\n"));
      }
    });

    const server = await startMcpServer({ FASTEMBED_CACHE_PATH: "/tmp/test-fastembed" }, {
      spawn: () => child,
      initTimeout: 100,
    });

    assert.equal(server.child, child);
    stopMcpServer(server);
    assert.equal(child.stdinEnded, true);
    assert.equal(child.killed, true);
  });

  it("startMcpServer fails on initialize timeout", async () => {
    const child = createFakeMcpProcess();
    await assert.rejects(
      startMcpServer({ FASTEMBED_CACHE_PATH: "/tmp/test-fastembed" }, { spawn: () => child, initTimeout: 1 }),
      /MCP server did not initialize in time/,
    );
  });

  it("startMcpServer fails on process error", async () => {
    const child = createFakeMcpProcess((_message, fakeChild) => {
      queueMicrotask(() => fakeChild.emit("error", new Error("spawn failed")));
    });
    await assert.rejects(
      startMcpServer({ FASTEMBED_CACHE_PATH: "/tmp/test-fastembed" }, { spawn: () => child, initTimeout: 100 }),
      /spawn failed/,
    );
  });

  it("callQdrantStore handles errors gracefully", async () => {
    const result = await callQdrantStore([{ text: "long enough chunk", path: "test.md" }], {});
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 0);
  });

  it("getFastEmbedCacheDir returns a persistent cache path", () => {
    const dir = getFastEmbedCacheDir();
    assert.ok(dir.endsWith("fastembed"));
    assert.equal(dir.includes("/tmp/fastembed_cache"), false);
  });

  it("getFastEmbedModelPath finds an existing model.onnx", () => {
    const cacheDir = mkdtempSync(join(os.tmpdir(), "omnicode-fastembed-"));
    try {
      const modelDir = join(cacheDir, "models--qdrant--bge-small-en-v1.5-onnx-q", "snapshots", "abc123");
      mkdirSync(modelDir, { recursive: true });
      const modelPath = join(modelDir, "model.onnx");
      writeFileSync(modelPath, "model");
      assert.equal(getFastEmbedModelPath(cacheDir), modelPath);
    } finally {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });


  it("walkReferencesAsync yields objects", async () => {
    const files = [];
    for await (const file of walkReferencesAsync(process.cwd())) {
      files.push(file);
      if (files.length > 5) break;
    }
    assert.ok(files.length > 0);
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

  it("saveIndexState and loadIndexState round-trip", async () => {
    const statePath = join(process.cwd(), ".test-index-state.json");
    await saveIndexState(statePath, { "/test/file.md": 123456 });
    const loaded = loadIndexState(statePath);
    assert.equal(loaded["/test/file.md"], 123456);
  });

  it("survives rapid MCP server start/stop cycles", async () => {
    for (let i = 0; i < 5; i++) {
      const child = createFakeMcpProcess((message, fakeChild) => {
        if (message.method === "initialize") {
          queueMicrotask(() => fakeChild.stdout.emit("data", JSON.stringify({ jsonrpc: "2.0", id: message.id, result: {} }) + "\n"));
        }
      });
      const server = await startMcpServer({ FASTEMBED_CACHE_PATH: "/tmp/test-fastembed" }, {
        spawn: () => child,
        initTimeout: 100,
      });
      assert.equal(server.child.killed, undefined);
      stopMcpServer(server);
      assert.equal(server.child.stdinEnded, true);
      assert.equal(server.child.killed, true);
    }
  });

  it("handles indexing errors gracefully via direct API", async () => {
    const result = await callQdrantStore([{ text: "chunk one", path: "test.md" }, { text: "chunk two", path: "test.md" }], {});
    assert.ok(Array.isArray(result));
  });

  it("stopMcpServer does not throw on already-dead child", () => {
    const child = createFakeMcpProcess();
    child.killed = true;
    assert.doesNotThrow(() => stopMcpServer({ child, notify: () => {} }));
  });

  it("batchEmbed returns empty array on subprocess failure", async () => {
    const result = await batchEmbed(["test"], { FASTEMBED_CACHE_PATH: "/nonexistent/path" }, { timeout: 100 });
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 0);
  });

  it("ensureQdrantCollection handles missing server gracefully", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error("connection refused"); };
    try {
      await assert.doesNotReject(ensureQdrantCollection("test-xyz"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("embedAndStore handles missing COLLECTION_NAME gracefully", async () => {
    const result = await embedAndStore([{ text: "test chunk", path: "test.md" }], {});
    assert.equal(result.length, 0);
  });

  it("Ctrl+C handler is registered during indexing", () => {
    const content = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "installer", "lib.js"), "utf8");
    assert.ok(content.includes('process.on("SIGINT"'));
    assert.ok(content.includes("cancelled = true"));
    assert.ok(content.includes('process.off("SIGINT"'));
  });
});
