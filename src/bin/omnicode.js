#!/usr/bin/env node
import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ensureOpenCodeConfig,
  ensurePlatformSupported,
  runInstallers,
  warnIfGlobalBinNotOnPath,
} from "../installer/lib.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const runtimeScript = join(__dirname, "omnicode-runtime.sh");

function printUsage() {
  console.log(`Usage: omnicode [-s <session_id>]`);
}

function parseArgs(argv) {
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

async function main() {
  ensurePlatformSupported();

  // Run install remediation on every invocation so updates are picked up.
  await runInstallers();

  // Ensure OpenCode plugin config is present.
  ensureOpenCodeConfig();

  // Warn if the global npm bin dir is not on PATH.
  warnIfGlobalBinNotOnPath();

  // Delegate to the Bash runtime wrapper for process lifecycle management.
  const args = parseArgs(process.argv);
  const childArgs = [runtimeScript];
  if (args.sessionId) childArgs.push(args.sessionId);

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

main().catch((err) => {
  console.error("[omnicode] ERROR:", err.message);
  process.exit(1);
});
