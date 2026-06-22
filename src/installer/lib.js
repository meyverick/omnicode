import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);
const isWindows = process.platform === "win32";

export async function commandExists(command) {
  const tool = isWindows ? "where" : "which";
  try {
    await execFileAsync(tool, [command]);
    return true;
  } catch {
    return false;
  }
}

export function commandExistsSync(command) {
  const tool = isWindows ? "where" : "which";
  try {
    execFileSync(tool, [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function isProcessRunning(name) {
  try {
    if (isWindows) {
      const extensions = [".exe", ".cmd", ".bat"];
      const checks = extensions.map(async (ext) => {
        try {
          const { stdout } = await execFileAsync("tasklist", ["/FI", `IMAGENAME eq ${name}${ext}`, "/NH"], {
            stdio: ["ignore", "pipe", "ignore"],
            encoding: "utf8",
          });
          return stdout.includes(`${name}${ext}`);
        } catch {
          return false;
        }
      });
      const results = await Promise.all(checks);
      return results.some((r) => r);
    }
    await execFileAsync("pgrep", ["-x", name], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function isProcessRunningSync(name) {
  try {
    if (isWindows) {
      const extensions = [".exe", ".cmd", ".bat"];
      for (const ext of extensions) {
        const out = execFileSync("tasklist", ["/FI", `IMAGENAME eq ${name}${ext}`, "/NH"], {
          stdio: ["ignore", "pipe", "ignore"],
          encoding: "utf8",
        });
        if (out.includes(`${name}${ext}`)) return true;
      }
      return false;
    }
    execFileSync("pgrep", ["-x", name], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function getDataDir() {
  return join(os.homedir(), ".local", "share", "omnicode");
}

export function getOpencodeDbPath() {
  const dbPath = join(os.homedir(), ".local", "share", "opencode", "opencode.db");
  if (!existsSync(dbPath)) return null;
  return dbPath;
}
