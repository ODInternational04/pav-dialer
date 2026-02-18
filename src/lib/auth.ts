import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { User } from '@/types'
import { JWT_SECRET } from '@/lib/config'

// Enhanced token payload with security features
export interface TokenPayload {
  userId: string
  email: string
  role: 'admin' | 'user'
  can_access_vault_clients?: boolean
  can_access_gold_clients?: boolean
  iat?: number
  exp?: number
  tokenVersion?: number
  sessionId?: string
}

// Password requirements for production security
export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
}

/**
 * Validates password strength according to security requirements
 */
export const validatePasswordStrength = (password: string): string[] => {
  const errors: string[] = []
  
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`)
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return errors
}

/**
 * Hashes password with secure salt rounds
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 14 // Increased from 12 for better security
  return bcrypt.hash(password, saltRounds)
}

/**
 * Verifies password against hash
 */
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * Generates secure JWT token with enhanced claims
 */
export const generateToken = (user: Omit<User, 'password'>, sessionId?: string): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    can_access_vault_clients: user.can_access_vault_clients ?? true,
    can_access_gold_clients: user.can_access_gold_clients ?? false,
    iat: Math.floor(Date.now() / 1000),
    tokenVersion: 1, // For token revocation capability
    sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h', // Extended for development/testing
    algorithm: 'HS256',
    issuer: 'dialer-system',
    audience: 'dialer-users'
  })
}

/**
 * Verifies JWT token with enhanced security checks
 */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'dialer-system',
      audience: 'dialer-users',
      maxAge: '24h' // Extended for development/testing
    }) as TokenPayload
    
    // Additional validation checks
    if (!decoded.userId || !decoded.email || !decoded.role) {
      console.error('Token missing required claims')
      return null
    }
    
    return decoded
  } catch (error) {
    console.error('Token verification failed:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

/**
 * Extracts and validates Bearer token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | null): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}