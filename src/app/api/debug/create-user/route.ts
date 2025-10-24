import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email = 'test@test.com', password = 'test123' } = await request.json()

    // Generate fresh hash
    const password_hash = await hashPassword(password)
    console.log('Generated hash:', password_hash)

    // Try to insert user directly
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash,
        first_name: 'Test',
        last_name: 'User',
        role: 'admin',
        is_active: true
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to create user',
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Test user created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      },
      credentials: {
        email,
        password
      },
      hash_info: {
        generated_hash: password_hash,
        hash_length: password_hash.length
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}