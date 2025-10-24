import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test basic Supabase connection
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role')
      .limit(5)

    if (error) {
      return NextResponse.json({
        error: 'Database query failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: (error as any).hint,
        code: (error as any).code
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection working',
      userCount: users?.length || 0,
      users: users || []
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}