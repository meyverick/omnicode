import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

import { commandExists, getDataDir } from "../installer/lib.js";

const isWindows = process.platform === "win32";
const MAX_OMNI_WAIT = 30;
const OMNI_CHECK_DELAY = 1000;

function isProcessRunning(name) {
  try {
    if (isWindows) {
      const out = execFileSync("tasklist", ["/FI", `IMAGENAME eq ${name}.exe`, "/NH"], {
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      });
      return out.includes(`${name}.exe`);
    }
    execFileSync("pgrep", ["-x", name], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function initTool(name, args, logPath) {
  return new Promise((resolve) => {
    if (!commandExists(name)) {
      console.log(`[omnicode] ${name}: not installed, skipping`);
      resolve();
      return;
    }
    console.log(`[omnicode] ${name}: initializing`);
    const log = openSync(logPath, "w");
    const child = spawn(name, args, { stdio: ["ignore", log, log] });
    child.on("close", (code) => {
      if (code === 0) {
        console.log(`[omnicode] ${name}: ready`);
      } else {
        console.log(`[omnicode] WARNING: ${name} init failed; continuing. Log: ${logPath}`);
      }
      resolve();
    });
    child.on("error", () => {
      console.log(`[omnicode] WARNING: ${name} init failed; continuing. Log: ${logPath}`);
      resolve();
    });
  });
}

async function initTools(dataDir) {
  const graymatterLog = join(dataDir, "graymatter-init.log");
  const openspecLog = join(dataDir, "openspec-init.log");

  await Promise.all([
    initTool("graymatter", ["init", "--only", "opencode"], graymatterLog),
    initTool("openspec", ["init", "--force", "--tools", "opencode"], openspecLog),
  ]);
}

function startOmniroute(dataDir, logFile, pidFile) {
  if (isProcessRunning("omniroute")) {
    console.log("[omnicode] omniroute already running");
    return null;
  }

  if (existsSync(pidFile) || existsSync(pidFile)) {
    let pid = null;
    try {
      pid = parseInt(readFileSync(pidFile, "utf8").trim(), 10);
    } catch {}
    if (pid && isPidAlive(pid)) {
      console.log(`[omnicode] omniroute already running (pid: ${pid})`);
      return null;
    }
    try { unlinkSync(pidFile); } catch {}
  }

  console.log("[omnicode] starting omniroute...");
  const log = openSync(logFile, "w");
  const child = spawn("omniroute", ["--no-open"], {
    detached: true,
    stdio: ["ignore", log, log],
  });
  child.unref();
  const pid = child.pid;
  writeFileSync(pidFile, String(pid), { mode: 0o600 });

  return pid;
}

async function waitForOmniroute(pid, logFile) {
  let waited = 0;
  while (waited < MAX_OMNI_WAIT * 1000) {
    await sleep(OMNI_CHECK_DELAY);
    waited += OMNI_CHECK_DELAY;

    if (!isPidAlive(pid)) {
      console.error(`[omnicode] ERROR: omniroute exited during startup. Log: ${logFile}`);
      process.exit(1);
    }

    if (isProcessRunning("omniroute")) {
      console.log(`[omnicode] omniroute started (pid: ${pid})`);
      return;
    }
  }

  console.error(`[omnicode] ERROR: omniroute did not become ready. Log: ${logFile}`);
  process.exit(1);
}

function stopOmnirouteIfIdle(pidFile) {
  if (isProcessRunning("opencode")) {
    return;
  }

  if (existsSync(pidFile)) {
    let pid = null;
    try {
      pid = parseInt(readFileSync(pidFile, "utf8").trim(), 10);
    } catch {}
    if (pid && isPidAlive(pid)) {
      console.log(`[omnicode] no opencode left -> stopping omniroute (pid: ${pid})`);
      try { process.kill(pid, "SIGTERM"); } catch {}
      const deadline = Date.now() + 5000;
      while (isPidAlive(pid) && Date.now() < deadline) {
        try { process.kill(pid, 0); } catch { break; }
      }
    }
    try { unlinkSync(pidFile); } catch {}
  }
}

export async function runRuntime(mode) {
  const dataDir = getDataDir();
  mkdirSync(dataDir, { recursive: true });

  const logFile = join(dataDir, "omniroute.log");
  const pidFile = join(dataDir, "omniroute.pid");

  if (!isWindows) {
    process.umask(0o077);
  }

  const cleanup = () => stopOmnirouteIfIdle(pidFile);
  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });

  await initTools(dataDir);

  const pid = startOmniroute(dataDir, logFile, pidFile);
  if (pid !== null) {
    await waitForOmniroute(pid, logFile);
  }

  if (mode.flag === "-s" && mode.id) {
    console.log(`[omnicode] launching opencode (session: ${mode.id})`);
    await new Promise((resolve) => {
      const child = spawn("opencode", ["-s", mode.id], {
        stdio: "inherit",
        cwd: process.cwd(),
      });
      child.on("close", () => resolve());
    });
  } else {
    console.log("[omnicode] launching opencode (new session)");
    await new Promise((resolve) => {
      const child = spawn("opencode", [], {
        stdio: "inherit",
        cwd: process.cwd(),
      });
      child.on("close", () => resolve());
    });
  }
}
