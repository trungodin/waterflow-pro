import { useState, useEffect } from 'react'

// Simple in-memory cache store
const cacheStore: Record<string, { data: any, timestamp: number }> = {}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useCachedData<T>(key: string, fetcher: () => Promise<T>, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(() => {
    // Initial state from cache if available and valid
    const cached = cacheStore[key]
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      return cached.data
    }
    return null
  })
  
  const [loading, setLoading] = useState(!data)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    // If we have fresh data from initial state, typically we might still want to revalidate 
    // or just rely on cache. Let's rely on cache to save reads if valid.
    const cached = cacheStore[key]
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        if (data !== cached.data) setData(cached.data)
        setLoading(false)
        return
    }

    let isMounted = true
    setLoading(true)
    
    fetcher().then(result => {
      if (isMounted) {
        cacheStore[key] = { data: result, timestamp: Date.now() }
        setData(result)
        setLoading(false)
      }
    }).catch(err => {
      if (isMounted) {
        setError(err)
        setLoading(false)
      }
    })

    return () => { isMounted = false }
  }, [key, ...dependencies])

  const refresh = () => {
    setLoading(true)
    fetcher().then(result => {
        cacheStore[key] = { data: result, timestamp: Date.now() }
        setData(result)
        setLoading(false)
    }).catch(err => {
      setError(err)
      setLoading(false)
    })
  }

  return { data, loading, error, refresh }
}
