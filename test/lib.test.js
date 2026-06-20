import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { commandExists } from "../src/installer/lib.js";

describe("lib helpers", () => {
  it("commandExists returns true for a known command", () => {
    assert.equal(commandExists("bash"), true);
  });

  it("commandExists returns false for a nonexistent command", () => {
    assert.equal(commandExists("omnicode-nonexistent-command-xyz"), false);
  });
});
