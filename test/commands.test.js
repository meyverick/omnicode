import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEPENDENCIES } from "../src/installer/commands.js";

describe("DEPENDENCIES", () => {
  it("lists the expected tools", () => {
    const names = DEPENDENCIES.map((d) => d.name);
    assert.ok(names.includes("OpenCode"));
    assert.ok(names.includes("OmniRoute"));
    assert.ok(names.includes("opencode-omniroute-auth"));
    assert.ok(names.includes("OpenSpec"));
    assert.ok(names.includes("GrayMatter"));
  });

  it("does not include @omniroute/opencode-plugin", () => {
    const names = DEPENDENCIES.map((d) => d.name);
    assert.ok(!names.includes("@omniroute/opencode-plugin"));
  });

  it("GrayMatter uses the pinned Linux AMD64 release URL", () => {
    const graymatter = DEPENDENCIES.find((d) => d.name === "GrayMatter");
    assert.ok(graymatter);
    assert.equal(graymatter.command, "graymatter");
  });
});
