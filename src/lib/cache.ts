/**
 * Cache utility for API responses with browser-level caching
 */

/**
 * Add cache headers to NextResponse for static/semi-static data
 * @param response NextResponse object
 * @param maxAge Cache duration in seconds (default: 30 seconds)
 * @param staleWhileRevalidate Allow stale content while revalidating (default: 60 seconds)
 */
export function addCacheHeaders(
  response: Response,
  maxAge: number = 30,
  staleWhileRevalidate: number = 60
): Response {
  // Set Cache-Control headers for browser caching
  response.headers.set(
    'Cache-Control',
    `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  )
  
  // Add ETag for conditional requests
  const etag = `"${Date.now().toString(36)}"`
  response.headers.set('ETag', etag)
  
  return response
}

/**
 * Add no-cache headers for dynamic user-specific data
 */
export function addNoCacheHeaders(response: Response): Response {
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  
  return response
}

/**
 * In-memory cache for server-side data with TTL
 */
class ServerCache {
  private cache: Map<string, { data: any; expires: number }> = new Map()
  private maxSize: number = 100 // Maximum cache entries

  get(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  set(key: string, data: any, ttlSeconds: number = 30): void {
    // Implement simple LRU: remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) this.cache.delete(firstKey)
    }
    
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttlSeconds * 1000)
    })
  }

  clear(): void {
    this.cache.clear()
  }

  invalidate(pattern: string): void {
    // Remove all keys matching the pattern
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

export const serverCache = new ServerCache()
