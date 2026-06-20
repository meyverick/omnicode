## ADDED Requirements

### Requirement: Native SQLite session lookup
The system SHALL query the OpenCode database using Node.js native `node:sqlite` instead of spawning a Python subprocess.

#### Scenario: Session lookup succeeds
- **WHEN** `getLatestSessionId()` is called and the database contains sessions for the current directory
- **THEN** it returns the latest session ID using `node:sqlite` without spawning external processes.

#### Scenario: Session lookup fails gracefully
- **WHEN** `getLatestSessionId()` is called and the database is unavailable or corrupted
- **THEN** it returns `null` and does not crash.

### Requirement: Lazy session lookup
The system SHALL only query the session database when no explicit session ID is provided.

#### Scenario: User provides -s flag
- **WHEN** the user runs `omnicode -s ses_abc123`
- **THEN** the database is not queried.

#### Scenario: User provides no session flag
- **WHEN** the user runs `omnicode` without `-s`
- **THEN** the database is queried to find the latest session for the current directory.

### Requirement: Optimized runtime directory creation
The system SHALL avoid redundant directory creation when the bash runtime already creates it.

#### Scenario: Node wrapper checks runtime dir
- **WHEN** `getRuntimeDir()` is called
- **THEN** it returns the path without calling `mkdirSync` if the directory already exists.
