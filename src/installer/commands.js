import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { commandExists, getCommandVersion, run, runSync } from "./lib.js";

const GRAYMATTER_VERSION = "0.6.0";
const GRAYMATHER_URL = `https://github.com/angelnicolasc/graymatter/releases/download/v${GRAYMATTER_VERSION}/graymatter_${GRAYMATTER_VERSION}_linux_amd64.tar.gz`;

function checkNode() {
  return commandExists("node");
}

function checkNpm() {
  return commandExists("npm");
}

function installOpenCode() {
  runSync("curl -fsSL https://opencode.ai/install | bash");
}

function installOmniRoute() {
  runSync("npm install -g omniroute");
}

function installOpenCodeOmniRouteAuth() {
  runSync("npm install -g opencode-omniroute-auth");
}

function installOpenSpec() {
  runSync("npm install -g @fission-ai/openspec@latest");
}

function installGrayMatter() {
  const tmpDir = join(tmpdir(), `omnicode-graymatter-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  runSync(`curl -fsSL "${GRAYMATHER_URL}" | tar -xzf - -C "${tmpDir}"`);
  runSync(`sudo mv "${join(tmpDir, "graymatter")}" /usr/local/bin/graymatter`);
}

export const DEPENDENCIES = [
  {
    name: "Node.js",
    command: "node",
    check: checkNode,
    install: () => {
      throw new Error("Node.js is required but not installed. Install Node.js 22+ first.");
    },
  },
  {
    name: "npm",
    command: "npm",
    check: checkNpm,
    install: () => {
      throw new Error("npm is required but not installed. Install npm first.");
    },
  },
  {
    name: "OpenCode",
    command: "opencode",
    install: installOpenCode,
  },
  {
    name: "OmniRoute",
    command: "omniroute",
    install: installOmniRoute,
  },
  {
    name: "opencode-omniroute-auth",
    command: "opencode-omniroute-auth",
    check: () => {
      try {
        execSync("npm list -g opencode-omniroute-auth", { stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    },
    install: installOpenCodeOmniRouteAuth,
  },
  {
    name: "OpenSpec",
    command: "openspec",
    install: installOpenSpec,
  },
  {
    name: "GrayMatter",
    command: "graymatter",
    install: installGrayMatter,
  },
];
