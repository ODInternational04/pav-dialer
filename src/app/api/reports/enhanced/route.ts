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

    // Only admin can access enhanced reports
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('reportType') || 'weekly'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userIds = searchParams.get('users')?.split(',').filter(Boolean) || []
    const callStatuses = searchParams.get('status')?.split(',').filter(Boolean) || []
    const feedbackTypes = searchParams.get('feedbackTypes')?.split(',').filter(Boolean) || []
    const priorityLevels = searchParams.get('priorityLevels')?.split(',').filter(Boolean) || []
    const resolutionStatus = searchParams.get('resolutionStatus') || 'all'
    const clientSegment = searchParams.get('clientSegment') || 'all'
    const sortBy = searchParams.get('sortBy') || 'date'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const searchTerm = searchParams.get('search')
    const showFeedback = searchParams.get('showFeedback') === 'true'
    const showTrends = searchParams.get('showTrends') === 'true'
    const compareWithPrevious = searchParams.get('compareWithPrevious') === 'true'

    // Calculate date ranges
    let queryStartDate: string
    let queryEndDate: string
    let previousStartDate: string
    let previousEndDate: string

    const now = new Date()

    switch (reportType) {
      case 'daily':
        if (startDate) {
          const date = new Date(startDate)
          queryStartDate = new Date(date.setHours(0, 0, 0, 0)).toISOString()
          queryEndDate = new Date(date.setHours(23, 59, 59, 999)).toISOString()
          
          const prevDate = new Date(date)
          prevDate.setDate(prevDate.getDate() - 1)
          previousStartDate = new Date(prevDate.setHours(0, 0, 0, 0)).toISOString()
          previousEndDate = new Date(prevDate.setHours(23, 59, 59, 999)).toISOString()
        } else {
          queryStartDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()
          queryEndDate = new Date(now.setHours(23, 59, 59, 999)).toISOString()
          
          const yesterday = new Date(now)
          yesterday.setDate(yesterday.getDate() - 1)
          previousStartDate = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString()
          previousEndDate = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString()
        }
        break
        
      case 'weekly':
        const startOfWeek = new Date(now)
        const day = startOfWeek.getDay()
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
        startOfWeek.setDate(diff)
        startOfWeek.setHours(0, 0, 0, 0)
        
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)
        
        queryStartDate = startOfWeek.toISOString()
        queryEndDate = endOfWeek.toISOString()
        
        // Previous week
        const prevWeekStart = new Date(startOfWeek)
        prevWeekStart.setDate(prevWeekStart.getDate() - 7)
        const prevWeekEnd = new Date(endOfWeek)
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 7)
        
        previousStartDate = prevWeekStart.toISOString()
        previousEndDate = prevWeekEnd.toISOString()
        break
        
      case 'monthly':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        
        queryStartDate = startOfMonth.toISOString()
        queryEndDate = endOfMonth.toISOString()
        
        // Previous month
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
        
        previousStartDate = prevMonth.toISOString()
        previousEndDate = prevMonthEnd.toISOString()
        break

      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3)
        const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1)
        const endOfQuarter = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999)
        
        queryStartDate = startOfQuarter.toISOString()
        queryEndDate = endOfQuarter.toISOString()
        
        // Previous quarter
        const prevQuarterStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1)
        const prevQuarterEnd = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59, 999)
        
        previousStartDate = prevQuarterStart.toISOString()
        previousEndDate = prevQuarterEnd.toISOString()
        break

      case 'yearly':
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        
        queryStartDate = startOfYear.toISOString()
        queryEndDate = endOfYear.toISOString()
        
        // Previous year
        const prevYearStart = new Date(now.getFullYear() - 1, 0, 1)
        const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
        
        previousStartDate = prevYearStart.toISOString()
        previousEndDate = prevYearEnd.toISOString()
        break
        
      case 'custom':
      default:
        if (startDate && endDate) {
          queryStartDate = new Date(startDate).toISOString()
          queryEndDate = new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString()
          
          const daysDiff = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
          const prevEnd = new Date(startDate)
          prevEnd.setDate(prevEnd.getDate() - 1)
          const prevStart = new Date(prevEnd)
          prevStart.setDate(prevStart.getDate() - daysDiff)
          
          previousStartDate = prevStart.toISOString()
          previousEndDate = new Date(prevEnd.setHours(23, 59, 59, 999)).toISOString()
        } else {
          queryStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          queryEndDate = now.toISOString()
          
          previousStartDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
          previousEndDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        }
        break
    }

    console.log('Enhanced Reports Date Ranges:', {
      current: { queryStartDate, queryEndDate },
      previous: { previousStartDate, previousEndDate }
    })

    // 1. Get comprehensive user performance statistics
    const { data: userStats, error: userStatsError } = await supabase.rpc('get_user_call_statistics', {
      start_date: queryStartDate,
      end_date: queryEndDate
    })

    // 2. Get system-wide statistics
    const { data: systemStats, error: systemStatsError } = await supabase.rpc('get_system_statistics', {
      start_date: queryStartDate,
      end_date: queryEndDate
    })

    // 3. Get customer feedback statistics (if feedback system exists)
    let feedbackStats = null
    let feedbackStatsError = null
    
    if (showFeedback) {
      try {
        const { data: feedbackData, error: fbError } = await supabase.rpc('get_feedback_statistics', {
          start_date: queryStartDate,
          end_date: queryEndDate
        })
        feedbackStats = feedbackData?.[0] || null
        feedbackStatsError = fbError
      } catch (error) {
        console.log('Feedback statistics function not available, using direct queries')
        
        // Fallback: Direct query for customer feedback
        let feedbackQuery = supabase
          .from('customer_feedback')
          .select('*')
          .gte('created_at', queryStartDate)
          .lte('created_at', queryEndDate)

        if (feedbackTypes.length > 0) {
          feedbackQuery = feedbackQuery.in('feedback_type', feedbackTypes)
        }

        if (priorityLevels.length > 0) {
          feedbackQuery = feedbackQuery.in('priority', priorityLevels)
        }

        if (resolutionStatus !== 'all') {
          if (resolutionStatus === 'resolved') {
            feedbackQuery = feedbackQuery.eq('is_resolved', true)
          } else if (resolutionStatus === 'pending') {
            feedbackQuery = feedbackQuery.eq('is_resolved', false)
          } else if (resolutionStatus === 'overdue') {
            feedbackQuery = feedbackQuery.eq('is_resolved', false)
                                         .eq('priority', 'urgent')
          }
        }

        const { data: feedbackData } = await feedbackQuery

        if (feedbackData) {
          const totalFeedback = feedbackData.length
          const resolved = feedbackData.filter(f => f.is_resolved).length
          const complaints = feedbackData.filter(f => f.feedback_type === 'complaint').length
          const happy = feedbackData.filter(f => f.feedback_type === 'happy').length
          
          feedbackStats = {
            total_feedback: totalFeedback,
            complaints_count: complaints,
            happy_count: happy,
            suggestions_count: feedbackData.filter(f => f.feedback_type === 'suggestion').length,
            general_count: feedbackData.filter(f => f.feedback_type === 'general').length,
            resolved_count: resolved,
            pending_count: totalFeedback - resolved,
            high_priority_count: feedbackData.filter(f => f.priority === 'high').length,
            urgent_priority_count: feedbackData.filter(f => f.priority === 'urgent').length,
            average_resolution_time_hours: 0, // Would need more complex calculation
            satisfaction_score: totalFeedback > 0 ? Math.round((happy / totalFeedback) * 100) : 0,
            resolution_rate: totalFeedback > 0 ? Math.round((resolved / totalFeedback) * 100) : 0
          }
        }
      }
    }

    // 4. Get detailed call logs with enhanced filtering
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
          contract_no,
          occupation,
          contract_start_date,
          contract_end_date
        )
      `)
      .gte('created_at', queryStartDate)
      .lte('created_at', queryEndDate)
      .order('created_at', { ascending: sortOrder === 'asc' })
      .limit(1000)

    // Apply filters
    if (userIds.length > 0) {
      detailedCallLogsQuery = detailedCallLogsQuery.in('user_id', userIds)
    }

    if (callStatuses.length > 0) {
      detailedCallLogsQuery = detailedCallLogsQuery.in('call_status', callStatuses)
    }

    const { data: detailedCallLogs } = await detailedCallLogsQuery

    // 5. Get detailed customer feedback
    let detailedFeedback: any[] = []
    if (showFeedback) {
      let detailedFeedbackQuery = supabase
        .from('customer_feedback')
        .select(`
          id,
          created_at,
          feedback_type,
          subject,
          notes,
          priority,
          is_resolved,
          resolved_at,
          resolution_notes,
          client_id,
          user_id,
          clients:client_id (
            principal_key_holder,
            telephone_cell,
            box_number
          ),
          users:user_id (
            first_name,
            last_name,
            email
          ),
          resolved_by_user:resolved_by (
            first_name,
            last_name
          )
        `)
        .gte('created_at', queryStartDate)
        .lte('created_at', queryEndDate)
        .order('created_at', { ascending: false })
        .limit(500)

      if (feedbackTypes.length > 0) {
        detailedFeedbackQuery = detailedFeedbackQuery.in('feedback_type', feedbackTypes)
      }

      if (priorityLevels.length > 0) {
        detailedFeedbackQuery = detailedFeedbackQuery.in('priority', priorityLevels)
      }

      const { data: feedbackData } = await detailedFeedbackQuery
      detailedFeedback = feedbackData || []
    }

    // 6. Get client interactions with enhanced segmentation
    let clientInteractionsQuery = supabase
      .from('call_logs')
      .select(`
        client_id,
        call_status,
        created_at,
        call_duration,
        user_id,
        users:user_id (first_name, last_name, email),
        clients:client_id (
          principal_key_holder,
          telephone_cell,
          box_number,
          contract_start_date,
          contract_end_date,
          occupation
        )
      `)
      .gte('created_at', queryStartDate)
      .lte('created_at', queryEndDate)

    if (userIds.length > 0) {
      clientInteractionsQuery = clientInteractionsQuery.in('user_id', userIds)
    }

    const { data: clientInteractions } = await clientInteractionsQuery

    // 7. Get performance trends (if requested)
    let performanceTrends = []
    if (showTrends) {
      const trendDays = 30 // Last 30 days for trends
      const trendStartDate = new Date(Date.now() - trendDays * 24 * 60 * 60 * 1000).toISOString()
      
      const { data: trendData } = await supabase
        .from('call_logs')
        .select('created_at, call_status, user_id')
        .gte('created_at', trendStartDate)
        .lte('created_at', queryEndDate)

      performanceTrends = processTrendData(trendData || [])
    }

    // 8. Get satisfaction trends (customer feedback over time)
    let satisfactionTrends = []
    if (showTrends && showFeedback) {
      const { data: satisfactionData } = await supabase
        .from('customer_feedback')
        .select('created_at, feedback_type, priority')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('created_at', queryEndDate)

      satisfactionTrends = processSatisfactionTrends(satisfactionData || [])
    }

    // 9. Get previous period comparison data (if requested)
    let previousPeriodComparison = null
    if (compareWithPrevious) {
      const { data: prevSystemStats } = await supabase.rpc('get_system_statistics', {
        start_date: previousStartDate,
        end_date: previousEndDate
      })

      let prevFeedbackStats = null
      if (showFeedback) {
        const { data: prevFeedbackData } = await supabase
          .from('customer_feedback')
          .select('feedback_type, is_resolved')
          .gte('created_at', previousStartDate)
          .lte('created_at', previousEndDate)

        if (prevFeedbackData) {
          const totalPrev = prevFeedbackData.length
          const resolvedPrev = prevFeedbackData.filter(f => f.is_resolved).length
          const happyPrev = prevFeedbackData.filter(f => f.feedback_type === 'happy').length

          prevFeedbackStats = {
            total_feedback: totalPrev,
            resolved_count: resolvedPrev,
            satisfaction_score: totalPrev > 0 ? Math.round((happyPrev / totalPrev) * 100) : 0
          }
        }
      }

      previousPeriodComparison = {
        systemStats: prevSystemStats?.[0] || {},
        feedbackStats: prevFeedbackStats
      }
    }

    // Process and aggregate data
    const processedCallVolumeData = processCallVolumeByDate(detailedCallLogs || [])
    const processedClientStats = processClientInteractions(clientInteractions || [], clientSegment)

    // Apply search filtering
    let filteredDetailedCallLogs = detailedCallLogs || []
    let filteredDetailedFeedback = detailedFeedback || []
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      
      filteredDetailedCallLogs = filteredDetailedCallLogs.filter((call: any) => 
        (call.users?.first_name || '').toLowerCase().includes(term) ||
        (call.users?.last_name || '').toLowerCase().includes(term) ||
        (call.clients?.principal_key_holder || '').toLowerCase().includes(term) ||
        (call.clients?.telephone_cell || '').toLowerCase().includes(term) ||
        (call.call_status || '').toLowerCase().includes(term) ||
        (call.notes || '').toLowerCase().includes(term)
      )

      filteredDetailedFeedback = filteredDetailedFeedback.filter((feedback: any) =>
        (feedback.clients?.principal_key_holder || '').toLowerCase().includes(term) ||
        (feedback.subject || '').toLowerCase().includes(term) ||
        (feedback.notes || '').toLowerCase().includes(term) ||
        (feedback.feedback_type || '').toLowerCase().includes(term)
      )
    }

    return NextResponse.json({
      userStats: userStats || [],
      systemStats: systemStats?.[0] || {
        total_calls: 0,
        completed_calls: 0,
        overall_success_rate: 0,
        average_call_duration: 0,
        total_users: 0,
        active_users: 0,
        callbacks_pending: 0,
        callbacks_overdue: 0
      },
      feedbackStats: feedbackStats || {
        total_feedback: 0,
        complaints_count: 0,
        happy_count: 0,
        suggestions_count: 0,
        general_count: 0,
        resolved_count: 0,
        pending_count: 0,
        high_priority_count: 0,
        urgent_priority_count: 0,
        average_resolution_time_hours: 0,
        satisfaction_score: 0,
        resolution_rate: 0
      },
      callVolumeByDate: processedCallVolumeData,
      detailedCallLogs: filteredDetailedCallLogs,
      detailedFeedback: filteredDetailedFeedback,
      topUsers: userStats?.slice(0, 10) || [],
      clientInteractions: processedClientStats,
      performanceTrends,
      satisfactionTrends,
      previousPeriodComparison,
      reportType,
      dateRange: {
        startDate: queryStartDate,
        endDate: queryEndDate
      },
      appliedFilters: {
        userIds,
        callStatuses,
        feedbackTypes,
        priorityLevels,
        resolutionStatus,
        clientSegment,
        searchTerm,
        sortBy,
        sortOrder,
        showFeedback,
        showTrends,
        compareWithPrevious
      }
    })

  } catch (error) {
    console.error('Error in enhanced reports GET:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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
        no_answer: 0,
        callback_requests: 0,
        total_duration: 0
      }
    }

    dailyStats[date].total++
    dailyStats[date][call.call_status]++
    
    if (call.callback_requested) {
      dailyStats[date].callback_requests++
    }
    
    if (call.call_duration) {
      dailyStats[date].total_duration += call.call_duration
    }
  })

  return Object.values(dailyStats)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .map((day: any) => ({
      ...day,
      success_rate: day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0,
      average_duration: day.total > 0 ? Math.round(day.total_duration / day.total) : 0
    }))
}

function processClientInteractions(interactions: any[], segment: string) {
  const clientStats: Record<string, any> = {}

  interactions.forEach(interaction => {
    const clientId = interaction.client_id
    if (!clientStats[clientId]) {
      clientStats[clientId] = {
        client: interaction.clients,
        totalCalls: 0,
        totalDuration: 0,
        lastCall: interaction.created_at,
        firstCall: interaction.created_at,
        lastCalledBy: interaction.users,
        callsByStatus: {
          completed: 0,
          missed: 0,
          declined: 0,
          busy: 0,
          no_answer: 0
        },
        calledByUsers: new Set(),
        userCallCounts: {},
        contractValue: 0, // Could be calculated based on contract dates
        clientLifetime: 0
      }
    }

    const stats = clientStats[clientId]
    stats.totalCalls++
    stats.callsByStatus[interaction.call_status]++
    stats.totalDuration += interaction.call_duration || 0
    
    // Track users who called this client
    if (interaction.users) {
      const userName = `${interaction.users.first_name} ${interaction.users.last_name}`
      stats.calledByUsers.add(userName)
      
      if (!stats.userCallCounts[userName]) {
        stats.userCallCounts[userName] = 0
      }
      stats.userCallCounts[userName]++
    }
    
    // Track date ranges
    if (new Date(interaction.created_at) > new Date(stats.lastCall)) {
      stats.lastCall = interaction.created_at
      stats.lastCalledBy = interaction.users
    }
    
    if (new Date(interaction.created_at) < new Date(stats.firstCall)) {
      stats.firstCall = interaction.created_at
    }
  })

  let processedStats = Object.values(clientStats).map((client: any) => ({
    ...client,
    calledByUsers: Array.from(client.calledByUsers),
    userCallCounts: client.userCallCounts,
    successRate: client.totalCalls > 0 ? Math.round((client.callsByStatus.completed / client.totalCalls) * 100) : 0,
    averageDuration: client.totalCalls > 0 ? Math.round(client.totalDuration / client.totalCalls) : 0,
    daysSinceLastCall: Math.floor((new Date().getTime() - new Date(client.lastCall).getTime()) / (1000 * 60 * 60 * 24)),
    clientLifetimeDays: Math.floor((new Date(client.lastCall).getTime() - new Date(client.firstCall).getTime()) / (1000 * 60 * 60 * 24))
  }))

  // Apply client segmentation
  if (segment !== 'all') {
    switch (segment) {
      case 'high_value':
        processedStats = processedStats.filter(client => client.totalCalls >= 10 || client.successRate >= 80)
        break
      case 'frequent':
        processedStats = processedStats.filter(client => client.totalCalls >= 5)
        break
      case 'new':
        processedStats = processedStats.filter(client => client.clientLifetimeDays <= 30)
        break
      case 'inactive':
        processedStats = processedStats.filter(client => client.daysSinceLastCall > 14)
        break
    }
  }

  return processedStats
    .sort((a: any, b: any) => b.totalCalls - a.totalCalls)
    .slice(0, 50) // Top 50 clients
}

function processTrendData(trendData: any[]) {
  const dailyTrends: Record<string, any> = {}

  trendData.forEach(call => {
    const date = new Date(call.created_at).toISOString().split('T')[0]
    if (!dailyTrends[date]) {
      dailyTrends[date] = {
        date,
        total: 0,
        completed: 0,
        users: new Set()
      }
    }

    dailyTrends[date].total++
    if (call.call_status === 'completed') {
      dailyTrends[date].completed++
    }
    if (call.user_id) {
      dailyTrends[date].users.add(call.user_id)
    }
  })

  return Object.values(dailyTrends)
    .map((day: any) => ({
      ...day,
      activeUsers: day.users.size,
      successRate: day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0
    }))
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
}

function processSatisfactionTrends(satisfactionData: any[]) {
  const dailySatisfaction: Record<string, any> = {}

  satisfactionData.forEach(feedback => {
    const date = new Date(feedback.created_at).toISOString().split('T')[0]
    if (!dailySatisfaction[date]) {
      dailySatisfaction[date] = {
        date,
        total: 0,
        happy: 0,
        complaints: 0,
        urgent: 0
      }
    }

    dailySatisfaction[date].total++
    if (feedback.feedback_type === 'happy') {
      dailySatisfaction[date].happy++
    }
    if (feedback.feedback_type === 'complaint') {
      dailySatisfaction[date].complaints++
    }
    if (feedback.priority === 'urgent') {
      dailySatisfaction[date].urgent++
    }
  })

  return Object.values(dailySatisfaction)
    .map((day: any) => ({
      ...day,
      satisfactionScore: day.total > 0 ? Math.round((day.happy / day.total) * 100) : 0,
      complaintRate: day.total > 0 ? Math.round((day.complaints / day.total) * 100) : 0
    }))
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
}