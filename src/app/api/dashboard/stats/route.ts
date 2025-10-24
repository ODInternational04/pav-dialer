import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const isAdmin = payload.role === 'admin'
    const userId = payload.userId

    // Get total clients
    const { count: totalClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })

    // Get calls for today
    const today = new Date().toISOString().split('T')[0]
    const { count: totalCallsToday } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .eq(!isAdmin ? 'user_id' : 'user_id', !isAdmin ? userId : undefined)

    // Get calls for this week
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    const { count: totalCallsThisWeek } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfWeek.toISOString())
      .eq(!isAdmin ? 'user_id' : 'user_id', !isAdmin ? userId : undefined)

    // Get calls for this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const { count: totalCallsThisMonth } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())
      .eq(!isAdmin ? 'user_id' : 'user_id', !isAdmin ? userId : undefined)

    // Calculate success rate (completed calls / total calls)
    const { data: monthlyCallsData } = await supabase
      .from('call_logs')
      .select('call_status')
      .gte('created_at', startOfMonth.toISOString())
      .eq(!isAdmin ? 'user_id' : 'user_id', !isAdmin ? userId : undefined)

    const totalCalls = monthlyCallsData?.length || 0
    const successfulCalls = monthlyCallsData?.filter(call => call.call_status === 'completed').length || 0
    const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0

    // Get pending callbacks
    const { count: pendingCallbacks } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .eq('callback_requested', true)
      .is('callback_time', null)
      .eq(!isAdmin ? 'user_id' : 'user_id', !isAdmin ? userId : undefined)

    // Get active users (admin only)
    let activeUsers = 0
    if (isAdmin) {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      activeUsers = count || 0
    }

    const stats = {
      totalClients: totalClients || 0,
      totalCallsToday: totalCallsToday || 0,
      totalCallsThisWeek: totalCallsThisWeek || 0,
      totalCallsThisMonth: totalCallsThisMonth || 0,
      successRate,
      pendingCallbacks: pendingCallbacks || 0,
      activeUsers,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}