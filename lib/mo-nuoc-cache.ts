// Simple Global Cache for Mo Nuoc Data
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 Minutes

type CacheEntry = {
  data: any[];
  date: string;
  timestamp: number;
};

// Global variable in memory
let globalCache: CacheEntry | null = null;

export const getMoNuocCache = (date: string): any[] | null => {
  if (!globalCache) return null;

  // Only return cache if it matches the selected date
  if (globalCache.date !== date) return null;

  const now = Date.now();
  if (now - globalCache.timestamp > CACHE_DURATION_MS) {
    globalCache = null;
    return null;
  }

  return globalCache.data;
};

export const setMoNuocCache = (date: string, data: any[]) => {
  globalCache = {
    data,
    date,
    timestamp: Date.now(),
  };
};

export const getLastMoNuocDate = (): string | null => {
  if (!globalCache) return null;
  const now = Date.now();
  if (now - globalCache.timestamp > CACHE_DURATION_MS) {
    globalCache = null;
    return null;
  }
  return globalCache.date;
};
