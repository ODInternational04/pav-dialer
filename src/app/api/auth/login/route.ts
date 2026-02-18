import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyPassword, generateToken, validatePasswordStrength } from '@/lib/auth'
import { validateInput, loginValidationSchema, sanitizeObject } from '@/lib/validation'
import { createSession } from '@/lib/session'
import { LoginRequest } from '@/types'

/**
 * OPTIONS /api/auth/login - Handle preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

// Track failed login attempts (use Redis in production)
const failedAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>()

// Login attempt limits
const LOGIN_LIMITS = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  ATTEMPT_WINDOW: 5 * 60 * 1000, // 5 minutes
}

/**
 * POST /api/auth/login - Authenticate user
 * Security: Rate limiting, account lockout, input validation, audit logging
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let attemptKey = ''
  
  try {
    // Parse and validate request body
    let body: LoginRequest
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON payload', code: 'INVALID_JSON' },
        { status: 400 }
      )
    }

    // Sanitize input
    const sanitizedBody = sanitizeObject(body)
    
    // Validate input with Zod schema
    const validation = validateInput(loginValidationSchema, sanitizedBody)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          code: 'VALIDATION_ERROR',
          details: validation.errors 
        },
        { status: 400 }
      )
    }

    const { email, password } = validation.data

    // Create attempt tracking key
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : realIp || request.ip || 'unknown'
    attemptKey = `${clientIp}:${email.toLowerCase()}`

    // Check for too many failed attempts
    const attemptData = failedAttempts.get(attemptKey)
    if (attemptData) {
      const now = Date.now()
      
      // Check if account is currently locked
      if (attemptData.blockedUntil && now < attemptData.blockedUntil) {
        const remainingTime = Math.ceil((attemptData.blockedUntil - now) / 1000)
        
        await logAuthAttempt(email, clientIp, 'BLOCKED', 'Account temporarily locked')
        
        return NextResponse.json(
          { 
            error: 'Account temporarily locked due to too many failed attempts', 
            code: 'ACCOUNT_LOCKED',
            retryAfter: remainingTime
          },
          { status: 429 }
        )
      }
      
      // Reset attempts if window has expired
      if (now - attemptData.lastAttempt > LOGIN_LIMITS.ATTEMPT_WINDOW) {
        failedAttempts.delete(attemptKey)
      }
    }

    try {
      // Find user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, password_hash, first_name, last_name, role, is_active, last_login, created_at, can_access_vault_clients, can_access_gold_clients')
        .eq('email', email.toLowerCase())
        .single()

      if (userError || !user) {
        await recordFailedAttempt(attemptKey, email, clientIp, 'User not found')
        return NextResponse.json(
          { error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
          { status: 401 }
        )
      }

      // Check if user account is active
      if (!user.is_active) {
        await logAuthAttempt(email, clientIp, 'FAILED', 'Account disabled')
        return NextResponse.json(
          { error: 'Account is disabled. Please contact administrator.', code: 'ACCOUNT_DISABLED' },
          { status: 401 }
        )
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.password_hash)
      if (!isValidPassword) {
        await recordFailedAttempt(attemptKey, email, clientIp, 'Invalid password')
        return NextResponse.json(
          { error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
          { status: 401 }
        )
      }

      // Clear failed attempts on successful login
      failedAttempts.delete(attemptKey)

      // Create session
      const sessionId = createSession(user.id, user.email, user.role, request)

      // Update last login timestamp
      const loginTime = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          last_login: loginTime,
          updated_at: loginTime 
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to update last login:', updateError)
        // Don't fail the login for this
      }

      // Prepare user object (without sensitive data)
      const userResponse = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: user.is_active,
        can_access_vault_clients: user.can_access_vault_clients ?? true,
        can_access_gold_clients: user.can_access_gold_clients ?? false,
        last_login: loginTime,
        created_at: user.created_at,
        updated_at: loginTime
      }
      
      // Generate JWT token with session ID
      const token = generateToken(userResponse, sessionId)

      // Log successful authentication
      await logAuthAttempt(email, clientIp, 'SUCCESS', 'Login successful')

      const responseTime = Date.now() - startTime
      
      return NextResponse.json({
        user: userResponse,
        token,
        sessionId,
        metadata: {
          loginTime,
          responseTime,
          requestId: request.headers.get('x-request-id')
        }
      })

    } catch (dbError) {
      console.error('Database error in login:', dbError)
      await logAuthAttempt(email, clientIp, 'ERROR', `Database error: ${dbError}`)
      
      return NextResponse.json(
        { error: 'Authentication service temporarily unavailable', code: 'DB_ERROR' },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('Error in login:', error)
    
    if (attemptKey) {
      await logAuthAttempt('unknown', 'unknown', 'ERROR', `Server error: ${error}`)
    }
    
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * Records a failed login attempt and implements progressive delays
 */
async function recordFailedAttempt(attemptKey: string, email: string, ip: string, reason: string): Promise<void> {
  const now = Date.now()
  const attemptData = failedAttempts.get(attemptKey) || { count: 0, lastAttempt: 0 }
  
  attemptData.count++
  attemptData.lastAttempt = now
  
  // Implement progressive lockout
  if (attemptData.count >= LOGIN_LIMITS.MAX_ATTEMPTS) {
    attemptData.blockedUntil = now + LOGIN_LIMITS.LOCKOUT_DURATION
    console.warn(`Account locked for ${email} from IP ${ip} after ${attemptData.count} failed attempts`)
  }
  
  failedAttempts.set(attemptKey, attemptData)
  
  // Log the failed attempt
  await logAuthAttempt(email, ip, 'FAILED', reason)
}

/**
 * Logs authentication attempts for security monitoring
 */
async function logAuthAttempt(email: string, ip: string, status: string, details: string): Promise<void> {
  try {
    // In production, this should go to a dedicated audit/security log
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'AUTH_ATTEMPT',
      email,
      ip,
      status,
      details,
      userAgent: 'request.headers.user-agent' // Would get from request context
    }))
    
    // Optional: Store in database audit log
    // This would require adding the request context or IP to the function params
    /*
    await supabase.from('auth_audit_logs').insert({
      email,
      ip_address: ip,
      status,
      details,
      created_at: new Date().toISOString()
    })
    */
  } catch (logError) {
    console.error('Failed to log auth attempt:', logError)
    // Don't fail the authentication process due to logging errors
  }
}

/**
 * Cleanup old failed attempts (run periodically)
 */
function cleanupFailedAttempts(): void {
  const now = Date.now()
  const expiredKeys: string[] = []
  
  for (const [key, data] of failedAttempts.entries()) {
    // Remove entries older than the attempt window
    if (now - data.lastAttempt > LOGIN_LIMITS.ATTEMPT_WINDOW) {
      expiredKeys.push(key)
    }
  }
  
  for (const key of expiredKeys) {
    failedAttempts.delete(key)
  }
}

// Note: Automatic cleanup is disabled for serverless environments
// In production, use Redis with TTL or a cron job for cleanup
// setInterval doesn't work reliably in serverless functions