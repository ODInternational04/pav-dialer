import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

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
    const { client_id, call_log_id, hours = 1 } = body

    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }

    // Get client information
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('principal_key_holder, telephone_cell')
      .eq('id', client_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Calculate callback time
    const now = new Date()
    const callbackTime = new Date(now.getTime() + (hours * 60 * 60 * 1000))

    const notificationData = {
      user_id: decoded.userId,
      client_id,
      call_log_id: call_log_id || null,
      type: 'callback',
      title: 'Callback Reminder',
      message: `Callback scheduled for ${client.principal_key_holder} (${client.telephone_cell}) in ${hours} hour${hours > 1 ? 's' : ''}`,
      scheduled_for: callbackTime.toISOString(),
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select(`
        *,
        clients:client_id (
          id,
          box_number,
          principal_key_holder,
          telephone_cell
        ),
        call_logs:call_log_id (
          id,
          call_status,
          notes
        )
      `)
      .single()

    if (error) {
      console.error('Error creating callback notification:', error)
      return NextResponse.json({ error: 'Failed to create callback notification' }, { status: 500 })
    }

    return NextResponse.json({
      notification,
      callbackTime: callbackTime.toISOString(),
      message: `Callback reminder set for ${hours} hour${hours > 1 ? 's' : ''} from now`
    }, { status: 201 })
  } catch (error) {
    console.error('Error in callback POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}