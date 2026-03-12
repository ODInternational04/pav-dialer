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
          notes,
          zoho_contact_id
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
          notes,
          zoho_contact_id
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

    // Sync to Zoho Bigin asynchronously (don't wait for it)
    // Use Promise.resolve to run after current execution context
    Promise.resolve().then(async () => {
      try {
        console.log('🚀 Starting Zoho sync for call log:', callLog.id)
        await syncCallToZoho(callLog)
      } catch (err: any) {
        console.error('❌ ZOHO SYNC FAILED:', err.message)
      }
    })

    return NextResponse.json(callLog, { status: 201 })
  } catch (error) {
    console.error('Error in call logs POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Async function to sync call log to Zoho Bigin
 * This runs in the background and doesn't block the API response
 */
async function syncCallToZoho(callLog: any) {
  try {
    console.log('🔵 syncCallToZoho STARTED')
    console.log('Call log ID:', callLog.id)
    console.log('Client data:', callLog.clients)
    console.log('Has Zoho contact ID?', !!callLog.clients?.zoho_contact_id)
    
    // Skip if Zoho is not configured
    if (!process.env.ZOHO_REFRESH_TOKEN) {
      console.log('⏭️ Zoho sync skipped: ZOHO_REFRESH_TOKEN not configured')
      return
    }

    // Dynamically import zoho client
    const { zohoClient } = await import('@/lib/zoho')

    let zohoContactId = callLog.clients?.zoho_contact_id

    // If client doesn't have Zoho ID, search or create contact
    if (!zohoContactId) {
      console.log(`🔍 Searching for Zoho contact for ${callLog.clients.phone}`)
      
      const searchResult = await zohoClient.searchContactByPhone(callLog.clients.phone)
      
      if (searchResult?.data && searchResult.data.length > 0) {
        // Found existing contact
        zohoContactId = searchResult.data[0].id
        console.log(`✅ Found existing Zoho contact: ${zohoContactId}`)
      } else {
        // Create new contact in Zoho
        console.log(`➕ Creating new Zoho contact for ${callLog.clients.name}`)
        const createResult = await zohoClient.createContact(callLog.clients)
        
        if (createResult.data && createResult.data[0].code === 'SUCCESS') {
          zohoContactId = createResult.data[0].details.id
          console.log(`✅ Created Zoho contact: ${zohoContactId}`)
        } else {
          throw new Error(`Failed to create Zoho contact: ${createResult.data?.[0]?.message || 'Unknown error'}`)
        }
      }

      // Update client with Zoho ID
      await supabase
        .from('clients')
        .update({ 
          zoho_contact_id: zohoContactId,
          zoho_synced_at: new Date().toISOString(),
          zoho_last_sync_status: 'success'
        })
        .eq('id', callLog.client_id)
    }

    // Create activity in Zoho
    console.log(`📞 Creating Zoho activity for call log ${callLog.id}`)
    const activityResult = await zohoClient.createActivity({
      ...callLog,
      zoho_contact_id: zohoContactId
    })

    if (activityResult.data && activityResult.data[0].code === 'SUCCESS') {
      const zohoActivityId = activityResult.data[0].details.id
      console.log(`✅ Created Zoho activity: ${zohoActivityId}`)
      
      // Update call log with Zoho activity ID
      await supabase
        .from('call_logs')
        .update({
          zoho_activity_id: zohoActivityId,
          zoho_synced_at: new Date().toISOString(),
          zoho_sync_status: 'success',
          zoho_sync_error: null
        })
        .eq('id', callLog.id)

      // Log successful sync
      await supabase
        .from('zoho_sync_log')
        .insert({
          sync_type: 'activity',
          entity_type: 'call_log',
          entity_id: callLog.id,
          zoho_id: zohoActivityId,
          status: 'success',
          request_data: { 
            call_log_id: callLog.id,
            zoho_contact_id: zohoContactId
          },
          response_data: activityResult.data[0],
          completed_at: new Date().toISOString()
        })
    } else {
      throw new Error(`Failed to create Zoho activity: ${activityResult.data?.[0]?.message || 'Unknown error'}`)
    }
  } catch (error: any) {
    console.error('❌ Failed to sync call to Zoho:', error.message)
    
    // Update call log with error status
    await supabase
      .from('call_logs')
      .update({
        zoho_sync_status: 'failed',
        zoho_sync_error: error.message
      })
      .eq('id', callLog.id)

    // Log failed sync
    await supabase
      .from('zoho_sync_log')
      .insert({
        sync_type: 'activity',
        entity_type: 'call_log',
        entity_id: callLog.id,
        status: 'failed',
        error_message: error.message,
        request_data: { call_log_id: callLog.id },
        completed_at: new Date().toISOString()
      })
    
    throw error
  }
}