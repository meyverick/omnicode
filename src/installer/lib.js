import { execSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

import { DEPENDENCIES } from "./commands.js";
import { mergeOpenCodePlugin } from "./opencode-config.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export function ensurePlatformSupported() {
  if (process.platform !== "linux") {
    console.error("[omnicode] ERROR: omnicode currently supports Linux/Ubuntu only.");
    process.exit(1);
  }

  const distro = getLinuxDistro();
  if (distro && !distro.toLowerCase().includes("ubuntu")) {
    console.warn(`[omnicode] WARNING: detected distro '${distro}'. Ubuntu is the only supported distro.`);
  }

  if (process.arch !== "x64") {
    console.error("[omnicode] ERROR: omnicode currently supports AMD64/x86_64 only.");
    process.exit(1);
  }
}

function getLinuxDistro() {
  try {
    const release = readFileSync("/etc/os-release", "utf8");
    const match = release.match(/^ID=(.+)$/m);
    return match ? match[1].replace(/"/g, "").trim() : "";
  } catch {
    return "";
  }
}

export function hasElevatedPrivileges() {
  return Boolean(process.getuid?.() === 0 || process.env.SUDO_USER);
}

export function requireSudoForFirstInstall() {
  if (process.env.OMNICODE_SKIP_SUDO === "1") return;
  if (!hasElevatedPrivileges()) {
    console.error("[omnicode] ERROR: first install requires sudo.");
    console.error("[omnicode] Run with sudo or set OMNICODE_SKIP_SUDO=1 to bypass.");
    process.exit(1);
  }
}

export function commandExists(command) {
  try {
    execSync(`command -v ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function getCommandVersion(command, versionFlag = "--version") {
  try {
    const output = execSync(`${command} ${versionFlag}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    return output.split("\n")[0].trim();
  } catch {
    return null;
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

export function runSync(command, opts = {}) {
  console.log(`[omnicode] $ ${command}`);
  execSync(command, { stdio: "inherit", ...opts });
}

export async function runInstallers(dryRun = false) {
  const isFirstInstall = !commandExists("omnicode");
  if (isFirstInstall && !dryRun) {
    requireSudoForFirstInstall();
  }

  for (const dep of DEPENDENCIES) {
    if (dryRun) {
      console.log(`[omnicode] [dry-run] would check ${dep.name}`);
      continue;
    }
    const needsInstall = dep.check ? !dep.check() : !commandExists(dep.command);
    if (needsInstall) {
      console.log(`[omnicode] ${dep.name} missing or stale; installing...`);
      await dep.install();
    } else {
      console.log(`[omnicode] ${dep.name} already available.`);
    }
  }
}

export function ensureOpenCodeConfig() {
  const configDir = join(os.homedir(), ".config", "opencode");
  const configPath = join(configDir, "opencode.jsonc");

  mkdirSync(configDir, { recursive: true });

  let existing = null;
  if (existsSync(configPath)) {
    try {
      existing = readFileSync(configPath, "utf8");
    } catch (err) {
      console.warn(`[omnicode] WARNING: could not read ${configPath}: ${err.message}`);
    }
  }

  const { content, changed } = mergeOpenCodePlugin(existing);
  if (changed) {
    if (existing) {
      const backupPath = `${configPath}.backup.${Date.now()}`;
      writeFileSync(backupPath, existing, "utf8");
      console.log(`[omnicode] backed up existing OpenCode config to ${backupPath}`);
    }
    writeFileSync(configPath, content, "utf8");
    console.log(`[omnicode] updated OpenCode config at ${configPath}`);
  }
}

export function getGlobalNpmBin() {
  try {
    return execSync("npm config get prefix", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

export function warnIfGlobalBinNotOnPath() {
  const prefix = getGlobalNpmBin();
  if (!prefix) return;
  const binDir = join(prefix, "bin");
  const path = process.env.PATH || "";
  const pathDirs = path.split(":").filter(Boolean);
  if (!pathDirs.includes(binDir)) {
    console.warn(`[omnicode] WARNING: global npm bin directory '${binDir}' is not on PATH.`);
    console.warn(`[omnicode] Add it to your shell profile, e.g. export PATH="${binDir}:$PATH"`);
  }
}

export function getRuntimeDir() {
  const dir = join(os.homedir(), ".local", "share", "omnicode");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export { __dirname };
