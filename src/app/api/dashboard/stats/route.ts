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

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Note: using decoded.role and decoded.userId directly for consistency with call-logs API
    const isAdmin = decoded.role === 'admin'
    const userId = decoded.userId

    // Get total clients
    const { count: totalClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })

    // Get calls for today using South African Standard Time (SAST = UTC+2)
    const now = new Date()
    const sastOffset = 2 * 60 * 60 * 1000 // 2 hours in milliseconds
    const sastNow = new Date(now.getTime() + sastOffset)
    
    // Get start of today in SAST
    const startOfTodaySAST = new Date(sastNow.getFullYear(), sastNow.getMonth(), sastNow.getDate())
    const startOfTodayUTC = new Date(startOfTodaySAST.getTime() - sastOffset)
    
    // Get end of today in SAST  
    const endOfTodaySAST = new Date(startOfTodaySAST.getTime() + 24 * 60 * 60 * 1000)
    const endOfTodayUTC = new Date(endOfTodaySAST.getTime() - sastOffset)
    
    let todayQuery = supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfTodayUTC.toISOString())
      .lt('created_at', endOfTodayUTC.toISOString())
    
    // For non-admin users, only show their own calls
    if (decoded.role !== 'admin') {
      todayQuery = todayQuery.eq('user_id', decoded.userId)
    }
    
    const { count: totalCallsToday } = await todayQuery

    // Get calls for this week
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    let weekQuery = supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfWeek.toISOString())
    
    if (decoded.role !== 'admin') {
      weekQuery = weekQuery.eq('user_id', decoded.userId)
    }
    
    const { count: totalCallsThisWeek } = await weekQuery

    // Get calls for this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    let monthQuery = supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())
    
    if (decoded.role !== 'admin') {
      monthQuery = monthQuery.eq('user_id', decoded.userId)
    }
    
    const { count: totalCallsThisMonth } = await monthQuery

    // Calculate success rate (completed calls / total calls)
    let monthlyDataQuery = supabase
      .from('call_logs')
      .select('call_status')
      .gte('created_at', startOfMonth.toISOString())
    
    if (decoded.role !== 'admin') {
      monthlyDataQuery = monthlyDataQuery.eq('user_id', decoded.userId)
    }
    
    const { data: monthlyCallsData } = await monthlyDataQuery

    const totalCalls = monthlyCallsData?.length || 0
    const successfulCalls = monthlyCallsData?.filter(call => call.call_status === 'completed').length || 0
    const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0

    // Get pending callbacks (callbacks that are scheduled for future or past due)
    let callbackQuery = supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .eq('callback_requested', true)
      .not('callback_time', 'is', null)
    
    if (decoded.role !== 'admin') {
      callbackQuery = callbackQuery.eq('user_id', decoded.userId)
    }
    
    const { count: pendingCallbacks } = await callbackQuery

    // Get active users (admin only)
    let activeUsers = 0
    if (isAdmin) {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      activeUsers = count || 0
    }

    // Debug logging with SAST timezone info
    console.log('=== Dashboard Stats Debug (SAST Timezone) ===', {
      userId,
      isAdmin,
      totalCallsToday,
      successRate,
      pendingCallbacks,
      totalCalls: monthlyCallsData?.length,
      successfulCalls: monthlyCallsData?.filter(call => call.call_status === 'completed').length,
      sastNow: sastNow.toISOString(),
      startOfTodayUTC: startOfTodayUTC.toISOString(),
      endOfTodayUTC: endOfTodayUTC.toISOString(),
      timestamp: new Date().toISOString()
    })

    // Get a quick count of ALL call logs to see if there's any data
    const { count: allCallsCount } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })

    console.log('Total calls in database:', allCallsCount)

    const stats = {
      totalClients: totalClients || 0,
      totalCallsToday: totalCallsToday || 0,
      totalCallsThisWeek: totalCallsThisWeek || 0,
      totalCallsThisMonth: totalCallsThisMonth || 0,
      successRate,
      pendingCallbacks: pendingCallbacks || 0,
      activeUsers,
      debug: {
        allCallsCount,
        userId,
        isAdmin
      }
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