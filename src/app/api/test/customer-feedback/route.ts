import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing customer feedback database setup...')
    
    // Test if customer_feedback table exists by trying to query it directly
    const { data: feedback, error: feedbackError } = await supabase
      .from('customer_feedback')
      .select('id, feedback_type, subject, created_at')
      .limit(1)

    if (feedbackError) {
      return NextResponse.json({
        error: 'customer_feedback table does not exist or is not accessible',
        details: feedbackError,
        message: 'Please run the customer-feedback-schema.sql file in Supabase SQL editor',
        tableExists: false
      }, { status: 500 })
    }

    const tableExists = true

    // Test enum values and functions
    const { data: enumData, error: enumError } = await supabase
      .rpc('get_feedback_statistics', {
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString()
      })

    // Get sample clients for testing
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, principal_key_holder, box_number')
      .limit(3)

    return NextResponse.json({
      success: true,
      message: 'Customer feedback system is properly set up',
      tableExists: true,
      feedbackCount: feedback?.length || 0,
      statistics: enumData?.[0] || null,
      statisticsError: enumError,
      sampleFeedback: feedback || [],
      availableClients: clients || [],
      clientsError: clientsError
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}