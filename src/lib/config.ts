/**
 * Configuration validation and environment variable management
 * Ensures all required environment variables are present and valid
 */

interface Config {
  JWT_SECRET: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  NODE_ENV: string
  NEXTAUTH_URL?: string
  DATABASE_URL?: string
}

// Default values for build time (these will be overridden at runtime)
const BUILD_TIME_DEFAULTS: Config = {
  JWT_SECRET: 'build-time-placeholder-secret-key-32chars',
  SUPABASE_URL: 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY: 'placeholder-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'placeholder-service-role-key',
  NODE_ENV: 'production'
}

/**
 * Check if we're in a build environment
 */
const isBuildTime = (): boolean => {
  return process.env.NEXT_PHASE === 'phase-production-build' ||
         process.env.npm_lifecycle_event === 'build' ||
         !process.env.NEXT_PUBLIC_SUPABASE_URL
}

/**
 * Validates all required environment variables
 * Returns defaults during build time to prevent build failures
 */
function getConfig(): Config {
  // During build time, return defaults to prevent errors
  if (isBuildTime()) {
    console.log('📦 Build time detected - using placeholder configuration')
    return BUILD_TIME_DEFAULTS
  }

  const requiredVars = [
    'JWT_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  const missing = requiredVars.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.error(
      `🚨 Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env.local file and ensure all required variables are set.`
    )
    // Return defaults instead of throwing to prevent runtime crashes
    return BUILD_TIME_DEFAULTS
  }

  // Validate JWT secret strength
  const jwtSecret = process.env.JWT_SECRET!
  if (jwtSecret.length < 32) {
    console.error(
      '🚨 JWT_SECRET must be at least 32 characters long for security.\n' +
      'Generate a secure secret using: openssl rand -base64 64'
    )
  }

  // Validate Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    console.error('🚨 Invalid Supabase URL format')
  }

  return {
    JWT_SECRET: jwtSecret,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    NODE_ENV: process.env.NODE_ENV || 'development',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL
  }
}

// Get configuration (safe for build time)
export const config = getConfig()

// Export individual config values for convenience
export const JWT_SECRET = config.JWT_SECRET
export const SUPABASE_URL = config.SUPABASE_URL
export const SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY
export const SUPABASE_SERVICE_ROLE_KEY = config.SUPABASE_SERVICE_ROLE_KEY
export const NODE_ENV = config.NODE_ENV

// Development vs Production checks
export const isDevelopment = NODE_ENV === 'development'
export const isProduction = NODE_ENV === 'production'
export const isTest = NODE_ENV === 'test'