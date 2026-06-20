## ADDED Requirements

### Requirement: Package installs globally from npm on Ubuntu
The system SHALL provide an npm package named `omnicode` that installs globally with `npm install -g omnicode` on Ubuntu.

#### Scenario: Supported Ubuntu host
- **WHEN** the user runs `npm install -g omnicode` on a supported Ubuntu Linux host
- **THEN** npm SHALL install the `omnicode` package without requiring a pre-existing project checkout
- **THEN** the package SHALL make an `omnicode` command available on `PATH`

#### Scenario: Sudo is required
- **WHEN** the user runs the installer on a supported Ubuntu Linux host
- **THEN** the installer SHALL require `sudo` for the first installation
- **THEN** the installer SHALL fail with a clear message if required elevated privileges are unavailable

#### Scenario: Unsupported host
- **WHEN** the installer runs on a non-Linux or non-Ubuntu host
- **THEN** the installer SHALL fail before making system changes and explain that the first release supports Ubuntu only

### Requirement: Project structure is organized around omnicode
The implementation SHALL reorganize project-owned installer and runtime files into an `omnicode`-focused package structure instead of relying on legacy `omos` script locations.

#### Scenario: Package files are organized
- **WHEN** the implementation adds installer and runtime command files
- **THEN** installer logic SHALL live in a dedicated source folder
- **THEN** installed command content SHALL live in a dedicated template or command folder
- **THEN** tests SHALL live in a package-level test folder

#### Scenario: Package is packed for global npm install
- **WHEN** the package is prepared for global npm installation
- **THEN** only the intended package metadata, installer source, runtime command template, tests, and documentation SHALL be part of the package file list

### Requirement: Installer verifies and remediates required tools
The installer SHALL verify OpenCode, OmniRoute, the OmniRoute OpenCode plugin, OpenSpec, and GrayMatter, and SHALL install or update each missing or stale tool using the configured install command for that tool.

#### Scenario: OpenCode missing or stale
- **WHEN** OpenCode is missing or determined to need an update
- **THEN** the installer SHALL run `curl -fsSL https://opencode.ai/install | bash`

#### Scenario: OmniRoute missing or stale
- **WHEN** OmniRoute is missing or determined to need an update
- **THEN** the installer SHALL run `npm install -g omniroute`

#### Scenario: OmniRoute OpenCode plugin missing or stale
- **WHEN** the OmniRoute OpenCode plugin is missing or determined to need an update
- **THEN** the installer SHALL run `npm install -g opencode-omniroute-auth`

#### Scenario: OpenSpec missing or stale
- **WHEN** OpenSpec is missing or determined to need an update
- **THEN** the installer SHALL run `npm install -g @fission-ai/openspec@latest`

#### Scenario: GrayMatter missing
- **WHEN** GrayMatter is missing on supported Linux AMD64
- **THEN** the installer SHALL install it from `https://github.com/angelnicolasc/graymatter/releases/download/v0.6.0/graymatter_0.6.0_linux_amd64.tar.gz` and place the `graymatter` binary in `/usr/local/bin`

### Requirement: Installer preserves OpenCode configuration
The installer SHALL ensure the OpenCode config includes `opencode-omniroute-auth` in the `plugin` array while preserving unrelated existing configuration.

#### Scenario: Strict plugin path
- **WHEN** the installer configures OpenCode
- **THEN** the installer SHALL configure `opencode-omniroute-auth`
- **THEN** the installer SHALL NOT configure `@omniroute/opencode-plugin`

#### Scenario: OpenCode config does not exist
- **WHEN** no OpenCode config exists for the user
- **THEN** the installer SHALL create `opencode.jsonc` with a `plugin` array containing `opencode-omniroute-auth`

#### Scenario: OpenCode config has unrelated keys
- **WHEN** OpenCode config exists with unrelated keys or plugin entries
- **THEN** the installer SHALL preserve those keys and entries while adding `opencode-omniroute-auth` if it is absent

#### Scenario: Plugin already configured
- **WHEN** OpenCode config already includes `opencode-omniroute-auth`
- **THEN** the installer SHALL leave a single plugin entry and SHALL NOT duplicate it

### Requirement: Installer installs omnicode command
The package SHALL expose an executable `omnicode` command-line utility on the user's `PATH` for Ubuntu shell usage through npm's global bin handling.

#### Scenario: Global npm bin directory is available
- **WHEN** `npm install -g omnicode` completes successfully
- **THEN** the `omnicode` command SHALL be available through the global npm bin path

#### Scenario: Package already installed
- **WHEN** the user runs `npm install -g omnicode` while an older global `omnicode` package is installed
- **THEN** npm SHALL replace the package-managed `omnicode` command with the current package version without creating duplicate commands

### Requirement: Uninstall removes only omnicode command
The package uninstall path SHALL be `npm uninstall -g omnicode`, and it SHALL remove only the npm-managed `omnicode` package/command while preserving shared dependencies and OpenCode configuration.

#### Scenario: Package uninstall runs
- **WHEN** the user runs `npm uninstall -g omnicode`
- **THEN** npm SHALL remove the package-managed `omnicode` command
- **THEN** the uninstall path SHALL NOT uninstall OmniRoute, `opencode-omniroute-auth`, GrayMatter, or OpenSpec
- **THEN** the uninstall path SHALL NOT remove the OpenCode plugin configuration

#### Scenario: Uninstall notice is shown
- **WHEN** uninstall completes or cannot remove the command because it is already absent
- **THEN** the package SHALL inform the user, where npm lifecycle support allows and in documentation, that OmniRoute, `opencode-omniroute-auth`, GrayMatter, and OpenSpec were touched by install and remain installed

### Requirement: omnicode initializes tooling before launch
The `omnicode` command SHALL initialize GrayMatter and OpenSpec for OpenCode before starting OmniRoute and OpenCode.

#### Scenario: New project run
- **WHEN** the user runs `omnicode` in a project directory
- **THEN** the command SHALL run `graymatter init --only opencode` before launching OpenCode
- **THEN** the command SHALL run `openspec init --force --tools opencode` before launching OpenCode

#### Scenario: Initialization command fails
- **WHEN** a required initialization command fails
- **THEN** the `omnicode` command SHALL stop and return a non-zero exit code instead of launching OpenCode

### Requirement: omnicode launches OmniRoute and OpenCode
The `omnicode` command SHALL start OmniRoute with `--no-open` in the background and then launch OpenCode with a project-local session ID.

#### Scenario: Project session file exists
- **WHEN** the user runs `omnicode` and `.opencode/session.id` exists in the current directory with a non-empty value
- **THEN** the command SHALL launch `opencode -s <session_id>` using the value from `.opencode/session.id`

#### Scenario: Project session file is missing
- **WHEN** the user runs `omnicode` and `.opencode/session.id` does not exist in the current directory
- **THEN** the command SHALL create `.opencode/` if needed
- **THEN** the command SHALL generate a UUID and write it to `.opencode/session.id`
- **THEN** the command SHALL launch `opencode -s <generated_uuid>`

#### Scenario: Project session file is empty
- **WHEN** the user runs `omnicode` and `.opencode/session.id` exists but is empty or whitespace-only
- **THEN** the command SHALL generate a UUID, replace the file contents, and launch `opencode -s <generated_uuid>`

#### Scenario: Launch without session
- **WHEN** the user runs `omnicode` without a manual session option
- **THEN** the command SHALL ensure `omniroute --no-open` is running in the background
- **THEN** the command SHALL launch `opencode -s <project_session_id>`

#### Scenario: Launch with session
- **WHEN** the user runs `omnicode -s <session_id>`
- **THEN** the command SHALL ensure `omniroute --no-open` is running in the background
- **THEN** the command SHALL create `.opencode/` if needed
- **THEN** the command SHALL write `<session_id>` to `.opencode/session.id`
- **THEN** the command SHALL launch `opencode -s <session_id>`

#### Scenario: Starting OmniRoute in background
- **WHEN** the command starts OmniRoute itself
- **THEN** it SHALL run `omniroute --no-open` as a background process
- **THEN** it SHALL write OmniRoute logs and the started process ID under `~/.local/share/omnicode`

#### Scenario: OmniRoute already running
- **WHEN** OmniRoute is already running
- **THEN** the command SHALL reuse the running OmniRoute process and SHALL NOT start a duplicate process

#### Scenario: OpenCode exits and OmniRoute was started by omnicode
- **WHEN** OpenCode exits and no other OpenCode process remains
- **THEN** the command SHALL stop the OmniRoute process it started
