import { ensureDir, join } from "./deps.ts";
import { getConfigDir } from "./config.ts";

export interface QueuedReport {
  id: string;                    // UUID for deduplication
  status: "pending" | "syncing" | "synced" | "failed";
  attempts: number;
  lastAttempt?: string;
  errorMessage?: string;
  createdAt: string;
  // Signal report data
  transmitterCall: string;
  signalHeard: string;
  time: string;
  receiverCall: string;
  receiverUid: string;
  groupId?: string;
  groupNumber?: number;
  useRepeater: boolean;
  repeaterCallSign?: string;
  repeaterFrequency?: string;
  simplexFrequency?: string;
}

export interface QueueState {
  version: 1;
  reports: QueuedReport[];
  lastSyncAttempt?: string;
  lastSuccessfulSync?: string;
}

const QUEUE_FILE_NAME = "queue.json";
const QUEUE_TMP_FILE_NAME = "queue.json.tmp";

async function getQueueFilePath(): Promise<string> {
  const configDir = await getConfigDir();
  return join(configDir, QUEUE_FILE_NAME);
}

async function getQueueTmpFilePath(): Promise<string> {
  const configDir = await getConfigDir();
  return join(configDir, QUEUE_TMP_FILE_NAME);
}

function createEmptyQueue(): QueueState {
  return {
    version: 1,
    reports: [],
  };
}

export async function loadQueue(): Promise<QueueState> {
  const queuePath = await getQueueFilePath();
  const tmpPath = await getQueueTmpFilePath();

  try {
    const data = await Deno.readTextFile(queuePath);
    return JSON.parse(data) as QueueState;
  } catch {
    // Try to recover from tmp file
    try {
      const tmpData = await Deno.readTextFile(tmpPath);
      const queue = JSON.parse(tmpData) as QueueState;
      // If tmp file is valid, save it as the main file
      await saveQueue(queue);
      return queue;
    } catch {
      // Both files missing or corrupted, return empty queue
      return createEmptyQueue();
    }
  }
}

export async function saveQueue(queue: QueueState): Promise<void> {
  const configDir = await getConfigDir();
  await ensureDir(configDir);

  const queuePath = await getQueueFilePath();
  const tmpPath = await getQueueTmpFilePath();

  // Atomic write: write to tmp, then rename
  await Deno.writeTextFile(tmpPath, JSON.stringify(queue, null, 2));
  await Deno.rename(tmpPath, queuePath);
}

function generateUUID(): string {
  return crypto.randomUUID();
}

export interface AddToQueueParams {
  transmitterCall: string;
  signalHeard: string;
  time: Date;
  receiverCall: string;
  receiverUid: string;
  groupId?: string;
  groupNumber?: number;
  useRepeater: boolean;
  repeaterCallSign?: string;
  repeaterFrequency?: string;
  simplexFrequency?: string;
}

export async function addToQueue(params: AddToQueueParams): Promise<QueuedReport> {
  const queue = await loadQueue();

  const report: QueuedReport = {
    id: generateUUID(),
    status: "pending",
    attempts: 0,
    createdAt: new Date().toISOString(),
    transmitterCall: params.transmitterCall,
    signalHeard: params.signalHeard,
    time: params.time.toISOString(),
    receiverCall: params.receiverCall,
    receiverUid: params.receiverUid,
    useRepeater: params.useRepeater,
  };

  // Add optional fields
  if (params.groupId) {
    report.groupId = params.groupId;
    report.groupNumber = params.groupNumber;
  }

  if (params.useRepeater) {
    if (params.repeaterCallSign) report.repeaterCallSign = params.repeaterCallSign;
    if (params.repeaterFrequency) report.repeaterFrequency = params.repeaterFrequency;
  } else {
    report.simplexFrequency = params.simplexFrequency || "146.52";
  }

  queue.reports.push(report);
  await saveQueue(queue);

  return report;
}

export async function updateReportStatus(
  reportId: string,
  status: QueuedReport["status"],
  errorMessage?: string
): Promise<void> {
  const queue = await loadQueue();

  const report = queue.reports.find(r => r.id === reportId);
  if (!report) return;

  report.status = status;
  report.lastAttempt = new Date().toISOString();

  if (status === "syncing" || status === "failed") {
    report.attempts++;
  }

  if (errorMessage) {
    report.errorMessage = errorMessage;
  }

  if (status === "synced") {
    queue.lastSuccessfulSync = new Date().toISOString();
  }

  queue.lastSyncAttempt = new Date().toISOString();

  await saveQueue(queue);
}

export async function getPendingReports(): Promise<QueuedReport[]> {
  const queue = await loadQueue();
  return queue.reports.filter(r => r.status === "pending");
}

export async function getFailedReports(): Promise<QueuedReport[]> {
  const queue = await loadQueue();
  return queue.reports.filter(r => r.status === "failed");
}

export interface QueueStats {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  total: number;
  lastSyncAttempt?: string;
  lastSuccessfulSync?: string;
}

export async function getQueueStats(): Promise<QueueStats> {
  const queue = await loadQueue();

  const stats: QueueStats = {
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    total: queue.reports.length,
    lastSyncAttempt: queue.lastSyncAttempt,
    lastSuccessfulSync: queue.lastSuccessfulSync,
  };

  for (const report of queue.reports) {
    stats[report.status]++;
  }

  return stats;
}

export async function clearSyncedReports(): Promise<number> {
  const queue = await loadQueue();
  const originalCount = queue.reports.length;

  queue.reports = queue.reports.filter(r => r.status !== "synced");

  await saveQueue(queue);

  return originalCount - queue.reports.length;
}

export async function retryFailedReports(): Promise<number> {
  const queue = await loadQueue();
  let count = 0;

  for (const report of queue.reports) {
    if (report.status === "failed") {
      report.status = "pending";
      report.attempts = 0;
      report.errorMessage = undefined;
      count++;
    }
  }

  await saveQueue(queue);

  return count;
}

export async function markReportSynced(reportId: string): Promise<void> {
  await updateReportStatus(reportId, "synced");
}

export async function markReportFailed(reportId: string, errorMessage: string): Promise<void> {
  await updateReportStatus(reportId, "failed", errorMessage);
}

export async function markReportSyncing(reportId: string): Promise<void> {
  await updateReportStatus(reportId, "syncing");
}
