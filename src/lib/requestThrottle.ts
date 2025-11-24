// Request throttling and caching utility to prevent 429 errors

class RequestThrottler {
  private requestQueue: Map<string, Promise<any>> = new Map()
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()
  private lastRequestTimes: Map<string, number> = new Map()
  private readonly minInterval = 1000 // Minimum 1 second between same requests
  private readonly maxConcurrent = 3 // Maximum 3 concurrent requests

  // Get cached data if it's still valid
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }
    if (cached) {
      this.cache.delete(key) // Remove expired cache
    }
    return null
  }

  // Set cache data
  private setCacheData(key: string, data: any, ttl: number = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  // Check if we can make the request (rate limiting)
  private canMakeRequest(key: string): boolean {
    const lastTime = this.lastRequestTimes.get(key) || 0
    const now = Date.now()
    return now - lastTime >= this.minInterval
  }

  // Throttled fetch function
  async throttledFetch(
    url: string, 
    options: RequestInit = {}, 
    cacheKey?: string,
    cacheTTL: number = 30000
  ): Promise<Response> {
    const key = cacheKey || `${options.method || 'GET'}:${url}`
    
    // Return cached data if available and valid
    if (options.method === 'GET' || !options.method) {
      const cachedData = this.getCachedData(key)
      if (cachedData) {
        console.log('🚀 Using cached data for:', url)
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // If there's already a pending request for this key, return it
    if (this.requestQueue.has(key)) {
      console.log('📦 Reusing pending request for:', url)
      return this.requestQueue.get(key)!
    }

    // Check rate limiting
    if (!this.canMakeRequest(key)) {
      const waitTime = this.minInterval - (Date.now() - (this.lastRequestTimes.get(key) || 0))
      console.log(`⏱️ Rate limited, waiting ${waitTime}ms for:`, url)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    // Create the request promise
    const requestPromise = this.makeRequest(url, options, key, cacheTTL)
    
    // Store in queue
    this.requestQueue.set(key, requestPromise)
    
    try {
      const response = await requestPromise
      return response
    } finally {
      // Remove from queue when done
      this.requestQueue.delete(key)
    }
  }

  private async makeRequest(
    url: string, 
    options: RequestInit, 
    key: string, 
    cacheTTL: number
  ): Promise<Response> {
    // Update last request time
    this.lastRequestTimes.set(key, Date.now())
    
    console.log('🌐 Making API request to:', url)
    
    try {
      const response = await fetch(url, options)
      
      if (response.ok && (options.method === 'GET' || !options.method)) {
        // Cache successful GET requests
        const data = await response.clone().json()
        this.setCacheData(key, data, cacheTTL)
      }
      
      return response
    } catch (error) {
      console.error('❌ Request failed:', url, error)
      throw error
    }
  }

  // Clear cache for specific key or all
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  // Get cache stats for debugging
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Global instance
export const requestThrottler = new RequestThrottler()

// Convenience function for throttled API calls
export async function throttledApiCall(
  url: string,
  options: RequestInit = {},
  cacheKey?: string,
  cacheTTL: number = 30000
): Promise<any> {
  try {
    const response = await requestThrottler.throttledFetch(url, options, cacheKey, cacheTTL)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Throttled API call failed:', error)
    throw error
  }
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}