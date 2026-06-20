#!/usr/bin/env bash
set -euo pipefail

SESSION_FLAG="${1:-}"
SESSION_ID="${2:-}"
RUNTIME_DIR="$HOME/.local/share/omnicode"
LOG_FILE="$RUNTIME_DIR/omniroute.log"
PID_FILE="$RUNTIME_DIR/omniroute.pid"
MAX_OMNI_WAIT=30
OMNI_CHECK_DELAY=1

export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

mkdir -p "$RUNTIME_DIR"

is_pid_alive() {
  local pid="${1:-}"
  [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1
}

is_omniroute_running() {
  pgrep -x "omniroute" >/dev/null 2>&1
}

is_opencode_running() {
  pgrep -x "opencode" >/dev/null 2>&1
}

start_omniroute() {
  if is_omniroute_running; then
    echo "[omnicode] omniroute already running"
    return 0
  fi

  echo "[omnicode] starting omniroute..."
  : > "$LOG_FILE"
  nohup omniroute --no-open >>"$LOG_FILE" 2>&1 &
  local pid=$!
  printf '%s\n' "$pid" > "$PID_FILE"

  local waited=0
  while ! is_pid_alive "$pid" && [[ "$waited" -lt "$MAX_OMNI_WAIT" ]]; do
    sleep "$OMNI_CHECK_DELAY"
    waited=$((waited + OMNI_CHECK_DELAY))
  done

  if ! is_pid_alive "$pid"; then
    echo "[omnicode] ERROR: omniroute exited during startup. Log: $LOG_FILE" >&2
    exit 1
  fi

  echo "[omnicode] omniroute started (pid: $pid)"
}

stop_omniroute_if_idle() {
  if is_opencode_running; then
    return 0
  fi

  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if is_pid_alive "$pid"; then
      echo "[omnicode] no opencode left -> stopping omniroute (pid: $pid)"
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi
}

cleanup() {
  stop_omniroute_if_idle
}
trap cleanup EXIT INT TERM

if command -v graymatter >/dev/null 2>&1; then
  echo "[omnicode] initializing graymatter..."
  graymatter init --only opencode || echo "[omnicode] WARNING: graymatter init failed; continuing."
else
  echo "[omnicode] WARNING: graymatter not found; skipping graymatter init."
fi

if command -v openspec >/dev/null 2>&1; then
  echo "[omnicode] initializing openspec..."
  openspec init --force --tools opencode || echo "[omnicode] WARNING: openspec init failed; continuing."
else
  echo "[omnicode] WARNING: openspec not found; skipping openspec init."
fi

start_omniroute

if [[ "$SESSION_FLAG" == "-s" && -n "$SESSION_ID" ]]; then
  echo "[omnicode] launching opencode (session: $SESSION_ID)"
  opencode -s "$SESSION_ID"
elif [[ "$SESSION_FLAG" == "-c" ]]; then
  echo "[omnicode] launching opencode (continue last session)"
  opencode -c
else
  echo "[omnicode] launching opencode (new session)"
  opencode
fi
