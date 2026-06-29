import { Config, FIREBASE_CONFIG } from "./config.ts";

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  mapValue?: { fields: Record<string, FirestoreValue> };
  arrayValue?: { values: FirestoreValue[] };
  nullValue?: null;
}

interface FirestoreDocument {
  fields: Record<string, FirestoreValue>;
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }
  if (typeof value === "boolean") {
    return { booleanValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === "object") {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

export interface SignalReportInput {
  transmitterCall: string;
  signalHeard: string;
  time?: Date;
  receiverCall: string;
  receiverUid: string;
  groupId?: string;
  groupNumber?: number;
  radioMake?: string;
  radioModel?: string;
  antenna?: string;
  useRepeater: boolean;
  repeaterCallSign?: string;
  repeaterFrequency?: string;
  simplexFrequency?: string;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
}

export async function addSignalReport(
  config: Config,
  transmitterCall: string,
  signalHeard: string,
  time?: Date
): Promise<boolean> {
  if (!config.idToken || !config.uid || !config.callSign) {
    console.error("Not properly configured. Please run: lsr login");
    return false;
  }

  const report: SignalReportInput = {
    transmitterCall: transmitterCall.toUpperCase().trim(),
    signalHeard: signalHeard.trim(),
    time: time || new Date(),
    receiverCall: config.callSign,
    receiverUid: config.uid,
    useRepeater: config.useRepeater || false,
  };

  // Add optional fields
  if (config.currentGroupId) {
    report.groupId = config.currentGroupId;
    report.groupNumber = config.currentGroupNumber;
  }

  if (config.useRepeater) {
    if (config.repeaterCallSign) report.repeaterCallSign = config.repeaterCallSign;
    if (config.repeaterFrequency) report.repeaterFrequency = config.repeaterFrequency;
  } else {
    report.simplexFrequency = config.simplexFrequency || "146.52";
  }

  // Build Firestore document
  const fields: Record<string, FirestoreValue> = {
    transmitterCall: toFirestoreValue(report.transmitterCall),
    signalHeard: toFirestoreValue(report.signalHeard),
    time: toFirestoreValue(report.time),
    receiverCall: toFirestoreValue(report.receiverCall),
    receiverUid: toFirestoreValue(report.receiverUid),
    useRepeater: toFirestoreValue(report.useRepeater),
    createdAt: toFirestoreValue(new Date()),
  };

  if (report.groupId) {
    fields.groupId = toFirestoreValue(report.groupId);
  }
  if (report.groupNumber) {
    fields.groupNumber = toFirestoreValue(report.groupNumber);
  }
  if (report.repeaterCallSign) {
    fields.repeaterCallSign = toFirestoreValue(report.repeaterCallSign);
  }
  if (report.repeaterFrequency) {
    fields.repeaterFrequency = toFirestoreValue(report.repeaterFrequency);
  }
  if (report.simplexFrequency) {
    fields.simplexFrequency = toFirestoreValue(report.simplexFrequency);
  }

  try {
    const response = await fetch(`${FIRESTORE_BASE}/signalReports`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to add signal report:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to add signal report:", error);
    return false;
  }
}

export async function getUserProfile(config: Config): Promise<Record<string, unknown> | null> {
  if (!config.idToken || !config.uid) {
    return null;
  }

  try {
    const response = await fetch(`${FIRESTORE_BASE}/users/${config.uid}`, {
      headers: {
        Authorization: `Bearer ${config.idToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const doc: FirestoreDocument = await response.json();
    return parseFirestoreDocument(doc);
  } catch {
    return null;
  }
}

function parseFirestoreDocument(doc: FirestoreDocument): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(doc.fields || {})) {
    result[key] = parseFirestoreValue(value);
  }

  return result;
}

function parseFirestoreValue(value: FirestoreValue): unknown {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return new Date(value.timestampValue);
  if (value.nullValue !== undefined) return null;
  if (value.arrayValue?.values) {
    return value.arrayValue.values.map(parseFirestoreValue);
  }
  if (value.mapValue?.fields) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value.mapValue.fields)) {
      result[k] = parseFirestoreValue(v);
    }
    return result;
  }
  return null;
}

export async function updateUserProfile(
  config: Config,
  updates: Record<string, unknown>
): Promise<boolean> {
  if (!config.idToken || !config.uid) {
    return false;
  }

  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields[key] = toFirestoreValue(value);
    }
  }

  // Add updatedAt timestamp
  fields.updatedAt = toFirestoreValue(new Date());

  // Build update mask
  const updateMask = Object.keys(fields).join(",");

  try {
    const response = await fetch(
      `${FIRESTORE_BASE}/users/${config.uid}?updateMask.fieldPaths=${updateMask}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${config.idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

export async function listGroups(config: Config): Promise<Array<{ id: string; groupNumber: number; nickname: string }>> {
  const profile = await getUserProfile(config);
  if (!profile || !profile.groups) {
    return [];
  }

  const groups = profile.groups as Array<{ id: string; groupNumber: number; nickname: string }>;
  return groups;
}

// CLI Auth Session polling

export interface CliAuthSession {
  idToken: string;
  refreshToken: string;
  uid: string;
  email: string;
  displayName: string;
  claimed: boolean;
}

export async function pollForSession(code: string, timeoutSeconds: number): Promise<CliAuthSession | null> {
  const pollInterval = 2000; // 2 seconds
  const maxAttempts = Math.ceil((timeoutSeconds * 1000) / pollInterval);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const session = await getCliAuthSession(code);

    if (session && !session.claimed) {
      return session;
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  return null;
}

async function getCliAuthSession(code: string): Promise<CliAuthSession | null> {
  try {
    const response = await fetch(`${FIRESTORE_BASE}/cliAuthSessions/${code}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Session not found yet
      }
      return null;
    }

    const doc = await response.json();
    if (!doc.fields) {
      return null;
    }

    const fields = doc.fields;
    return {
      idToken: fields.idToken?.stringValue || "",
      refreshToken: fields.refreshToken?.stringValue || "",
      uid: fields.uid?.stringValue || "",
      email: fields.email?.stringValue || "",
      displayName: fields.displayName?.stringValue || "",
      claimed: fields.claimed?.booleanValue || false,
    };
  } catch {
    return null;
  }
}

export async function claimAndDeleteSession(code: string, idToken: string): Promise<boolean> {
  try {
    // First, mark as claimed
    const claimResponse = await fetch(`${FIRESTORE_BASE}/cliAuthSessions/${code}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          claimed: { booleanValue: true }
        }
      }),
    });

    if (!claimResponse.ok) {
      console.error("Failed to claim session");
      return false;
    }

    // Then delete the session
    const deleteResponse = await fetch(`${FIRESTORE_BASE}/cliAuthSessions/${code}`, {
      method: "DELETE",
    });

    return deleteResponse.ok;
  } catch (error) {
    console.error("Error claiming session:", error);
    return false;
  }
}
