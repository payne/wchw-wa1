# Offline Queue System

The LSR CLI includes an offline queue system that allows you to continue logging signal reports without internet connectivity. Reports are stored locally and automatically synchronized when connectivity is restored.

## How It Works

1. **Queue-First Architecture**: Every signal report goes to a local queue first
2. **Immediate Sync Attempt**: After queuing, the CLI checks connectivity and attempts to sync
3. **Graceful Offline Handling**: If offline, reports remain queued for later sync
4. **Manual Sync Control**: Use `lsr queue sync` to manually trigger synchronization

## Queue Storage

Reports are stored in `~/.wchw/queue.json` with the following structure:

```json
{
  "version": 1,
  "reports": [
    {
      "id": "uuid-string",
      "status": "pending",
      "attempts": 0,
      "createdAt": "2024-06-15T14:30:00Z",
      "transmitterCall": "KX0U",
      "signalHeard": "59",
      "time": "2024-06-15T14:30:00Z",
      "receiverCall": "N3PAY",
      "receiverUid": "...",
      "useRepeater": false,
      "simplexFrequency": "146.52"
    }
  ],
  "lastSyncAttempt": "2024-06-15T14:35:00Z",
  "lastSuccessfulSync": "2024-06-15T14:35:00Z"
}
```

### Report Status

- `pending` - Waiting to be synced
- `syncing` - Currently being uploaded (transient)
- `synced` - Successfully uploaded to Firebase
- `failed` - Upload failed after multiple attempts

## Commands

### View Queue Status

```bash
lsr queue
```

Shows:
- Number of pending reports
- Number of failed reports
- Last sync time

### Force Sync

```bash
lsr queue sync
```

Attempts to sync all pending reports immediately. Shows progress and results for each report.

### Clear Synced Reports

```bash
lsr queue clear
```

Removes successfully synced reports from the local queue file to save space.

### Retry Failed Reports

```bash
lsr queue retry
```

Resets failed reports to pending status and attempts to sync them again.

## User Experience

### Logging Online

```
$ lsr KX0U 59
Logging: N3PAY heard KX0U at 59
Signal report logged successfully!
  [synced to cloud]
```

### Logging Offline

```
$ lsr KX0U 59
Logging: N3PAY heard KX0U at 59
Signal report queued.
  [offline - queued for later sync]
```

### Status Shows Queue

```
$ lsr status
LSR Status
==========
Logged in as: user@example.com
Call sign:    N3PAY
...

Queue:
  Pending: 3 reports
  Failed:  1 report (use 'lsr queue retry')
```

## Sync Behavior

### Automatic Sync

- **On each log**: Attempts immediate sync after queuing
- **On interactive session end**: Batch syncs all new reports from the session

### Retry Strategy

- Maximum 5 attempts per report
- Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 5 minutes)
- Reports marked as `failed` after max attempts

### Connectivity Check

The CLI performs a quick HEAD request to Firestore with a 5-second timeout to determine connectivity status.

## Edge Cases

### Duplicate Prevention

Each report includes a unique `clientId` (UUID). Firebase uses this for deduplication, preventing the same report from being logged multiple times if sync retries occur.

### Token Expiry

If your authentication token expires while offline:
1. Reports remain safely queued
2. On next `lsr login`, tokens are refreshed
3. Run `lsr queue sync` to upload pending reports

### File Corruption Recovery

The queue file uses atomic writes (write to `.tmp`, then rename) to prevent corruption. If the main file is corrupted, the CLI will attempt to recover from the `.tmp` file.

### Large Queue Warning

If the queue grows beyond 100 reports, the CLI will warn you and recommend running `lsr queue sync` when connectivity is restored.

## Design Philosophy

The CLI remains stateless - no background daemon runs. Users control when syncing happens:

1. Automatic sync on each log (when online)
2. Manual `lsr queue sync` when needed
3. Batch sync at end of interactive sessions

This design ensures the CLI is lightweight, portable, and works reliably across all platforms without requiring persistent background processes.
