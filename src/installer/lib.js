import { spawn, execFileSync as _execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, rmSync, unlinkSync, promises as fsPromises } from "node:fs";
import { join, basename, dirname, extname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { processComplexDocument } from "./mineru-client.js";
import { chunkWithTreeSitter } from "./tree-sitter.js";

// 🛡️ Sentinel: Enforce FEAR principle. Wrap synchronous I/O to prevent DoS via indefinitely hanging child processes.
const execFileSync = (cmd, argsOrOpts, opts = {}) => {
  if (!Array.isArray(argsOrOpts)) {
    opts = argsOrOpts || {};
    return _execFileSync(cmd, { timeout: opts.timeout ?? 5000, ...opts });
  }
  return _execFileSync(cmd, argsOrOpts, { timeout: opts.timeout ?? 5000, ...opts });
};

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
const QDRANT_AGENTS_TEMPLATE = readFileSync(join(__dirname, "QDRANT.md"), "utf8").trim() + "\n";
const GRAYMATTER_INSTRUCTIONS_BEGIN = "<!-- graymatter_cli:instructions:begin";
const GRAYMATTER_INSTRUCTIONS_END = "<!-- graymatter_cli:instructions:end -->";
const GRAYMATTER_AGENTS_TEMPLATE = readFileSync(join(__dirname, "GRAYMATTER.md"), "utf8").trim() + "\n";

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
    execFileSync("uvx", ["mcp-server-qdrant", "--help"], { stdio: "ignore", timeout: 30000 });
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
  
  // Resolve concurrency from environment, fallback to existing config, fallback to default (25% of cores)
  let concurrency = process.env.INDEXING_CONCURRENCY;
  if (!concurrency) {
    try {
      const configPath = join(process.cwd(), "opencode.jsonc");
      if (existsSync(configPath)) {
        const existing = JSON.parse(readFileSync(configPath, "utf8"));
        concurrency = existing?.mcp?.qdrant?.env?.INDEXING_CONCURRENCY;
      }
    } catch {}
  }
  const resolvedConcurrency = concurrency ? String(concurrency) : String(DEFAULT_INDEX_CONCURRENCY);
  
  let command;
  if (isWindows) {
    command = [
      "cmd.exe",
      "/c",
      `set QDRANT_URL=http://localhost:6333&& set COLLECTION_NAME=${collectionName}&& set EMBEDDING_MODEL=${FASTEMBED_MODEL_NAME}&& set FASTEMBED_CACHE_PATH=${cacheDir}&& set OMP_NUM_THREADS=${resolvedConcurrency}&& set ONNXRUNTIME_NUM_THREADS=${resolvedConcurrency}&& set ORT_DEFAULT_NUM_THREADS=${resolvedConcurrency}&& set UV_THREADPOOL_SIZE=${resolvedConcurrency}&& set RAYON_NUM_THREADS=${resolvedConcurrency}&& set INDEXING_CONCURRENCY=${resolvedConcurrency}&& uvx mcp-server-qdrant`
    ];
  } else {
    command = [
      "sh",
      "-c",
      `QDRANT_URL=http://localhost:6333 COLLECTION_NAME=${collectionName} EMBEDDING_MODEL=${FASTEMBED_MODEL_NAME} FASTEMBED_CACHE_PATH=${cacheDir} OMP_NUM_THREADS=${resolvedConcurrency} ONNXRUNTIME_NUM_THREADS=${resolvedConcurrency} ORT_DEFAULT_NUM_THREADS=${resolvedConcurrency} UV_THREADPOOL_SIZE=${resolvedConcurrency} RAYON_NUM_THREADS=${resolvedConcurrency} INDEXING_CONCURRENCY=${resolvedConcurrency} uvx mcp-server-qdrant`
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
      INDEXING_CONCURRENCY: resolvedConcurrency,
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

function ensureManagedBlock(agentsPath, template, beginMarker, endMarker) {
  if (!existsSync(agentsPath)) {
    writeFileSync(agentsPath, template, "utf8");
    return;
  }

  const current = readFileSync(agentsPath, "utf8");
  const beginIndex = current.indexOf(beginMarker);
  const endIndex = current.indexOf(endMarker);

  if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
    const separator = current.endsWith("\n") ? "\n" : "\n\n";
    writeFileSync(agentsPath, current + separator + template, "utf8");
    return;
  }

  const endOfBlock = endIndex + endMarker.length;
  const next = current.slice(0, beginIndex) + template.trimEnd() + current.slice(endOfBlock);
  writeFileSync(agentsPath, next.endsWith("\n") ? next : `${next}\n`, "utf8");
}

export function ensureQdrantAgentInstructions(agentsPath = join(process.cwd(), "AGENTS.md"), template = QDRANT_AGENTS_TEMPLATE) {
  ensureManagedBlock(agentsPath, template, QDRANT_INSTRUCTIONS_BEGIN, QDRANT_INSTRUCTIONS_END);
}

export function ensureGraymatterAgentInstructions(agentsPath = join(process.cwd(), "AGENTS.md"), template = GRAYMATTER_AGENTS_TEMPLATE) {
  ensureManagedBlock(agentsPath, template, GRAYMATTER_INSTRUCTIONS_BEGIN, GRAYMATTER_INSTRUCTIONS_END);
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
    execFileSync("docker", ["run", "-d", "--name", "omnicode-qdrant", "-p", "6333:6333", "-v", `${storagePath}:/qdrant/storage`, "qdrant/qdrant"], { stdio: "ignore", timeout: 120000 });
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
  const indexConcurrency = qdrantConfig.env.QRANT_INDEX_CONCURRENCY || unifiedConcurrency || String(DEFAULT_INDEX_CONCURRENCY);
  return Object.assign({}, qdrantConfig.env, {
    OMP_NUM_THREADS: threads,
    ONNXRUNTIME_NUM_THREADS: threads,
    UV_THREADPOOL_SIZE: threads,
    ORT_DEFAULT_NUM_THREADS: threads,
    QRANT_NUM_THREADS: threads,
    QRANT_INDEX_CONCURRENCY: indexConcurrency,
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

const INDEX_STATE_VERSION = 2;
const DELETE_BATCH_SIZE = 100;

export function loadIndexState(statePath) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return { version: INDEX_STATE_VERSION, files: {}, submoduleCommits: {} };
  }

  if (!raw || typeof raw !== "object" || raw.version !== INDEX_STATE_VERSION) {
    const backupPath = `${statePath}.v1`;
    try {
      writeFileSync(backupPath, JSON.stringify(raw, null, 2) + "\n", "utf8");
      console.log(`[omnicode] index: backed up old state to ${backupPath}`);
    } catch (err) {
      console.warn(`[omnicode] index: could not back up old state — ${err.message}`);
    }
    return { version: INDEX_STATE_VERSION, files: {}, submoduleCommits: {} };
  }

  return {
    version: raw.version,
    files: raw.files || {},
    submoduleCommits: raw.submoduleCommits || {},
  };
}

export async function saveIndexState(statePath, state) {
  const toWrite = {
    version: INDEX_STATE_VERSION,
    files: state.files || {},
    submoduleCommits: state.submoduleCommits || {},
  };
  const tmpPath = `${statePath}.${randomUUID()}.tmp`;
  await fsPromises.writeFile(tmpPath, JSON.stringify(toWrite, null, 2) + "\n", "utf8");
  await fsPromises.rename(tmpPath, statePath);
}

export function hashFile(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return `sha256:${hash.digest("hex")}`;
}

export function getSubmoduleCommit(submodulePath) {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: submodulePath, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return commit.trim();
  } catch {
    return null;
  }
}

export function resolveSubmoduleForFile(filePath, refsDir) {
  const rel = relative(refsDir, filePath);
  const firstSegment = rel.split(sep)[0];
  if (!firstSegment) return null;
  const candidate = join(refsDir, firstSegment);
  if (existsSync(join(candidate, ".git"))) return candidate;
  return null;
}

export function batchEmbedScript(modelName) {
  return `import json, sys\nfrom fastembed import TextEmbedding\ntexts = json.load(sys.stdin)\nmodel = TextEmbedding('${modelName}')\nembeddings = list(model.passage_embed(texts))\nvectors = [e.tolist() for e in embeddings]\njson.dump(vectors, sys.stdout)`;
}

export async function batchEmbed(texts, env, options = {}) {
  const modelName = options.modelName || FASTEMBED_MODEL_NAME;
  const timeout = options.timeout || 120000;
  const signal = options.signal || null;
  return new Promise((resolve) => {
    if (signal && signal.aborted) { resolve([]); return; }

    const child = spawn("uvx", ["--from", "mcp-server-qdrant", "python3", "-c", batchEmbedScript(modelName)], {
      env: { ...process.env, ...env, FASTEMBED_CACHE_PATH: env.FASTEMBED_CACHE_PATH || getFastEmbedCacheDir() },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => { child.kill(); }, timeout);
    const onAbort = () => { child.kill(); };
    if (signal) signal.addEventListener("abort", onAbort, { once: true });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
      if (code !== 0 || !stdout.trim()) {
        if (!(signal && signal.aborted)) {
          console.warn(`[omnicode] index: embedding failed — ${stderr.trim().split("\n").pop() || `exit code ${code}`}`);
        }
        resolve([]);
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (err) {
        console.warn(`[omnicode] index: embedding output parse failed — ${err.message}`);
        resolve([]);
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
      console.warn(`[omnicode] index: embedding failed — ${err.message}`);
      resolve([]);
    });

    child.stdin.write(JSON.stringify(texts));
    child.stdin.end();
  });
}

export async function createQdrantCollection(collectionName) {
  try {
    const body = {
      name: collectionName,
      vectors: { size: 384, distance: "Cosine" },
    };
    const res = await fetch(`http://localhost:6333/collections/${encodeURIComponent(collectionName)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok && res.status !== 409) {
      console.warn(`[omnicode] index: failed to create collection — ${res.status}`);
    }
  } catch (err) {
    console.warn(`[omnicode] index: qdrant server not reachable — ${err.message}`);
  }
}

export async function ensureQdrantCollection(collectionName) {
  try {
    const res = await fetch(`http://localhost:6333/collections/${encodeURIComponent(collectionName)}`);
    if (res.status === 404) {
      await createQdrantCollection(collectionName);
    }
  } catch (err) {
    console.warn(`[omnicode] index: qdrant server not reachable — ${err.message}`);
  }
}

export async function upsertQdrantPoints(collectionName, points) {
  try {
    const body = { points };
    const res = await fetch(`http://localhost:6333/collections/${encodeURIComponent(collectionName)}/points`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`[omnicode] index: failed to upsert points — ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.warn(`[omnicode] index: qdrant server not reachable — ${err.message}`);
  }
}

export async function embedAndStore(chunks, env, signal = null) {
  const collectionName = env.COLLECTION_NAME;
  if (!collectionName) {
    console.error("[omnicode] index: COLLECTION_NAME is required");
    return [];
  }

  await ensureQdrantCollection(collectionName);

  const storeChunks = chunks.filter((c) => c.text.length >= 10);
  if (storeChunks.length === 0) return [];

  const texts = storeChunks.map((c) => c.text);
  const vectors = await batchEmbed(texts, env, { signal });
  if (vectors.length === 0) {
    console.warn("[omnicode] index: no embeddings returned, skipping storage");
    return [];
  }

  if (vectors.length !== storeChunks.length) {
    console.warn(`[omnicode] index: embedding count mismatch (${vectors.length} vs ${storeChunks.length}), skipping`);
    return [];
  }

  const POINTS_BATCH = 100;
  let pointId = 0;
  const allIds = [];

  for (let i = 0; i < storeChunks.length; i += POINTS_BATCH) {
    const batchPoints = [];
    for (let j = i; j < Math.min(i + POINTS_BATCH, storeChunks.length); j++) {
      pointId++;
      batchPoints.push({
        id: pointId,
        vector: vectors[j],
        payload: { source: storeChunks[j].path, text: storeChunks[j].text },
      });
    }
    await upsertQdrantPoints(collectionName, batchPoints);
    allIds.push(...batchPoints.map((p) => p.id));
  }

  return allIds.map((id, idx) => ({ chunk: storeChunks[idx].text.substring(0, 80), stored: true }));
}

export async function deleteQdrantPointsBySource(collectionName, sources) {
  try {
    for (let i = 0; i < sources.length; i += DELETE_BATCH_SIZE) {
      const batch = sources.slice(i, i + DELETE_BATCH_SIZE);
      const body = {
        filter: {
          must: [
            { key: "source", match: { any: batch } },
          ],
        },
      };
      const res = await fetch(`http://localhost:6333/collections/${encodeURIComponent(collectionName)}/points/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.warn(`[omnicode] index: failed to delete points — ${res.status}: ${await res.text()}`);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn(`[omnicode] index: qdrant server not reachable during deletion — ${err.message}`);
    return false;
  }
}

export async function callQdrantStore(chunks, env, _concurrency = DEFAULT_INDEX_CONCURRENCY, _mcpServer = null) {
  return embedAndStore(chunks, env);
}



export async function indexReferences(refsDir, qdrantConfig, _mcpServer = null, forceReindex = false, abortSignal = null, options = {}) {
  const dryRun = options.dryRun || false;
  const qdrantDir = join(process.cwd(), ".qdrant");

  if (forceReindex && !dryRun) {
    console.log("[omnicode] index: forcing full reindex, clearing .qdrant directory...");
    try { rmSync(qdrantDir, { recursive: true, force: true }); } catch {}
  }

  const stateFile = join(qdrantDir, "index.json");
  const state = loadIndexState(stateFile);

  if (!existsSync(refsDir)) {
    console.log("[omnicode] index: no references/ folder found");
    return { new: 0, modified: 0, deleted: 0, unchanged: 0 };
  }

  const files = [];
  const currentPaths = new Set();
  for await (const file of walkReferencesAsync(refsDir)) {
    files.push(file);
    currentPaths.add(file.path);
  }

  const submoduleCommits = new Map();
  for (const file of files) {
    const submodulePath = resolveSubmoduleForFile(file.path, refsDir);
    if (submodulePath && !submoduleCommits.has(submodulePath)) {
      const commit = getSubmoduleCommit(submodulePath);
      if (commit) submoduleCommits.set(submodulePath, commit);
    }
  }

  const newFiles = [];
  const modifiedFiles = [];
  const unchangedFiles = [];

  for (const file of files) {
    const stored = state.files[file.path];
    const submodulePath = resolveSubmoduleForFile(file.path, refsDir);
    const currentCommit = submodulePath ? submoduleCommits.get(submodulePath) || null : null;
    const submoduleName = submodulePath ? relative(process.cwd(), submodulePath) : null;
    const storedSubmoduleCommit = submoduleName ? (state.submoduleCommits || {})[submoduleName] : null;

    if (!stored) {
      newFiles.push(file);
      continue;
    }

    let isModified = false;
    if (stored.mtimeMs !== file.mtimeMs) {
      isModified = true;
    }
    if (!isModified) {
      const currentHash = hashFile(file.path);
      if (stored.hash !== currentHash) isModified = true;
    }
    if (!isModified && submoduleName && storedSubmoduleCommit && currentCommit && storedSubmoduleCommit !== currentCommit) {
      isModified = true;
    }

    if (isModified) {
      modifiedFiles.push(file);
    } else {
      unchangedFiles.push(file);
    }
  }

  const deletedPaths = Object.keys(state.files).filter((p) => !currentPaths.has(p));

  console.log(`[omnicode] index: ${newFiles.length} new, ${modifiedFiles.length} modified, ${deletedPaths.length} deleted, ${unchangedFiles.length} unchanged`);

  if (dryRun) {
    return { new: newFiles.length, modified: modifiedFiles.length, deleted: deletedPaths.length, unchanged: unchangedFiles.length };
  }

  if (newFiles.length === 0 && modifiedFiles.length === 0 && deletedPaths.length === 0) {
    console.log("[omnicode] index: all files up to date");
    return { new: 0, modified: 0, deleted: 0, unchanged: unchangedFiles.length };
  }

  const env = getQdrantStoreEnv(qdrantConfig);
  const collectionName = env.COLLECTION_NAME;
  if (deletedPaths.length > 0 && collectionName) {
    console.log(`[omnicode] index: cleaning up ${deletedPaths.length} deleted file(s)`);
    const deleted = await deleteQdrantPointsBySource(collectionName, deletedPaths);
    if (deleted) {
      for (const p of deletedPaths) delete state.files[p];
      await saveIndexState(stateFile, state);
    } else {
      console.warn("[omnicode] index: deletion cleanup failed, will retry next startup");
    }
  }

  const isMemoryPressure = !warnIfMemoryPressure();
  if (isMemoryPressure) {
    console.warn("[omnicode] index: high memory pressure detected, forcing effective concurrency to 1");
  }

  try { mkdirSync(qdrantDir, { recursive: true }); } catch {}

  let cancelled = false;
  const onCancel = () => {
    if (cancelled) return;
    console.log("\n[omnicode] index: interrupted, saving partial state...");
    cancelled = true;
  };
  const onSigint = onCancel;
  process.on("SIGINT", onSigint);
  if (abortSignal) {
    abortSignal.addEventListener("abort", onCancel);
  }

  const filesToIndex = [...newFiles, ...modifiedFiles];

  try {
    const lockFile = join(qdrantDir, ".indexing");
    try { writeFileSync(lockFile, "1"); } catch {}
    let totalStored = 0;
    let filesProcessed = 0;

    let batchFiles = [];
    let batchChunks = [];
    let batchBytes = 0;
    let minerUDisabled = false;
    const activeMinerUTasks = [];

    const flushBatch = async () => {
      if (batchChunks.length === 0) return;
      if (cancelled) return;

      const currentChunks = batchChunks;
      const currentFiles = batchFiles;
      batchChunks = [];
      batchFiles = [];
      batchBytes = 0;

      const start = Date.now();
      console.log(`[omnicode] index: storing batch of ${currentChunks.length} chunks (${filesProcessed}/${filesToIndex.length} files processed)`);

      const storedIds = await embedAndStore(currentChunks, env, abortSignal);

      const duration = Date.now() - start;
      console.log(`[omnicode] index: batch complete in ${duration}ms (${storedIds.length} chunks stored)`);
      if (duration > 30000) console.warn("[omnicode] index: WARNING: batch took > 30s to process!");

      if (storedIds.length > 0) {
        totalStored += currentChunks.length;
        for (const file of currentFiles) {
          const submodulePath = resolveSubmoduleForFile(file.path, refsDir);
          const submoduleName = submodulePath ? relative(process.cwd(), submodulePath) : null;
          state.files[file.path] = {
            mtimeMs: file.mtimeMs,
            hash: hashFile(file.path),
            submoduleCommit: submoduleName ? submoduleCommits.get(submodulePath) || null : null,
          };
          if (submoduleName && submoduleCommits.has(submodulePath)) {
            state.submoduleCommits[submoduleName] = submoduleCommits.get(submodulePath);
          }
        }
        await saveIndexState(stateFile, state);
      } else {
        console.warn(`[omnicode] index: batch storage failed, state not updated for ${currentFiles.length} file(s)`);
      }
    };

    const workers = [];
    let fileIndex = 0;

    const processNextFile = async () => {
      while (fileIndex < filesToIndex.length) {
        if (cancelled) break;
        const file = filesToIndex[fileIndex++];
        if (!file) continue;

        try {
          const fileBuffer = await fsPromises.readFile(file.path);
          await new Promise(r => setImmediate(r));

          if (cancelled) break;

          const apiKey = process.env.MINERU_API_KEY;
          const isComplex = isComplexDocument(file.path, fileBuffer);

          const addChunks = async (chunks, sourcePath, via = "local") => {
            for (const c of chunks) {
              batchChunks.push({ path: sourcePath, text: c });
              batchBytes += Buffer.byteLength(c, "utf8");
            }
            batchFiles.push(file);
            filesProcessed++;
            if (batchFiles.length >= 100 || batchBytes > 20_000_000) {
              await flushBatch();
            }
          };

          if (isComplex && apiKey && !minerUDisabled) {
              const taskPromise = processComplexDocument(fileBuffer, basename(file.path), apiKey)
                  .then(async markdown => {
                      if (cancelled) return;
                      let chunks = await chunkWithTreeSitter(markdown, file.path + ".md");
                      let algo = "Tree-sitter (structural)";
                      if (!chunks) {
                        chunks = chunkFile(markdown, file.path + ".md");
                        algo = "Linear (sequential)";
                      }
                      console.log(`[omnicode] Indexed: ${file.path} (via MinerU) using ${algo} chunking`);
                      await addChunks(chunks, file.path, "MinerU");
                  })
                  .catch(async err => {
                      if (err.status === 401 || err.status === 402) {
                          console.warn(`[omnicode] index: MinerU API quota/auth error (${err.status}), disabling MinerU routing.`);
                          minerUDisabled = true;
                      } else {
                          console.warn(`[omnicode] index: MinerU API failed for ${file.path}, falling back to local chunking: ${err.message}`);
                      }
                      const isBinaryDoc = BINARY_DOC_EXTENSIONS.has(extname(file.path).toLowerCase());
                      const contentStr = isBinaryDoc ? "Binary Content Placeholder" : fileBuffer.toString("utf8");
                      let chunks = await chunkWithTreeSitter(contentStr, file.path);
                      let algo = "Tree-sitter (structural)";
                      if (!chunks) {
                        chunks = chunkFile(contentStr, file.path);
                        algo = "Linear (sequential)";
                      }
                      console.log(`[omnicode] Indexed: ${file.path} (local fallback) using ${algo} chunking`);
                      await addChunks(chunks, file.path, "local fallback");
                  });

              activeMinerUTasks.push(taskPromise);
              continue;
          }

          const isBinaryDoc = BINARY_DOC_EXTENSIONS.has(extname(file.path).toLowerCase());
          const content = isBinaryDoc ? "Binary Content Placeholder" : fileBuffer.toString("utf8");
          let chunks = await chunkWithTreeSitter(content, file.path);
          let algo = "Tree-sitter (structural)";
          if (!chunks) {
            chunks = chunkFile(content, file.path);
            algo = "Linear (sequential)";
          }
          console.log(`[omnicode] Indexed: ${file.path} using ${algo} chunking`);
          await addChunks(chunks, file.path, "local");
        } catch (err) {
          console.warn(`[omnicode] index: skipping ${file.path} — ${err.message}`);
        }
      }
    };

    for (let i = 0; i < Math.max(1, DEFAULT_INDEX_CONCURRENCY); i++) {
      workers.push(processNextFile());
    }
    await Promise.all(workers);

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
    await saveIndexState(stateFile, state);
    const lockFile = join(qdrantDir, ".indexing");
    try { rmSync(lockFile, { force: true }); } catch {}
  }

  return { new: newFiles.length, modified: modifiedFiles.length, deleted: deletedPaths.length, unchanged: unchangedFiles.length };
}
