import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeOpenCodePlugin } from "../src/installer/opencode-config.js";

describe("mergeOpenCodePlugin", () => {
  it("creates a fresh config when input is null", () => {
    const { content, changed } = mergeOpenCodePlugin(null);
    assert.equal(changed, true);
    const cfg = JSON.parse(content);
    assert.equal(cfg.$schema, "https://opencode.ai/config.json");
    assert.deepEqual(cfg.plugin, ["opencode-omniroute-auth"]);
  });

  it("creates a fresh config when input is empty", () => {
    const { content, changed } = mergeOpenCodePlugin("");
    assert.equal(changed, true);
    const cfg = JSON.parse(content);
    assert.deepEqual(cfg.plugin, ["opencode-omniroute-auth"]);
  });

  it("adds the plugin to an existing config without removing unrelated keys", () => {
    const existing = JSON.stringify({ model: "gpt-5.5", plugin: ["other"] }, null, 2);
    const { content, changed } = mergeOpenCodePlugin(existing);
    assert.equal(changed, true);
    const cfg = JSON.parse(content);
    assert.equal(cfg.model, "gpt-5.5");
    assert.deepEqual(cfg.plugin, ["other", "opencode-omniroute-auth"]);
  });

  it("does not duplicate the plugin", () => {
    const existing = JSON.stringify({ plugin: ["opencode-omniroute-auth"] }, null, 2);
    const { content, changed } = mergeOpenCodePlugin(existing);
    assert.equal(changed, false);
    assert.equal(content, existing);
  });

  it("ignores comments while parsing JSONC", () => {
    const existing = `{
  // this is a comment
  "plugin": ["other"]
}`;
    const { content, changed } = mergeOpenCodePlugin(existing);
    assert.equal(changed, true);
    const cfg = JSON.parse(content);
    assert.deepEqual(cfg.plugin, ["other", "opencode-omniroute-auth"]);
  });
});
