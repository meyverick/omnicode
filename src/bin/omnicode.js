#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { commandExists, getOpencodeDbPath, isProcessRunning, detectQdrantMcp, generateQdrantConfig, ensureOpencodeConfig, indexReferences } from "../installer/lib.js";
import { runRuntime } from "./omnicode-runtime.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const packageJsonPath = join(__dirname, "..", "..", "package.json");

const SESSION_ID_RE = /^(?=.{1,128}$)[a-zA-Z0-9_-]+$/;

let DatabaseSync;
try {
  ({ DatabaseSync } = await import("node:sqlite"));
} catch {
  DatabaseSync = null;
}

export function printUsage() {
  console.log(`Usage: omnicode [-s <session_id>] [-c] [--status] [--version]`);
}

let _cachedVersion = null;

export function getVersion() {
  if (_cachedVersion !== null) return _cachedVersion;
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  _cachedVersion = pkg.version;
  return _cachedVersion;
}

export function getProcessStatus() {
  return {
    opencode: isProcessRunning("opencode"),
    omniroute: isProcessRunning("omniroute"),
  };
}

export function printStatus(status = getProcessStatus()) {
  console.log(`[omnicode] opencode: ${status.opencode ? "running" : "stopped"}`);
  console.log(`[omnicode] omniroute: ${status.omniroute ? "running" : "stopped"}`);
}

export function parseArgs(argv) {
  let sessionId = null;
  let continueSession = false;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      printUsage();
      process.exit(0);
    }
    if (arg === "-v" || arg === "--version") {
      console.log(getVersion());
      process.exit(0);
    }
    if (arg === "--status" || arg === "status") {
      printStatus();
      process.exit(0);
    }
    if (arg === "-c" || arg === "--continue") {
      continueSession = true;
      continue;
    }
    if (arg === "--index") {
      return { sessionId: null, continueSession: false, index: true };
    }
    if (arg === "-s") {
      sessionId = argv[++i];
      if (!sessionId) {
        console.error("[omnicode] ERROR: -s requires a value");
        process.exit(2);
      }
    } else if (arg.startsWith("-s")) {
      sessionId = arg.slice(2);
    } else {
      console.error(`[omnicode] ERROR: unknown option ${arg}`);
      printUsage();
      process.exit(2);
    }

    if (!sessionId || !SESSION_ID_RE.test(sessionId)) {
      console.error(`[omnicode] ERROR: invalid session ID format`);
      process.exit(2);
    }
  }
  return { sessionId, continueSession };
}

export async function getLatestSessionId(directory = realpathSync(process.cwd())) {
  const dbPath = getOpencodeDbPath();
  if (!dbPath) return null;

  try {
    if (!DatabaseSync) return null;
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const row = db.prepare(
      "SELECT id FROM session WHERE directory = ? ORDER BY time_updated DESC LIMIT 1"
    ).get(directory);
    db.close();
    return row ? row.id : null;
  } catch {
    return null;
  }
}

export async function resolveSessionMode(sessionId, latestSessionId = null) {
  if (sessionId) return { flag: "-s", id: sessionId };
  if (latestSessionId === null) latestSessionId = await getLatestSessionId();
  if (latestSessionId) return { flag: "-s", id: latestSessionId };
  return { flag: null, id: null };
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.index) {
    if (!detectQdrantMcp()) {
      console.error("[omnicode] ERROR: uvx mcp-server-qdrant not found. Install uvx first.");
      process.exit(1);
    }
    const qdrantConfig = generateQdrantConfig();
    ensureOpencodeConfig(qdrantConfig);
    await indexReferences(join(process.cwd(), "references"), qdrantConfig);
    process.exit(0);
  }

  const missing = ["opencode", "omniroute"].filter((cmd) => !commandExists(cmd));
  if (missing.length > 0) {
    console.error(`[omnicode] ERROR: missing required tool(s): ${missing.join(", ")}`);
    console.error("[omnicode] Install them before running omnicode. See the README for instructions.");
    process.exit(1);
  }

  const mode = await resolveSessionMode(args.sessionId);
  await runRuntime(mode);
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main().catch((err) => {
    console.error("[omnicode] ERROR:", err.message);
    process.exit(1);
  });
}
