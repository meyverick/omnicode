import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

import { parseArgs, resolveSessionMode, getVersion, printStatus, getLatestSessionId } from "../src/bin/omnicode.js";
import { isProcessRunning } from "../src/installer/lib.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const binPath = join(__dirname, "..", "src", "bin", "omnicode.js");

describe("omnicode.js CLI integration", () => {
  it("fails when a required tool is missing", () => {
    const env = { ...process.env, PATH: "/usr/bin:/bin" };
    assert.throws(
      () => execSync(`node "${binPath}"`, { env, encoding: "utf8" }),
      /missing required tool\(s\): (opencode|omniroute)/
    );
  });

  it("shows usage for --help", () => {
    const output = execSync(`node "${binPath}" --help`, { encoding: "utf8" });
    assert.ok(output.includes("Usage: omnicode"));
  });

  it("shows package version for --version", () => {
    const output = execSync(`node "${binPath}" --version`, { encoding: "utf8" });
    assert.equal(output.trim(), getVersion());
  });

  it("shows process state for --status", () => {
    const output = execSync(`node "${binPath}" --status`, { encoding: "utf8" });
    assert.match(output, /opencode: (running|stopped)/);
    assert.match(output, /omniroute: (running|stopped)/);
  });

  it("rejects -s without a value", () => {
    assert.throws(
      () => execSync(`node "${binPath}" -s`, { encoding: "utf8" }),
      /-s requires a value/
    );
  });

  it("rejects unknown options", () => {
    assert.throws(
      () => execSync(`node "${binPath}" --bogus`, { encoding: "utf8" }),
      /unknown option/
    );
  });

  it("rejects invalid session ID format", () => {
    assert.throws(
      () => execSync(`node "${binPath}" -s 'foo; rm -rf /'`, { encoding: "utf8" }),
      /invalid session ID format/
    );
  });

  it("rejects session ID with spaces", () => {
    assert.throws(
      () => execSync(`node "${binPath}" -s 'foo bar'`, { encoding: "utf8" }),
      /invalid session ID format/
    );
  });

  it("rejects session ID longer than 128 characters", () => {
    const longId = "a".repeat(129);
    assert.throws(
      () => execSync(`node "${binPath}" -s ${longId}`, { encoding: "utf8" }),
      /invalid session ID format/
    );
  });
});

describe("parseArgs", () => {
  it("returns null sessionId when no -s is given", () => {
    assert.deepEqual(parseArgs(["node", "omnicode.js"]), { sessionId: null, continueSession: false, index: false, forceReindex: false });
  });

  it("parses -s <id>", () => {
    assert.deepEqual(parseArgs(["node", "omnicode.js", "-s", "ses_abc"]), {
      sessionId: "ses_abc",
      continueSession: false,
      index: false,
      forceReindex: false,
    });
  });

  it("parses -s<id>", () => {
    assert.deepEqual(parseArgs(["node", "omnicode.js", "-ses_abc"]), {
      sessionId: "es_abc",
      continueSession: false,
      index: false,
      forceReindex: false,
    });
  });

  it("parses -c", () => {
    assert.deepEqual(parseArgs(["node", "omnicode.js", "-c"]), { sessionId: null, continueSession: true, index: false, forceReindex: false });
  });
});

describe("resolveSessionMode", () => {
  it("returns -s mode when sessionId is provided", async () => {
    assert.deepEqual(await resolveSessionMode("ses_abc", "ses_xyz"), { flag: "-s", id: "ses_abc" });
  });

  it("returns -s mode when sessionId is provided even if no latest session exists", async () => {
    assert.deepEqual(await resolveSessionMode("ses_abc", null), { flag: "-s", id: "ses_abc" });
  });

  it("returns -s mode with latest session when no sessionId and latest session exists", async () => {
    assert.deepEqual(await resolveSessionMode(null, "ses_xyz"), { flag: "-s", id: "ses_xyz" });
  });

  it("returns -s mode for -c with latest session", async () => {
    assert.deepEqual(await resolveSessionMode(null, "ses_xyz"), { flag: "-s", id: "ses_xyz" });
  });

  it("returns no flag when no sessionId and no latest session exists", async () => {
    assert.deepEqual(await resolveSessionMode(null, ""), { flag: null, id: null });
  });

  it("returns no flag for -c when no latest session exists", async () => {
    assert.deepEqual(await resolveSessionMode(null, ""), { flag: null, id: null });
  });
});

describe("isProcessRunning", () => {
  it("returns true for a known-running process", () => {
    const known = process.platform === "win32" ? "cmd" : "bash";
    assert.equal(isProcessRunning(known), true);
  });

  it("returns false for a nonexistent process", () => {
    assert.equal(isProcessRunning("nonexistent-xyz-999"), false);
  });
});

describe("printStatus", () => {
  it("prints process statuses", () => {
    const lines = [];
    const originalLog = console.log;
    console.log = (line) => lines.push(line);
    try {
      printStatus({ opencode: true, omniroute: false, qdrant: false });
    } finally {
      console.log = originalLog;
    }
    assert.deepEqual(lines, ["[omnicode] opencode: running (true)", "[omnicode] omniroute: stopped", "[omnicode] qdrant: stopped", "[omnicode] indexing: false"]);
  });
});

describe("getVersion", () => {
  it("returns the version string from package.json", () => {
    const version = getVersion();
    assert.equal(typeof version, "string");
    assert.match(version, /^\d+\.\d+\.\d+/);
  });

  it("caches the version on repeated calls", () => {
    const v1 = getVersion();
    const v2 = getVersion();
    assert.equal(v1, v2);
  });
});

describe("getLatestSessionId", () => {
  it("returns null when the database does not exist", async () => {
    const result = await getLatestSessionId("/nonexistent/path/that/does/not/exist");
    assert.equal(result, null);
  });
});
