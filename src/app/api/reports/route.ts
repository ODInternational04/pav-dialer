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

    // Only admin can access detailed reports
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('reportType') || 'monthly' // daily, weekly, monthly
    const specificDate = searchParams.get('date') // For daily reports
    const userId = searchParams.get('userId')

    // Calculate date ranges based on report type
    let queryStartDate: string
    let queryEndDate: string

    const now = new Date()

    switch (reportType) {
      case 'daily':
        if (specificDate) {
          const date = new Date(specificDate)
          queryStartDate = new Date(date.setHours(0, 0, 0, 0)).toISOString()
          queryEndDate = new Date(date.setHours(23, 59, 59, 999)).toISOString()
        } else {
          // Today
          queryStartDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()
          queryEndDate = new Date(now.setHours(23, 59, 59, 999)).toISOString()
        }
        break
        
      case 'weekly':
        // Current week (Monday to Sunday)
        const startOfWeek = new Date(now)
        const day = startOfWeek.getDay()
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is Sunday
        startOfWeek.setDate(diff)
        startOfWeek.setHours(0, 0, 0, 0)
        
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)
        
        queryStartDate = startOfWeek.toISOString()
        queryEndDate = endOfWeek.toISOString()
        break
        
      case 'monthly':
      default:
        // Current month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        
        queryStartDate = startOfMonth.toISOString()
        queryEndDate = endOfMonth.toISOString()
        break
    }

    // Get user performance statistics
    let userStatsQuery = supabase.rpc('get_user_call_statistics', {
      start_date: queryStartDate,
      end_date: queryEndDate
    })

    if (userId) {
      userStatsQuery = userStatsQuery.eq('user_id', userId)
    }

    const { data: userStats, error: userStatsError } = await userStatsQuery

    if (userStatsError) {
      console.error('Error fetching user statistics:', userStatsError)
      return NextResponse.json({ error: 'Failed to fetch user statistics' }, { status: 500 })
    }

    // Get user details to ensure we have names (fallback if function doesn't return them)
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('role', 'user')
      .eq('is_active', true)

    // Merge user details with statistics
    const enhancedUserStats = userStats?.map((stat: any) => {
      const user = allUsers?.find(u => u.id === stat.user_id)
      return {
        ...stat,
        first_name: stat.first_name || user?.first_name || null,
        last_name: stat.last_name || user?.last_name || null,
        email: stat.email || user?.email || null
      }
    }) || []

    console.log('Enhanced user stats:', enhancedUserStats)

    // Get overall system statistics
    const { data: systemStats, error: systemStatsError } = await supabase.rpc('get_system_statistics', {
      start_date: queryStartDate,
      end_date: queryEndDate
    })

    if (systemStatsError) {
      console.error('Error fetching system statistics:', systemStatsError)
      return NextResponse.json({ error: 'Failed to fetch system statistics' }, { status: 500 })
    }

    // Get call volume by date (for charts) with user attribution
    let callVolumeQuery = supabase
      .from('call_logs')
      .select(`
        created_at,
        call_status,
        call_duration,
        user_id,
        client_id,
        notes,
        users:user_id (first_name, last_name, email),
        clients:client_id (principal_key_holder, box_number, telephone_cell)
      `)
      .gte('created_at', queryStartDate)
      .lte('created_at', queryEndDate)
      .order('created_at', { ascending: false })

    // Apply user filter if specified
    if (userId) {
      callVolumeQuery = callVolumeQuery.eq('user_id', userId)
    }

    const { data: callVolumeData, error: callVolumeError } = await callVolumeQuery

    if (callVolumeError) {
      console.error('Error fetching call volume data:', callVolumeError)
      return NextResponse.json({ error: 'Failed to fetch call volume data' }, { status: 500 })
    }

    // Get detailed call logs with user attribution for admin view
    let detailedCallLogsQuery = supabase
      .from('call_logs')
      .select(`
        id,
        created_at,
        call_status,
        call_type,
        call_duration,
        notes,
        callback_requested,
        callback_time,
        user_id,
        client_id,
        users:user_id (
          id,
          first_name, 
          last_name, 
          email,
          role
        ),
        clients:client_id (
          id,
          principal_key_holder,
          box_number,
          telephone_cell,
          contract_no
        )
      `)
      .gte('created_at', queryStartDate)
      .lte('created_at', queryEndDate)
      .order('created_at', { ascending: false })
      .limit(500) // Limit to prevent excessive data

    // Apply user filter if specified
    if (userId) {
      detailedCallLogsQuery = detailedCallLogsQuery.eq('user_id', userId)
    }

    const { data: detailedCallLogs, error: detailedCallLogsError } = await detailedCallLogsQuery

    if (detailedCallLogsError) {
      console.error('Error fetching detailed call logs:', detailedCallLogsError)
      return NextResponse.json({ error: 'Failed to fetch detailed call logs' }, { status: 500 })
    }

    // Get top performing users
    let topUsersQuery = supabase
      .from('call_statistics')
      .select(`
        user_id,
        total_calls,
        success_rate,
        users:user_id (first_name, last_name, email)
      `)
      .gte('date', queryStartDate.split('T')[0])
      .lte('date', queryEndDate.split('T')[0])
      .order('success_rate', { ascending: false })
      .limit(10)

    // Apply user filter if specified
    if (userId) {
      topUsersQuery = topUsersQuery.eq('user_id', userId)
    }

    const { data: topUsers, error: topUsersError } = await topUsersQuery

    if (topUsersError) {
      console.error('Error fetching top users:', topUsersError)
      return NextResponse.json({ error: 'Failed to fetch top users' }, { status: 500 })
    }

    // Get callback completion rates
    let callbackStatsQuery = supabase
      .from('call_logs')
      .select(`
        callback_requested,
        callback_time,
        created_at,
        user_id,
        users:user_id (first_name, last_name)
      `)
      .gte('created_at', queryStartDate)
      .lte('created_at', queryEndDate)
      .eq('callback_requested', true)

    // Apply user filter if specified
    if (userId) {
      callbackStatsQuery = callbackStatsQuery.eq('user_id', userId)
    }

    const { data: callbackStats, error: callbackStatsError } = await callbackStatsQuery

    if (callbackStatsError) {
      console.error('Error fetching callback statistics:', callbackStatsError)
      return NextResponse.json({ error: 'Failed to fetch callback statistics' }, { status: 500 })
    }

    // Get client interaction summary with user attribution
    let clientInteractionsQuery = supabase
      .from('call_logs')
      .select(`
        client_id,
        call_status,
        created_at,
        user_id,
        users:user_id (first_name, last_name, email),
        clients:client_id (
          principal_key_holder,
          telephone_cell,
          box_number
        )
      `)
      .gte('created_at', queryStartDate)
      .lte('created_at', queryEndDate)

    // Apply user filter if specified
    if (userId) {
      clientInteractionsQuery = clientInteractionsQuery.eq('user_id', userId)
    }

    const { data: clientInteractions, error: clientInteractionsError } = await clientInteractionsQuery

    if (clientInteractionsError) {
      console.error('Error fetching client interactions:', clientInteractionsError)
      return NextResponse.json({ error: 'Failed to fetch client interactions' }, { status: 500 })
    }

    // Process and aggregate data
    const processedCallVolumeData = processCallVolumeByDate(callVolumeData || [])
    const processedClientStats = processClientInteractions(clientInteractions || [])
    const processedCallbackStats = processCallbackData(callbackStats || [])

    return NextResponse.json({
      userStats: enhancedUserStats || [],
      systemStats: systemStats?.[0] || {},
      callVolumeByDate: processedCallVolumeData,
      detailedCallLogs: detailedCallLogs || [],
      topUsers: topUsers || [],
      callbackStats: processedCallbackStats,
      clientInteractions: processedClientStats,
      reportType: reportType,
      dateRange: {
        startDate: queryStartDate,
        endDate: queryEndDate
      }
    })
  } catch (error) {
    console.error('Error in reports GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function processCallVolumeByDate(callData: any[]) {
  const dailyStats: Record<string, any> = {}

  callData.forEach(call => {
    const date = new Date(call.created_at).toISOString().split('T')[0]
    if (!dailyStats[date]) {
      dailyStats[date] = {
        date,
        total: 0,
        completed: 0,
        missed: 0,
        declined: 0,
        busy: 0,
        no_answer: 0
      }
    }

    dailyStats[date].total++
    dailyStats[date][call.call_status]++
  })

  return Object.values(dailyStats).sort((a: any, b: any) => a.date.localeCompare(b.date))
}

function processClientInteractions(interactions: any[]) {
  const clientStats: Record<string, any> = {}

  interactions.forEach(interaction => {
    const clientId = interaction.client_id
    if (!clientStats[clientId]) {
      clientStats[clientId] = {
        client: interaction.clients,
        totalCalls: 0,
        lastCall: interaction.created_at,
        lastCalledBy: interaction.users,
        callsByStatus: {
          completed: 0,
          missed: 0,
          declined: 0,
          busy: 0,
          no_answer: 0
        },
        calledByUsers: new Set(),
        userCallCounts: {}
      }
    }

    clientStats[clientId].totalCalls++
    clientStats[clientId].callsByStatus[interaction.call_status]++
    
    // Track users who called this client
    if (interaction.users) {
      const userName = `${interaction.users.first_name} ${interaction.users.last_name}`
      clientStats[clientId].calledByUsers.add(userName)
      
      if (!clientStats[clientId].userCallCounts[userName]) {
        clientStats[clientId].userCallCounts[userName] = 0
      }
      clientStats[clientId].userCallCounts[userName]++
    }
    
    // Keep track of most recent call and who made it
    if (new Date(interaction.created_at) > new Date(clientStats[clientId].lastCall)) {
      clientStats[clientId].lastCall = interaction.created_at
      clientStats[clientId].lastCalledBy = interaction.users
    }
  })

  return Object.values(clientStats)
    .map((client: any) => ({
      ...client,
      calledByUsers: Array.from(client.calledByUsers),
      userCallCounts: client.userCallCounts
    }))
    .sort((a: any, b: any) => b.totalCalls - a.totalCalls)
    .slice(0, 20) // Top 20 most contacted clients
}

function processCallbackData(callbackData: any[]) {
  const now = new Date()
  let totalCallbacks = callbackData.length
  let overdueCallbacks = 0
  let completedCallbacks = 0

  callbackData.forEach(callback => {
    if (callback.callback_time) {
      const callbackTime = new Date(callback.callback_time)
      if (callbackTime < now) {
        overdueCallbacks++
      }
    }
  })

  const callbackCompletionRate = totalCallbacks > 0 
    ? Math.round((completedCallbacks / totalCallbacks) * 100) 
    : 0

  return {
    totalCallbacks,
    overdueCallbacks,
    completedCallbacks,
    callbackCompletionRate,
    pendingCallbacks: totalCallbacks - completedCallbacks - overdueCallbacks
  }
}