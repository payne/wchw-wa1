import { parse } from "./deps.ts";
import { loadConfig, saveConfig, Config } from "./config.ts";
import { login, logout, ensureAuthenticated } from "./auth.ts";
import { listGroups } from "./firestore.ts";
import {
  addToQueue,
  getQueueStats,
  getPendingReports,
  clearSyncedReports,
  retryFailedReports,
  QueuedReport,
} from "./queue.ts";
import {
  checkConnectivity,
  trySyncSingleReport,
  syncAllPending,
} from "./sync.ts";

const VERSION = "2.2.0";

function printHelp(): void {
  console.log(`
lsr - Log Signal Report CLI v${VERSION}

USAGE:
  lsr <transmitter_call> <signal>   Log a signal report
  lsr log                            Interactive logging mode (fast entry)
  lsr login                          Sign in via web browser
  lsr logout                         Sign out
  lsr status                         Show current status
  lsr config                         Show/set configuration
  lsr groups                         List available groups
  lsr queue                          Show offline queue status
  lsr queue sync                     Sync pending reports to cloud
  lsr queue clear                    Remove synced reports from queue
  lsr queue retry                    Retry failed reports
  lsr help                           Show this help

EXAMPLES:
  lsr KX0U 59                        Log hearing KX0U with signal 59
  lsr KF0VWD 57 --time "2024-06-15T14:30:00Z"
  lsr log                            Start interactive logging mode
  lsr login                          Authenticate via web browser
  lsr config --group 1               Set current group to #1
  lsr config --simplex 146.52        Set simplex frequency
  lsr config --repeater W0JJK 145.235
  lsr status                         Show logged in user and settings
  lsr queue sync                     Force sync all pending reports

INTERACTIVE LOGGING MODE:
  lsr log
  > kf0uwe 412
  > kf0vwz 324
  > k0ux 599
  > end

OFFLINE SUPPORT:
  Reports are queued locally and sync when online.
  Use 'lsr queue' to check status, 'lsr queue sync' to force sync.

OPTIONS:
  --time, -t <ISO8601>    Override timestamp (default: now)
  --group, -g <number>    Set current group number
  --callsign, -c <call>   Set your call sign
  --simplex, -s <freq>    Set simplex frequency
  --repeater, -r <call> <freq>  Set repeater mode
  --help, -h              Show help
  --version, -v           Show version
`);
}

function printVersion(): void {
  console.log(`lsr version ${VERSION}`);
}

async function printStatus(): Promise<void> {
  const config = await loadConfig();

  console.log("LSR Status");
  console.log("==========");
  console.log("");

  if (config.email) {
    console.log(`Logged in as: ${config.email}`);
    console.log(`Call sign:    ${config.callSign || "(not set)"}`);
    console.log("");
    console.log("Current settings:");
    console.log(`  Group:      ${config.currentGroupNumber ? `#${config.currentGroupNumber}` : "(none)"}`);
    console.log(`  Mode:       ${config.useRepeater ? "Repeater" : "Simplex"}`);
    if (config.useRepeater) {
      console.log(`  Repeater:   ${config.repeaterCallSign || ""} ${config.repeaterFrequency || ""}`);
    } else {
      console.log(`  Frequency:  ${config.simplexFrequency || "146.52"}`);
    }

    // Show queue status
    const stats = await getQueueStats();
    if (stats.pending > 0 || stats.failed > 0) {
      console.log("");
      console.log("Queue:");
      if (stats.pending > 0) {
        console.log(`  Pending: ${stats.pending} report${stats.pending !== 1 ? "s" : ""}`);
      }
      if (stats.failed > 0) {
        console.log(`  Failed:  ${stats.failed} report${stats.failed !== 1 ? "s" : ""} (use 'lsr queue retry')`);
      }
    }
  } else {
    console.log("Not logged in");
    console.log("");
    console.log("Run: lsr login");
  }
}

async function handleConfig(args: ReturnType<typeof parse>): Promise<void> {
  const config = await loadConfig();

  // If no options, show current config
  if (!args.callsign && !args.c && !args.group && !args.g && !args.simplex && !args.s && !args.repeater && !args.r) {
    console.log("Current configuration:");
    console.log(`  Call sign:      ${config.callSign || "(not set)"}`);
    console.log(`  Current group:  ${config.currentGroupNumber ? `#${config.currentGroupNumber}` : "(none)"}`);
    console.log(`  Mode:           ${config.useRepeater ? "Repeater" : "Simplex"}`);
    if (config.useRepeater) {
      console.log(`  Repeater:       ${config.repeaterCallSign || ""} ${config.repeaterFrequency || ""}`);
    } else {
      console.log(`  Simplex freq:   ${config.simplexFrequency || "146.52"}`);
    }
    console.log("");
    console.log("Use --callsign, --group, --simplex, or --repeater to change settings");
    return;
  }

  // Update call sign
  const callSign = args.callsign || args.c;
  if (callSign) {
    config.callSign = String(callSign).toUpperCase().trim();
    console.log(`Call sign set to: ${config.callSign}`);
  }

  // Update group
  const group = args.group || args.g;
  if (group !== undefined) {
    const authConfig = await ensureAuthenticated();
    if (authConfig) {
      const groups = await listGroups(authConfig);
      const targetGroup = groups.find(g => g.groupNumber === Number(group));
      if (targetGroup) {
        config.currentGroupId = targetGroup.id;
        config.currentGroupNumber = targetGroup.groupNumber;
        console.log(`Group set to: #${targetGroup.groupNumber} - ${targetGroup.nickname}`);
      } else {
        console.error(`Group #${group} not found. Available groups:`);
        for (const g of groups) {
          console.log(`  #${g.groupNumber} - ${g.nickname}`);
        }
        return;
      }
    }
  }

  // Update simplex mode
  const simplex = args.simplex || args.s;
  if (simplex) {
    config.useRepeater = false;
    config.simplexFrequency = String(simplex);
    console.log(`Simplex mode set with frequency: ${config.simplexFrequency}`);
  }

  // Update repeater mode
  const repeater = args.repeater || args.r;
  if (repeater) {
    config.useRepeater = true;
    // Repeater should have call and frequency
    const repeaterArgs = args._.filter((a): a is string => typeof a === "string");
    if (typeof repeater === "string") {
      config.repeaterCallSign = repeater.toUpperCase();
      if (repeaterArgs.length > 0) {
        config.repeaterFrequency = repeaterArgs[0];
      }
    }
    console.log(`Repeater mode set: ${config.repeaterCallSign || ""} ${config.repeaterFrequency || ""}`);
  }

  await saveConfig(config);
}

async function handleGroups(): Promise<void> {
  const config = await ensureAuthenticated();
  if (!config) return;

  const groups = await listGroups(config);

  if (groups.length === 0) {
    console.log("No groups configured.");
    console.log("Create groups in the web app at https://n3pay-2b69c.web.app/configure");
    return;
  }

  console.log("Available groups:");
  for (const group of groups) {
    const current = group.id === config.currentGroupId ? " (current)" : "";
    console.log(`  #${group.groupNumber} - ${group.nickname}${current}`);
  }
  console.log("");
  console.log("Set current group with: lsr config --group <number>");
}

async function handleLogReport(transmitterCall: string, signalHeard: string, time?: string): Promise<void> {
  const config = await ensureAuthenticated();
  if (!config) return;

  if (!config.callSign || !config.uid) {
    console.error("Call sign not configured.");
    console.error("Set your call sign with: lsr config --callsign <CALL>");
    console.error("Or configure it in the web app.");
    return;
  }

  const reportTime = time ? new Date(time) : new Date();

  if (isNaN(reportTime.getTime())) {
    console.error(`Invalid time format: ${time}`);
    console.error("Use ISO 8601 format, e.g., 2024-06-15T14:30:00Z");
    return;
  }

  console.log(`Logging: ${config.callSign} heard ${transmitterCall.toUpperCase()} at ${signalHeard}`);

  // Queue-first: always add to local queue first
  const queuedReport = await addToQueue({
    transmitterCall: transmitterCall.toUpperCase().trim(),
    signalHeard: signalHeard.trim(),
    time: reportTime,
    receiverCall: config.callSign,
    receiverUid: config.uid,
    groupId: config.currentGroupId,
    groupNumber: config.currentGroupNumber,
    useRepeater: config.useRepeater || false,
    repeaterCallSign: config.repeaterCallSign,
    repeaterFrequency: config.repeaterFrequency,
    simplexFrequency: config.simplexFrequency || "146.52",
  });

  // Try to sync immediately
  const { synced, offline } = await trySyncSingleReport(config, queuedReport);

  if (synced) {
    console.log("Signal report logged successfully!");
    if (config.currentGroupNumber) {
      console.log(`  Group: #${config.currentGroupNumber}`);
    }
    console.log(`  Time: ${reportTime.toISOString()}`);
    console.log("  [synced to cloud]");
  } else if (offline) {
    console.log("Signal report queued.");
    console.log("  [offline - queued for later sync]");
  } else {
    console.log("Signal report queued.");
    console.log("  [sync failed - will retry later]");
  }
}

async function handleInteractiveLogging(): Promise<void> {
  const config = await ensureAuthenticated();
  if (!config) return;

  if (!config.callSign || !config.uid) {
    console.error("Call sign not configured.");
    console.error("Set your call sign with: lsr config --callsign <CALL>");
    return;
  }

  console.log("");
  console.log("Interactive Logging Mode");
  console.log("========================");
  console.log(`Receiver: ${config.callSign}`);
  if (config.currentGroupNumber) {
    console.log(`Group: #${config.currentGroupNumber}`);
  }
  console.log("");
  console.log("Enter: <callsign> <signal>  (e.g., KX0U 59)");
  console.log("Commands: quiet, no quiet, end");
  console.log("");

  let loggedCount = 0;
  let syncedCount = 0;
  let offlineCount = 0;
  let quietMode = false;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const sessionReports: QueuedReport[] = [];

  // Read from stdin line by line
  const buf = new Uint8Array(1024);
  let lineBuffer = "";

  while (true) {
    // Print prompt
    await Deno.stdout.write(encoder.encode("> "));

    // Read input
    const n = await Deno.stdin.read(buf);
    if (n === null) {
      // EOF (Ctrl+D)
      console.log("");
      break;
    }

    lineBuffer += decoder.decode(buf.subarray(0, n));

    // Process complete lines
    while (lineBuffer.includes("\n")) {
      const newlineIndex = lineBuffer.indexOf("\n");
      const line = lineBuffer.slice(0, newlineIndex).trim();
      lineBuffer = lineBuffer.slice(newlineIndex + 1);

      // Check for exit commands
      const lowerLine = line.toLowerCase();
      if (lowerLine === "end" || lowerLine === "quit" || lowerLine === "exit" || lowerLine === "q") {
        console.log("");

        // Try to sync any pending reports from this session
        if (sessionReports.length > 0) {
          const pending = await getPendingReports();
          const sessionPending = pending.filter(p =>
            sessionReports.some(s => s.id === p.id)
          );

          if (sessionPending.length > 0) {
            console.log(`Syncing ${sessionPending.length} pending report${sessionPending.length !== 1 ? "s" : ""}...`);
            const result = await syncAllPending(config, { verbose: false });
            syncedCount += result.synced;
            offlineCount = sessionPending.length - result.synced;
          }
        }

        console.log(`Session complete. Logged ${loggedCount} report${loggedCount !== 1 ? "s" : ""}.`);
        if (syncedCount > 0 || offlineCount > 0) {
          const parts: string[] = [];
          if (syncedCount > 0) parts.push(`${syncedCount} synced`);
          if (offlineCount > 0) parts.push(`${offlineCount} pending`);
          console.log(`  (${parts.join(", ")})`);
        }
        return;
      }

      // Check for quiet mode toggle
      if (lowerLine === "quiet") {
        quietMode = true;
        console.log("  Quiet mode ON");
        continue;
      }
      if (lowerLine === "no quiet" || lowerLine === "noquiet" || lowerLine === "verbose") {
        quietMode = false;
        console.log("  Quiet mode OFF");
        continue;
      }

      // Skip empty lines
      if (!line) {
        continue;
      }

      // Parse input: <callsign> <signal>
      const parts = line.split(/\s+/);
      if (parts.length < 2) {
        console.log("  Invalid format. Use: <callsign> <signal>");
        continue;
      }

      const transmitterCall = parts[0].toUpperCase();
      const signalHeard = parts[1];

      // Quick validation
      if (!/^[A-Z0-9]{3,10}$/.test(transmitterCall)) {
        console.log(`  Invalid callsign: ${transmitterCall}`);
        continue;
      }

      // Queue-first: add to local queue
      const queuedReport = await addToQueue({
        transmitterCall,
        signalHeard,
        time: new Date(),
        receiverCall: config.callSign,
        receiverUid: config.uid,
        groupId: config.currentGroupId,
        groupNumber: config.currentGroupNumber,
        useRepeater: config.useRepeater || false,
        repeaterCallSign: config.repeaterCallSign,
        repeaterFrequency: config.repeaterFrequency,
        simplexFrequency: config.simplexFrequency || "146.52",
      });

      sessionReports.push(queuedReport);
      loggedCount++;

      // Try immediate sync
      const { synced, offline } = await trySyncSingleReport(config, queuedReport);

      if (!quietMode) {
        if (synced) {
          syncedCount++;
          console.log(`  OK: ${transmitterCall} ${signalHeard}`);
        } else if (offline) {
          console.log(`  QUEUED: ${transmitterCall} ${signalHeard} (offline)`);
        } else {
          console.log(`  QUEUED: ${transmitterCall} ${signalHeard} (sync pending)`);
        }
      } else if (synced) {
        syncedCount++;
      }
    }
  }

  console.log(`Session complete. Logged ${loggedCount} report${loggedCount !== 1 ? "s" : ""}.`);
}

async function handleQueue(subcommand?: string): Promise<void> {
  const stats = await getQueueStats();

  // lsr queue (no subcommand) - show status
  if (!subcommand) {
    console.log("Queue Status");
    console.log("============");
    console.log("");
    console.log(`  Pending: ${stats.pending} report${stats.pending !== 1 ? "s" : ""}`);
    console.log(`  Synced:  ${stats.synced} report${stats.synced !== 1 ? "s" : ""}`);
    console.log(`  Failed:  ${stats.failed} report${stats.failed !== 1 ? "s" : ""}`);

    if (stats.lastSuccessfulSync) {
      console.log("");
      console.log(`Last sync: ${stats.lastSuccessfulSync}`);
    }

    if (stats.pending > 0) {
      console.log("");
      console.log("Run 'lsr queue sync' to sync pending reports.");
    }
    if (stats.failed > 0) {
      console.log("Run 'lsr queue retry' to retry failed reports.");
    }
    if (stats.synced > 0) {
      console.log("Run 'lsr queue clear' to remove synced reports.");
    }

    return;
  }

  // lsr queue sync
  if (subcommand === "sync") {
    const pending = await getPendingReports();

    if (pending.length === 0) {
      console.log("No pending reports to sync.");
      return;
    }

    // Check connectivity first
    const isOnline = await checkConnectivity();
    if (!isOnline) {
      console.log("Cannot sync: No network connectivity.");
      console.log(`${pending.length} report${pending.length !== 1 ? "s" : ""} remain pending.`);
      return;
    }

    const config = await ensureAuthenticated();
    if (!config) return;

    console.log(`Syncing ${pending.length} pending report${pending.length !== 1 ? "s" : ""}...`);

    const result = await syncAllPending(config, { verbose: true });

    console.log("");
    console.log(`Sync complete: ${result.synced} synced, ${result.failed} failed`);

    return;
  }

  // lsr queue clear
  if (subcommand === "clear") {
    if (stats.synced === 0) {
      console.log("No synced reports to clear.");
      return;
    }

    const cleared = await clearSyncedReports();
    console.log(`Cleared ${cleared} synced report${cleared !== 1 ? "s" : ""} from queue.`);

    return;
  }

  // lsr queue retry
  if (subcommand === "retry") {
    if (stats.failed === 0) {
      console.log("No failed reports to retry.");
      return;
    }

    const retried = await retryFailedReports();
    console.log(`Reset ${retried} failed report${retried !== 1 ? "s" : ""} to pending.`);

    // Check connectivity and sync
    const isOnline = await checkConnectivity();
    if (!isOnline) {
      console.log("Cannot sync now: No network connectivity.");
      console.log("Run 'lsr queue sync' when online.");
      return;
    }

    const config = await ensureAuthenticated();
    if (!config) return;

    console.log(`Syncing ${retried} report${retried !== 1 ? "s" : ""}...`);

    const result = await syncAllPending(config, { verbose: true });

    console.log("");
    console.log(`Sync complete: ${result.synced} synced, ${result.failed} failed`);

    return;
  }

  // Unknown subcommand
  console.error(`Unknown queue command: ${subcommand}`);
  console.error("Valid commands: lsr queue, lsr queue sync, lsr queue clear, lsr queue retry");
}

async function main(): Promise<void> {
  const args = parse(Deno.args, {
    boolean: ["help", "h", "version", "v"],
    string: ["time", "t", "callsign", "c", "simplex", "s", "repeater", "r"],
    alias: {
      help: "h",
      version: "v",
      time: "t",
      callsign: "c",
      group: "g",
      simplex: "s",
      repeater: "r",
    },
  });

  // Handle global flags
  if (args.help || args.h) {
    printHelp();
    return;
  }

  if (args.version || args.v) {
    printVersion();
    return;
  }

  const command = args._[0];

  // Handle commands
  switch (command) {
    case "login":
      await login();
      break;

    case "logout":
      await logout();
      break;

    case "status":
      await printStatus();
      break;

    case "config":
      await handleConfig(args);
      break;

    case "groups":
      await handleGroups();
      break;

    case "log":
    case "logging":
      await handleInteractiveLogging();
      break;

    case "queue":
      await handleQueue(args._[1] as string | undefined);
      break;

    case "help":
      printHelp();
      break;

    case undefined:
      printHelp();
      break;

    default:
      // Assume it's a signal report: lsr <callsign> <signal>
      if (args._.length >= 2) {
        const transmitterCall = String(args._[0]);
        const signalHeard = String(args._[1]);
        const time = args.time || args.t;
        await handleLogReport(transmitterCall, signalHeard, time);
      } else {
        console.error(`Unknown command: ${command}`);
        console.error("Run 'lsr help' for usage information.");
        Deno.exit(1);
      }
  }
}

// Run
if (import.meta.main) {
  main().catch((error) => {
    console.error("Error:", error.message);
    Deno.exit(1);
  });
}
