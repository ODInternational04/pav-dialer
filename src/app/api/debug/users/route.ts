import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyPassword } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get all users from database
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_active, password_hash')
      .order('created_at')

    if (error) {
      return NextResponse.json({
        error: 'Database error',
        details: error
      }, { status: 500 })
    }

    // Test password verification for admin user
    const adminUser = users?.find(u => u.email === 'admin@dialersystem.com')
    let passwordTest = null
    
    if (adminUser) {
      const testPassword = 'admin123'
      const isValid = await verifyPassword(testPassword, adminUser.password_hash)
      passwordTest = {
        testPassword,
        storedHash: adminUser.password_hash,
        isValid,
        hashLength: adminUser.password_hash.length,
        hashPrefix: adminUser.password_hash.substring(0, 10)
      }
    }

    return NextResponse.json({
      userCount: users?.length || 0,
      users: users?.map(u => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
        is_active: u.is_active,
        has_password_hash: !!u.password_hash,
        hash_length: u.password_hash?.length
      })) || [],
      adminPasswordTest: passwordTest
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}