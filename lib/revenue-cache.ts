// Simple Global Cache for Revenue Analysis Data
import {
  YearlyRevenue,
  MonthlyRevenue,
  DailyRevenue,
} from "@/app/actions/revenue";

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 Hour

type CacheEntry = {
  filters: {
    startYear: number;
    endYear: number;
    dateUntil: string;
  };
  state: {
    activeTab: "year" | "month" | "day";
    selectedYear: number | null;
    selectedKy: number | null;
    selectedYearForDaily: number | null;
  };
  data: {
    yearlyData: YearlyRevenue[];
    monthlyData: MonthlyRevenue[];
    dailyData: DailyRevenue[];
  };
  timestamp: number;
};

// Global variable in memory
let globalCache: CacheEntry | null = null;

export const getRevenueCache = (): CacheEntry | null => {
  if (!globalCache) return null;
  const now = Date.now();
  if (now - globalCache.timestamp > CACHE_DURATION_MS) {
    globalCache = null;
    return null;
  }
  return globalCache;
};

export const setRevenueCache = (cache: Omit<CacheEntry, "timestamp">) => {
  globalCache = {
    ...cache,
    timestamp: Date.now(),
  };
};
