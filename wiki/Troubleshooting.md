# Troubleshooting

## `omnicode` not on PATH

```bash
export PATH="$(npm config get prefix)/bin:$PATH"
```

Add to `~/.bashrc` or `~/.zshrc` to persist.

## Missing required tool

```text
[omnicode] ERROR: missing required tool(s): opencode, omniroute
```

```bash
npm install -g opencode
npm install -g omniroute
```

## OmniRoute does not start

Check the log:

```bash
cat ~/.local/share/omnicode/omniroute.log
```

Verify `omniroute --no-open` works directly. For Node version mismatches:

```bash
omniroute runtime repair
```

## Qdrant container fails to start

Requires Docker. Verify Docker is installed and running:

```bash
docker info
```

Manually start the container:

```bash
docker run -d --name omnicode-qdrant -p 6333:6333 -v ~/.local/share/omnicode/qdrant-storage:/qdrant/storage qdrant/qdrant
```

Check container logs:

```bash
docker logs omnicode-qdrant
```

## Duplicate MCP servers

If `omnicode status` shows qdrant running but `qdrant-find` tools fail with `fast-all-minilm-l6-v2` errors, stale MCP server processes may be using an old model. Kill them:

```bash
pkill -f "mcp-server-qdrant"
```

OpenCode will respawn a fresh MCP server with the correct environment.

## Qdrant tool calls fail with vector name mismatch

Error: `Not existing vector name error: fast-all-minilm-l6-v2`

The collection was created with a different embedding model. Re-index with the current model:

```bash
omnicode index --force-reindex
```

## System freeze during indexing

If the computer becomes unresponsive during `omnicode index`, indexing now supports Ctrl+C to cancel safely. The MCP server is stopped and partial state is saved. On next run, only unindexed files are processed.

## GrayMatter or OpenSpec init fails

Non-fatal. Check captured logs:

```bash
cat ~/.local/share/omnicode/graymatter-init.log
cat ~/.local/share/omnicode/openspec-init.log
```

## Check runtime status

```bash
omnicode --status
```

Shows OpenCode, OmniRoute, Qdrant, and active indexers.

## Clean uninstall

```bash
sudo npm uninstall -g @meyverick/omnicode
rm -rf ~/.local/share/omnicode
docker rm -f omnicode-qdrant 2>/dev/null
```
