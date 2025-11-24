/**
 * Session Management System
 * Provides secure session handling and tracking for the dialer system
 */

import { NextRequest } from 'next/server'

export interface SessionData {
  userId: string
  email: string
  role: string
  loginTime: number
  lastActivity: number
  ipAddress: string
  userAgent: string
  sessionId: string
  isActive: boolean
  tokenVersion: number
}

// In-memory session storage (use Redis in production)
const activeSessions = new Map<string, SessionData>()
const userSessionMap = new Map<string, Set<string>>() // userId -> sessionIds

// Session configuration
const SESSION_CONFIG = {
  TIMEOUT: 30 * 60 * 1000, // 30 minutes
  MAX_SESSIONS_PER_USER: 5, // Maximum concurrent sessions per user
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  EXTEND_ON_ACTIVITY: true
}

/**
 * Creates a new session for a user
 */
export const createSession = (
  userId: string,
  email: string,
  role: string,
  request: NextRequest
): string => {
  const sessionId = generateSessionId()
  const now = Date.now()
  
  // Get client information
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : realIp || request.ip || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Clean up old sessions for this user if needed
  cleanupUserSessions(userId)

  const sessionData: SessionData = {
    userId,
    email,
    role,
    loginTime: now,
    lastActivity: now,
    ipAddress,
    userAgent,
    sessionId,
    isActive: true,
    tokenVersion: 1
  }

  // Store session
  activeSessions.set(sessionId, sessionData)
  
  // Track session for user
  if (!userSessionMap.has(userId)) {
    userSessionMap.set(userId, new Set())
  }
  userSessionMap.get(userId)!.add(sessionId)

  console.log(`Session created for user ${email} (${sessionId}) from ${ipAddress}`)
  
  return sessionId
}

/**
 * Validates a session and updates last activity
 */
export const validateSession = (sessionId: string): SessionData | null => {
  const session = activeSessions.get(sessionId)
  
  if (!session || !session.isActive) {
    return null
  }
  
  const now = Date.now()
  
  // Check if session has expired
  if (now - session.lastActivity > SESSION_CONFIG.TIMEOUT) {
    invalidateSession(sessionId)
    return null
  }
  
  // Update last activity if configured to do so
  if (SESSION_CONFIG.EXTEND_ON_ACTIVITY) {
    session.lastActivity = now
  }
  
  return session
}

/**
 * Invalidates a specific session
 */
export const invalidateSession = (sessionId: string): boolean => {
  const session = activeSessions.get(sessionId)
  
  if (!session) {
    return false
  }

  // Mark as inactive
  session.isActive = false
  
  // Remove from active sessions
  activeSessions.delete(sessionId)
  
  // Remove from user session tracking
  const userSessions = userSessionMap.get(session.userId)
  if (userSessions) {
    userSessions.delete(sessionId)
    if (userSessions.size === 0) {
      userSessionMap.delete(session.userId)
    }
  }

  console.log(`Session invalidated for user ${session.email} (${sessionId})`)
  return true
}

/**
 * Invalidates all sessions for a specific user
 */
export const invalidateUserSessions = (userId: string): number => {
  const userSessions = userSessionMap.get(userId)
  
  if (!userSessions) {
    return 0
  }

  let invalidatedCount = 0
  for (const sessionId of userSessions) {
    if (invalidateSession(sessionId)) {
      invalidatedCount++
    }
  }

  console.log(`Invalidated ${invalidatedCount} sessions for user ${userId}`)
  return invalidatedCount
}

/**
 * Gets all active sessions for a user
 */
export const getUserSessions = (userId: string): SessionData[] => {
  const userSessions = userSessionMap.get(userId)
  
  if (!userSessions) {
    return []
  }

  const sessions: SessionData[] = []
  for (const sessionId of userSessions) {
    const session = activeSessions.get(sessionId)
    if (session && session.isActive) {
      sessions.push(session)
    }
  }

  return sessions
}

/**
 * Gets session statistics
 */
export const getSessionStats = () => {
  const totalSessions = activeSessions.size
  const userCount = userSessionMap.size
  
  const sessionsByRole = new Map<string, number>()
  const sessionsByUser = new Map<string, number>()
  
  for (const session of activeSessions.values()) {
    // Count by role
    const roleCount = sessionsByRole.get(session.role) || 0
    sessionsByRole.set(session.role, roleCount + 1)
    
    // Count by user
    const userCount = sessionsByUser.get(session.userId) || 0
    sessionsByUser.set(session.userId, userCount + 1)
  }

  return {
    totalSessions,
    userCount,
    sessionsByRole: Object.fromEntries(sessionsByRole),
    averageSessionsPerUser: userCount > 0 ? totalSessions / userCount : 0,
    oldestSession: Math.min(...Array.from(activeSessions.values()).map(s => s.loginTime)),
    newestSession: Math.max(...Array.from(activeSessions.values()).map(s => s.loginTime))
  }
}

/**
 * Cleans up expired sessions
 */
export const cleanupExpiredSessions = (): number => {
  const now = Date.now()
  const expiredSessions: string[] = []
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActivity > SESSION_CONFIG.TIMEOUT) {
      expiredSessions.push(sessionId)
    }
  }
  
  for (const sessionId of expiredSessions) {
    invalidateSession(sessionId)
  }

  if (expiredSessions.length > 0) {
    console.log(`Cleaned up ${expiredSessions.length} expired sessions`)
  }
  
  return expiredSessions.length
}

/**
 * Cleans up old sessions for a user (keeps only the most recent ones)
 */
export const cleanupUserSessions = (userId: string): number => {
  const userSessions = userSessionMap.get(userId)
  
  if (!userSessions || userSessions.size <= SESSION_CONFIG.MAX_SESSIONS_PER_USER) {
    return 0
  }

  // Get all sessions for user and sort by last activity
  const sessions = Array.from(userSessions)
    .map(sessionId => activeSessions.get(sessionId))
    .filter((session): session is SessionData => session !== undefined)
    .sort((a, b) => b.lastActivity - a.lastActivity)

  // Keep only the most recent sessions
  const sessionsToRemove = sessions.slice(SESSION_CONFIG.MAX_SESSIONS_PER_USER)
  
  for (const session of sessionsToRemove) {
    invalidateSession(session.sessionId)
  }

  return sessionsToRemove.length
}

/**
 * Detects suspicious session activity
 */
export const detectSuspiciousActivity = (userId: string, currentSession: SessionData): string[] => {
  const warnings: string[] = []
  const userSessions = getUserSessions(userId)
  
  if (userSessions.length === 0) {
    return warnings
  }

  // Check for sessions from different IP addresses
  const ipAddresses = new Set(userSessions.map(s => s.ipAddress))
  if (ipAddresses.size > 1) {
    warnings.push(`Multiple IP addresses detected: ${Array.from(ipAddresses).join(', ')}`)
  }

  // Check for sessions from different user agents (might indicate device/browser switching)
  const userAgents = new Set(userSessions.map(s => s.userAgent))
  if (userAgents.size > 2) { // Allow some variation in user agents
    warnings.push(`Multiple user agents detected (${userAgents.size} different)`)
  }

  // Check for too many concurrent sessions
  if (userSessions.length > SESSION_CONFIG.MAX_SESSIONS_PER_USER) {
    warnings.push(`Too many concurrent sessions: ${userSessions.length}`)
  }

  // Check for rapid session creation
  const recentSessions = userSessions.filter(s => 
    Date.now() - s.loginTime < 5 * 60 * 1000 // Last 5 minutes
  )
  if (recentSessions.length > 3) {
    warnings.push(`Rapid session creation detected: ${recentSessions.length} sessions in 5 minutes`)
  }

  return warnings
}

/**
 * Generates a cryptographically secure session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2)
  const extraRandom = Math.random().toString(36).substring(2)
  return `sess_${timestamp}_${randomPart}_${extraRandom}`
}

/**
 * Middleware helper to extract session from request
 */
export const getSessionFromRequest = (request: NextRequest): SessionData | null => {
  // Try to get session ID from various sources
  const sessionId = 
    request.headers.get('x-session-id') ||
    request.cookies.get('session-id')?.value ||
    null

  if (!sessionId) {
    return null
  }

  return validateSession(sessionId)
}

// Set up automatic cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanupExpiredSessions()
  }, SESSION_CONFIG.CLEANUP_INTERVAL)
}

// Export session configuration for external use
export const getSessionConfig = () => ({ ...SESSION_CONFIG })