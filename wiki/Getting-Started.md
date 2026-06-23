# Getting Started

> **Platform note:** `omnicode` is written in Node.js and designed to work cross-platform, but it has only been developed and tested on **Ubuntu Linux**. Running on Windows, macOS, or other Linux distributions may uncover untested edge cases.

## Requirements

- Linux, macOS, or Windows
- Node.js 22 or later (OmniRoute requires Node >=22 <=24)
- npm
- [OpenCode](https://github.com/opencode-ai/opencode)
- [OmniRoute](https://github.com/meyverick/omniroute)
- (Optional) GrayMatter
- (Optional) OpenSpec
- (Optional) Docker — required for Qdrant vector indexing
- (Optional) [MinerU](https://github.com/opendatalab/MinerU) — required for PDF/image OCR in complex documents
- (Optional) [web-tree-sitter](https://github.com/tree-sitter/tree-sitter) — required for structural code chunking

## Install dependencies

`omnicode` requires `opencode` and `omniroute` on your `PATH`:

```bash
npm install -g opencode
npm install -g omniroute
```

Optional tools:

```bash
# GrayMatter
sudo install -m 755 graymatter /usr/local/bin/graymatter

# OpenSpec
npm install -g @fission-ai/openspec
```

## Install omnicode

```bash
npm install -g @meyverick/omnicode
```

No postinstall scripts run. No additional tools are installed.

## Run

```bash
omnicode
```

This will:

1. Verify `opencode` and `omniroute` are available.
2. Run GrayMatter and OpenSpec initialization quietly (logs captured to `~/.local/share/omnicode/`).
3. Start `omniroute --no-open` in the background.
4. Start a Qdrant Docker container for vector indexing (if Docker is available).
5. Begin indexing `./references/` in the background.
6. Look up the latest OpenCode session for the current directory.
7. Launch OpenCode.

### Indexing

If a `./references/` directory exists and Qdrant is enabled, omnicode indexes the reference files in the background. Indexing uses:

- **BAAI/bge-small-en-v1.5** — lightweight embedding model (384 dimensions, ~65MB).
- **Qdrant Docker container** — persistent vector storage at `localhost:6333`.
- **MinerU** — OCR and layout parsing for PDFs and images (optional).
- **web-tree-sitter** — structural code chunking (optional).

Run indexing manually:

```bash
omnicode index
```

Force a full re-index:

```bash
omnicode index --force-reindex
```

## Check status

```bash
omnicode --status
```

Shows whether OpenCode, OmniRoute, Qdrant, and any active indexers are running.

## Uninstall

```bash
sudo npm uninstall -g @meyverick/omnicode
```

To clean up Qdrant data:

```bash
docker rm -f omnicode-qdrant 2>/dev/null
rm -rf ~/.local/share/omnicode/qdrant-storage
```
