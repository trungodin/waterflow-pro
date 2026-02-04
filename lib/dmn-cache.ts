
// Simple Global Cache for DMN Data
// Simple Global Cache for DMN Data
const CACHE_DURATION_MS = 15 * 60 * 1000 // 15 Minutes

type CacheEntry = {
  data: any[]
  timestamp: number
}

// Global variable in memory
let globalCache: CacheEntry | null = null

export const getDmnCache = (): any[] | null => {
  if (!globalCache) return null
  
  const now = Date.now()
  if (now - globalCache.timestamp > CACHE_DURATION_MS) {
    globalCache = null
    return null
  }
  
  return globalCache.data
}

export const setDmnCache = (data: any[]) => {
  globalCache = {
    data,
    timestamp: Date.now()
  }
}
