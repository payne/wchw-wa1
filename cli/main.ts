import { parse } from "./deps.ts";
import { loadConfig, saveConfig, Config } from "./config.ts";
import { login, logout, ensureAuthenticated } from "./auth.ts";
import { addSignalReport, listGroups } from "./firestore.ts";

const VERSION = "2.1.0";

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

INTERACTIVE LOGGING MODE:
  lsr log
  > kf0uwe 412
  > kf0vwz 324
  > k0ux 599
  > end

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

  if (!config.callSign) {
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

  const success = await addSignalReport(config, transmitterCall, signalHeard, reportTime);

  if (success) {
    console.log("Signal report logged successfully!");
    if (config.currentGroupNumber) {
      console.log(`  Group: #${config.currentGroupNumber}`);
    }
    console.log(`  Time: ${reportTime.toISOString()}`);
  } else {
    console.error("Failed to log signal report.");
  }
}

async function handleInteractiveLogging(): Promise<void> {
  const config = await ensureAuthenticated();
  if (!config) return;

  if (!config.callSign) {
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
  let quietMode = false;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

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
        console.log(`Session complete. Logged ${loggedCount} report${loggedCount !== 1 ? "s" : ""}.`);
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

      // Submit the report
      const success = await addSignalReport(config, transmitterCall, signalHeard, new Date());

      if (success) {
        loggedCount++;
        if (!quietMode) {
          console.log(`  OK: ${transmitterCall} ${signalHeard}`);
        }
      } else {
        console.log(`  FAILED: ${transmitterCall} ${signalHeard}`);
      }
    }
  }

  console.log(`Session complete. Logged ${loggedCount} report${loggedCount !== 1 ? "s" : ""}.`);
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
