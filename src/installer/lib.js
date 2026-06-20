import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

export function commandExists(command) {
  try {
    execFileSync("which", [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function run(command, args = [], opts = {}) {
  const quoted = [command, ...args.map((a) => (a.includes(" ") ? `"${a}"` : a))].join(" ");
  console.log(`[omnicode] $ ${quoted}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      cwd: process.cwd(),
      ...opts,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}: ${quoted}`));
      } else {
        resolve();
      }
    });
  });
}

export function getRuntimeDir() {
  const dir = join(os.homedir(), ".local", "share", "omnicode");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}
