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

    // Only admin can export reports
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('reportType') || 'monthly' // daily, weekly, monthly
    const specificDate = searchParams.get('date') // For daily reports
    const userId = searchParams.get('userId')

    // Calculate date ranges based on report type (same logic as main reports API)
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
          queryStartDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()
          queryEndDate = new Date(now.setHours(23, 59, 59, 999)).toISOString()
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
        break
        
      case 'monthly':
      default:
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        
        queryStartDate = startOfMonth.toISOString()
        queryEndDate = endOfMonth.toISOString()
        break
    }

    // Get all the necessary data for the PDF report
    
    // User statistics
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

    // System statistics
    const { data: systemStats, error: systemStatsError } = await supabase.rpc('get_system_statistics', {
      start_date: queryStartDate,
      end_date: queryEndDate
    })

    if (systemStatsError) {
      console.error('Error fetching system statistics:', systemStatsError)
      return NextResponse.json({ error: 'Failed to fetch system statistics' }, { status: 500 })
    }

    // Detailed call logs
    let callLogsQuery = supabase
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
        users:user_id (
          first_name, 
          last_name, 
          email
        ),
        clients:client_id (
          principal_key_holder,
          box_number,
          telephone_cell,
          contract_no
        )
      `)
      .gte('created_at', queryStartDate)
      .lte('created_at', queryEndDate)
      .order('created_at', { ascending: false })
      .limit(100) // Limit for PDF

    if (userId) {
      callLogsQuery = callLogsQuery.eq('user_id', userId)
    }

    const { data: callLogs, error: callLogsError } = await callLogsQuery

    if (callLogsError) {
      console.error('Error fetching call logs:', callLogsError)
      return NextResponse.json({ error: 'Failed to fetch call logs' }, { status: 500 })
    }

    // Client interactions
    const { data: clientInteractions, error: clientInteractionsError } = await supabase
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

    if (clientInteractionsError) {
      console.error('Error fetching client interactions:', clientInteractionsError)
      return NextResponse.json({ error: 'Failed to fetch client interactions' }, { status: 500 })
    }

    // Process client interactions
    const processedClientStats = processClientInteractions(clientInteractions || [])

    // Prepare data for PDF generation
    const reportData = {
      userStats: userStats || [],
      systemStats: systemStats?.[0] || {},
      detailedCallLogs: callLogs || [],
      clientInteractions: processedClientStats,
      reportType: reportType as 'daily' | 'weekly' | 'monthly',
      dateRange: {
        startDate: queryStartDate,
        endDate: queryEndDate
      }
    }

    // Return the data - PDF generation will be handled on the frontend
    return NextResponse.json({ 
      success: true, 
      reportData,
      filename: generateFilename(reportType, queryStartDate, queryEndDate)
    })

  } catch (error) {
    console.error('Error in PDF reports export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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
        }
      }
    }

    clientStats[clientId].totalCalls++
    clientStats[clientId].callsByStatus[interaction.call_status]++
    
    if (new Date(interaction.created_at) > new Date(clientStats[clientId].lastCall)) {
      clientStats[clientId].lastCall = interaction.created_at
      clientStats[clientId].lastCalledBy = interaction.users
    }
  })

  return Object.values(clientStats)
    .sort((a: any, b: any) => b.totalCalls - a.totalCalls)
    .slice(0, 20)
}

function generateFilename(reportType: string, startDate: string, endDate: string): string {
  const start = new Date(startDate).toISOString().split('T')[0]
  const end = new Date(endDate).toISOString().split('T')[0]
  
  switch (reportType) {
    case 'daily':
      return `dialer-daily-report-${start}.pdf`
    case 'weekly':
      return `dialer-weekly-report-${start}-to-${end}.pdf`
    case 'monthly':
      return `dialer-monthly-report-${start}-to-${end}.pdf`
    default:
      return `dialer-report-${start}-to-${end}.pdf`
  }
}