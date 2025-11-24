import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('🔍 Testing Reports API Functions...')
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {} as any,
      raw_data: {} as any,
      summary: ''
    }

    // Test 1: Check if we can call get_report_overview
    try {
      console.log('Testing get_report_overview...')
      const { data: overview, error: overviewError } = await supabase
        .rpc('get_report_overview')
      
      results.tests.get_report_overview = {
        success: !overviewError,
        error: overviewError?.message,
        data: overview
      }
      results.raw_data.overview = overview
      console.log('Overview result:', { overview, overviewError })
    } catch (error: any) {
      results.tests.get_report_overview = {
        success: false,
        error: error.message,
        data: null
      }
    }

    // Test 2: Check if we can call get_team_performance
    try {
      console.log('Testing get_team_performance...')
      const { data: teamPerf, error: teamError } = await supabase
        .rpc('get_team_performance')
      
      results.tests.get_team_performance = {
        success: !teamError,
        error: teamError?.message,
        data: teamPerf
      }
      results.raw_data.team_performance = teamPerf
      console.log('Team performance result:', { teamPerf, teamError })
    } catch (error: any) {
      results.tests.get_team_performance = {
        success: false,
        error: error.message,
        data: null
      }
    }

    // Test 3: Raw table queries
    try {
      console.log('Testing raw table access...')
      
      // Check users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(5)
      
      results.raw_data.users_sample = users
      results.tests.users_table = { success: !usersError, error: usersError?.message, count: users?.length || 0 }

      // Check clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .limit(5)
      
      results.raw_data.clients_sample = clients
      results.tests.clients_table = { success: !clientsError, error: clientsError?.message, count: clients?.length || 0 }

      // Check call_logs
      const { data: callLogs, error: callLogsError } = await supabase
        .from('call_logs')
        .select('*')
        .limit(5)
      
      results.raw_data.call_logs_sample = callLogs
      results.tests.call_logs_table = { success: !callLogsError, error: callLogsError?.message, count: callLogs?.length || 0 }

      console.log('Raw data results:', { 
        users: users?.length, 
        clients: clients?.length, 
        callLogs: callLogs?.length 
      })
    } catch (error: any) {
      results.tests.raw_tables = {
        success: false,
        error: error.message,
        data: null
      }
    }

    // Generate summary
    const successfulTests = Object.values(results.tests).filter((test: any) => test.success).length
    const totalTests = Object.keys(results.tests).length
    results.summary = `${successfulTests}/${totalTests} tests passed`

    console.log('🎯 Reports API Test Summary:', results.summary)
    console.log('📊 Full Results:', JSON.stringify(results, null, 2))

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('❌ Debug test failed:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}