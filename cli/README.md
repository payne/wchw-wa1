# LSR - Log Signal Report CLI

A command-line tool for logging amateur radio signal reports to the WCHW Signal Logger.

## Installation

### Option 1: Compile to Standalone Executable

Requires [Deno](https://deno.land/) to be installed.

```bash
# Compile for your current platform
cd cli
deno task compile

# The executable will be created as 'lsr' (or 'lsr.exe' on Windows)
# Move it to your PATH
mv lsr /usr/local/bin/
```

### Option 2: Run with Deno

```bash
# Run directly with Deno
deno task run help

# Or create an alias
alias lsr="deno run --allow-net --allow-read --allow-write --allow-env --allow-run /path/to/cli/main.ts"
```

### Cross-Platform Compilation

```bash
# Compile for all platforms
deno task compile:all

# Or compile for specific platforms:
deno task compile:linux      # Linux x86_64
deno task compile:windows    # Windows x86_64
deno task compile:mac-intel  # macOS Intel
deno task compile:mac-arm    # macOS Apple Silicon
```

## Quick Start

### 1. Login

```bash
lsr login
```

This will:
1. Display a device code (e.g., `ABCD-1234`)
2. Open your browser to the web app's CLI authentication page
3. Wait for you to enter the code in the web app
4. Automatically retrieve your credentials once authenticated

### 2. Configure Your Settings

```bash
# Set your call sign (if not already set in web app)
lsr config --callsign N3PAY

# Set current group
lsr config --group 1

# Set simplex frequency
lsr config --simplex 146.52

# Or set repeater mode
lsr config --repeater W0JJK 145.235
```

## Usage

### Log a Signal Report

```bash
# Basic usage: lsr <transmitter_call> <signal>
lsr KX0U 59
lsr KF0VWD 57
lsr KF0SLC 55

# With custom time (ISO 8601 format)
lsr KF0UWE 59 --time "2024-06-15T14:30:00Z"
```

### Interactive Logging Mode (Fast Entry)

For rapid logging of multiple contacts, use interactive mode:

```bash
lsr log
```

This starts a session where you can quickly enter reports:

```
Interactive Logging Mode
========================
Receiver: N3PAY
Group: #1

Enter: <callsign> <signal>  (e.g., KX0U 59)
Type 'end' or press Ctrl+D to finish

> kf0uwe 412
  OK: KF0UWE 412
> kf0vwz 324
  OK: KF0VWZ 324
> k0ux 599
  OK: K0UX 599
> end

Session complete. Logged 3 reports.
```

**Commands in interactive mode:**
- `quiet` - Suppress OK messages (only show errors)
- `no quiet` or `verbose` - Show OK messages again
- `end`, `quit`, `exit`, `q`, or Ctrl+D - Exit session

### Check Status

```bash
lsr status
```

### List Groups

```bash
lsr groups
```

### View Help

```bash
lsr help
```

## Commands

| Command | Description |
|---------|-------------|
| `lsr <call> <signal>` | Log a signal report |
| `lsr log` | Interactive logging mode (fast entry) |
| `lsr login` | Sign in via web browser |
| `lsr logout` | Sign out |
| `lsr status` | Show current status and settings |
| `lsr config` | Show/set configuration |
| `lsr groups` | List available groups |
| `lsr queue` | Show offline queue status |
| `lsr queue sync` | Sync pending reports to cloud |
| `lsr queue clear` | Remove synced reports from queue |
| `lsr queue retry` | Retry failed reports |
| `lsr help` | Show help |

## Options

| Option | Description |
|--------|-------------|
| `--time, -t <ISO8601>` | Override timestamp |
| `--callsign, -c <call>` | Set your call sign |
| `--group, -g <number>` | Set current group number |
| `--simplex, -s <freq>` | Set simplex frequency |
| `--repeater, -r <call> <freq>` | Set repeater mode |
| `--help, -h` | Show help |
| `--version, -v` | Show version |

## Configuration Files

Configuration is stored in `~/.wchw/config.json` and includes:
- Authentication tokens
- User settings (call sign, group, frequency mode)

## Examples

```bash
# Quick logging session (individual commands)
lsr login
lsr config --group 1
lsr KX0U 59
lsr KF0VWD 57

# Fast logging session (interactive mode)
lsr login
lsr config --group 1
lsr log
# Then type:
#   kx0u 59
#   kf0vwd 57
#   kf0slc 55
#   kf0uwe 59
#   kd0nmd 53
#   end

# Check your status
lsr status

# Switch to a different group
lsr config --group 2
lsr log

# Logout when done
lsr logout
```

## Troubleshooting

### "Not logged in"

Run `lsr login` to authenticate via your web browser.

### "Authentication timed out"

The authentication code expires after 5 minutes. Run `lsr login` again to get a new code.

### "Call sign not configured"

Either:
1. Set it in the web app at https://n3pay-2b69c.web.app/configure
2. Or run `lsr config --callsign YOUR_CALL`

### "Token expired"

The CLI will automatically refresh tokens. If it fails, run `lsr login` again.

### "Group not found"

Groups must be created in the web app. Run `lsr groups` to see available groups.

## Offline Support

The CLI works offline! Reports are queued locally and synced when connectivity is restored.

### How it works

1. Every signal report is saved to a local queue (`~/.wchw/queue.json`) first
2. The CLI immediately attempts to sync to the cloud
3. If offline, reports stay queued for later sync
4. Run `lsr queue sync` when you're back online

### Example

```bash
# While offline
$ lsr KX0U 59
Logging: N3PAY heard KX0U at 59
Signal report queued.
  [offline - queued for later sync]

# Check queue status
$ lsr queue
Queue Status
============
  Pending: 3 reports
  Synced:  0 reports
  Failed:  0 reports

Run 'lsr queue sync' to sync pending reports.

# When back online
$ lsr queue sync
Syncing 3 pending reports...
  KX0U 59       [synced]
  KF0VWD 57     [synced]
  K0UM 55       [synced]

Sync complete: 3 synced, 0 failed
```

For more details, see [OFFLINE.md](./OFFLINE.md).

## Security

- Authentication tokens are stored in `~/.wchw/config.json`
- The device code flow ensures credentials never pass through untrusted channels
- Tokens are automatically refreshed when expired
- All communication uses HTTPS
- Offline queue is stored in `~/.wchw/queue.json`
