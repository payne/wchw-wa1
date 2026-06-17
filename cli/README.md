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

## Setup

### 1. Configure OAuth Credentials

You need to create OAuth 2.0 credentials in Google Cloud Console:

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Select your Firebase project (wchw1-f9f49)
3. Click "Create Credentials" → "OAuth client ID"
4. Select "Desktop app" as the application type
5. Note the Client ID and Client Secret

Also get your Firebase Web API Key from the [Firebase Console](https://console.firebase.google.com/).

Then run:

```bash
lsr setup
# Enter your Client ID, Client Secret, and Firebase API Key when prompted
```

Or set environment variables:

```bash
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export FIREBASE_API_KEY="your-firebase-api-key"
```

### 2. Login

```bash
lsr login
```

This will open your browser for Google sign-in. After authenticating, you'll be logged in and your call sign will be loaded from your profile.

### 3. Configure Your Settings

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
| `lsr login` | Sign in with Google |
| `lsr logout` | Sign out |
| `lsr status` | Show current status and settings |
| `lsr config` | Show/set configuration |
| `lsr setup` | Configure OAuth credentials |
| `lsr groups` | List available groups |
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

Configuration is stored in `~/.wchw/`:

- `config.json` - User settings and cached tokens
- `credentials.json` - OAuth credentials (chmod 600)

## Examples

```bash
# Quick logging session
lsr login
lsr config --group 1
lsr KX0U 59
lsr KF0VWD 57
lsr KF0SLC 55
lsr KF0UWE 59
lsr KD0NMD 53

# Check your status
lsr status

# Switch to a different group
lsr config --group 2
lsr KX0U 58

# Logout when done
lsr logout
```

## Troubleshooting

### "OAuth credentials not configured"

Run `lsr setup` and enter your credentials, or set the environment variables.

### "Not logged in"

Run `lsr login` to authenticate with Google.

### "Call sign not configured"

Either:
1. Set it in the web app at https://wchw1-f9f49.web.app/configure
2. Or run `lsr config --callsign YOUR_CALL`

### "Token expired"

The CLI will automatically refresh tokens. If it fails, run `lsr login` again.

### "Group not found"

Groups must be created in the web app. Run `lsr groups` to see available groups.

## Security

- Refresh tokens are stored in `~/.wchw/config.json`
- OAuth credentials are stored in `~/.wchw/credentials.json` with 600 permissions
- All communication uses HTTPS
- Tokens are automatically refreshed when expired
