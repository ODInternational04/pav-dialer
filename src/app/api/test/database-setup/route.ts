import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing clients and database setup...')
    
    // Test clients table
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, principal_key_holder, box_number')
      .limit(3)

    if (clientsError) {
      return NextResponse.json({
        error: 'Clients table query failed',
        details: clientsError
      }, { status: 500 })
    }

    // Test users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .limit(3)

    if (usersError) {
      return NextResponse.json({
        error: 'Users table query failed',
        details: usersError
      }, { status: 500 })
    }

    // Test if customer_feedback table exists
    let feedbackExists = false
    let feedbackError = null
    
    try {
      const { data: feedback, error } = await supabase
        .from('customer_feedback')
        .select('id')
        .limit(1)
      
      if (!error) {
        feedbackExists = true
      } else {
        feedbackError = error
      }
    } catch (e) {
      feedbackError = e
    }

    return NextResponse.json({
      success: true,
      tables: {
        clients: {
          exists: true,
          count: clients?.length || 0,
          sample: clients || []
        },
        users: {
          exists: true,
          count: users?.length || 0,
          sample: users || []
        },
        customer_feedback: {
          exists: feedbackExists,
          error: feedbackError
        }
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}