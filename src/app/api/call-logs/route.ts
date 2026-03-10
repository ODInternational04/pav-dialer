import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { serverCache } from '@/lib/cache'

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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const clientId = searchParams.get('clientId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const callType = searchParams.get('callType')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const offset = (page - 1) * limit

    let query = supabase
      .from('call_logs')
      .select(`
        *,
        clients:client_id (
          id,
          name,
          phone,
          email,
          notes
        ),
        users:user_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (status) {
      query = query.eq('call_status', status)
    }

    if (callType) {
      query = query.eq('call_type', callType)
    }

    if (search) {
      // Search in client name, phone, or notes
      query = query.or(`clients.name.ilike.%${search}%,clients.phone.ilike.%${search}%,notes.ilike.%${search}%`)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      // Append end-of-day time so today's records are included
      const endOfDay = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`
      query = query.lte('created_at', endOfDay)
    }

    // For non-admin users, only show their own calls
    if (decoded.role !== 'admin') {
      query = query.eq('user_id', decoded.userId)
    }

    // Get total count with same filters
    let countQuery = supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })

    // Apply same filters to count query
    if (clientId) {
      countQuery = countQuery.eq('client_id', clientId)
    }
    if (userId) {
      countQuery = countQuery.eq('user_id', userId)
    }
    if (status) {
      countQuery = countQuery.eq('call_status', status)
    }
    if (callType) {
      countQuery = countQuery.eq('call_type', callType)
    }
    if (startDate) {
      countQuery = countQuery.gte('created_at', startDate)
    }
    if (endDate) {
      const endOfDay = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`
      countQuery = countQuery.lte('created_at', endOfDay)
    }
    if (decoded.role !== 'admin') {
      countQuery = countQuery.eq('user_id', decoded.userId)
    }

    const { count } = await countQuery

    // Get paginated data
    const { data: callLogs, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching call logs:', error)
      return NextResponse.json({ error: 'Failed to fetch call logs' }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    const response = NextResponse.json({
      callLogs,
      totalCount: count || 0,
      page,
      limit,
      totalPages,
    })
    
    // Add cache headers for better performance (30 second cache)
    response.headers.set('Cache-Control', 'private, s-maxage=10, stale-while-revalidate=30')
    
    return response
  } catch (error) {
    console.error('Error in call logs GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const {
      client_id,
      call_type,
      call_status,
      call_duration,
      notes,
      callback_requested,
      callback_time,
      call_started_at,
      call_ended_at
    } = body

    // Validate required fields
    if (!client_id || !call_type || !call_status) {
      return NextResponse.json(
        { error: 'Missing required fields: client_id, call_type, call_status' },
        { status: 400 }
      )
    }

    // Validate callback requirements
    if (callback_requested && !callback_time) {
      return NextResponse.json(
        { error: 'Callback time must be specified when callback is requested' },
        { status: 400 }
      )
    }

    const callLogData = {
      client_id,
      user_id: decoded.userId,
      call_type,
      call_status,
      call_duration: call_duration || null,
      notes: notes?.trim() || '',
      callback_requested: callback_requested || false,
      callback_time: callback_time || null,
      call_started_at: call_started_at || new Date().toISOString(),
      call_ended_at: call_ended_at || null,
    }

    const { data: callLog, error } = await supabase
      .from('call_logs')
      .insert(callLogData)
      .select(`
        *,
        clients:client_id (
          id,
          name,
          phone,
          email,
          notes
        ),
        users:user_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error creating call log:', error)
      return NextResponse.json({ error: 'Failed to create call log' }, { status: 500 })
    }

    // Create callback notification if requested
    if (callback_requested && callback_time) {
      const notificationData = {
        user_id: decoded.userId,
        client_id,
        call_log_id: callLog.id,
        type: 'callback',
        title: 'Callback Reminder',
        message: `Callback scheduled for ${callLog.clients?.name} (${callLog.clients?.phone})`,
        scheduled_for: callback_time,
      }

      await supabase
        .from('notifications')
        .insert(notificationData)
    }

    return NextResponse.json(callLog, { status: 201 })
  } catch (error) {
    console.error('Error in call logs POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}