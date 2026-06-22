import { spawn, execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, basename, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === "win32";
const FASTEMBED_MODEL_CACHE_DIR = "models--qdrant--all-MiniLM-L6-v2-onnx";
const FASTEMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2";
const FASTEMBED_MIN_MODEL_SIZE = 80 * 1024 * 1024;
const FASTEMBED_WARMUP_SCRIPT = `from fastembed import TextEmbedding; list(TextEmbedding('${FASTEMBED_MODEL_NAME}').passage_embed(['warmup']))`;
const QDRANT_INSTRUCTIONS_BEGIN = "<!-- qdrant:instructions:begin";
const QDRANT_INSTRUCTIONS_END = "<!-- qdrant:instructions:end -->";
const QDRANT_AGENTS_TEMPLATE = readFileSync(join(__dirname, "AGENTS.template.md"), "utf8").trim() + "\n";

export function commandExists(command) {
  const tool = isWindows ? "where" : "which";
  try {
    execFileSync(tool, [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function isProcessRunning(name) {
  try {
    if (isWindows) {
      const extensions = [".exe", ".cmd", ".bat"];
      for (const ext of extensions) {
        const out = execFileSync("tasklist", ["/FI", `IMAGENAME eq ${name}${ext}`, "/NH"], {
          stdio: ["ignore", "pipe", "ignore"],
          encoding: "utf8",
        });
        if (out.includes(`${name}${ext}`)) return true;
      }
      return false;
    }
    execFileSync("pgrep", ["-f", name], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function isProcessRunningAsync(name) {
  try {
    if (isWindows) {
      const extensions = [".exe", ".cmd", ".bat"];
      for (const ext of extensions) {
        try {
          const { stdout } = await execFileAsync("tasklist", ["/FI", `IMAGENAME eq ${name}${ext}`, "/NH"], {
            encoding: "utf8",
          });
          if (stdout.includes(`${name}${ext}`)) return true;
        } catch {}
      }
      return false;
    }
    await execFileAsync("pgrep", ["-f", name]);
    return true;
  } catch {
    return false;
  }
}

export function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function detectQdrantMcp() {
  if (!commandExists("uvx")) return false;
  try {
    execFileSync("uvx", ["mcp-server-qdrant", "--help"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function generateQdrantConfig() {
  return {
    type: "local",
    enabled: true,
    disabled: true,
    command: ["uvx", "mcp-server-qdrant"],
    env: {
      QDRANT_LOCAL_PATH: join(process.cwd(), ".qdrant"),
      COLLECTION_NAME: "references",
      EMBEDDING_MODEL: "sentence-transformers/all-MiniLM-L6-v2",
      FASTEMBED_CACHE_PATH: getFastEmbedCacheDir(),
    },
  };
}

export function ensureOpencodeConfig(qdrantConfig) {
  const configPath = join(process.cwd(), "opencode.jsonc");
  let config = { $schema: "https://opencode.ai/config.json", mcp: {} };
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, "utf8"));
    } catch {}
    if (!config.mcp) config.mcp = {};
  }
  config.mcp.qdrant = { ...qdrantConfig, disabled: true };
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
}

export function ensureQdrantAgentInstructions(agentsPath = join(process.cwd(), "AGENTS.md"), template = QDRANT_AGENTS_TEMPLATE) {
  if (!existsSync(agentsPath)) {
    writeFileSync(agentsPath, template, "utf8");
    return;
  }

  const current = readFileSync(agentsPath, "utf8");
  const beginIndex = current.indexOf(QDRANT_INSTRUCTIONS_BEGIN);
  const endIndex = current.indexOf(QDRANT_INSTRUCTIONS_END);

  if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
    const separator = current.endsWith("\n") ? "\n" : "\n\n";
    writeFileSync(agentsPath, current + separator + template, "utf8");
    return;
  }

  const endOfBlock = endIndex + QDRANT_INSTRUCTIONS_END.length;
  const next = current.slice(0, beginIndex) + template.trimEnd() + current.slice(endOfBlock);
  writeFileSync(agentsPath, next.endsWith("\n") ? next : `${next}\n`, "utf8");
}

export function getDataDir() {
  return join(os.homedir(), ".local", "share", "omnicode");
}

export function getOpencodeDbPath() {
  const dbPath = join(os.homedir(), ".local", "share", "opencode", "opencode.db");
  if (!existsSync(dbPath)) return null;
  return dbPath;
}

export function getFastEmbedCacheDir() {
  if (isWindows) return join(process.env.LOCALAPPDATA || os.tmpdir(), "fastembed");
  return join(os.homedir(), ".cache", "fastembed");
}

export function getFastEmbedModelPath(cacheDir = getFastEmbedCacheDir()) {
  const snapshotsDir = join(cacheDir, FASTEMBED_MODEL_CACHE_DIR, "snapshots");
  try {
    const snapshots = readdirSync(snapshotsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(snapshotsDir, entry.name, "model.onnx"));
    return snapshots.find((modelPath) => existsSync(modelPath)) || null;
  } catch {
    return null;
  }
}

async function runFastEmbedWarmup(cacheDir, timeout) {
  await execFileAsync("uvx", ["--from", "mcp-server-qdrant", "python3", "-c", FASTEMBED_WARMUP_SCRIPT], {
    env: { ...process.env, FASTEMBED_CACHE_PATH: cacheDir },
    timeout,
  });
}

export async function verifyFastEmbedModel(options = {}) {
  const cacheDir = options.cacheDir || getFastEmbedCacheDir();
  const minModelSize = options.minModelSize || FASTEMBED_MIN_MODEL_SIZE;
  const warmup = options.warmup || runFastEmbedWarmup;
  const loadTimeout = options.loadTimeout || 30000;
  const downloadTimeout = options.downloadTimeout || 120000;
  const modelCacheDir = join(cacheDir, FASTEMBED_MODEL_CACHE_DIR);

  const validate = async () => {
    const modelPath = getFastEmbedModelPath(cacheDir);
    if (!modelPath) return false;
    try {
      if (statSync(modelPath).size < minModelSize) return false;
      await warmup(cacheDir, loadTimeout);
      return true;
    } catch {
      return false;
    }
  };

  console.log("[omnicode] verifying embedding model...");
  if (await validate()) {
    console.log("[omnicode] embedding model OK");
    return true;
  }

  console.log("[omnicode] embedding model corrupted, re-downloading...");
  try {
    rmSync(modelCacheDir, { recursive: true, force: true });
    mkdirSync(cacheDir, { recursive: true });
    await warmup(cacheDir, downloadTimeout);
    if (await validate()) {
      console.log("[omnicode] embedding model downloaded");
      return true;
    }
  } catch {}

  console.error(`[omnicode] index: failed to prepare FastEmbed model cache at ${cacheDir}`);
  console.error("[omnicode] index: run `rm -rf <cache>` and retry, or check network access to HuggingFace.");
  return false;
}

export function getQdrantStoreEnv(qdrantConfig) {
  return {
    QDRANT_LOCAL_PATH: qdrantConfig.env.QDRANT_LOCAL_PATH,
    COLLECTION_NAME: qdrantConfig.env.COLLECTION_NAME,
    EMBEDDING_MODEL: qdrantConfig.env.EMBEDDING_MODEL,
    FASTEMBED_CACHE_PATH: qdrantConfig.env.FASTEMBED_CACHE_PATH || getFastEmbedCacheDir(),
  };
}

export async function startMcpServer(env, options = {}) {
  const spawnFn = options.spawn || spawn;
  const initTimeout = options.initTimeout || 10000;
  const child = spawnFn("uvx", ["mcp-server-qdrant"], {
    env: { ...process.env, ...env, FASTEMBED_CACHE_PATH: env.FASTEMBED_CACHE_PATH || getFastEmbedCacheDir() },
    stdio: ["pipe", "pipe", "pipe"],
  });

  const pending = new Map();
  let buffer = "";
  let stderr = "";
  let nextId = 1;

  const resolvePending = (id, message) => {
    if (!pending.has(id)) return;
    const request = pending.get(id);
    pending.delete(id);
    clearTimeout(request.timeout);
    request.resolve(message);
  };

  const rejectPending = (message) => {
    for (const id of pending.keys()) {
      resolvePending(id, { error: { message } });
    }
  };

  const parseMessages = (data) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let message;
      try {
        message = JSON.parse(trimmed);
      } catch {
        continue;
      }

      if (message.id !== undefined) resolvePending(message.id, message);
    }
  };

  const request = (method, params, timeoutMs, timeoutMessage) => {
    const id = nextId++;
    const response = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(timeoutMessage));
      }, timeoutMs);
      pending.set(id, { resolve, timeout });
    });

    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    return response;
  };

  const notify = (method, params) => {
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, ...(params ? { params } : {}) }) + "\n");
  };

  child.stdout.on("data", parseMessages);
  child.stderr.on("data", (data) => { stderr += data.toString(); });
  child.on("error", (err) => { rejectPending(err.message); });
  child.on("close", (code) => {
    rejectPending(stderr.trim().split("\n").pop() || `MCP server exited with code ${code}`);
  });

  let initialized;
  try {
    initialized = await request("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "omnicode-indexer", version: "0.1" },
    }, initTimeout, "MCP server did not initialize in time");
  } catch (err) {
    try { child.kill(); } catch {}
    throw err;
  }
  if (initialized.error) {
    try { child.kill(); } catch {}
    throw new Error(initialized.error.message || "MCP server failed to initialize");
  }

  notify("notifications/initialized");

  return { child, request, notify, pending };
}

export function stopMcpServer(mcpServer) {
  if (!mcpServer) return;
  try { mcpServer.notify("exit"); } catch {}
  try { mcpServer.child.stdin.end(); } catch {}
  try { mcpServer.child.kill(); } catch {}
}

const TEXT_EXTENSIONS = new Set([".md", ".txt", ".json", ".yaml", ".yml", ".ts", ".js", ".mjs", ".cjs", ".sh", ".bash", ".zsh", ".toml", ".cfg", ".conf", ".ini", ".env", ".gitignore", ".dockerfile"]);

export function walkReferences(dir) {
  const files = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      if (entry.isDirectory()) {
        files.push(...walkReferences(fullPath));
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        const name = entry.name.toLowerCase();
        if (TEXT_EXTENSIONS.has(ext) || TEXT_EXTENSIONS.has(name)) {
          const st = statSync(fullPath);
          files.push({ path: fullPath, mtimeMs: st.mtimeMs });
        }
      }
    }
  } catch {}
  return files;
}

export function chunkFile(content, filePath) {
  const chunks = [];
  const isMarkdown = filePath.endsWith(".md");
  if (isMarkdown) {
    const lines = content.split("\n");
    let currentChunk = [];
    for (const line of lines) {
      if (line.startsWith("## ")) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join("\n").trim());
        }
        currentChunk = [line];
      } else {
        currentChunk.push(line);
      }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk.join("\n").trim());
  } else {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i += 50) {
      chunks.push(lines.slice(i, i + 50).join("\n").trim());
    }
  }
  return chunks.filter((c) => c.length > 0);
}

export function loadIndexState(statePath) {
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return {};
  }
}

export function saveIndexState(statePath, state) {
  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
}

export async function callQdrantStore(chunks, env, concurrency = 10, mcpServer = null) {
  const ownsServer = !mcpServer;
  const server = mcpServer || await startMcpServer(env);
  const results = [];

  const storeChunks = chunks.filter((chunk) => chunk.length >= 10);
  const workerCount = Math.min(Math.max(1, concurrency), storeChunks.length);
  let nextChunk = 0;
  let nextId = 2;

  const storeChunk = async (chunk) => {
    const requestNumber = nextId++;
    const response = server.request("tools/call", {
      name: "qdrant-store",
      arguments: { information: chunk },
    }, 30000, `chunk ${requestNumber} timed out`)
      .catch((err) => ({ error: { message: err.message } }));

    const message = await response;
    if (message.error) {
      console.warn(`[omnicode] index: warning: ${message.error.message || "chunk failed"}`);
      return;
    }
    results.push({ chunk: chunk.substring(0, 80), stored: true });
  };

  const worker = async () => {
    while (nextChunk < storeChunks.length) {
      const chunk = storeChunks[nextChunk++];
      await storeChunk(chunk);
    }
  };

  try {
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return results;
  } finally {
    if (ownsServer) stopMcpServer(server);
  }
}

export async function indexReferences(refsDir, qdrantConfig, mcpServer = null) {
  const qdrantDir = join(process.cwd(), ".qdrant");
  const stateFile = join(qdrantDir, "index.json");
  const state = loadIndexState(stateFile);

  if (!existsSync(refsDir)) {
    console.log("[omnicode] index: no references/ folder found");
    return;
  }

  const files = walkReferences(refsDir);
  const newFiles = files.filter((f) => (state[f.path] || 0) < f.mtimeMs);

  if (newFiles.length === 0) {
    console.log("[omnicode] index: all files up to date");
    return;
  }

  console.log(`[omnicode] index: ${newFiles.length} files to index`);
  const allChunks = [];

  for (const file of newFiles) {
    try {
      const content = readFileSync(file.path, "utf8");
      const chunks = chunkFile(content, file.path);
      allChunks.push(...chunks.map((c) => ({ path: file.path, text: c })));
      state[file.path] = file.mtimeMs;
    } catch {}
  }

  if (allChunks.length === 0) {
    console.log("[omnicode] index: no chunks to store");
    saveIndexState(stateFile, state);
    return;
  }

  try { mkdirSync(qdrantDir, { recursive: true }); } catch {}

  console.log(`[omnicode] index: storing ${allChunks.length} chunks`);

  try {
    if (!mcpServer && !(await verifyFastEmbedModel({ cacheDir: qdrantConfig.env.FASTEMBED_CACHE_PATH || getFastEmbedCacheDir() }))) {
      console.error("[omnicode] index: skipped because embedding model is unavailable");
      return;
    }

    const env = getQdrantStoreEnv(qdrantConfig);
    const concurrency = Number.parseInt(process.env.OMNICODE_INDEX_CONCURRENCY || "10", 10);
    await callQdrantStore(allChunks.map((c) => c.text), env, Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 10, mcpServer);
    console.log("[omnicode] index: complete");
  } catch (err) {
    console.error(`[omnicode] index: failed — ${err.message}`);
  }

  saveIndexState(stateFile, state);
}
