import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email = 'admin@dialersystem.com', password = 'admin123' } = await request.json()

    // Generate a fresh password hash for admin123
    const newPasswordHash = await hashPassword(password)
    console.log('Generated new hash for admin123:', newPasswordHash)

    // Update the existing admin user with correct password hash
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ 
        password_hash: newPasswordHash 
      })
      .eq('email', email)
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to update user password',
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Admin password updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      },
      credentials: {
        email,
        password
      },
      hash_info: {
        new_hash: newPasswordHash,
        hash_length: newPasswordHash.length
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}