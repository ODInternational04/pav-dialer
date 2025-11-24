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

    // Get total clients count
    const { count: totalClients } = await supabase
      .from('clients')
      .select('id', { count: 'exact' })

    // Get clients with calls
    const { data: clientsWithCalls } = await supabase
      .from('call_logs')
      .select('client_id')
      .not('client_id', 'is', null)

    const uniqueCalledClients = new Set(clientsWithCalls?.map(log => log.client_id) || [])
    const calledClientsCount = uniqueCalledClients.size
    const notCalledClientsCount = (totalClients || 0) - calledClientsCount

    // Get call statistics by status
    const { data: callStats } = await supabase
      .from('call_logs')
      .select('call_status, client_id')

    const callStatusStats = {
      completed: 0,
      missed: 0,
      declined: 0,
      busy: 0,
      no_answer: 0
    }

    callStats?.forEach(call => {
      if (call.call_status in callStatusStats) {
        callStatusStats[call.call_status as keyof typeof callStatusStats]++
      }
    })

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: recentCalls } = await supabase
      .from('call_logs')
      .select('id', { count: 'exact' })
      .gte('created_at', sevenDaysAgo.toISOString())

    // Get clients added in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: newClients } = await supabase
      .from('clients')
      .select('id', { count: 'exact' })
      .gte('created_at', thirtyDaysAgo.toISOString())

    const stats = {
      totalClients: totalClients || 0,
      calledClients: calledClientsCount,
      notCalledClients: notCalledClientsCount,
      successRate: totalClients ? Math.round((calledClientsCount / totalClients) * 100) : 0,
      callStatusBreakdown: callStatusStats,
      recentActivity: {
        callsLast7Days: recentCalls || 0,
        newClientsLast30Days: newClients || 0
      }
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching client stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}