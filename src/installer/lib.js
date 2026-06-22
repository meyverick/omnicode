import { spawn, execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);
const isWindows = process.platform === "win32";

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
    command: "uvx",
    args: ["mcp-server-qdrant"],
    env: {
      QDRANT_LOCAL_PATH: join(process.cwd(), ".qdrant"),
      COLLECTION_NAME: "references",
      EMBEDDING_MODEL: "sentence-transformers/all-MiniLM-L6-v2",
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
  config.mcp.qdrant = qdrantConfig;
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");
}

export function getDataDir() {
  return join(os.homedir(), ".local", "share", "omnicode");
}

export function getOpencodeDbPath() {
  const dbPath = join(os.homedir(), ".local", "share", "opencode", "opencode.db");
  if (!existsSync(dbPath)) return null;
  return dbPath;
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

export async function callQdrantStore(chunks, env) {
  const child = spawn("uvx", ["mcp-server-qdrant"], {
    env: { ...process.env, ...env },
    stdio: ["pipe", "pipe", "pipe"],
  });

  const results = [];
  let buffer = "";

  child.stdout.on("data", (data) => { buffer += data.toString(); });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new Error("MCP server did not initialize in time")); }, 10000);

    child.stdout.on("data", () => {
      if (buffer.includes("server-ready") || buffer.includes('"result"')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.on("error", reject);

    child.stdin.write(JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "omnicode-indexer", version: "0.1" } },
    }) + "\n");
  });

  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.length < 10) continue;
    const id = i + 2;
    await new Promise((resolve) => {
      const onData = (data) => {
        buffer += data.toString();
        if (buffer.includes(`"id":${id}`) || buffer.includes(`"id": ${id}`)) {
          child.stdout.removeListener("data", onData);
          results.push({ chunk: chunk.substring(0, 80), stored: true });
          resolve();
        }
      };
      child.stdout.on("data", onData);
      child.stdin.write(JSON.stringify({
        jsonrpc: "2.0", id, method: "tools/call",
        params: { name: "qdrant-store", arguments: { information: chunk } },
      }) + "\n");
    });
  }

  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "exit" }) + "\n");
  child.stdin.end();
  return results;
}

export async function indexReferences(refsDir, qdrantConfig) {
  const stateFile = join(process.cwd(), ".omnicode-index.json");
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

  console.log(`[omnicode] index: storing ${allChunks.length} chunks`);

  try {
    const env = {
      QDRANT_LOCAL_PATH: qdrantConfig.env.QDRANT_LOCAL_PATH,
      COLLECTION_NAME: qdrantConfig.env.COLLECTION_NAME,
      EMBEDDING_MODEL: qdrantConfig.env.EMBEDDING_MODEL,
    };
    await callQdrantStore(allChunks.map((c) => c.text), env);
    console.log("[omnicode] index: complete");
  } catch (err) {
    console.error(`[omnicode] index: failed — ${err.message}`);
  }

  saveIndexState(stateFile, state);
}
