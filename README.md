# omnicode

The Ubuntu command-line entrypoint for running OpenCode through OmniRoute.

## What is omnicode?

`omnicode` is a thin wrapper that launches OpenCode through OmniRoute on Ubuntu. It expects you to install the underlying tools yourself, then handles optional GrayMatter and OpenSpec initialization, background OmniRoute lifecycle, and project-local OpenCode sessions.

## Why

Installing OpenCode, OmniRoute, GrayMatter, and OpenSpec by hand is straightforward, but wiring them together every time is repetitive. `omnicode` removes the boilerplate while staying out of your package manager.

## Features

- Thin npm global command for Ubuntu.
- Automatic session resume per project using the OpenCode database.
- Background OmniRoute lifecycle with cleanup when OpenCode exits.
- Quiet GrayMatter and OpenSpec initialization with captured logs.
- Check runtime status with `omnicode --status`.
- Print version with `omnicode --version`.

## Explore

- [Getting Started](Getting-Started) — install, run, and uninstall.
- [How it works](How-it-works) — runtime flow, session handling, and lifecycle.
- [Configuration](Configuration) — paths and environment overrides.
- [Troubleshooting](Troubleshooting) — common issues and rollback.

## License

MIT
