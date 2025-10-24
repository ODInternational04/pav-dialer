import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, verifyPassword } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Test password hashing
    const testPassword = 'admin123'
    const hashedPassword = await hashPassword(testPassword)
    
    // Test verification
    const isValid = await verifyPassword(testPassword, hashedPassword)
    
    // Test against the hash in database
    const dbHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewDy/w9CkZP8EzGm'
    const isDbValid = await verifyPassword(testPassword, dbHash)
    
    return NextResponse.json({
      testPassword,
      newHash: hashedPassword,
      isNewHashValid: isValid,
      dbHash,
      isDbHashValid: isDbValid,
      message: 'Password hash test completed'
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Hash test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}