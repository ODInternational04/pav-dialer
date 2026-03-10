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
    const reportType = searchParams.get('reportType') || 'weekly' // daily, weekly, monthly, custom
    const specificDate = searchParams.get('date') // For daily reports
    const startDate = searchParams.get('startDate') // For custom range
    const endDate = searchParams.get('endDate') // For custom range
    const userIds = searchParams.get('users')?.split(',').filter(Boolean) || [] // Multiple users
    const callStatuses = searchParams.get('status')?.split(',').filter(Boolean) || [] // Multiple statuses
    const clientType = searchParams.get('clientType')
    const includeCallbacks = searchParams.get('includeCallbacks') === 'true'
    const sortBy = searchParams.get('sortBy') || 'date'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const searchTerm = searchParams.get('search')

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
        // Current month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        
        queryStartDate = startOfMonth.toISOString()
        queryEndDate = endOfMonth.toISOString()
        break
        
      case 'custom':
        // Use provided date range
        if (startDate && endDate) {
          queryStartDate = new Date(startDate).toISOString()
          queryEndDate = new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString()
        } else {
          // Fallback to last 30 days if no custom range provided
          queryStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          queryEndDate = now.toISOString()
        }
        break
        
      default:
        // Default to weekly
        const defaultStartOfWeek = new Date(now)
        const defaultDay = defaultStartOfWeek.getDay()
        const defaultDiff = defaultStartOfWeek.getDate() - defaultDay + (defaultDay === 0 ? -6 : 1)
        defaultStartOfWeek.setDate(defaultDiff)
        defaultStartOfWeek.setHours(0, 0, 0, 0)
        
        const defaultEndOfWeek = new Date(defaultStartOfWeek)
        defaultEndOfWeek.setDate(defaultStartOfWeek.getDate() + 6)
        defaultEndOfWeek.setHours(23, 59, 59, 999)
        
        queryStartDate = defaultStartOfWeek.toISOString()
        queryEndDate = defaultEndOfWeek.toISOString()
        break
    }

    // Get user performance statistics
    let userStats = []
    let userStatsError = null
    
    try {
      const { data: userStatsData, error: userStatsErr } = await supabase.rpc('get_user_call_statistics', {
        start_date: queryStartDate,
        end_date: queryEndDate
      })
      
      // If RPC function doesn't exist, error is returned (not thrown) — force fallback
      if (userStatsErr) throw userStatsErr
      
      userStats = userStatsData || []
      userStatsError = userStatsErr
      
      // Apply user filters if specified
      if (userIds.length > 0 && userStats) {
        userStats = userStats.filter((stat: any) => userIds.includes(stat.user_id))
      }
    } catch (error) {
      console.error('Database function get_user_call_statistics not available, using fallback:', error)
      // Fallback: Get basic user stats from call_logs directly
      let callLogsQuery = supabase
        .from('call_logs')
        .select(`
          user_id,
          call_status,
          call_duration,
          created_at,
          users:user_id (first_name, last_name, email)
        `)
        .gte('created_at', queryStartDate)
        .lte('created_at', queryEndDate)
      
      if (userIds.length > 0) {
        callLogsQuery = callLogsQuery.in('user_id', userIds)
      }
      
      const { data: callLogs } = await callLogsQuery
      
      // Process into user stats
      const userStatsMap: Record<string, any> = {}
      
      callLogs?.forEach((call: any) => {
        const userId = call.user_id
        if (!userStatsMap[userId]) {
          userStatsMap[userId] = {
            user_id: userId,
            first_name: call.users?.first_name || 'Unknown',
            last_name: call.users?.last_name || 'User',
            email: call.users?.email || '',
            total_calls: 0,
            completed_calls: 0,
            missed_calls: 0,
            declined_calls: 0,
            busy_calls: 0,
            no_answer_calls: 0,
            total_call_duration: 0,
            success_rate: 0,
            average_call_duration: 0
          }
        }
        
        const stats = userStatsMap[userId]
        stats.total_calls++
        stats[`${call.call_status}_calls`]++
        stats.total_call_duration += call.call_duration || 0
      })
      
      // Calculate success rates and averages
      userStats = Object.values(userStatsMap).map((stats: any) => ({
        ...stats,
        success_rate: stats.total_calls > 0 ? Math.round((stats.completed_calls / stats.total_calls) * 100) : 0,
        average_call_duration: stats.total_calls > 0 ? Math.round(stats.total_call_duration / stats.total_calls) : 0
      }))
    }

    // Get user details to ensure we have names (fallback if function doesn't return them)
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('is_active', true)

    console.log('Raw user data from database:', allUsers)

    // Merge user details with statistics
    const enhancedUserStats = userStats?.map((stat: any) => {
      const user = allUsers?.find(u => u.id === stat.user_id)
      
      // Function to clean and validate names
      const cleanName = (name: any) => {
        if (!name || typeof name !== 'string') return ''
        const cleaned = name.trim()
        return cleaned && cleaned !== 'null' && cleaned !== 'undefined' ? cleaned : ''
      }
      
      const firstName = cleanName(stat.first_name) || cleanName(user?.first_name) || ''
      const lastName = cleanName(stat.last_name) || cleanName(user?.last_name) || ''
      const email = stat.email || user?.email || ''
      
      // If no proper names, try to derive from email
      let displayFirstName = firstName
      let displayLastName = lastName
      
      if (!firstName && !lastName && email) {
        console.log(`No names found for user ${stat.user_id}, attempting email extraction from: ${email}`)
        const emailUsername = email.split('@')[0]
        
        // Try different splitting patterns
        let emailParts = []
        if (emailUsername.includes('.')) {
          emailParts = emailUsername.split('.')
        } else if (emailUsername.includes('_')) {
          emailParts = emailUsername.split('_')
        } else {
          // Try camelCase split
          emailParts = emailUsername.split(/(?=[A-Z])/)
        }
        
        if (emailParts.length >= 2) {
          displayFirstName = emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1).toLowerCase()
          displayLastName = emailParts[1].charAt(0).toUpperCase() + emailParts[1].slice(1).toLowerCase()
        } else if (emailParts.length === 1 && emailParts[0]) {
          displayFirstName = emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1).toLowerCase()
          displayLastName = 'User'
        }
        
        console.log(`Extracted names: ${displayFirstName} ${displayLastName}`)
      }
      
      // Ensure we always have some name
      if (!displayFirstName && !displayLastName) {
        // Final fallback: use part of user ID
        const userIdSlice = stat.user_id ? stat.user_id.toString().slice(0, 8) : 'unknown'
        displayFirstName = `User`
        displayLastName = userIdSlice
      }
      
      return {
        ...stat,
        first_name: displayFirstName || 'Unknown',
        last_name: displayLastName || 'User',
        email: email || 'No email',
        user_name: `${displayFirstName || 'Unknown'} ${displayLastName || 'User'}`.trim()
      }
    }) || []

    console.log('Enhanced user stats:', enhancedUserStats)

    // Get overall system statistics
    let systemStats = []
    let systemStatsError = null
    
    try {
      const { data: systemStatsData, error: systemStatsErr } = await supabase.rpc('get_system_statistics', {
        start_date: queryStartDate,
        end_date: queryEndDate
      })
      
      // If RPC function doesn't exist, error is returned (not thrown) — force fallback
      if (systemStatsErr) throw systemStatsErr
      
      systemStats = systemStatsData || []
      systemStatsError = systemStatsErr
    } catch (error) {
      console.error('Database function get_system_statistics not available, using fallback:', error)
      
      // Fallback: Calculate system stats from call_logs directly
      const { data: allCallLogs } = await supabase
        .from('call_logs')
        .select('call_status, call_duration, created_at')
        .gte('created_at', queryStartDate)
        .lte('created_at', queryEndDate)
      
      const { data: totalUsers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'user')
        .eq('is_active', true)
      
      const { data: totalClients } = await supabase
        .from('clients')
        .select('id')
      
      const totalCalls = allCallLogs?.length || 0
      const completedCalls = allCallLogs?.filter(call => call.call_status === 'completed').length || 0
      const totalDuration = allCallLogs?.reduce((sum, call) => sum + (call.call_duration || 0), 0) || 0
      
      systemStats = [{
        total_calls: totalCalls,
        completed_calls: completedCalls,
        missed_calls: allCallLogs?.filter(call => call.call_status === 'missed').length || 0,
        declined_calls: allCallLogs?.filter(call => call.call_status === 'declined').length || 0,
        busy_calls: allCallLogs?.filter(call => call.call_status === 'busy').length || 0,
        no_answer_calls: allCallLogs?.filter(call => call.call_status === 'no_answer').length || 0,
        total_call_duration: totalDuration,
        success_rate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
        average_call_duration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
        active_users: totalUsers?.length || 0,
        total_clients: totalClients?.length || 0
      }]
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
        clients:client_id (name, phone, email)
      `)
      .gte('created_at', queryStartDate)
      .lte('created_at', queryEndDate)
      .order('created_at', { ascending: false })

    // Apply user filters if specified
    if (userIds.length > 0) {
      callVolumeQuery = callVolumeQuery.in('user_id', userIds)
    }

    // Apply status filters if specified
    if (callStatuses.length > 0) {
      callVolumeQuery = callVolumeQuery.in('call_status', callStatuses)
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
          name,
          phone,
          email
        )
      `)
      .gte('created_at', queryStartDate)
      .lte('created_at', queryEndDate)
      .order('created_at', { ascending: false })
      .limit(500) // Limit to prevent excessive data

    // Apply filters if specified
    if (userIds.length > 0) {
      detailedCallLogsQuery = detailedCallLogsQuery.in('user_id', userIds)
    }

    if (callStatuses.length > 0) {
      detailedCallLogsQuery = detailedCallLogsQuery.in('call_status', callStatuses)
    }

    // Add search functionality
    if (searchTerm) {
      // We'll need to get the data first and filter client-side since Supabase doesn't support complex text search on joined tables easily
    }

    // Apply sorting
    if (sortBy === 'date') {
      detailedCallLogsQuery = detailedCallLogsQuery.order('created_at', { ascending: sortOrder === 'asc' })
    }

    const { data: detailedCallLogs, error: detailedCallLogsError } = await detailedCallLogsQuery

    if (detailedCallLogsError) {
      console.error('Error fetching detailed call logs:', detailedCallLogsError)
      return NextResponse.json({ error: 'Failed to fetch detailed call logs' }, { status: 500 })
    }

    // Get top performing users (from call_statistics view if available, otherwise skip)
    let topUsers: any[] = []
    try {
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

      if (userIds.length > 0) {
        topUsersQuery = topUsersQuery.in('user_id', userIds)
      }

      const { data: topUsersData, error: topUsersError } = await topUsersQuery
      if (!topUsersError) {
        topUsers = topUsersData || []
      }
    } catch (error) {
      console.log('call_statistics table not available, skipping top users')
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

    // Apply user filters if specified
    if (userIds.length > 0) {
      callbackStatsQuery = callbackStatsQuery.in('user_id', userIds)
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
          name,
          phone,
          email
        )
      `)
      .gte('created_at', queryStartDate)
      .lte('created_at', queryEndDate)

    // Apply user filters if specified
    if (userIds.length > 0) {
      clientInteractionsQuery = clientInteractionsQuery.in('user_id', userIds)
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

    // Enhance call logs with proper user names
    const enhancedDetailedCallLogs = (detailedCallLogs || []).map((call: any) => {
      if (call.users) {
        const cleanName = (name: any) => {
          if (!name || typeof name !== 'string') return ''
          const cleaned = name.trim()
          return cleaned && cleaned !== 'null' && cleaned !== 'undefined' ? cleaned : ''
        }
        
        let firstName = cleanName(call.users.first_name)
        let lastName = cleanName(call.users.last_name)
        const email = call.users.email || ''
        
        // If no proper names, try to derive from email
        if (!firstName && !lastName && email) {
          const emailParts = email.split('@')[0].split(/[._]/)
          if (emailParts.length >= 2) {
            firstName = emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1)
            lastName = emailParts[1].charAt(0).toUpperCase() + emailParts[1].slice(1)
          } else if (emailParts.length === 1) {
            firstName = emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1)
          }
        }
        
        // Fallback to allUsers data
        if (!firstName && !lastName) {
          const foundUser = allUsers?.find(u => u.id === call.user_id)
          if (foundUser) {
            firstName = cleanName(foundUser.first_name) || 'Unknown'
            lastName = cleanName(foundUser.last_name) || 'User'
          }
        }
        
        call.users.first_name = firstName || 'Unknown'
        call.users.last_name = lastName || 'User'
      }
      return call
    })

    // Apply client-side filtering for search terms if needed
    let filteredDetailedCallLogs = enhancedDetailedCallLogs
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filteredDetailedCallLogs = filteredDetailedCallLogs.filter((call: any) => 
        (call.users?.first_name || '').toLowerCase().includes(term) ||
        (call.users?.last_name || '').toLowerCase().includes(term) ||
        (call.clients?.name || '').toLowerCase().includes(term) ||
        (call.clients?.phone || '').toLowerCase().includes(term) ||
        (call.call_status || '').toLowerCase().includes(term) ||
        (call.notes || '').toLowerCase().includes(term)
      )
    }

    return NextResponse.json({
      userStats: enhancedUserStats || [],
      systemStats: systemStats?.[0] || {},
      callVolumeByDate: processedCallVolumeData,
      detailedCallLogs: filteredDetailedCallLogs,
      topUsers: topUsers || [],
      callbackStats: processedCallbackStats,
      clientInteractions: processedClientStats,
      reportType: reportType,
      dateRange: {
        startDate: queryStartDate,
        endDate: queryEndDate
      },
      appliedFilters: {
        userIds,
        callStatuses,
        searchTerm,
        sortBy,
        sortOrder,
        includeCallbacks
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