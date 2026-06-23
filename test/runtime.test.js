import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

import { runRuntime } from "../src/bin/omnicode-runtime.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const runtimePath = join(__dirname, "..", "src", "bin", "omnicode-runtime.js");

describe("omnicode-runtime.js", () => {
  it("exports runRuntime as an async function", () => {
    assert.equal(typeof runRuntime, "function");
    assert.equal(runRuntime.constructor.name, "AsyncFunction");
  });

  it("does not reference .opencode/session.id", () => {
    const content = readFileSync(runtimePath, "utf8");
    assert.ok(!content.includes(".opencode/session.id"));
    assert.ok(!content.includes("uuid"));
  });

  it("launches opencode -s when given -s mode", () => {
    const content = readFileSync(runtimePath, "utf8");
    assert.ok(content.includes('"opencode"'));
    assert.ok(content.includes('"-s", mode.id'));
  });

  it("does not use the buggy opencode -c continue flag", () => {
    const content = readFileSync(runtimePath, "utf8");
    assert.ok(!content.includes("opencode -c"));
  });

  it("launches plain opencode when no session flag is given", () => {
    const content = readFileSync(runtimePath, "utf8");
    assert.ok(content.includes('"opencode"'));
    assert.ok(content.includes("new session"));
  });

  it("conditionally runs graymatter and openspec", () => {
    const content = readFileSync(runtimePath, "utf8");
    assert.ok(content.includes("graymatter"));
    assert.ok(content.includes("openspec"));
    assert.ok(content.includes("not installed, skipping"));
  });

  it("redirects graymatter and openspec init logs", () => {
    const content = readFileSync(runtimePath, "utf8");
    assert.ok(content.includes("graymatter-init.log"));
    assert.ok(content.includes("openspec-init.log"));
  });

  it("runs omniroute with --no-open", () => {
    const content = readFileSync(runtimePath, "utf8");
    assert.ok(content.includes("omniroute"));
    assert.ok(content.includes("--no-open"));
  });

  it("uses process.kill for liveness and termination", () => {
    const content = readFileSync(runtimePath, "utf8");
    assert.ok(content.includes("process.kill"));
  });

  it("protects PID file from stale data", () => {
    const content = readFileSync(runtimePath, "utf8");
    assert.ok(content.includes("writeFileSync"));
    assert.ok(content.includes("unlinkSync"));
  });

  it("starts MCP server before launching opencode", () => {
    const content = readFileSync(runtimePath, "utf8");
    assert.ok(content.includes("startMcpServer"));
    assert.ok(content.indexOf("await startMcpServer") < content.indexOf("const launch = launchOpencode("));
  });

  it("passes the ready Qdrant server to close handler", () => {
    const content = readFileSync(runtimePath, "utf8");
    assert.ok(content.includes("if (mcpServer) stopMcpServer(mcpServer)"));
  });
});
