#!/usr/bin/env node
import { readdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const REFS_DIR = "./references";

function run(cwd, cmd, args) {
  const result = spawnSync(cmd, args, { cwd, stdio: "pipe", encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`[sync-references] FAIL in ${cwd}: ${cmd} ${args.join(" ")}`);
    if (result.stderr) console.error(result.stderr.trim());
    return false;
  }
  if (result.stdout) console.log(result.stdout.trim());
  return true;
}

function getDefaultBranch(cwd) {
  const remote = spawnSync("git", ["rev-parse", "--abbrev-ref", "origin/HEAD"], { cwd, encoding: "utf8" });
  if (remote.status === 0 && remote.stdout) {
    return remote.stdout.trim().replace("origin/", "");
  }
  for (const fallback of ["main", "master"]) {
    const check = spawnSync("git", ["ls-remote", "--heads", "origin", fallback], { cwd, encoding: "utf8" });
    if (check.status === 0 && check.stdout.trim()) return fallback;
  }
  return null;
}

function getRemoteUrl(repoPath) {
  const result = spawnSync("git", ["remote", "get-url", "origin"], { cwd: repoPath, encoding: "utf8" });
  if (result.status === 0 && result.stdout) return result.stdout.trim();
  return null;
}

function isSubmodule(name) {
  return existsSync(".gitmodules") &&
    spawnSync("git", ["config", "--file", ".gitmodules", "--get-regexp", `submodule.*${name}.*path`], { encoding: "utf8" }).status === 0;
}

function registerSubmodule(repoPath) {
  const name = repoPath.replace(/^\.\/references\//, "");
  if (isSubmodule(name)) return true;

  const remoteUrl = getRemoteUrl(repoPath);
  if (!remoteUrl) {
    console.error(`[sync-references] ${name}: no origin remote found, cannot register as submodule`);
    return false;
  }

  console.log(`[sync-references] ${name}: registering as submodule from ${remoteUrl}`);

  // Deinitialize the nested git repo so git can absorb it as a submodule
  if (!run(repoPath, "git", ["checkout", "."])) return false;

  // Remove the directory from git index without deleting files
  const rmResult = spawnSync("git", ["rm", "-f", "--cached", repoPath], { encoding: "utf8" });
  if (rmResult.status !== 0 && rmResult.stderr && !rmResult.stderr.includes("did not match any files")) {
    console.error(`[sync-references] ${name}: failed to remove from index`);
    console.error(rmResult.stderr.trim());
    return false;
  }

  // Add as submodule
  if (!run(".", "git", ["submodule", "add", "--force", remoteUrl, repoPath])) {
    return false;
  }

  return true;
}

function syncRepo(repoPath) {
  const name = repoPath.replace(/^\.\/references\//, "");
  console.log(`\n[sync-references] === ${name} ===`);

  if (!isSubmodule(name)) {
    if (!registerSubmodule(repoPath)) return false;
  }

  console.log(`[sync-references] ${name}: updating as git submodule`);
  if (!run(".", "git", ["submodule", "update", "--init", "--remote", "--force", repoPath])) return false;
  if (!run(repoPath, "git", ["reset", "--hard", "HEAD"])) return false;
  return true;
}

function main() {
  const entries = readdirSync(REFS_DIR, { withFileTypes: true });
  let ok = 0;
  let fail = 0;
  let skip = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const repoPath = join(REFS_DIR, entry.name);
    const gitDir = join(repoPath, ".git");
    if (!existsSync(gitDir)) {
      console.log(`[sync-references] ${entry.name}: not a git repo, skipping`);
      skip++;
      continue;
    }
    if (syncRepo(repoPath)) ok++;
    else fail++;
  }

  console.log(`\n[sync-references] done: ${ok} updated, ${fail} failed, ${skip} skipped`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
