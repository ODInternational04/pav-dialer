/**
 * Next.js Middleware for Security, Rate Limiting, and Request Processing
 * Provides comprehensive security headers and rate limiting for all routes
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting storage (use Redis in production for distributed systems)
const rateLimitMap = new Map<string, { count: number; resetTime: number; firstRequest: number }>()

// Rate limit configurations for different endpoints
const RATE_LIMITS = {
  '/api/auth/login': { requests: 5, windowMs: 5 * 60 * 1000 }, // 5 requests per 5 minutes
  '/api/auth/register': { requests: 3, windowMs: 10 * 60 * 1000 }, // 3 requests per 10 minutes
  '/api/auth/verify': { requests: 100, windowMs: 60 * 1000 }, // 100 requests per minute for token verification (frequent on page refresh)
  '/api/auth/': { requests: 10, windowMs: 60 * 1000 }, // 10 requests per minute for other auth
  '/api/': { requests: 100, windowMs: 60 * 1000 }, // 100 requests per minute for general API
  default: { requests: 200, windowMs: 60 * 1000 } // 200 requests per minute for everything else
}

/**
 * Generates a unique identifier for rate limiting
 * Combines IP address and User-Agent for better identification
 */
function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || request.ip || 'unknown'
  const userAgent = request.headers.get('user-agent')?.slice(0, 50) || 'unknown'
  return `${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 20)}`
}

/**
 * Determines rate limit configuration based on request path
 */
function getRateLimitConfig(pathname: string): { requests: number; windowMs: number } {
  for (const [path, config] of Object.entries(RATE_LIMITS)) {
    if (path !== 'default' && pathname.startsWith(path)) {
      return config
    }
  }
  return RATE_LIMITS.default
}

/**
 * Checks if request is rate limited
 */
function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(key)

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new rate limit entry
    rateLimitMap.set(key, { 
      count: 1, 
      resetTime: now + windowMs, 
      firstRequest: now 
    })
    return false
  }

  if (userLimit.count >= limit) {
    return true
  }

  userLimit.count++
  return false
}

/**
 * Cleans up expired rate limit entries
 * Prevents memory leaks in long-running processes
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}

// Cleanup expired entries every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000)

/**
 * Detects potentially malicious patterns in requests
 */
function detectSuspiciousActivity(request: NextRequest): string | null {
  const userAgent = request.headers.get('user-agent') || ''
  const referer = request.headers.get('referer') || ''
  const pathname = request.nextUrl.pathname

  // Check for common attack patterns
  const suspiciousPatterns = [
    /sql.*injection/i,
    /<script/i,
    /javascript:/i,
    /\.\.\//,
    /\/etc\/passwd/,
    /\/proc\/self/,
    /union.*select/i,
    /base64_decode/i,
    /eval\(/i
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(pathname) || pattern.test(referer)) {
      return `Suspicious pattern detected: ${pattern.source}`
    }
  }

  // Check for bot-like behavior
  const botPatterns = [
    /bot|crawler|spider|scraper/i,
    /^curl/i,
    /^wget/i,
    /python-requests/i
  ]

  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      return `Bot detected: ${userAgent}`
    }
  }

  return null
}

/**
 * Main middleware function
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Skip middleware for static files and internal Next.js routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.')
  ) {
    return response
  }

  try {
    // Detect suspicious activity
    const suspiciousActivity = detectSuspiciousActivity(request)
    if (suspiciousActivity) {
      console.warn(`Suspicious activity detected: ${suspiciousActivity} from ${getRateLimitKey(request)}`)
      
      // Block obviously malicious requests
      if (suspiciousActivity.includes('Suspicious pattern')) {
        return new NextResponse(
          JSON.stringify({ error: 'Request blocked for security reasons' }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Apply rate limiting to API routes
    if (pathname.startsWith('/api/')) {
      const key = getRateLimitKey(request)
      const { requests, windowMs } = getRateLimitConfig(pathname)

      if (isRateLimited(key, requests, windowMs)) {
        console.warn(`Rate limit exceeded for ${key} on ${pathname}`)
        
        return new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil(windowMs / 1000)
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil(windowMs / 1000).toString(),
              'X-RateLimit-Limit': requests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': Math.ceil((Date.now() + windowMs) / 1000).toString()
            },
          }
        )
      }

      // Add rate limit headers to successful requests
      const userLimit = rateLimitMap.get(key)
      if (userLimit) {
        response.headers.set('X-RateLimit-Limit', requests.toString())
        response.headers.set('X-RateLimit-Remaining', Math.max(0, requests - userLimit.count).toString())
        response.headers.set('X-RateLimit-Reset', Math.ceil(userLimit.resetTime / 1000).toString())
      }
    }

    // Set comprehensive security headers
    response.headers.set('X-DNS-Prefetch-Control', 'off')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
    
    // Strict Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Note: unsafe-inline should be removed in production
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "font-src 'self' https://fonts.gstatic.com",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ')
    
    response.headers.set('Content-Security-Policy', csp)

    // HSTS header for HTTPS enforcement (only in production)
    if (request.nextUrl.protocol === 'https:') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }

    // Add request ID for tracking
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    response.headers.set('X-Request-ID', requestId)

    return response

  } catch (error) {
    console.error('Middleware error:', error)
    // Fail securely - continue with basic response
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths including API routes but exclude static files
     * - Include API routes for rate limiting and security
     * - Exclude _next/static (static files)
     * - Exclude _next/image (image optimization files)
     * - Exclude favicon.ico and other static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
}