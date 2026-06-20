#!/usr/bin/env node
import { execSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { commandExists } from "../installer/lib.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const runtimeScript = join(__dirname, "omnicode-runtime.sh");

export function printUsage() {
  console.log(`Usage: omnicode [-s <session_id>]`);
}

export function parseArgs(argv) {
  let sessionId = null;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      printUsage();
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

export function hasOpenCodeSessions() {
  try {
    const output = execSync("opencode session list", {
      encoding: "utf8",
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "ignore"],
    });
    return /ses_[A-Za-z0-9]+/.test(output);
  } catch {
    return false;
  }
}

export function resolveSessionMode(sessionId, sessionsExist = hasOpenCodeSessions()) {
  if (sessionId) return { flag: "-s", id: sessionId };
  if (sessionsExist) return { flag: "-c", id: null };
  return { flag: null, id: null };
}

export function buildRuntimeArgs(mode) {
  const args = [runtimeScript];
  if (mode.flag === "-s") {
    args.push("-s", mode.id);
  } else if (mode.flag === "-c") {
    args.push("-c");
  }
  return args;
}

function main() {
  const missing = ["opencode", "omniroute"].filter((cmd) => !commandExists(cmd));
  if (missing.length > 0) {
    console.error(`[omnicode] ERROR: missing required tool(s): ${missing.join(", ")}`);
    console.error("[omnicode] Install them before running omnicode. See the README for instructions.");
    process.exit(1);
  }

  const args = parseArgs(process.argv);
  const mode = resolveSessionMode(args.sessionId);
  const childArgs = buildRuntimeArgs(mode);

  try {
    execSync("bash", childArgs, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch (err) {
    if (err.status) process.exit(err.status);
    console.error("[omnicode] ERROR:", err.message);
    process.exit(1);
  }
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
  main();
}
