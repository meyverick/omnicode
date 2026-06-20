#!/usr/bin/env node
import { ensurePlatformSupported, runInstallers, ensureOpenCodeConfig } from "./lib.js";

async function main() {
  ensurePlatformSupported();
  await runInstallers();
  ensureOpenCodeConfig();
  console.log("[omnicode] install/setup complete.");
}

main().catch((err) => {
  console.error("[omnicode] ERROR:", err.message);
  process.exit(1);
});
