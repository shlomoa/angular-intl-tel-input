#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_NAME="$(basename "$0")"
ACTION="all"
COMMAND_TIMEOUT=10
DISPLAY_NUMBER=1
DESKTOP_PACKAGE="ubuntu-desktop"
SESSION_COMMAND="gnome-session"
GEOMETRY="1920x1080"
LOCALHOST_MODE="yes"
SKIP_UPGRADE=0
SKIP_PASSWORD=0
DRY_RUN=0
TARGET_USER="${SUDO_USER:-${USER:-}}"
TARGET_HOME=""
TARGET_GROUP=""
PASSWORD_FILE=""
PASSWORD_VALUE=""
WSL_CONF_PATH="/etc/wsl.conf"
VNC_DIR=""
SERVICE_DIR=""
TIMEOUT_BIN=""

usage() {
  cat <<EOF
Usage: sudo ${SCRIPT_NAME} [action] [options]

Actions:
  all              Run install, configure, and start (default)
  install          Install desktop and TigerVNC packages
  configure        Configure /etc/wsl.conf, ~/.vnc/xstartup, and the user service
  start            Start VNC on the configured display
  stop             Stop VNC on the configured display
  status           Show VNC server status
  service-enable   Enable and start the user systemd VNC service
  service-disable  Disable and stop the user systemd VNC service

Options:
  --user USER                 Target Linux user (defaults to SUDO_USER)
  --target-home PATH          Override the target home directory
  --display NUMBER            VNC display number (default: 1)
  --desktop-package PACKAGE   Desktop meta package to install (default: ubuntu-desktop)
  --session-command COMMAND   Session command for ~/.vnc/xstartup (default: gnome-session)
  --geometry WxH              VNC geometry (default: 1920x1080)
  --localhost                 Bind VNC to localhost only (default)
  --no-localhost              Allow remote VNC connections
  --password-file PATH        Read the VNC password from a file
  --password VALUE            Set the VNC password from the provided value
  --skip-upgrade              Skip apt-get upgrade
  --skip-password             Do not set a VNC password
  --timeout SECONDS           Per-command timeout, 1-10 seconds (default: 10)
  --wsl-conf-path PATH        Override /etc/wsl.conf path
  --vnc-dir PATH              Override the user's .vnc directory
  --service-dir PATH          Override the user systemd directory
  --dry-run                   Print steps without making changes
  --help                      Show this help
EOF
}

step_start() {
  printf 'Step "%s": Starting\n' "$1"
}

step_result() {
  printf 'Step "%s": %s: %s\n' "$1" "$2" "$3"
}

fail() {
  step_result "$1" "Failed" "$2"
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$2" "missing required command: $1"
}

run_command() {
  local step_name="$1"
  local success_message="$2"
  shift 2

  step_start "$step_name"
  if (( DRY_RUN )); then
    step_result "$step_name" "Updated" "dry-run: $(printf '%q ' "$@")"
    return 0
  fi

  local output=""
  local rc=0
  set +e
  output=$("$TIMEOUT_BIN" --foreground --kill-after=2s "${COMMAND_TIMEOUT}s" "$@" 2>&1)
  rc=$?
  set -e

  if (( rc == 0 )); then
    step_result "$step_name" "Updated" "$success_message"
    if [[ -n "$output" ]]; then
      printf '%s\n' "$output" | sed 's/^/  /'
    fi
    return 0
  fi

  if (( rc == 124 )); then
    fail "$step_name" "timed out after ${COMMAND_TIMEOUT}s"
  fi

  fail "$step_name" "${output:-command failed with exit code ${rc}}"
}

run_target_bash() {
  local step_name="$1"
  local success_message="$2"
  local script="$3"
  shift 3

  if [[ "$(id -u)" -eq 0 && "$TARGET_USER" != "$(id -un)" ]]; then
    run_command "$step_name" "$success_message" sudo -u "$TARGET_USER" env HOME="$TARGET_HOME" USER="$TARGET_USER" LOGNAME="$TARGET_USER" bash -lc "$script" bash "$@"
  else
    run_command "$step_name" "$success_message" env HOME="$TARGET_HOME" USER="$TARGET_USER" LOGNAME="$TARGET_USER" bash -lc "$script" bash "$@"
  fi
}

ensure_directory() {
  local step_name="$1"
  local path="$2"
  local owner_group="$3"
  local mode="$4"

  step_start "$step_name"
  if (( DRY_RUN )); then
    if [[ -d "$path" ]]; then
      step_result "$step_name" "Updated" "$path already exists"
    else
      step_result "$step_name" "Created" "$path"
    fi
    return 0
  fi

  if [[ -d "$path" ]]; then
    chmod "$mode" "$path"
    chown "$owner_group" "$path"
    step_result "$step_name" "Updated" "$path already exists"
    return 0
  fi

  install -d -m "$mode" "$path"
  chown "$owner_group" "$path"
  step_result "$step_name" "Created" "$path"
}

write_file_if_changed() {
  local step_name="$1"
  local path="$2"
  local owner_group="$3"
  local mode="$4"
  local temp_file="$5"

  step_start "$step_name"

  if (( DRY_RUN )); then
    if [[ -f "$path" ]]; then
      if cmp -s "$temp_file" "$path"; then
        step_result "$step_name" "Updated" "$path already matches requested content"
      else
        step_result "$step_name" "Updated" "$path"
      fi
    else
      step_result "$step_name" "Created" "$path"
    fi
    return 0
  fi

  install -d -m 0755 "$(dirname "$path")"

  if [[ ! -f "$path" ]]; then
    install -m "$mode" "$temp_file" "$path"
    chown "$owner_group" "$path"
    step_result "$step_name" "Created" "$path"
    return 0
  fi

  if cmp -s "$temp_file" "$path"; then
    chmod "$mode" "$path"
    chown "$owner_group" "$path"
    step_result "$step_name" "Updated" "$path already matches requested content"
    return 0
  fi

  install -m "$mode" "$temp_file" "$path"
  chown "$owner_group" "$path"
  step_result "$step_name" "Updated" "$path"
}

render_wsl_conf() {
  local temp_file="$1"

  if (( DRY_RUN )); then
    python3 - "$WSL_CONF_PATH" "$temp_file" <<'PY'
from pathlib import Path
import re
import sys

source_path = Path(sys.argv[1])
target_path = Path(sys.argv[2])
text = source_path.read_text() if source_path.exists() else ""
lines = text.splitlines(True)
output = []
in_boot = False
found_boot = False
found_systemd = False

for line in lines:
    stripped = line.strip()
    if stripped.startswith("[") and stripped.endswith("]"):
        if in_boot and not found_systemd:
            output.append("systemd=true\n")
            found_systemd = True
        in_boot = stripped.lower() == "[boot]"
        found_boot = found_boot or in_boot
        output.append(line)
        continue

    if in_boot and re.match(r"\s*systemd\s*=", line, re.IGNORECASE):
        output.append("systemd=true\n")
        found_systemd = True
        continue

    output.append(line)

if in_boot and not found_systemd:
    output.append("systemd=true\n")
    found_systemd = True

if not found_boot:
    if output and output[-1].strip():
        output.append("\n")
    output.extend(["[boot]\n", "systemd=true\n"])

target_path.write_text("".join(output))
PY
    return 0
  fi

  run_command "Render WSL systemd configuration" "generated updated ${WSL_CONF_PATH} content" python3 - "$WSL_CONF_PATH" "$temp_file" <<'PY'
from pathlib import Path
import re
import sys

source_path = Path(sys.argv[1])
target_path = Path(sys.argv[2])
text = source_path.read_text() if source_path.exists() else ""
lines = text.splitlines(True)
output = []
in_boot = False
found_boot = False
found_systemd = False

for line in lines:
    stripped = line.strip()
    if stripped.startswith("[") and stripped.endswith("]"):
        if in_boot and not found_systemd:
            output.append("systemd=true\n")
            found_systemd = True
        in_boot = stripped.lower() == "[boot]"
        found_boot = found_boot or in_boot
        output.append(line)
        continue

    if in_boot and re.match(r"\s*systemd\s*=", line, re.IGNORECASE):
        output.append("systemd=true\n")
        found_systemd = True
        continue

    output.append(line)

if in_boot and not found_systemd:
    output.append("systemd=true\n")
    found_systemd = True

if not found_boot:
    if output and output[-1].strip():
        output.append("\n")
    output.extend(["[boot]\n", "systemd=true\n"])

target_path.write_text("".join(output))
PY
}

configure_wsl_conf() {
  local temp_file
  temp_file="$(mktemp)"
  render_wsl_conf "$temp_file"
  write_file_if_changed "Configure /etc/wsl.conf" "$WSL_CONF_PATH" "root:root" 0644 "$temp_file"
  rm -f "$temp_file"
}

configure_xstartup() {
  local temp_file
  temp_file="$(mktemp)"
  cat >"$temp_file" <<EOF
#!/bin/sh
[ -r "\$HOME/.Xresources" ] && xrdb "\$HOME/.Xresources"
export XKL_XMODMAP_DISABLE=1
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
exec ${SESSION_COMMAND}
EOF
  write_file_if_changed "Configure ~/.vnc/xstartup" "${VNC_DIR}/xstartup" "${TARGET_USER}:${TARGET_GROUP}" 0755 "$temp_file"
  rm -f "$temp_file"
}

configure_service() {
  local temp_file
  temp_file="$(mktemp)"
  cat >"$temp_file" <<EOF
[Unit]
Description=TigerVNC server on display :%i
After=default.target

[Service]
Type=forking
ExecStart=/usr/bin/vncserver :%i -geometry ${GEOMETRY} -localhost ${LOCALHOST_MODE}
ExecStop=/usr/bin/vncserver -kill :%i
Restart=on-failure

[Install]
WantedBy=default.target
EOF
  write_file_if_changed "Configure user VNC systemd service" "${SERVICE_DIR}/vncserver@.service" "${TARGET_USER}:${TARGET_GROUP}" 0644 "$temp_file"
  rm -f "$temp_file"
}

configure_password() {
  if (( SKIP_PASSWORD )); then
    step_start "Configure VNC password"
    step_result "Configure VNC password" "Updated" "skipped password configuration"
    return 0
  fi

  if [[ -n "$PASSWORD_VALUE" ]]; then
    run_target_bash "Configure VNC password" "stored VNC password in ${VNC_DIR}/passwd" '
      install -d -m 700 "$1"
      umask 077
      printf "%s\n" "$2" | vncpasswd -f > "$1/passwd"
      chmod 600 "$1/passwd"
    ' "$VNC_DIR" "$PASSWORD_VALUE"
    return 0
  fi

  if [[ -n "$PASSWORD_FILE" ]]; then
    run_target_bash "Configure VNC password" "stored VNC password in ${VNC_DIR}/passwd" '
      install -d -m 700 "$1"
      umask 077
      head -n 1 "$2" | tr -d "\r\n" | vncpasswd -f > "$1/passwd"
      chmod 600 "$1/passwd"
    ' "$VNC_DIR" "$PASSWORD_FILE"
    return 0
  fi

  step_start "Configure VNC password"
  step_result "Configure VNC password" "Updated" "skipped automatic password configuration; rerun with --password or --password-file"
}

install_packages() {
  run_command "Refresh apt package lists" "apt-get update completed" apt-get update
  if (( SKIP_UPGRADE == 0 )); then
    run_command "Upgrade installed packages" "apt-get upgrade completed" apt-get upgrade -y
  else
    step_start "Upgrade installed packages"
    step_result "Upgrade installed packages" "Updated" "skipped apt-get upgrade"
  fi
  run_command "Install desktop and VNC packages" "desktop and VNC packages installed" apt-get install -y "$DESKTOP_PACKAGE" xwayland tigervnc-standalone-server tigervnc-xorg-extension dbus-x11
}

configure_files() {
  configure_wsl_conf
  ensure_directory "Ensure ~/.vnc directory" "$VNC_DIR" "${TARGET_USER}:${TARGET_GROUP}" 0700
  ensure_directory "Ensure user systemd directory" "$SERVICE_DIR" "${TARGET_USER}:${TARGET_GROUP}" 0755
  configure_xstartup
  configure_service
  configure_password
}

start_vnc() {
  run_target_bash "Start VNC server" "VNC server started on display :${DISPLAY_NUMBER}" '
    vncserver ":${1}" -geometry "${2}" -localhost "${3}"
  ' "$DISPLAY_NUMBER" "$GEOMETRY" "$LOCALHOST_MODE"
}

stop_vnc() {
  run_target_bash "Stop VNC server" "VNC server stopped on display :${DISPLAY_NUMBER}" '
    vncserver -kill ":${1}"
  ' "$DISPLAY_NUMBER"
}

status_vnc() {
  run_target_bash "Check VNC server status" "listed VNC sessions" 'vncserver -list'
}

service_enable() {
  run_target_bash "Enable VNC systemd service" "enabled and started vncserver@${DISPLAY_NUMBER}.service" '
    systemctl --user daemon-reload
    systemctl --user enable --now "vncserver@${1}.service"
  ' "$DISPLAY_NUMBER"
}

service_disable() {
  run_target_bash "Disable VNC systemd service" "disabled and stopped vncserver@${DISPLAY_NUMBER}.service" '
    systemctl --user disable --now "vncserver@${1}.service"
  ' "$DISPLAY_NUMBER"
}

while (($# > 0)); do
  case "$1" in
    all|install|configure|start|stop|status|service-enable|service-disable)
      ACTION="$1"
      shift
      ;;
    --user)
      TARGET_USER="$2"
      shift 2
      ;;
    --target-home)
      TARGET_HOME="$2"
      shift 2
      ;;
    --display)
      DISPLAY_NUMBER="$2"
      shift 2
      ;;
    --desktop-package)
      DESKTOP_PACKAGE="$2"
      shift 2
      ;;
    --session-command)
      SESSION_COMMAND="$2"
      shift 2
      ;;
    --geometry)
      GEOMETRY="$2"
      shift 2
      ;;
    --localhost)
      LOCALHOST_MODE="yes"
      shift
      ;;
    --no-localhost)
      LOCALHOST_MODE="no"
      shift
      ;;
    --password-file)
      PASSWORD_FILE="$2"
      shift 2
      ;;
    --password)
      PASSWORD_VALUE="$2"
      shift 2
      ;;
    --skip-upgrade)
      SKIP_UPGRADE=1
      shift
      ;;
    --skip-password)
      SKIP_PASSWORD=1
      shift
      ;;
    --timeout)
      COMMAND_TIMEOUT="$2"
      shift 2
      ;;
    --wsl-conf-path)
      WSL_CONF_PATH="$2"
      shift 2
      ;;
    --vnc-dir)
      VNC_DIR="$2"
      shift 2
      ;;
    --service-dir)
      SERVICE_DIR="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 1
      ;;
  esac
done

[[ "$COMMAND_TIMEOUT" =~ ^[0-9]+$ ]] || fail "Validate timeout" "timeout must be an integer"
(( COMMAND_TIMEOUT >= 1 && COMMAND_TIMEOUT <= 10 )) || fail "Validate timeout" "timeout must be between 1 and 10 seconds"
[[ "$DISPLAY_NUMBER" =~ ^[0-9]+$ ]] || fail "Validate display" "display must be a non-negative integer"
[[ -n "$TARGET_USER" ]] || fail "Resolve target user" "unable to determine target user; rerun with --user"

if [[ -z "$TARGET_HOME" ]]; then
  TARGET_HOME="$(getent passwd "$TARGET_USER" | cut -d: -f6)"
fi
[[ -n "$TARGET_HOME" ]] || fail "Resolve target home" "unable to determine home directory for ${TARGET_USER}"

TARGET_GROUP="$(id -gn "$TARGET_USER")"
VNC_DIR="${VNC_DIR:-${TARGET_HOME}/.vnc}"
SERVICE_DIR="${SERVICE_DIR:-${TARGET_HOME}/.config/systemd/user}"
TIMEOUT_BIN="$(command -v timeout || true)"
[[ -n "$TIMEOUT_BIN" ]] || fail "Resolve timeout command" "missing required command: timeout"

require_command python3 "Validate prerequisites"
require_command bash "Validate prerequisites"
require_command sudo "Validate prerequisites"

case "$ACTION" in
  all)
    install_packages
    configure_files
    start_vnc
    ;;
  install)
    install_packages
    ;;
  configure)
    configure_files
    ;;
  start)
    start_vnc
    ;;
  stop)
    stop_vnc
    ;;
  status)
    status_vnc
    ;;
  service-enable)
    service_enable
    ;;
  service-disable)
    service_disable
    ;;
esac
