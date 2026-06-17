import { serve } from "./deps.ts";
import {
  Config,
  loadConfig,
  saveConfig,
  loadCredentials,
  isTokenExpired,
  FIREBASE_CONFIG,
  OAUTH_CONFIG,
} from "./config.ts";

const OAUTH_PORT = 8085;

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

interface FirebaseAuthResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email: string;
  displayName?: string;
}

export async function login(): Promise<boolean> {
  const credentials = await loadCredentials();
  if (!credentials) {
    console.error("OAuth credentials not configured.");
    console.error("");
    console.error("Please run: lsr setup");
    console.error("Or set environment variables:");
    console.error("  GOOGLE_CLIENT_ID");
    console.error("  GOOGLE_CLIENT_SECRET");
    console.error("  FIREBASE_API_KEY");
    return false;
  }

  const { clientId, clientSecret, apiKey } = credentials;

  // Generate OAuth URL
  const state = crypto.randomUUID();
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", OAUTH_CONFIG.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", OAUTH_CONFIG.scopes.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  console.log("Opening browser for Google sign-in...");
  console.log("");

  // Open browser
  const cmd = Deno.build.os === "darwin" ? "open" : Deno.build.os === "windows" ? "start" : "xdg-open";
  const process = new Deno.Command(cmd, { args: [authUrl.toString()] });
  process.spawn();

  // Start local server to receive callback
  const authCode = await waitForAuthCallback(state);

  if (!authCode) {
    console.error("Authentication failed: No auth code received");
    return false;
  }

  console.log("Received authorization code, exchanging for tokens...");

  // Exchange code for tokens
  const tokenResponse = await exchangeCodeForTokens(authCode, clientId, clientSecret);
  if (!tokenResponse) {
    console.error("Failed to exchange authorization code for tokens");
    return false;
  }

  // Sign in to Firebase with Google credential
  const firebaseAuth = await signInToFirebase(tokenResponse.id_token, apiKey);
  if (!firebaseAuth) {
    console.error("Failed to sign in to Firebase");
    return false;
  }

  // Save tokens to config
  const config = await loadConfig();
  config.accessToken = tokenResponse.access_token;
  config.refreshToken = tokenResponse.refresh_token || config.refreshToken;
  config.idToken = firebaseAuth.idToken;
  config.tokenExpiry = Date.now() + parseInt(firebaseAuth.expiresIn) * 1000;
  config.uid = firebaseAuth.localId;
  config.email = firebaseAuth.email;
  config.displayName = firebaseAuth.displayName;

  await saveConfig(config);

  console.log("");
  console.log(`Signed in as: ${firebaseAuth.email}`);
  console.log("");

  // Fetch user profile from Firestore
  await fetchAndSaveUserProfile(config, apiKey);

  return true;
}

async function waitForAuthCallback(expectedState: string): Promise<string | null> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, 120000); // 2 minute timeout

    const handler = async (request: Request): Promise<Response> => {
      const url = new URL(request.url);

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        clearTimeout(timeout);

        if (error) {
          setTimeout(() => {
            controller.abort();
            resolve(null);
          }, 100);
          return new Response(
            `<html><body><h1>Authentication Failed</h1><p>${error}</p><p>You can close this window.</p></body></html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        }

        if (state !== expectedState) {
          setTimeout(() => {
            controller.abort();
            resolve(null);
          }, 100);
          return new Response(
            `<html><body><h1>Authentication Failed</h1><p>Invalid state parameter</p><p>You can close this window.</p></body></html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        }

        setTimeout(() => {
          controller.abort();
          resolve(code);
        }, 100);

        return new Response(
          `<html><body><h1>Authentication Successful!</h1><p>You can close this window and return to the terminal.</p></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      return new Response("Not found", { status: 404 });
    };

    serve(handler, { port: OAUTH_PORT, signal: controller.signal }).catch(() => {
      // Server stopped
    });

    console.log(`Waiting for authentication callback on port ${OAUTH_PORT}...`);
  });
}

async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<TokenResponse | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Token exchange error:", error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Token exchange error:", error);
    return null;
  }
}

async function signInToFirebase(idToken: string, apiKey: string): Promise<FirebaseAuthResponse | null> {
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postBody: `id_token=${idToken}&providerId=google.com`,
          requestUri: "http://localhost",
          returnSecureToken: true,
          returnIdpCredential: true,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Firebase sign-in error:", error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Firebase sign-in error:", error);
    return null;
  }
}

export async function refreshTokens(): Promise<boolean> {
  const config = await loadConfig();
  const credentials = await loadCredentials();

  if (!config.refreshToken || !credentials) {
    return false;
  }

  try {
    // Refresh Google tokens
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: config.refreshToken,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      return false;
    }

    const tokenResponse: TokenResponse = await response.json();

    // Sign in to Firebase with refreshed token
    const firebaseAuth = await signInToFirebase(tokenResponse.id_token, credentials.apiKey);
    if (!firebaseAuth) {
      return false;
    }

    // Update config
    config.accessToken = tokenResponse.access_token;
    config.idToken = firebaseAuth.idToken;
    config.tokenExpiry = Date.now() + parseInt(firebaseAuth.expiresIn) * 1000;

    await saveConfig(config);
    return true;
  } catch {
    return false;
  }
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
  const config = await loadConfig();

  // Keep credentials but clear auth tokens and user info
  const newConfig: Config = {
    oauthClientId: config.oauthClientId,
    oauthClientSecret: config.oauthClientSecret,
    firebaseApiKey: config.firebaseApiKey,
  };

  await saveConfig(newConfig);
  console.log("Logged out successfully.");
}

async function fetchAndSaveUserProfile(config: Config, apiKey: string): Promise<void> {
  const credentials = await loadCredentials();
  if (!credentials || !config.uid || !config.idToken) return;

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/users/${config.uid}`;
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
              config.currentGroupNumber = group.mapValue?.fields?.groupNumber?.integerValue;
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
