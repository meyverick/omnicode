## ADDED Requirements

### Requirement: No automatic dependency installation
The system SHALL NOT install, update, or remove `opencode`, `omniroute`, `openspec`, `graymatter`, or any plugin.

#### Scenario: Package install
- **WHEN** the user runs `npm install -g omnicode`
- **THEN** no network requests or package installs are triggered for dependencies.

### Requirement: Hard requirements are checked at runtime
The system SHALL verify that `opencode` and `omniroute` are available on `PATH` before attempting to run.

#### Scenario: Both tools are present
- **WHEN** `opencode` and `omniroute` are installed
- **THEN** the `omnicode` command continues to run.

#### Scenario: Missing critical tool
- **WHEN** either `opencode` or `omniroute` is missing
- **THEN** the `omnicode` command exits with a non-zero status and prints an error message naming the missing tool.

### Requirement: Optional tools are checked with warnings
The system SHALL warn and skip initialization steps when `graymatter` or `openspec` is missing.

#### Scenario: GrayMatter is missing
- **WHEN** `omnicode` runs and `graymatter` is not on `PATH`
- **THEN** it prints a warning and skips `graymatter init --only opencode`.

#### Scenario: OpenSpec is missing
- **WHEN** `omnicode` runs and `openspec` is not on `PATH`
- **THEN** it prints a warning and skips `openspec init --force --tools opencode`.

### Requirement: No plugin configuration
The system SHALL NOT configure or reference the `opencode-omniroute-auth` plugin or any other OpenCode plugin.

#### Scenario: OpenCode config inspection
- **WHEN** a user inspects the OpenCode configuration after running `omnicode`
- **THEN** no plugin entry is added, modified, or required by `omnicode`.

### Requirement: Manual install instructions in documentation
The system documentation SHALL instruct users to install `opencode` and `omniroute` manually.

#### Scenario: New user reads README
- **WHEN** a user reads the project README
- **THEN** they find clear instructions for installing the required tools before installing `omnicode`.
