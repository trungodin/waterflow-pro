
// Simple Global Cache for DMN Data (in-memory, 15 minutes)
const CACHE_DURATION_MS = 15 * 60 * 1000

type CacheEntry = {
  data: any[]
  timestamp: number
}

// Tầng 1: In-memory cache (15 phút, mất khi reload)
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

// Tầng 2: localStorage cache (không giới hạn thời gian, tồn tại qua ngày)
const LS_KEY = 'dmn_data_cache'

export const getDmnLocalCache = (): any[] | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const setDmnLocalCache = (data: any[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Could not save DMN cache to localStorage:', e)
  }
}
