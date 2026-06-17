import { Injectable } from '@angular/core';
import { Location } from '../models/signal-report.model';

interface HamDBResponse {
  hamdb: {
    version: string;
    callsign: {
      call: string;
      class: string;
      expires: string;
      status: string;
      grid: string;
      lat: string;
      lon: string;
      fname: string;
      mi: string;
      name: string;
      suffix: string;
      addr1: string;
      addr2: string;
      state: string;
      zip: string;
      country: string;
    } | 'NOT_FOUND';
    messages: {
      status: string;
    };
  };
}

export interface CallsignInfo {
  callSign: string;
  name: string;
  location: Location;
  grid: string;
  address: string;
  state: string;
  country: string;
  cachedAt: number; // Timestamp for cache expiry
}

const CACHE_KEY = 'wchw_callsign_cache';
const CACHE_EXPIRY_DAYS = 30; // Cache entries expire after 30 days

@Injectable({
  providedIn: 'root'
})
export class CallsignLookupService {
  private memoryCache = new Map<string, CallsignInfo | null>();
  private pendingRequests = new Map<string, Promise<CallsignInfo | null>>();

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as Record<string, CallsignInfo | null>;
        const now = Date.now();
        const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        // Load non-expired entries into memory cache
        for (const [key, value] of Object.entries(data)) {
          if (value && value.cachedAt && (now - value.cachedAt) < expiryMs) {
            this.memoryCache.set(key, value);
          } else if (value === null) {
            // Keep null entries (not found) but they should also expire
            // We'll just reload them if needed
          }
        }
      }
    } catch (error) {
      console.warn('Error loading callsign cache from localStorage:', error);
    }
  }

  private saveToLocalStorage(): void {
    try {
      const data: Record<string, CallsignInfo | null> = {};
      this.memoryCache.forEach((value, key) => {
        data[key] = value;
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Error saving callsign cache to localStorage:', error);
    }
  }

  async lookupCallsign(callSign: string): Promise<CallsignInfo | null> {
    const normalizedCall = callSign.toUpperCase().trim();

    // Check memory cache first
    if (this.memoryCache.has(normalizedCall)) {
      const cached = this.memoryCache.get(normalizedCall);
      // Check if cache entry is still valid
      if (cached && cached.cachedAt) {
        const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        if ((Date.now() - cached.cachedAt) < expiryMs) {
          return cached;
        }
      } else if (cached === null) {
        // null means "not found" - return it but maybe refresh after a while
        return null;
      }
    }

    // Check if there's already a pending request for this callsign
    if (this.pendingRequests.has(normalizedCall)) {
      return this.pendingRequests.get(normalizedCall)!;
    }

    // Make the API request
    const requestPromise = this.fetchCallsignInfo(normalizedCall);
    this.pendingRequests.set(normalizedCall, requestPromise);

    try {
      const result = await requestPromise;
      this.memoryCache.set(normalizedCall, result);
      this.saveToLocalStorage();
      return result;
    } finally {
      this.pendingRequests.delete(normalizedCall);
    }
  }

  private async fetchCallsignInfo(callSign: string): Promise<CallsignInfo | null> {
    try {
      // HamDB.org API - returns JSON with location data
      const response = await fetch(
        `https://api.hamdb.org/v1/${encodeURIComponent(callSign)}/json/wchw-signal-logger`
      );

      if (!response.ok) {
        console.warn(`HamDB lookup failed for ${callSign}: ${response.status}`);
        return null;
      }

      const data: HamDBResponse = await response.json();

      if (data.hamdb.callsign === 'NOT_FOUND' || data.hamdb.messages.status === 'NOT_FOUND') {
        return null;
      }

      const info = data.hamdb.callsign;
      if (typeof info === 'string') {
        return null;
      }

      const lat = parseFloat(info.lat);
      const lon = parseFloat(info.lon);

      if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) {
        return null;
      }

      return {
        callSign: info.call,
        name: `${info.fname} ${info.name}`.trim(),
        location: {
          latitude: lat,
          longitude: lon,
          address: [info.addr1, info.addr2, info.state, info.zip].filter(Boolean).join(', ')
        },
        grid: info.grid,
        address: [info.addr1, info.addr2].filter(Boolean).join(', '),
        state: info.state,
        country: info.country,
        cachedAt: Date.now()
      };
    } catch (error) {
      console.error(`Error looking up callsign ${callSign}:`, error);
      return null;
    }
  }

  async lookupMultiple(callSigns: string[]): Promise<Map<string, CallsignInfo | null>> {
    const results = new Map<string, CallsignInfo | null>();
    const uniqueCalls = [...new Set(callSigns.map(c => c.toUpperCase().trim()))];
    const callsToFetch: string[] = [];

    // Check cache first for all callsigns
    for (const call of uniqueCalls) {
      if (this.memoryCache.has(call)) {
        const cached = this.memoryCache.get(call);
        if (cached && cached.cachedAt) {
          const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
          if ((Date.now() - cached.cachedAt) < expiryMs) {
            results.set(call, cached);
            continue;
          }
        }
      }
      callsToFetch.push(call);
    }

    // Fetch uncached callsigns in batches
    const batchSize = 5;
    for (let i = 0; i < callsToFetch.length; i += batchSize) {
      const batch = callsToFetch.slice(i, i + batchSize);
      const promises = batch.map(call => this.lookupCallsign(call));
      const batchResults = await Promise.all(promises);

      batch.forEach((call, index) => {
        results.set(call, batchResults[index]);
      });

      // Small delay between batches to be nice to the API
      if (i + batchSize < callsToFetch.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  clearCache(): void {
    this.memoryCache.clear();
    localStorage.removeItem(CACHE_KEY);
  }

  getCacheStats(): { total: number; withLocation: number } {
    let total = 0;
    let withLocation = 0;
    this.memoryCache.forEach(value => {
      total++;
      if (value && value.location) {
        withLocation++;
      }
    });
    return { total, withLocation };
  }
}
