import { spawn, execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, rmSync, unlinkSync, promises as fsPromises } from "node:fs";
import { join, basename, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { processComplexDocument } from "./mineru-client.js";
import { chunkWithTreeSitter } from "./tree-sitter.js";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === "win32";
const FASTEMBED_MODEL_NAME = "BAAI/bge-small-en-v1.5";
const FASTEMBED_MODEL_CACHE_DIR = "models--qdrant--bge-small-en-v1.5-onnx-q";
const FASTEMBED_MIN_MODEL_SIZE = 40 * 1024 * 1024;
const DEFAULT_INDEX_CONCURRENCY = Math.max(1, Math.floor(os.cpus().length * 0.25));
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

export function countProcesses(name) {
  try {
    if (isWindows) {
      let count = 0;
      const extensions = [".exe", ".cmd", ".bat"];
      for (const ext of extensions) {
        const out = execFileSync("tasklist", ["/FI", `IMAGENAME eq ${name}${ext}`, "/NH"], {
          stdio: ["ignore", "pipe", "ignore"],
          encoding: "utf8",
        });
        const lines = out.trim().split("\n").filter(line => line.includes(`${name}${ext}`));
        count += lines.length;
      }
      return count;
    }
    const out = execFileSync("pgrep", ["-f", name], {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    return out.trim().split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}

export function isProcessRunning(name) {
  return countProcesses(name) > 0;
}

export async function isProcessRunningAsync(name) {
  return isProcessRunning(name);
}

export function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function getQdrantRunningCount() {
  let count = 0;
  const pidFile = getQdrantPidFile();
  try {
    const pid = parseInt(readFileSync(pidFile, "utf8").trim(), 10);
    if (isPidAlive(pid)) count++;
  } catch {}

  // Fallback/Check: Check if the Docker container is running
  if (commandExists("docker")) {
    try {
      const inspectOut = execFileSync("docker", ["inspect", "-f", "{{.State.Running}}", "omnicode-qdrant"], {
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8"
      }).trim();
      if (inspectOut === "true") count++;
    } catch {}
  }
  return count;
}

export function countActiveIndexers() {
  const cwds = new Set();
  
  if (isWindows) {
    try {
      const out = execFileSync("wmic", ["process", "where", "name='node.exe' or name='bun.exe'", "get", "CommandLine"], {
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8"
      });
      // Windows extraction is trickier, fallback to checking if any indexing lock exists
      // But we can check if it contains opencode
      if (out.includes("opencode")) {
        // As a simple fallback on Windows, just check the current dir
        if (existsSync(join(process.cwd(), ".qdrant", ".indexing"))) {
          cwds.add(process.cwd());
        }
      }
    } catch {}
  } else {
    try {
      const out = execFileSync("pgrep", ["-f", "opencode"], {
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8"
      });
      const pids = out.trim().split("\n").filter(Boolean);
      for (const pid of pids) {
        try {
          let cwd = null;
          try {
            cwd = readFileSync(`/proc/${pid}/cwd`); // This won't work, it's a symlink
          } catch {}
          if (!cwd) {
             // Use readlink
             try {
                const linkOut = execFileSync("readlink", ["-e", `/proc/${pid}/cwd`], { encoding: "utf8" });
                cwd = linkOut.trim();
             } catch {}
          }
          if (!cwd && commandExists("pwdx")) {
            try {
              const pwdxOut = execFileSync("pwdx", [pid], { encoding: "utf8" });
              const match = pwdxOut.match(/:\s*(.+)$/);
              if (match) cwd = match[1].trim();
            } catch {}
          }
          if (!cwd && commandExists("lsof")) {
            try {
              const lsofOut = execFileSync("lsof", ["-p", pid, "-a", "-d", "cwd", "-F", "n"], { encoding: "utf8" });
              const lines = lsofOut.trim().split("\n");
              if (lines.length > 1 && lines[1].startsWith("n")) cwd = lines[1].slice(1).trim();
            } catch {}
          }
          
          if (cwd) {
            cwds.add(cwd);
          }
        } catch {}
      }
    } catch {}
  }

  // If no processes found or resolution failed, at least check the current workspace
  if (cwds.size === 0) {
     cwds.add(process.cwd());
  }

  let activeIndexers = 0;
  for (const cwd of cwds) {
    if (existsSync(join(cwd, ".qdrant", ".indexing"))) {
      activeIndexers++;
    }
  }
  
  return activeIndexers;
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

export function resolveCollectionName() {
  const qdrantDir = join(process.cwd(), ".qdrant");
  const idFile = join(qdrantDir, "id");

  if (existsSync(qdrantDir)) {
    const stat = statSync(qdrantDir);
    if (stat.isFile()) {
      try {
        const id = readFileSync(qdrantDir, "utf8").trim();
        unlinkSync(qdrantDir);
        mkdirSync(qdrantDir, { recursive: true });
        writeFileSync(idFile, id, "utf8");
        if (id) return id;
      } catch (e) {
        console.warn("[omnicode] warning: failed to migrate .qdrant file to directory:", e.message);
      }
    } else if (stat.isDirectory()) {
      if (existsSync(idFile)) {
        try {
          const id = readFileSync(idFile, "utf8").trim();
          if (id) return id;
        } catch {}
      }
    }
  } else {
    try { mkdirSync(qdrantDir, { recursive: true }); } catch {}
  }

  const newId = `references-${randomUUID()}`;
  try { writeFileSync(idFile, newId, "utf8"); } catch {}
  return newId;
}

export function generateQdrantConfig() {
  const collectionName = resolveCollectionName();
  const cacheDir = getFastEmbedCacheDir();
  
  let command;
  if (isWindows) {
    command = [
      "cmd.exe",
      "/c",
      `set QDRANT_URL=http://localhost:6333&& set COLLECTION_NAME=${collectionName}&& set EMBEDDING_MODEL=${FASTEMBED_MODEL_NAME}&& set FASTEMBED_CACHE_PATH=${cacheDir}&& set QRANT_NUM_THREADS=1&& set QRANT_INDEX_CONCURRENCY=${DEFAULT_INDEX_CONCURRENCY}&& uvx mcp-server-qdrant`
    ];
  } else {
    command = [
      "sh",
      "-c",
      `QDRANT_URL=http://localhost:6333 COLLECTION_NAME=${collectionName} EMBEDDING_MODEL=${FASTEMBED_MODEL_NAME} FASTEMBED_CACHE_PATH=${cacheDir} QRANT_NUM_THREADS=1 QRANT_INDEX_CONCURRENCY=${DEFAULT_INDEX_CONCURRENCY} uvx mcp-server-qdrant`
    ];
  }

  return {
    type: "local",
    enabled: true,
    disabled: false,
    command,
    env: {
      QDRANT_URL: "http://localhost:6333",
      COLLECTION_NAME: collectionName,
      EMBEDDING_MODEL: FASTEMBED_MODEL_NAME,
      FASTEMBED_CACHE_PATH: cacheDir,
      QRANT_NUM_THREADS: "1",
      QRANT_INDEX_CONCURRENCY: String(DEFAULT_INDEX_CONCURRENCY),
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
  config.mcp.qdrant = { ...qdrantConfig, disabled: false };
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

export function getQdrantPidFile() {
  return join(getDataDir(), "qdrant.pid");
}

export function isQdrantRunning() {
  const pidFile = getQdrantPidFile();
  try {
    const pid = parseInt(readFileSync(pidFile, "utf8").trim(), 10);
    if (isPidAlive(pid)) return true;
  } catch {}

  // Fallback: Check if the Docker container is running
  if (commandExists("docker")) {
    try {
      const inspectOut = execFileSync("docker", ["inspect", "-f", "{{.State.Running}}", "omnicode-qdrant"], {
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8"
      }).trim();
      return inspectOut === "true";
    } catch {}
  }
  return false;
}

export async function startQdrantContainer() {
  if (!commandExists("docker")) {
    console.log("[omnicode] docker not found, skipping container initialization");
    return;
  }
  const storagePath = join(getDataDir(), "qdrant-storage");
  try { mkdirSync(storagePath, { recursive: true }); } catch {}
  try {
    execFileSync("docker", ["run", "-d", "--name", "omnicode-qdrant", "-p", "6333:6333", "-v", `${storagePath}:/qdrant/storage`, "qdrant/qdrant"], { stdio: "ignore" });
    console.log("[omnicode] qdrant container started");
  } catch {
    // might be running already or conflict
  }
  
  const start = Date.now();
  while (Date.now() - start < 15000) {
    try {
      const res = await fetch("http://localhost:6333/readyz");
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  console.log("[omnicode] WARNING: qdrant container did not become ready in time");
}

export function stopQdrantContainer() {
  if (!commandExists("docker")) return;
  try {
    execFileSync("docker", ["rm", "-f", "omnicode-qdrant"], { stdio: "ignore" });
  } catch {}
}

export function cleanQdrantStaleData(qdrantConfig) {
  const localPath = qdrantConfig?.env?.QDRANT_LOCAL_PATH;
  if (!localPath) return;
  const lockPath = join(localPath, ".lock");
  const walPath = join(localPath, "collection", qdrantConfig?.env?.COLLECTION_NAME || "references", "wal");
  try {
    if (existsSync(lockPath)) {
      rmSync(lockPath, { force: true });
    }
    if (existsSync(walPath)) {
      rmSync(walPath, { recursive: true, force: true });
    }
  } catch {}
}

export function getFastEmbedModelPath(cacheDir = getFastEmbedCacheDir()) {
  const snapshotsDir = join(cacheDir, FASTEMBED_MODEL_CACHE_DIR, "snapshots");
  try {
    const snapshots = readdirSync(snapshotsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => ["model.onnx", "model_optimized.onnx"].map((f) => join(snapshotsDir, entry.name, f)));
    return snapshots.find((modelPath) => existsSync(modelPath)) || null;
  } catch {
    return null;
  }
}



export function getQdrantStoreEnv(qdrantConfig) {
  const unifiedConcurrency = qdrantConfig.env.INDEXING_CONCURRENCY || process.env.INDEXING_CONCURRENCY;
  const threads = qdrantConfig.env.QRANT_NUM_THREADS || unifiedConcurrency || String(DEFAULT_INDEX_CONCURRENCY);
  return Object.assign({}, qdrantConfig.env, {
    OMP_NUM_THREADS: threads,
    ONNXRUNTIME_NUM_THREADS: threads,
    UV_THREADPOOL_SIZE: threads,
    ORT_DEFAULT_NUM_THREADS: threads,
    QDRANT_URL: qdrantConfig.env.QDRANT_URL,
    COLLECTION_NAME: qdrantConfig.env.COLLECTION_NAME,
    EMBEDDING_MODEL: qdrantConfig.env.EMBEDDING_MODEL,
    FASTEMBED_CACHE_PATH: qdrantConfig.env.FASTEMBED_CACHE_PATH || getFastEmbedCacheDir(),
  });
}

export async function startMcpServer(env, options = {}) {
  const spawnFn = options.spawn || spawn;
  const initTimeout = options.initTimeout || 10000;
  const pidFile = options.pidFile || null;

  if (pidFile && existsSync(pidFile)) {
    try {
      const existingPid = parseInt(readFileSync(pidFile, "utf8").trim(), 10);
      if (isPidAlive(existingPid)) {
        console.log(`[omnicode] qdrant MCP already running (pid: ${existingPid})`);
        return null;
      }
    } catch {}
    try { rmSync(pidFile, { force: true }); } catch {}
  }

  const cacheDir = env.FASTEMBED_CACHE_PATH || getFastEmbedCacheDir();
  const modelPath = getFastEmbedModelPath(cacheDir);
  if (modelPath) {
    try {
      if (statSync(modelPath).size < FASTEMBED_MIN_MODEL_SIZE) {
        console.log("[omnicode] index: embedding model appears corrupted or incomplete, MCP server will re-download it");
        try { rmSync(join(cacheDir, FASTEMBED_MODEL_CACHE_DIR), { recursive: true, force: true }); } catch {}
      }
    } catch {}
  } else {
    console.log("[omnicode] index: embedding model not found, MCP server will download it during initialization (this may take a while)");
  }

  cleanQdrantStaleData({ env: { QDRANT_LOCAL_PATH: env.QDRANT_LOCAL_PATH, COLLECTION_NAME: env.COLLECTION_NAME } });
  const child = spawnFn("uvx", ["mcp-server-qdrant"], {
    env: { ...process.env, ...env, FASTEMBED_CACHE_PATH: env.FASTEMBED_CACHE_PATH || getFastEmbedCacheDir() },
    stdio: ["pipe", "pipe", "pipe"],
  });

  const pending = new Map();
  let buffer = "";
  let stderr = "";
  let nextId = 1;
  let closed = false;

  const resolvePending = (id, message) => {
    if (!pending.has(id)) return;
    const request = pending.get(id);
    pending.delete(id);
    clearTimeout(request.timeout);
    request.resolve(message);
  };

  const rejectPending = (message) => {
    closed = true;
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
  child.stderr.on("data", (data) => {
    stderr += data.toString();
    if (stderr.length > 5000) stderr = stderr.substring(stderr.length - 5000);
  });
  child.stdin.on("error", () => {});
  child.on("error", (err) => { rejectPending(err.message); });
  child.on("close", (code) => {
    rejectPending(stderr.trim().split("\n").pop() || `MCP server exited with code ${code}`);
  });
  process.on("exit", () => { try { child.kill("SIGKILL"); } catch {} });

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

  if (pidFile) {
    try {
      mkdirSync(dirname(pidFile), { recursive: true });
      writeFileSync(pidFile, String(child.pid), { mode: 0o600 });
    } catch {}
  }

  return { child, request, notify, pending, pidFile, get closed() { return closed; } };
}

export function stopMcpServer(mcpServer) {
  if (!mcpServer || !mcpServer.child) return;
  try { mcpServer.notify("exit", {}); } catch (e) { if (e) {} }
  try { mcpServer.child.stdin.end(); } catch (e) { if (e) {} }
  try { mcpServer.child.kill("SIGTERM"); } catch (e) { if (e) {} }
  const timer = setTimeout(() => {
    try { mcpServer.child.kill("SIGKILL"); } catch {}
    if (mcpServer.pidFile) try { rmSync(mcpServer.pidFile, { force: true }); } catch {}
  }, 5000);
  timer.unref();
}

export function getSystemMemoryInfo() {
  const total = os.totalmem();
  const free = os.freemem();
  return { total, free, usedPercent: ((total - free) / total) * 100, rss: process.memoryUsage().rss };
}

export function warnIfMemoryPressure(thresholdPercent = 75) {
  const info = getSystemMemoryInfo();
  if (info.usedPercent >= thresholdPercent) {
    console.warn(`[omnicode] WARNING: system memory usage at ${info.usedPercent.toFixed(1)}% (threshold: ${thresholdPercent}%). Indexing may be slower or unstable.`);
  }
  return info.usedPercent < thresholdPercent;
}

const BINARY_DOC_EXTENSIONS = new Set([
  ".pdf",
  ".png", ".jpg", ".jpeg", ".jp2", ".webp", ".gif", ".bmp",
  ".doc", ".docx",
  ".ppt", ".pptx",
  ".xls", ".xlsx"
]);

const TEXT_EXTENSIONS = new Set([
  ".md", ".txt", ".json", ".yaml", ".yml", ".ts", ".js", ".mjs", ".cjs", ".sh", ".bash", ".zsh", ".toml", ".cfg", ".conf", ".ini", ".env", ".gitignore", ".dockerfile", ".html", ".htm",
  ...BINARY_DOC_EXTENSIONS
]);

export function isComplexDocument(filePath, buffer) {
  const ext = extname(filePath).toLowerCase();
  if (!BINARY_DOC_EXTENSIONS.has(ext)) return false;

  // Skip small images (under 50KB) as they are likely UI icons/assets rather than doc pages
  const isImage = [".png", ".jpg", ".jpeg", ".jp2", ".webp", ".gif", ".bmp"].includes(ext);
  if (isImage && buffer && buffer.length < 50 * 1024) {
    return false;
  }

  return true;
}

export async function* walkReferencesAsync(dir) {
  try {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      if (entry.isDirectory()) {
        yield* walkReferencesAsync(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        const name = entry.name.toLowerCase();
        if (TEXT_EXTENSIONS.has(ext) || TEXT_EXTENSIONS.has(name)) {
          const st = await fsPromises.stat(fullPath);
          yield { path: fullPath, mtimeMs: st.mtimeMs };
        }
      }
    }
  } catch (err) {
    if (err.code !== "EACCES" && err.code !== "EPERM") throw err;
  }
}

export function chunkFile(content, filePath) {
  let chunks = [];
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
  
  chunks = chunks.filter((c) => c.length > 0);
  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.length > 4000) {
      let remaining = chunk;
      while (remaining.length > 0) {
        finalChunks.push(remaining.substring(0, 4000));
        remaining = remaining.substring(4000);
      }
    } else {
      finalChunks.push(chunk);
    }
  }
  return finalChunks;
}

export function loadIndexState(statePath) {
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return {};
  }
}

export async function saveIndexState(statePath, state) {
  const tmpPath = statePath + ".tmp";
  await fsPromises.writeFile(tmpPath, JSON.stringify(state, null, 2) + "\n", "utf8");
  await fsPromises.rename(tmpPath, statePath);
}

export async function callQdrantStore(chunks, env, concurrency = DEFAULT_INDEX_CONCURRENCY, mcpServer = null) {
  const ownsServer = !mcpServer;
  const server = mcpServer || await startMcpServer(env);
  const results = [];

  const storeChunks = chunks.filter((c) => c.text.length >= 10);
  const workerCount = Math.min(Math.max(1, concurrency), storeChunks.length);
  let nextChunk = 0;
  let nextId = 2;
  let consecutiveTimeouts = 0;

  const storeChunk = async (chunkObj) => {
    const requestNumber = nextId++;
    const response = server.request("tools/call", {
      name: "qdrant-store",
      arguments: { information: chunkObj.text, metadata: { source: chunkObj.path } },
    }, 30000, `chunk ${requestNumber} timed out`)
      .catch((err) => ({ error: { message: err.message } }));

    const message = await response;
    if (message.error) {
      console.warn(`[omnicode] index: warning: ${message.error.message || "chunk failed"}`);
      if (message.error.message && message.error.message.includes("timed out")) {
        consecutiveTimeouts++;
      } else {
        consecutiveTimeouts = 0;
      }
      return;
    }
    consecutiveTimeouts = 0;
    results.push({ chunk: chunkObj.text.substring(0, 80), stored: true });
  };

  const worker = async () => {
    while (nextChunk < storeChunks.length && !server.closed) {
      if (consecutiveTimeouts > 3) {
        console.error("[omnicode] index: aborting batch due to 3+ consecutive timeouts (MCP deadlock detected)");
        server.closed = true;
        break;
      }
      const chunkObj = storeChunks[nextChunk++];
      await storeChunk(chunkObj);
    }
  };

  try {
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return results;
  } finally {
    if (ownsServer) stopMcpServer(server);
  }
}

export async function indexReferences(refsDir, qdrantConfig, mcpServer = null, forceReindex = false, abortSignal = null) {
  const qdrantDir = join(process.cwd(), ".qdrant");
  
  if (forceReindex) {
    console.log("[omnicode] index: forcing full reindex, clearing .qdrant directory...");
    try { rmSync(qdrantDir, { recursive: true, force: true }); } catch {}
  }
  
  const stateFile = join(qdrantDir, "index.json");
  const state = loadIndexState(stateFile);

  if (!existsSync(refsDir)) {
    console.log("[omnicode] index: no references/ folder found");
    return;
  }

  const files = [];
  const currentPaths = new Set();
  for await (const file of walkReferencesAsync(refsDir)) {
    files.push(file);
    currentPaths.add(file.path);
  }

  let stateChanged = false;
  for (const path of Object.keys(state)) {
    if (!currentPaths.has(path)) {
      delete state[path];
      stateChanged = true;
    }
  }
  if (stateChanged) await saveIndexState(stateFile, state);

  const newFiles = files.filter((f) => (state[f.path] || 0) < f.mtimeMs);

  if (newFiles.length === 0) {
    console.log("[omnicode] index: all files up to date");
    return;
  }

  console.log(`[omnicode] index: ${newFiles.length} files to index`);

  const isMemoryPressure = !warnIfMemoryPressure();
  if (isMemoryPressure) {
    console.warn("[omnicode] index: high memory pressure detected, forcing effective concurrency to 1");
  }

  try { mkdirSync(qdrantDir, { recursive: true }); } catch {}

  let ownsServer = false;
  if (!mcpServer) {
    try {
      const env = getQdrantStoreEnv(qdrantConfig);
      mcpServer = await startMcpServer(env);
      ownsServer = true;
    } catch (err) {
      console.error(`[omnicode] index: failed to start MCP server — ${err.message}`);
      return;
    }
  }

  let cancelled = false;
  const onCancel = () => {
    if (cancelled) return;
    console.log("\n[omnicode] index: interrupted, saving partial state...");
    cancelled = true;
    if (mcpServer) stopMcpServer(mcpServer);
  };
  const onSigint = onCancel;
  process.on("SIGINT", onSigint);
  if (abortSignal) {
    abortSignal.addEventListener("abort", onCancel);
  }

  try {
    const lockFile = join(qdrantDir, ".indexing");
    try { writeFileSync(lockFile, "1"); } catch {}
    const env = getQdrantStoreEnv(qdrantConfig);
    const unifiedConcurrency = env.INDEXING_CONCURRENCY || process.env.INDEXING_CONCURRENCY;
    let concurrency = Number.parseInt(env.QRANT_INDEX_CONCURRENCY || unifiedConcurrency || String(DEFAULT_INDEX_CONCURRENCY), 10);
    if (isMemoryPressure) concurrency = 1;
    const workerConcurrency = Number.isFinite(concurrency) && concurrency > 0 ? concurrency : DEFAULT_INDEX_CONCURRENCY;
    let totalStored = 0;
    let filesProcessed = 0;

    let batchFiles = [];
    let batchChunks = [];
    let batchBytes = 0;
    let minerUDisabled = false;
    const activeMinerUTasks = [];

    const flushBatch = async () => {
      if (batchChunks.length === 0) return;
      if (mcpServer && mcpServer.closed) {
        cancelled = true;
        return;
      }

      const currentChunks = batchChunks;
      const currentFiles = batchFiles;
      batchChunks = [];
      batchFiles = [];
      batchBytes = 0;

      const start = Date.now();
      console.log(`[omnicode] index: storing batch of ${currentChunks.length} chunks (${filesProcessed}/${newFiles.length} files processed)`);
      
      await callQdrantStore(currentChunks, env, workerConcurrency, mcpServer);
      
      const duration = Date.now() - start;
      console.log(`[omnicode] index: batch complete in ${duration}ms`);
      if (duration > 30000) console.warn(`[omnicode] index: WARNING: batch took > 30s to process!`);

      totalStored += currentChunks.length;
      for (const file of currentFiles) {
        state[file.path] = file.mtimeMs;
      }
      await saveIndexState(stateFile, state);
    };

    const CONCURRENCY_LIMIT = 8;
    const workers = [];
    let fileIndex = 0;

    const processNextFile = async () => {
      while (fileIndex < newFiles.length) {
        if (cancelled || (mcpServer && mcpServer.closed)) break;
        const file = newFiles[fileIndex++];
        if (!file) continue;

        try {
          const fileBuffer = await fsPromises.readFile(file.path);
          await new Promise(r => setImmediate(r)); // yield event loop
          
          if (cancelled || (mcpServer && mcpServer.closed)) break;

          const apiKey = process.env.MINERU_API_KEY;
          const isComplex = isComplexDocument(file.path, fileBuffer);

          if (isComplex && apiKey && !minerUDisabled) {
              const taskPromise = processComplexDocument(fileBuffer, basename(file.path), apiKey)
                  .then(async markdown => {
                      if (cancelled || (mcpServer && mcpServer.closed)) return;
                      // Append .md to ensure markdown chunking logic applies
                      let chunks = await chunkWithTreeSitter(markdown, file.path + ".md");
                      let algo = "Tree-sitter (structural)";
                      if (!chunks) {
                        chunks = chunkFile(markdown, file.path + ".md");
                        algo = "Linear (sequential)";
                      }
                      console.log(`[omnicode] Indexed: ${file.path} (via MinerU) using ${algo} chunking`);
                      for (const c of chunks) {
                          batchChunks.push({ path: file.path, text: c });
                          batchBytes += Buffer.byteLength(c, "utf8");
                      }
                      batchFiles.push(file);
                      filesProcessed++;
                      if (batchFiles.length >= 100 || batchBytes > 20_000_000) {
                        await flushBatch();
                      }
                  })
                  .catch(async err => {
                      if (err.status === 401 || err.status === 402) {
                          console.warn(`[omnicode] index: MinerU API quota/auth error (${err.status}), disabling MinerU routing.`);
                          minerUDisabled = true;
                      } else {
                          console.warn(`[omnicode] index: MinerU API failed for ${file.path}, falling back to local chunking: ${err.message}`);
                      }
                      // Fallback to local
                      const isBinaryDoc = BINARY_DOC_EXTENSIONS.has(extname(file.path).toLowerCase());
                      const contentStr = isBinaryDoc ? "Binary Content Placeholder" : fileBuffer.toString("utf8");
                      let chunks = await chunkWithTreeSitter(contentStr, file.path);
                      let algo = "Tree-sitter (structural)";
                      if (!chunks) {
                        chunks = chunkFile(contentStr, file.path);
                        algo = "Linear (sequential)";
                      }
                      console.log(`[omnicode] Indexed: ${file.path} (local fallback) using ${algo} chunking`);
                      for (const c of chunks) {
                          batchChunks.push({ path: file.path, text: c });
                          batchBytes += Buffer.byteLength(c, "utf8");
                      }
                      batchFiles.push(file);
                      filesProcessed++;
                      if (batchFiles.length >= 100 || batchBytes > 20_000_000) {
                        await flushBatch();
                      }
                  });
              
              activeMinerUTasks.push(taskPromise);
              continue;
          }

          // Standard processing for non-complex or if API missing/disabled
          const isBinaryDoc = BINARY_DOC_EXTENSIONS.has(extname(file.path).toLowerCase());
          const content = isBinaryDoc ? "Binary Content Placeholder" : fileBuffer.toString("utf8");
          let chunks = await chunkWithTreeSitter(content, file.path);
          let algo = "Tree-sitter (structural)";
          if (!chunks) {
            chunks = chunkFile(content, file.path);
            algo = "Linear (sequential)";
          }
          console.log(`[omnicode] Indexed: ${file.path} using ${algo} chunking`);
          for (const c of chunks) {
            batchChunks.push({ path: file.path, text: c });
            batchBytes += Buffer.byteLength(c, "utf8");
          }
          batchFiles.push(file);
          filesProcessed++;

          if (batchFiles.length >= 100 || batchBytes > 20_000_000) {
            await flushBatch();
          }
        } catch (err) {
          console.warn(`[omnicode] index: skipping ${file.path} — ${err.message}`);
        }
      }
    };

    for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
      workers.push(processNextFile());
    }
    await Promise.all(workers);
    
    // Wait for any remaining asynchronous MinerU tasks to resolve before final flush
    await Promise.allSettled(activeMinerUTasks);

    if (!cancelled) await flushBatch();
    
    if (cancelled) {
      console.log("[omnicode] index: aborted by user");
    } else {
      console.log("[omnicode] index: complete");
    }
  } catch (err) {
    console.error(`[omnicode] index: failed — ${err.message}`);
  } finally {
    process.off("SIGINT", onSigint);
    if (abortSignal) abortSignal.removeEventListener("abort", onCancel);
    if (ownsServer) stopMcpServer(mcpServer);
    await saveIndexState(stateFile, state);
    const lockFile = join(qdrantDir, ".indexing");
    try { rmSync(lockFile, { force: true }); } catch {}
  }
}
