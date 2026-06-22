import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

import { commandExists, getDataDir, isProcessRunning, isProcessRunningSync, isPidAlive } from "../installer/lib.js";

const MAX_OMNI_WAIT = 30;
const OMNI_CHECK_DELAY = 1000;
const isWindows = process.platform === "win32";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initTool(name, args, logPath) {
  if (!(await commandExists(name))) {
    console.log(`[omnicode] ${name}: not installed, skipping`);
    return;
  }
  console.log(`[omnicode] ${name}: initializing`);
  let log;
  try {
    log = openSync(logPath, "w");
    const child = spawn(name, args, { stdio: ["ignore", log, log] });
    const result = await Promise.race([
      new Promise((resolve) => {
        child.on("close", resolve);
        child.on("error", () => resolve(null));
      }),
      new Promise((resolve) => {
        setTimeout(() => { child.kill(); resolve(null); }, 30000);
      }),
    ]);
    if (result === null) {
      console.log(`[omnicode] WARNING: ${name} init timed out; continuing. Log: ${logPath}`);
    } else if (result === 0) {
      console.log(`[omnicode] ${name}: ready`);
    } else {
      console.log(`[omnicode] WARNING: ${name} init failed; continuing. Log: ${logPath}`);
    }
  } catch {
    if (log !== undefined) try { closeSync(log); } catch {}
  }
}

async function initTools(dataDir) {
  const graymatterLog = join(dataDir, "graymatter-init.log");
  const openspecLog = join(dataDir, "openspec-init.log");

  await Promise.all([
    initTool("graymatter", ["init", "--only", "opencode"], graymatterLog),
    initTool("openspec", ["init", "--force", "--tools", "opencode"], openspecLog),
  ]);
}

async function startOmniroute(dataDir, logFile, pidFile) {
  if (await isProcessRunning("omniroute")) {
    console.log("[omnicode] omniroute already running");
    return null;
  }

  if (existsSync(pidFile)) {
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

    if (await isProcessRunning("omniroute")) {
      console.log(`[omnicode] omniroute started (pid: ${pid})`);
      return;
    }
  }

  console.error(`[omnicode] ERROR: omniroute did not become ready. Log: ${logFile}`);
  process.exit(1);
}

async function stopOmnirouteIfIdle(pidFile) {
  if (await isProcessRunning("opencode")) {
    return;
  }

  if (existsSync(pidFile)) {
    let pid = null;
    try {
      pid = parseInt(readFileSync(pidFile, "utf8").trim(), 10);
    } catch {}
    if (pid && isPidAlive(pid)) {
      console.log(`[omnicode] no opencode left -> stopping omniroute (pid: ${pid})`);
      if (isWindows) {
        spawn("taskkill", ["/T", "/F", "/PID", String(pid)], { stdio: "ignore" });
      } else {
        try { process.kill(-pid, "SIGTERM"); } catch {}
      }
      for (let i = 0; i < 10; i++) {
        if (!isPidAlive(pid)) break;
        try { process.kill(pid, 0); } catch { break; }
      }
    }
    try { unlinkSync(pidFile); } catch {}
  }
}

function stopOmnirouteIfIdleSync(pidFile) {
  if (isProcessRunningSync("opencode")) {
    return;
  }

  if (existsSync(pidFile)) {
    let pid = null;
    try {
      pid = parseInt(readFileSync(pidFile, "utf8").trim(), 10);
    } catch {}
    if (pid && isPidAlive(pid)) {
      console.log(`[omnicode] no opencode left -> stopping omniroute (pid: ${pid})`);
      if (isWindows) {
        spawn("taskkill", ["/T", "/F", "/PID", String(pid)], { stdio: "ignore" });
      } else {
        try { process.kill(-pid, "SIGTERM"); } catch {}
      }
      for (let i = 0; i < 10; i++) {
        if (!isPidAlive(pid)) break;
        try { process.kill(pid, 0); } catch { break; }
      }
    }
    try { unlinkSync(pidFile); } catch {}
  }
}

export async function runRuntime(mode) {
  const dataDir = getDataDir();
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });

  const logFile = join(dataDir, "omniroute.log");
  const pidFile = join(dataDir, "omniroute.pid");

  if (!isWindows) {
    process.umask(0o077);
  }

  const cleanup = () => stopOmnirouteIfIdle(pidFile);
  const cleanupSync = () => stopOmnirouteIfIdleSync(pidFile);

  process.on("exit", cleanupSync);
  process.on("SIGINT", async () => { await cleanup(); process.exit(0); });
  process.on("SIGTERM", async () => { await cleanup(); process.exit(0); });

  const pid = await startOmniroute(dataDir, logFile, pidFile);

  await Promise.all([
    pid !== null ? waitForOmniroute(pid, logFile) : Promise.resolve(),
    initTools(dataDir),
  ]);

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
