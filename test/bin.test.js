import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const binPath = join(__dirname, "..", "src", "bin", "omnicode.js");

describe("omnicode.js", () => {
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
});
