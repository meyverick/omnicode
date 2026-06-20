#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

import { commandExists } from "../installer/lib.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const runtimeScript = join(__dirname, "omnicode-runtime.sh");
const packageJsonPath = join(__dirname, "..", "..", "package.json");

const SESSION_ID_RE = /^[a-zA-Z0-9_-]+$/;

export function printUsage() {
  console.log(`Usage: omnicode [-s <session_id>] [-c] [--status] [--version]`);
}

export function getVersion() {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  return pkg.version;
}

export function isProcessRunning(name) {
  try {
    execFileSync("pgrep", ["-x", name], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
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

    if (sessionId && !SESSION_ID_RE.test(sessionId)) {
      console.error(`[omnicode] ERROR: invalid session ID format`);
      process.exit(2);
    }
  }
  return { sessionId, continueSession };
}

export async function getLatestSessionId(directory = realpathSync(process.cwd())) {
  const dbPath = join(os.homedir(), ".local", "share", "opencode", "opencode.db");
  if (!existsSync(dbPath)) return null;

  try {
    const { DatabaseSync } = await import("node:sqlite");
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

export function buildRuntimeArgs(mode) {
  const args = [runtimeScript];
  if (mode.flag === "-s") {
    args.push("-s", mode.id);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  const missing = ["opencode", "omniroute"].filter((cmd) => !commandExists(cmd));
  if (missing.length > 0) {
    console.error(`[omnicode] ERROR: missing required tool(s): ${missing.join(", ")}`);
    console.error("[omnicode] Install them before running omnicode. See the README for instructions.");
    process.exit(1);
  }

  const mode = await resolveSessionMode(args.sessionId);
  const childArgs = buildRuntimeArgs(mode);

  return new Promise((resolve, reject) => {
    const child = spawn("bash", childArgs, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        process.exit(code);
      } else {
        resolve();
      }
    });
  });
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
