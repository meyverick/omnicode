import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { commandExists, ensurePlatformSupported, hasElevatedPrivileges } from "../src/installer/lib.js";

describe("lib helpers", () => {
  it("commandExists returns true for a known shell builtin", () => {
    assert.equal(commandExists("bash"), true);
  });

  it("commandExists returns false for a nonexistent command", () => {
    assert.equal(commandExists("omnicode-nonexistent-command-xyz"), false);
  });

  it("hasElevatedPrivileges does not throw", () => {
    assert.equal(typeof hasElevatedPrivileges(), "boolean");
  });
});
