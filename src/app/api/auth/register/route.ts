import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'
import { CreateUserRequest } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json()
    const { email, password, first_name, last_name, role } = body

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const password_hash = await hashPassword(password)

    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash,
        first_name,
        last_name,
        role,
      })
      .select('id, email, first_name, last_name, role, is_active, created_at')
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: newUser
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in user registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}