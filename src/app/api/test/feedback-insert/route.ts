import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Direct test of customer_feedback table...')
    
    // Try to insert a test feedback record
    const { data: insertData, error: insertError } = await supabase
      .from('customer_feedback')
      .insert({
        client_id: 'test-uuid',
        user_id: 'test-uuid',
        feedback_type: 'general',
        subject: 'Test feedback',
        notes: 'This is a test',
        priority: 'medium'
      })
      .select()

    return NextResponse.json({
      testType: 'insert',
      success: !insertError,
      error: insertError?.message || null,
      data: insertData
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}