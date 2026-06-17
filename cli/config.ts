import { ensureDir, join } from "./deps.ts";

// Firebase configuration - same as web app
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Replace with your Firebase API key
  authDomain: "wchw1-f9f49.firebaseapp.com",
  projectId: "wchw1-f9f49",
  storageBucket: "wchw1-f9f49.firebasestorage.app",
  messagingSenderId: "844585210137",
  appId: "1:844585210137:web:xxxxxxxxxxxxxxxx", // Replace with your Firebase app ID
};

// Google OAuth configuration
// You need to create OAuth 2.0 credentials in Google Cloud Console
// for a "Desktop app" type application
export const OAUTH_CONFIG = {
  clientId: "", // Set via environment or config file
  clientSecret: "", // Set via environment or config file
  redirectUri: "http://localhost:8085/callback",
  scopes: [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],
};

export interface Config {
  // Auth tokens
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  tokenExpiry?: number;

  // User info
  uid?: string;
  email?: string;
  displayName?: string;
  callSign?: string;

  // Defaults
  currentGroupId?: string;
  currentGroupNumber?: number;
  currentRadioId?: string;
  currentLocationId?: string;
  useRepeater?: boolean;
  simplexFrequency?: string;
  repeaterCallSign?: string;
  repeaterFrequency?: string;

  // OAuth credentials (can be set by user)
  oauthClientId?: string;
  oauthClientSecret?: string;
  firebaseApiKey?: string;
}

const CONFIG_DIR = join(Deno.env.get("HOME") || "~", ".wchw");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials.json");

export async function getConfigDir(): Promise<string> {
  await ensureDir(CONFIG_DIR);
  return CONFIG_DIR;
}

export async function loadConfig(): Promise<Config> {
  try {
    await ensureDir(CONFIG_DIR);
    const data = await Deno.readTextFile(CONFIG_FILE);
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureDir(CONFIG_DIR);
  await Deno.writeTextFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function clearConfig(): Promise<void> {
  try {
    await Deno.remove(CONFIG_FILE);
  } catch {
    // File doesn't exist, that's fine
  }
}

export async function loadCredentials(): Promise<{ clientId: string; clientSecret: string; apiKey: string } | null> {
  // First check environment variables
  const envClientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const envClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const envApiKey = Deno.env.get("FIREBASE_API_KEY");

  if (envClientId && envClientSecret && envApiKey) {
    return { clientId: envClientId, clientSecret: envClientSecret, apiKey: envApiKey };
  }

  // Then check config
  const config = await loadConfig();
  if (config.oauthClientId && config.oauthClientSecret && config.firebaseApiKey) {
    return {
      clientId: config.oauthClientId,
      clientSecret: config.oauthClientSecret,
      apiKey: config.firebaseApiKey,
    };
  }

  // Then check credentials file
  try {
    const data = await Deno.readTextFile(CREDENTIALS_FILE);
    const creds = JSON.parse(data);
    if (creds.clientId && creds.clientSecret && creds.apiKey) {
      return creds;
    }
  } catch {
    // File doesn't exist
  }

  return null;
}

export async function saveCredentials(clientId: string, clientSecret: string, apiKey: string): Promise<void> {
  await ensureDir(CONFIG_DIR);
  await Deno.writeTextFile(
    CREDENTIALS_FILE,
    JSON.stringify({ clientId, clientSecret, apiKey }, null, 2)
  );
  // Set restrictive permissions
  await Deno.chmod(CREDENTIALS_FILE, 0o600);
}

export function isTokenExpired(config: Config): boolean {
  if (!config.tokenExpiry) return true;
  // Consider expired if less than 5 minutes remaining
  return Date.now() > config.tokenExpiry - 5 * 60 * 1000;
}
