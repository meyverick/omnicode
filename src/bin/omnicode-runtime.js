import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync, writeSync, unlinkSync } from "node:fs";
import { join } from "node:path";

import { commandExists, getDataDir, isPidAlive, isProcessRunningAsync, detectQdrantMcp, generateQdrantConfig, ensureOpencodeConfig, ensureQdrantAgentInstructions, ensureGraymatterAgentInstructions, indexReferences, startMcpServer, stopMcpServer, getQdrantStoreEnv, getQdrantPidFile, isQdrantRunning, startQdrantContainer, stopQdrantContainer } from "../installer/lib.js";

process.on("unhandledRejection", (err) => {
  console.error("[omnicode] runtime: UNHANDLED REJECTION:", err?.message || err);
});

const MAX_OMNI_WAIT = 30;
const OMNI_CHECK_DELAY = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initTool(name, args, logPath) {
  if (!commandExists(name)) {
    console.log(`[omnicode] ${name}: not installed, skipping`);
    return;
  }
  console.log(`[omnicode] ${name}: initializing`);
  let log;
  try {
    log = openSync(logPath, "w");
    const child = spawn(name, args, { stdio: ["ignore", log, log] });
    let timer;
    const result = await Promise.race([
      new Promise((resolve) => {
        child.on("close", resolve);
        child.on("error", () => resolve(null));
      }),
      new Promise((resolve) => {
        timer = setTimeout(() => { child.kill(); resolve(null); }, 30000);
      }),
    ]);
    clearTimeout(timer);
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
  if (await isProcessRunningAsync("omniroute")) {
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

    if (await isProcessRunningAsync("omniroute")) {
      console.log(`[omnicode] omniroute started (pid: ${pid})`);
      return;
    }
  }

  console.error(`[omnicode] ERROR: omniroute did not become ready. Log: ${logFile}`);
  process.exit(1);
}

async function stopOmnirouteIfIdle(pidFile) {
  if (await isProcessRunningAsync("opencode")) {
    return;
  }

  stopQdrantContainer();

  if (existsSync(pidFile)) {
    let pid = null;
    try {
      pid = parseInt(readFileSync(pidFile, "utf8").trim(), 10);
    } catch {}
    if (pid && isPidAlive(pid)) {
      console.log(`[omnicode] no opencode left -> stopping omniroute (pid: ${pid})`);
      if (process.platform === "win32") {
        spawn("taskkill", ["/T", "/F", "/PID", String(pid)], { stdio: "ignore" });
      } else {
        try { process.kill(-pid, "SIGTERM"); } catch {}
      }
      for (let i = 0; i < 10; i++) {
        if (!isPidAlive(pid)) break;
        await sleep(100);
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

  if (process.platform !== "win32") {
    process.umask(0o077);
  }

  let startedIndexing = false;
  const cleanup = async () => {
    if (startedIndexing) try { unlinkSync(join(process.cwd(), ".qdrant", ".indexing")); } catch {}
    await stopOmnirouteIfIdle(pidFile);
  };
  process.on("exit", () => {
    if (startedIndexing) try { unlinkSync(join(process.cwd(), ".qdrant", ".indexing")); } catch {}
    try {
      if (!existsSync(pidFile)) return;
      const pid = parseInt(readFileSync(pidFile, "utf8").trim(), 10);
      if (pid && isPidAlive(pid)) {
        process.kill(-pid, "SIGTERM");
      }
      unlinkSync(pidFile);
    } catch {}
  });
  process.on("SIGINT", async () => { await cleanup(); process.exit(0); });
  process.on("SIGTERM", async () => { await cleanup(); process.exit(0); });

  const pid = await startOmniroute(dataDir, logFile, pidFile);

  await Promise.all([
    pid !== null ? waitForOmniroute(pid, logFile) : Promise.resolve(),
    startQdrantContainer(),
    initTools(dataDir),
  ]);

  const hasQdrant = detectQdrantMcp();
  const refsDir = join(process.cwd(), "references");
  let qdrantConfig = null;

  if (hasQdrant) {
    qdrantConfig = generateQdrantConfig();
    ensureOpencodeConfig(qdrantConfig);
    ensureQdrantAgentInstructions();
    console.log("[omnicode] qdrant MCP configured");
  }

  ensureGraymatterAgentInstructions();
  console.log("[omnicode] graymatter CLI instructions ensured");

  const ac = new AbortController();
  if (hasQdrant && existsSync(refsDir) && qdrantConfig) {
    if (existsSync(join(process.cwd(), ".qdrant", ".indexing"))) {
      console.log("[omnicode] background indexing is already running, skipping");
    } else {
      startedIndexing = true;
      console.log("[omnicode] background indexing started");
      indexReferences(refsDir, qdrantConfig, null, false, ac.signal).catch((err) => {
        console.error(`[omnicode] background index failed: ${err.message}`);
      });
    }
  }

  const launchOpencode = () => new Promise((resolve) => {
    const args = mode.flag === "-s" && mode.id ? ["-s", mode.id] : [];
    if (mode.flag === "-s" && mode.id) {
      console.log(`[omnicode] launching opencode (session: ${mode.id})`);
    } else {
      console.log("[omnicode] launching opencode (new session)");
    }
    const child = spawn("opencode", args, { stdio: "inherit", cwd: process.cwd() });
    const logFd = openSync(join(dataDir, "background.log"), "w");
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;
    console.log = (...args) => writeSync(logFd, args.join(" ") + "\n");
    console.warn = (...args) => writeSync(logFd, "WARN: " + args.join(" ") + "\n");
    console.error = (...args) => writeSync(logFd, "ERROR: " + args.join(" ") + "\n");
    child.on("close", () => {
      setTimeout(() => {
        console.log = origLog;
        console.warn = origWarn;
        console.error = origError;
        try { closeSync(logFd); } catch {}
        resolve();
      }, 100);
    });
  });

  await launchOpencode();
  ac.abort();
  await cleanup();
}
