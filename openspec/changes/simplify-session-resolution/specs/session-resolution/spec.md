## ADDED Requirements

### Requirement: No invented session IDs
The system SHALL NOT generate, store, or pass invented session IDs to OpenCode.

#### Scenario: Running without a saved session
- **WHEN** the user runs `omnicode` in a directory with no prior OpenCode sessions
- **THEN** the system launches OpenCode without a session argument.

### Requirement: Explicit session ID passes through
The system SHALL pass a user-provided session ID to OpenCode unchanged.

#### Scenario: User provides -s
- **WHEN** the user runs `omnicode -s ses_abc123`
- **THEN** the system launches OpenCode with `opencode -s ses_abc123`.

### Requirement: Continue existing sessions automatically
The system SHALL continue the most recent session when no session ID is provided and at least one OpenCode session exists for the current directory.

#### Scenario: Existing sessions in directory
- **WHEN** the user runs `omnicode` in a directory with existing OpenCode sessions
- **THEN** the system launches OpenCode with `opencode -c`.

### Requirement: No project-local session file
The system SHALL NOT create or modify `.opencode/session.id`.

#### Scenario: First run in a directory
- **WHEN** the user runs `omnicode` for the first time in a directory
- **THEN** no `.opencode/session.id` file is created by the system.

### Requirement: Session existence detection
The system SHALL detect existing sessions by invoking `opencode session list` and checking for session identifiers in the output.

#### Scenario: opencode session list returns sessions
- **WHEN** `opencode session list` outputs rows containing session IDs
- **THEN** the system treats the directory as having existing sessions.

#### Scenario: opencode session list returns nothing
- **WHEN** `opencode session list` outputs no session IDs
- **THEN** the system treats the directory as having no existing sessions.
