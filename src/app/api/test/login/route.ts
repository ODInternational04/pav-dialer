import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email = 'admin@dialersystem.com', password = 'admin123' } = body

    console.log('🔍 Testing login for:', email)

    // Step 1: Test database connection
    const { data: testConnection, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (connectionError) {
      return NextResponse.json({
        step: 1,
        success: false,
        error: 'Database connection failed',
        details: connectionError
      }, { status: 500 })
    }

    // Step 2: Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, password_hash, first_name, last_name, role, is_active')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return NextResponse.json({
        step: 2,
        success: false,
        error: 'User not found',
        details: userError,
        searchedEmail: email
      }, { status: 404 })
    }

    // Step 3: Check if user is active
    if (!user.is_active) {
      return NextResponse.json({
        step: 3,
        success: false,
        error: 'User account is disabled',
        user: { email: user.email, is_active: user.is_active }
      }, { status: 401 })
    }

    // Step 4: Test password verification
    console.log('🔐 Testing password verification...')
    console.log('Password:', password)
    console.log('Hash from DB:', user.password_hash)
    
    const isValidPassword = await verifyPassword(password, user.password_hash)
    
    if (!isValidPassword) {
      return NextResponse.json({
        step: 4,
        success: false,
        error: 'Password verification failed',
        testPassword: password,
        storedHash: user.password_hash,
        passwordValid: isValidPassword
      }, { status: 401 })
    }

    // Step 5: Success
    return NextResponse.json({
      step: 5,
      success: true,
      message: 'Login test successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: user.is_active
      }
    })

  } catch (error) {
    console.error('❌ Login test error:', error)
    return NextResponse.json({
      step: 0,
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}