import { Config, FIREBASE_CONFIG } from "./config.ts";
import { syncQueuedReport } from "./firestore.ts";
import {
  QueuedReport,
  getPendingReports,
  markReportSynced,
  markReportFailed,
  markReportSyncing,
  loadQueue,
  saveQueue,
} from "./queue.ts";

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;
const CONNECTIVITY_TIMEOUT = 5000; // 5 seconds
const MAX_ATTEMPTS = 5;
const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes

export async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECTIVITY_TIMEOUT);

    const response = await fetch(`${FIRESTORE_BASE}`, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 200 or 401 (unauthorized but reachable) both indicate connectivity
    return response.status === 200 || response.status === 401 || response.status === 403;
  } catch {
    return false;
  }
}

export function calculateBackoff(attempts: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s... capped at 5 minutes
  const backoffMs = Math.min(1000 * Math.pow(2, attempts), MAX_BACKOFF_MS);
  return backoffMs;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  isDuplicate?: boolean;
}

export async function syncReport(config: Config, report: QueuedReport): Promise<SyncResult> {
  if (!config.idToken) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if we've exceeded max attempts
  if (report.attempts >= MAX_ATTEMPTS) {
    return { success: false, error: `Max attempts (${MAX_ATTEMPTS}) exceeded` };
  }

  await markReportSyncing(report.id);

  try {
    const result = await syncQueuedReport(config, {
      clientId: report.id,
      transmitterCall: report.transmitterCall,
      signalHeard: report.signalHeard,
      time: new Date(report.time),
      receiverCall: report.receiverCall,
      receiverUid: report.receiverUid,
      groupId: report.groupId,
      groupNumber: report.groupNumber,
      useRepeater: report.useRepeater,
      repeaterCallSign: report.repeaterCallSign,
      repeaterFrequency: report.repeaterFrequency,
      simplexFrequency: report.simplexFrequency,
    });

    if (result.success) {
      await markReportSynced(report.id);
      return { success: true, isDuplicate: result.isDuplicate };
    } else {
      // Check if we should mark as failed or keep pending
      const queue = await loadQueue();
      const updatedReport = queue.reports.find(r => r.id === report.id);
      if (updatedReport && updatedReport.attempts >= MAX_ATTEMPTS) {
        await markReportFailed(report.id, result.error || "Unknown error");
      } else {
        // Reset to pending for retry
        if (updatedReport) {
          updatedReport.status = "pending";
          updatedReport.errorMessage = result.error;
          await saveQueue(queue);
        }
      }
      return { success: false, error: result.error };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check attempts and mark as failed or pending
    const queue = await loadQueue();
    const updatedReport = queue.reports.find(r => r.id === report.id);
    if (updatedReport && updatedReport.attempts >= MAX_ATTEMPTS) {
      await markReportFailed(report.id, errorMessage);
    } else if (updatedReport) {
      updatedReport.status = "pending";
      updatedReport.errorMessage = errorMessage;
      await saveQueue(queue);
    }

    return { success: false, error: errorMessage };
  }
}

export interface BatchSyncResult {
  synced: number;
  failed: number;
  skipped: number;
  results: Array<{ report: QueuedReport; result: SyncResult }>;
}

export async function syncAllPending(
  config: Config,
  options: { verbose?: boolean; batchSize?: number } = {}
): Promise<BatchSyncResult> {
  const { verbose = true, batchSize = 20 } = options;

  const pending = await getPendingReports();

  if (pending.length === 0) {
    return { synced: 0, failed: 0, skipped: 0, results: [] };
  }

  // Warn about large queue
  if (pending.length > 100 && verbose) {
    console.log(`Warning: Large queue (${pending.length} reports). This may take a while.`);
  }

  const results: BatchSyncResult = {
    synced: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };

  // Process in batches
  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);

    for (const report of batch) {
      const result = await syncReport(config, report);

      results.results.push({ report, result });

      if (result.success) {
        results.synced++;
        if (verbose) {
          const dupIndicator = result.isDuplicate ? " (duplicate)" : "";
          console.log(`  ${report.transmitterCall} ${report.signalHeard}       [synced${dupIndicator}]`);
        }
      } else {
        results.failed++;
        if (verbose) {
          console.log(`  ${report.transmitterCall} ${report.signalHeard}       [failed: ${result.error}]`);
        }
      }
    }

    // Small delay between batches to avoid overwhelming the server
    if (i + batchSize < pending.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

export async function trySyncSingleReport(
  config: Config,
  report: QueuedReport
): Promise<{ synced: boolean; offline: boolean }> {
  // Quick connectivity check
  const isOnline = await checkConnectivity();

  if (!isOnline) {
    return { synced: false, offline: true };
  }

  const result = await syncReport(config, report);

  return { synced: result.success, offline: false };
}
