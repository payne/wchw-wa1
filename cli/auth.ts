import {
  Config,
  loadConfig,
  saveConfig,
  isTokenExpired,
  FIREBASE_CONFIG,
  WEB_APP_URL,
} from "./config.ts";
import { pollForSession, claimAndDeleteSession, getUserProfile } from "./firestore.ts";

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

function generateDeviceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Omit confusing chars: 0, O, I, 1
  let code = "";
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);

  for (let i = 0; i < 8; i++) {
    code += chars[array[i] % chars.length];
  }

  // Format as XXXX-XXXX
  return code.slice(0, 4) + "-" + code.slice(4);
}

function openBrowser(url: string): void {
  const cmd = Deno.build.os === "darwin"
    ? "open"
    : Deno.build.os === "windows"
    ? "start"
    : "xdg-open";

  try {
    const process = new Deno.Command(cmd, { args: [url] });
    process.spawn();
  } catch {
    // Silently fail if browser can't be opened
  }
}

export async function login(): Promise<boolean> {
  // Generate 8-char code (XXXX-XXXX format)
  const code = generateDeviceCode();
  const normalizedCode = code.replace("-", "");

  console.log("");
  console.log("To authenticate, open your browser to:");
  console.log(`  ${WEB_APP_URL}/cli-auth`);
  console.log("");
  console.log("Enter this code:", code);
  console.log("");
  console.log("Waiting for authentication...");
  console.log("(Press Ctrl+C to cancel)");
  console.log("");

  // Open browser automatically
  openBrowser(`${WEB_APP_URL}/cli-auth`);

  // Poll Firestore for session (5 minute timeout)
  const session = await pollForSession(normalizedCode, 300);

  if (!session) {
    console.error("Authentication timed out. Please try again.");
    return false;
  }

  // Save tokens to config
  const config = await loadConfig();
  config.idToken = session.idToken;
  config.refreshToken = session.refreshToken;
  config.uid = session.uid;
  config.email = session.email;
  config.displayName = session.displayName;
  config.tokenExpiry = Date.now() + 3600000; // 1 hour

  await saveConfig(config);

  // Mark session as claimed and delete it
  await claimAndDeleteSession(normalizedCode, session.idToken);

  console.log(`Authenticated as: ${session.email}`);
  console.log("");

  // Fetch user profile from Firestore
  await fetchAndSaveUserProfile(config);

  return true;
}

export async function refreshTokens(): Promise<boolean> {
  const config = await loadConfig();

  if (!config.refreshToken) {
    return false;
  }

  try {
    // Use Firebase's token refresh endpoint
    const response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${await getApiKey()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: config.refreshToken,
        }),
      }
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();

    // Update config with new tokens
    config.idToken = data.id_token;
    config.refreshToken = data.refresh_token;
    config.tokenExpiry = Date.now() + parseInt(data.expires_in) * 1000;

    await saveConfig(config);
    return true;
  } catch {
    return false;
  }
}

async function getApiKey(): Promise<string> {
  // Fetch the API key from the web app's config
  // For now, we'll use a public approach - the Firebase config is public
  // This key is safe to expose as it's restricted by Firebase rules
  try {
    const response = await fetch(`${WEB_APP_URL}/__/firebase/init.json`);
    if (response.ok) {
      const config = await response.json();
      return config.apiKey || "";
    }
  } catch {
    // Fall back to default
  }
  return "";
}

export async function ensureAuthenticated(): Promise<Config | null> {
  const config = await loadConfig();

  if (!config.idToken || !config.uid) {
    console.error("Not logged in. Please run: lsr login");
    return null;
  }

  if (isTokenExpired(config)) {
    console.log("Token expired, refreshing...");
    const refreshed = await refreshTokens();
    if (!refreshed) {
      console.error("Failed to refresh token. Please run: lsr login");
      return null;
    }
    return await loadConfig();
  }

  return config;
}

export async function logout(): Promise<void> {
  // Clear all auth data but keep user preferences
  const config = await loadConfig();

  const newConfig: Config = {
    // Keep settings
    currentGroupId: config.currentGroupId,
    currentGroupNumber: config.currentGroupNumber,
    useRepeater: config.useRepeater,
    simplexFrequency: config.simplexFrequency,
    repeaterCallSign: config.repeaterCallSign,
    repeaterFrequency: config.repeaterFrequency,
  };

  await saveConfig(newConfig);
  console.log("Logged out successfully.");
}

async function fetchAndSaveUserProfile(config: Config): Promise<void> {
  if (!config.uid || !config.idToken) return;

  try {
    const url = `${FIRESTORE_BASE}/users/${config.uid}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.idToken}`,
      },
    });

    if (response.ok) {
      const doc = await response.json();
      if (doc.fields) {
        config.callSign = doc.fields.callSign?.stringValue;
        config.currentGroupId = doc.fields.currentGroupId?.stringValue;
        config.currentRadioId = doc.fields.currentRadioId?.stringValue;
        config.currentLocationId = doc.fields.currentLocationId?.stringValue;
        config.useRepeater = doc.fields.useRepeater?.booleanValue || false;
        config.simplexFrequency = doc.fields.simplexFrequency?.stringValue || "146.52";
        config.repeaterCallSign = doc.fields.repeaterInfo?.mapValue?.fields?.callSign?.stringValue;
        config.repeaterFrequency = doc.fields.repeaterInfo?.mapValue?.fields?.frequency?.stringValue;

        // Get group number if we have a group ID
        if (config.currentGroupId && doc.fields.groups?.arrayValue?.values) {
          const groups = doc.fields.groups.arrayValue.values;
          for (const group of groups) {
            if (group.mapValue?.fields?.id?.stringValue === config.currentGroupId) {
              config.currentGroupNumber = parseInt(group.mapValue?.fields?.groupNumber?.integerValue || "0");
              break;
            }
          }
        }

        await saveConfig(config);

        if (config.callSign) {
          console.log(`Call sign: ${config.callSign}`);
        } else {
          console.log("Note: No call sign configured. Set one using: lsr config --callsign <CALL>");
        }
      }
    }
  } catch (error) {
    console.error("Note: Could not fetch user profile:", error);
  }
}
