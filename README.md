# omnicode

The Ubuntu command-line entrypoint for running OpenCode through OmniRoute.

## What is omnicode?

`omnicode` turns a fresh Ubuntu machine into a working OpenCode + OmniRoute environment with a single global npm install. It manages the toolchain, wires OpenCode to OmniRoute, and exposes one command that initializes your project, starts OmniRoute in the background, and resumes your OpenCode session.

## Why

Setting up OpenCode, OmniRoute, GrayMatter, OpenSpec, and the right OpenCode plugin by hand is repetitive and error-prone. `omnicode` automates that setup, keeps it idempotent, and gives you a project-local session file so every directory you work in remembers its OpenCode session.

## Features

- One-command install through npm on Ubuntu.
- Automatic dependency verification and remediation.
- Project-local OpenCode sessions via `.opencode/session.id`.
- Background OmniRoute lifecycle with cleanup when OpenCode exits.
- Safe uninstall that only removes `omnicode` and tells you what remains.

## Explore

- [Getting Started](Getting-Started) — install, run, and uninstall.
- [How it works](How-it-works) — runtime flow, session handling, and lifecycle.
- [Configuration](Configuration) — OpenCode config and plugin wiring.
- [Troubleshooting](Troubleshooting) — common issues and rollback.

## License

MIT
