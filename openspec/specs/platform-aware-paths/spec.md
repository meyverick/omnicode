# platform-aware-paths

## Purpose

Resolves filesystem paths based on OS-specific conventions for XDG (Linux), Library (macOS), and AppData (Windows) directory structures.

## Requirements

### Requirement: Platform-aware data directory

The system SHALL resolve the omnicode data directory based on the host operating system conventions.

#### Scenario: Linux data directory

- **WHEN** the platform is Linux
- **THEN** the data directory SHALL be `~/.local/share/omnicode`

#### Scenario: macOS data directory

- **WHEN** the platform is macOS
- **THEN** the data directory SHALL be `~/.local/share/omnicode`

#### Scenario: Windows data directory

- **WHEN** the platform is Windows
- **THEN** the data directory SHALL be `%USERPROFILE%/.local/share/omnicode`

### Requirement: Platform-aware OpenCode DB path

The system SHALL resolve the OpenCode database path by checking OS-appropriate candidate locations and returning the first that exists.

#### Scenario: Linux DB path

- **WHEN** the platform is Linux
- **THEN** the candidate DB path SHALL be `~/.local/share/opencode/opencode.db`

#### Scenario: macOS DB path

- **WHEN** the platform is macOS
- **THEN** the candidate DB path SHALL be `~/.local/share/opencode/opencode.db`

#### Scenario: Windows DB path

- **WHEN** the platform is Windows
- **THEN** the candidate DB path SHALL be `%USERPROFILE%/.local/share/opencode/opencode.db`

#### Scenario: No DB found

- **WHEN** no candidate path exists
- **THEN** the system SHALL return `null`
