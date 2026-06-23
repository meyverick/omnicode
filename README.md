# omnicode

The cross-platform command-line entrypoint for running OpenCode through OmniRoute, backed by AI-powered reference indexing with Qdrant.

## What is omnicode?

`omnicode` is a wrapper that launches OpenCode through OmniRoute with zero friction. It handles GrayMatter memory, OpenSpec change tracking, and OmniRoute lifecycle automatically. On top of that, it indexes your `./references/` directory into a Qdrant vector database — unlocking semantic search for AI agents working in your codebase.

Developed and tested on Ubuntu Linux; cross-platform by design (Node.js, no bash).

## Why

Because I kept opening a second terminal to run `omniroute`, manually init GrayMatter, manually init OpenSpec, and forget which session ID I was using. I wrote a wrapper so I can run one command and pretend I'm a responsible developer with proper infrastructure.

## Features

- **Single command** — launches OmniRoute + OpenCode + optional tools in one shot.
- **Automatic session resume** — remembers your session per project via the OpenCode database.
- **Background OmniRoute lifecycle** — starts with OpenCode, stops when no sessions remain.
- **Quiet initialization** — GrayMatter and OpenSpec init run in the background with captured logs.
- **Semantic reference indexing** — indexes `./references/` into Qdrant with BGE embeddings for AI-agent search.
- **Cross-platform runtime** — pure Node.js, no bash dependency.

## Quick start

```bash
npm install -g @meyverick/omnicode
omnicode
```

See the [wiki](https://github.com/meyverick/omnicode/wiki) for detailed setup, configuration, and troubleshooting.
