import { ensureDir, join } from "./deps.ts";

// Firebase configuration - same as web app
export const FIREBASE_CONFIG = {
  projectId: "n3pay-2b69c",
  authDomain: "n3pay-2b69c.firebaseapp.com",
};

// Web app URL for CLI auth
export const WEB_APP_URL = "https://n3pay-2b69c.web.app";

export interface Config {
  // Auth tokens (from Firebase via web app)
  idToken?: string;
  refreshToken?: string;
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
}

const CONFIG_DIR = join(Deno.env.get("HOME") || "~", ".wchw");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

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

export function isTokenExpired(config: Config): boolean {
  if (!config.tokenExpiry) return true;
  // Consider expired if less than 5 minutes remaining
  return Date.now() > config.tokenExpiry - 5 * 60 * 1000;
}
