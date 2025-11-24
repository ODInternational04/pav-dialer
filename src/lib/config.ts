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

/**
 * Validates all required environment variables
 * Throws error if any required variables are missing or invalid
 */
function validateConfig(): Config {
  const requiredVars = [
    'JWT_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  const missing = requiredVars.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(
      `🚨 SECURITY ERROR: Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env.local file and ensure all required variables are set.`
    )
  }

  // Validate JWT secret strength
  const jwtSecret = process.env.JWT_SECRET!
  if (jwtSecret.length < 32) {
    throw new Error(
      '🚨 SECURITY ERROR: JWT_SECRET must be at least 32 characters long for security.\n' +
      'Generate a secure secret using: openssl rand -base64 64'
    )
  }

  // Validate Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    throw new Error('🚨 SECURITY ERROR: Invalid Supabase URL format')
  }

  console.log('✅ Environment configuration validated successfully')

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

// Validate configuration on module load
export const config = validateConfig()

// Export individual config values for convenience
export const {
  JWT_SECRET,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  NODE_ENV
} = config

// Development vs Production checks
export const isDevelopment = NODE_ENV === 'development'
export const isProduction = NODE_ENV === 'production'
export const isTest = NODE_ENV === 'test'

// Security warnings for development
if (isDevelopment) {
  console.log('🔧 Running in development mode')
  if (JWT_SECRET.includes('your-super-secret') || JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: Using weak JWT secret in development')
  }
}

if (isProduction) {
  console.log('🚀 Running in production mode')
  // Additional production-only validations
  if (!process.env.NEXTAUTH_URL) {
    console.warn('⚠️  WARNING: NEXTAUTH_URL not set for production')
  }
}