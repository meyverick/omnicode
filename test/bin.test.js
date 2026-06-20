import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

import { parseArgs, resolveSessionMode, buildRuntimeArgs, getVersion } from "../src/bin/omnicode.js";

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
});

describe("parseArgs", () => {
  it("returns null sessionId when no -s is given", () => {
    assert.deepEqual(parseArgs(["node", "omnicode.js"]), { sessionId: null });
  });

  it("parses -s <id>", () => {
    assert.deepEqual(parseArgs(["node", "omnicode.js", "-s", "ses_abc"]), { sessionId: "ses_abc" });
  });

  it("parses -s<id>", () => {
    assert.deepEqual(parseArgs(["node", "omnicode.js", "-ses_abc"]), { sessionId: "es_abc" });
  });
});

describe("resolveSessionMode", () => {
  it("returns -s mode when sessionId is provided", () => {
    assert.deepEqual(resolveSessionMode("ses_abc", true), { flag: "-s", id: "ses_abc" });
  });

  it("returns -s mode when sessionId is provided even if no sessions exist", () => {
    assert.deepEqual(resolveSessionMode("ses_abc", false), { flag: "-s", id: "ses_abc" });
  });

  it("returns -c mode when no sessionId and sessions exist", () => {
    assert.deepEqual(resolveSessionMode(null, true), { flag: "-c", id: null });
  });

  it("returns no flag when no sessionId and no sessions exist", () => {
    assert.deepEqual(resolveSessionMode(null, false), { flag: null, id: null });
  });
});

describe("buildRuntimeArgs", () => {
  it("builds -s args", () => {
    const args = buildRuntimeArgs({ flag: "-s", id: "ses_abc" });
    assert.ok(args.length >= 3);
    assert.equal(args[1], "-s");
    assert.equal(args[2], "ses_abc");
  });

  it("builds -c args", () => {
    const args = buildRuntimeArgs({ flag: "-c", id: null });
    assert.ok(args.length === 2);
    assert.equal(args[1], "-c");
  });

  it("builds no-flag args", () => {
    const args = buildRuntimeArgs({ flag: null, id: null });
    assert.ok(args.length === 1);
  });
});
