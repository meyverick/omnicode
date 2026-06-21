# omnicode

The cross-platform command-line entrypoint for running OpenCode through OmniRoute.

## What is omnicode?

`omnicode` is a thin wrapper that launches OpenCode through OmniRoute. It expects you to install the underlying tools yourself, then handles optional GrayMatter and OpenSpec initialization, background OmniRoute lifecycle, and project-local OpenCode sessions. Developed and tested on Ubuntu Linux — cross-platform by design but untested on Windows, macOS, and other Linux distributions.

## Why

Because I'm lazy. Not "I'll automate this repetitive task" lazy, but "I keep opening a second terminal just to run `omniroute`, then manually init GrayMatter, then manually init OpenSpec, then forget which session ID I was using" lazy.

Yes, I know OmniRoute is designed to run on a server. But I don't have a server at home, and I still want to save tokens by routing requests through it locally. Bonus: I get to use a bunch of free tiers from different providers without having to remember which API key goes where.

So I wrote this wrapper. It starts OmniRoute, inits GrayMatter and OpenSpec quietly in the background, remembers my session per project, and shuts everything down when I'm done. I run one command and pretend I'm a responsible developer with proper infrastructure.

## Features

- Thin npm global command written in Node.js (no bash needed).
- Cross-platform by design — developed and tested on Ubuntu Linux; untested on Windows, macOS, and other Linux distributions.
- Automatic session resume per project using the OpenCode database.
- Background OmniRoute lifecycle with cleanup when OpenCode exits.
- Quiet GrayMatter and OpenSpec initialization with captured logs.
- Check runtime status with `omnicode --status`.
- Print version with `omnicode --version`.

## Requirements

- Node.js 22 or later (developed and tested on Node 26; OmniRoute requires Node >=22 <=24).

## Explore

- [Getting Started](https://github.com/meyverick/omnicode/wiki/Getting-Started) - install, run, and uninstall.
- [How it works](https://github.com/meyverick/omnicode/wiki/How-it-works) - runtime flow, session handling, and lifecycle.
- [Configuration](https://github.com/meyverick/omnicode/wiki/Configuration) - paths and environment overrides.
- [Troubleshooting](https://github.com/meyverick/omnicode/wiki/Troubleshooting) - common issues and rollback.

## Acknowledgments

Built on top of:

- [OpenCode](https://github.com/opencode-ai/opencode) - AI-powered coding assistant
- [OmniRoute](https://github.com/diegosouzapw/OmniRoute) - model routing layer
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) - AI agent workflow framework
- [GrayMatter](https://github.com/angelnicolasc/graymatter) - persistent memory for AI agents

## License

[Apache 2.0](LICENSE)
