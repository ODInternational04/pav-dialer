/**
 * Utilities for optimistic UI updates to make the interface feel faster
 */

/**
 * Performs an optimistic update: immediately update the UI, then call the API
 * If the API call fails, rollback the change
 * 
 * @param optimisticUpdate Function to immediately update the UI state
 * @param apiCall Function that performs the actual API request
 * @param rollback Function to rollback the UI if API fails
 */
export async function withOptimisticUpdate<T>(
  optimisticUpdate: () => void,
  apiCall: () => Promise<T>,
  rollback: () => void
): Promise<T> {
  try {
    // Immediately update UI
    optimisticUpdate()
    
    // Make the actual API call
    const result = await apiCall()
    
    return result
  } catch (error) {
    // Rollback on failure
    rollback()
    throw error
  }
}

/**
 * Debounce function to prevent excessive API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function to limit execution rate
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Request deduplication: prevent multiple identical requests from being sent
 */
class RequestDeduplicator {
  private pending: Map<string, Promise<any>> = new Map()

  async dedupe<T>(key: string, request: () => Promise<T>): Promise<T> {
    // If there's already a pending request with this key, return it
    if (this.pending.has(key)) {
      return this.pending.get(key) as Promise<T>
    }

    // Create new request
    const promise = request().finally(() => {
      // Remove from pending once complete
      this.pending.delete(key)
    })

    this.pending.set(key, promise)
    return promise
  }

  clear() {
    this.pending.clear()
  }
}

export const requestDeduplicator = new RequestDeduplicator()
