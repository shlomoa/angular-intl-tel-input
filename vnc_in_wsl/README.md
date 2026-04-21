# VNC in WSL

`run-vnc.sh` implements the VNC-in-WSL flow from the referenced gist as a single sudo-friendly bash entrypoint.

## What it does

- enables `systemd=true` in `/etc/wsl.conf`
- installs a desktop package plus TigerVNC packages
- creates `~/.vnc/xstartup`
- creates `~/.config/systemd/user/vncserver@.service`
- can start, stop, inspect, enable, or disable the VNC server

Every step is verbose by default and prints:

- `Step "<name>": Starting`
- `Step "<name>": Created|Updated|Failed: <details>`

Every external command is wrapped with a timeout of up to 10 seconds to match the issue requirement. Timed-out commands are terminated. Use `--timeout` to lower the limit if needed.

## Usage

```bash
sudo ./vnc_in_wsl/run-vnc.sh all --password-file /path/to/vnc-password.txt
```

Useful actions:

```bash
sudo ./vnc_in_wsl/run-vnc.sh install
sudo ./vnc_in_wsl/run-vnc.sh configure --skip-password
sudo ./vnc_in_wsl/run-vnc.sh start --display 1
sudo ./vnc_in_wsl/run-vnc.sh stop --display 1
sudo ./vnc_in_wsl/run-vnc.sh status
sudo ./vnc_in_wsl/run-vnc.sh service-enable --display 1
```

For a no-change preview:

```bash
sudo ./vnc_in_wsl/run-vnc.sh all --dry-run
```
