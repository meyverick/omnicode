#!/usr/bin/env node
import { execSync, spawn } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { commandExists } from "../installer/lib.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const runtimeScript = join(__dirname, "omnicode-runtime.sh");
const packageJsonPath = join(__dirname, "..", "..", "package.json");

export function printUsage() {
  console.log(`Usage: omnicode [-s <session_id>] [--version]`);
}

export function getVersion() {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  return pkg.version;
}

export function parseArgs(argv) {
  let sessionId = null;
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
  }
  return { sessionId };
}

export function getLatestSessionId() {
  try {
    const output = execSync("opencode session list", {
      encoding: "utf8",
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "ignore"],
    });
    const lines = output.split("\n").slice(2);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^(ses_[A-Za-z0-9]+)/);
      if (match) return match[1];
    }
  } catch {
    // fall through to null
  }
  return null;
}

export function resolveSessionMode(sessionId, latestSessionId = getLatestSessionId()) {
  if (sessionId) return { flag: "-s", id: sessionId };
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
  const missing = ["opencode", "omniroute"].filter((cmd) => !commandExists(cmd));
  if (missing.length > 0) {
    console.error(`[omnicode] ERROR: missing required tool(s): ${missing.join(", ")}`);
    console.error("[omnicode] Install them before running omnicode. See the README for instructions.");
    process.exit(1);
  }

  const args = parseArgs(process.argv);
  const mode = resolveSessionMode(args.sessionId);
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
