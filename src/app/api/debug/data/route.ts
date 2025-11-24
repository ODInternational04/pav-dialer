import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Only admin can access debug info
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Check what data exists in the database
    const results: any = {}

    // Count users
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    // Count clients
    const { count: clientCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
    
    // Count call logs
    const { count: callLogCount } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
    
    // Count callbacks
    const { count: callbackCount } = await supabase
      .from('callbacks')
      .select('*', { count: 'exact', head: true })

    // Get recent call logs (last 10)
    const { data: recentCalls } = await supabase
      .from('call_logs')
      .select(`
        id,
        created_at,
        call_status,
        call_duration,
        users:user_id (first_name, last_name),
        clients:client_id (principal_key_holder)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get active users
    const { data: activeUsers } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, is_active')
      .eq('is_active', true)

    // Get sample clients
    const { data: sampleClients } = await supabase
      .from('clients')
      .select('id, box_number, principal_key_holder, telephone_cell')
      .limit(5)

    // Test the database functions
    let functionsWork = false
    try {
      const { data: userStats } = await supabase.rpc('get_user_call_statistics', {
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString()
      })
      
      const { data: systemStats } = await supabase.rpc('get_system_statistics', {
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString()
      })
      
      functionsWork = true
      results.functionTest = { userStats, systemStats }
      
    } catch (funcError) {
      console.error('Function test failed:', funcError)
      results.functionError = funcError instanceof Error ? funcError.message : String(funcError)
    }

    return NextResponse.json({
      database_summary: {
        users: userCount || 0,
        clients: clientCount || 0,
        call_logs: callLogCount || 0,
        callbacks: callbackCount || 0
      },
      functions_working: functionsWork,
      sample_data: {
        recent_calls: recentCalls || [],
        active_users: activeUsers || [],
        sample_clients: sampleClients || []
      },
      ...results
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ 
      error: 'Debug check failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}