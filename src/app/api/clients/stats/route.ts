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

    // Get filter parameters from query string
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const quotationStatus = searchParams.get('quotationStatus') || 'all'
    const bookingStatus = searchParams.get('bookingStatus') || 'all'

    // Build base query with filters
    let clientQuery = supabase
      .from('clients')
      .select('id, quotation_done, booking_status', { count: 'exact' })

    // Apply search filter
    if (search) {
      const searchTerm = search.trim()
      clientQuery = clientQuery.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
    }

    // Apply quotation status filter
    if (quotationStatus === 'done') {
      clientQuery = clientQuery.eq('quotation_done', true)
    } else if (quotationStatus === 'not_done') {
      clientQuery = clientQuery.or('quotation_done.eq.false,quotation_done.is.null')
    }

    // Apply booking status filter
    if (bookingStatus !== 'all') {
      if (bookingStatus === 'none') {
        clientQuery = clientQuery.or('booking_status.is.null,booking_status.eq.')
      } else {
        clientQuery = clientQuery.eq('booking_status', bookingStatus)
      }
    }

    // Get filtered clients
    const { data: allClients, error: clientsError, count: totalClients } = await clientQuery

    if (clientsError) {
      console.error('Error fetching clients:', clientsError)
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      )
    }

    const clients = allClients || []

    // Get call logs to determine which clients have been called
    const { data: callLogs } = await supabase
      .from('call_logs')
      .select('client_id, call_status')

    // Create set of called client IDs
    const calledClientIds = new Set(callLogs?.map(log => log.client_id) || [])
    
    // Filter clients based on which ones have been called
    const calledClients = clients.filter(c => calledClientIds.has(c.id))
    const notCalledClients = clients.filter(c => !calledClientIds.has(c.id))

    // Calculate call status breakdown
    const callStatusStats = {
      completed: 0,
      missed: 0,
      declined: 0,
      busy: 0,
      no_answer: 0
    }

    callLogs?.forEach(call => {
      if (call.call_status in callStatusStats) {
        callStatusStats[call.call_status as keyof typeof callStatusStats]++
      }
    })

    // Calculate quotation statistics
    const quotationDone = clients.filter(c => c.quotation_done === true).length
    const quotationPending = clients.filter(c => !c.quotation_done).length

    // Calculate booking status statistics
    const bookingStatusCounts = {
      pending: clients.filter(c => c.booking_status === 'Pending').length,
      confirmed: clients.filter(c => c.booking_status === 'Confirmed').length,
      cancelled: clients.filter(c => c.booking_status === 'Cancelled').length,
      completed: clients.filter(c => c.booking_status === 'Completed').length,
      onHold: clients.filter(c => c.booking_status === 'On Hold').length,
      followUp: clients.filter(c => c.booking_status === 'Follow Up Required').length,
      none: clients.filter(c => !c.booking_status || c.booking_status === '').length
    }

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
      calledClients: calledClients.length,
      notCalledClients: notCalledClients.length,
      successRate: totalClients ? Math.round((calledClients.length / totalClients) * 100) : 0,
      
      // Quotation statistics
      quotationDone: quotationDone,
      quotationPending: quotationPending,
      
      // Booking status statistics
      bookingStatus: bookingStatusCounts,
      
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