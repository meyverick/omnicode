import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
