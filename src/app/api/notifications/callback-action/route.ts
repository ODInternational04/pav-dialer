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
    const { notification_id, action, call_data } = body

    if (!notification_id || !action) {
      return NextResponse.json({ error: 'notification_id and action are required' }, { status: 400 })
    }

    // Get the notification
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select(`
        *,
        clients:client_id (
          id,
          box_number,
          principal_key_holder,
          telephone_cell,
          telephone_home,
          principal_key_holder_email_address
        )
      `)
      .eq('id', notification_id)
      .eq('user_id', decoded.userId)
      .single()

    if (notifError || !notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    switch (action) {
      case 'initiate_call':
        // Mark notification as read and update status
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ 
            is_read: true,
            is_sent: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', notification_id)
          .eq('user_id', decoded.userId)

        if (updateError) {
          console.error('Error updating notification:', updateError)
          return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
        }

        // Log the callback initiation
        const logData = {
          user_id: decoded.userId,
          client_id: notification.client_id,
          call_type: 'outbound' as const,
          call_status: 'initiated' as any, // Will be updated when call completes
          notes: `Callback initiated automatically - ${notification.title}`,
          callback_requested: false,
          created_at: new Date().toISOString(),
          call_started_at: new Date().toISOString()
        }

        const { data: callLog, error: callLogError } = await supabase
          .from('call_logs')
          .insert(logData)
          .select()
          .single()

        if (callLogError) {
          console.error('Error creating call log:', callLogError)
          // Don't fail the request - the notification update is more important
        }

        return NextResponse.json({
          success: true,
          message: 'Callback call initiated',
          notification: notification,
          call_log: callLog,
          action_taken: 'initiate_call'
        })

      case 'mark_completed':
        // Mark the callback as completed
        const { error: completeError } = await supabase
          .from('notifications')
          .update({ 
            is_read: true,
            is_sent: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', notification_id)
          .eq('user_id', decoded.userId)

        if (completeError) {
          console.error('Error completing notification:', completeError)
          return NextResponse.json({ error: 'Failed to complete notification' }, { status: 500 })
        }

        // Create a call log if call_data is provided
        if (call_data) {
          const completionLogData = {
            user_id: decoded.userId,
            client_id: notification.client_id,
            call_type: call_data.call_type || 'outbound',
            call_status: call_data.call_status || 'completed',
            call_duration: call_data.call_duration || 0,
            notes: call_data.notes || `Callback completed - ${notification.title}`,
            callback_requested: call_data.callback_requested || false,
            callback_time: call_data.callback_time || null,
            created_at: new Date().toISOString(),
            call_started_at: call_data.call_started_at || new Date().toISOString(),
            call_ended_at: new Date().toISOString()
          }

          const { data: completionCallLog, error: completionCallLogError } = await supabase
            .from('call_logs')
            .insert(completionLogData)
            .select()
            .single()

          if (completionCallLogError) {
            console.error('Error creating completion call log:', completionCallLogError)
          }

          return NextResponse.json({
            success: true,
            message: 'Callback marked as completed',
            notification: notification,
            call_log: completionCallLog,
            action_taken: 'mark_completed'
          })
        }

        return NextResponse.json({
          success: true,
          message: 'Callback marked as completed',
          notification: notification,
          action_taken: 'mark_completed'
        })

      case 'snooze':
        // Snooze the callback by updating the scheduled time
        const { hours = 1 } = body
        const now = new Date()
        const newScheduledTime = new Date(now.getTime() + (hours * 60 * 60 * 1000))

        const { error: snoozeError } = await supabase
          .from('notifications')
          .update({ 
            scheduled_for: newScheduledTime.toISOString(),
            is_sent: false, // Reset so it can trigger again
            updated_at: new Date().toISOString()
          })
          .eq('id', notification_id)
          .eq('user_id', decoded.userId)

        if (snoozeError) {
          console.error('Error snoozing notification:', snoozeError)
          return NextResponse.json({ error: 'Failed to snooze notification' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: `Callback snoozed for ${hours} hour${hours > 1 ? 's' : ''}`,
          notification: notification,
          new_scheduled_time: newScheduledTime.toISOString(),
          action_taken: 'snooze'
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in callback action POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint to check callback status
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
    const client_id = searchParams.get('client_id')

    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }

    // Get pending callbacks for the client
    const { data: pendingCallbacks, error } = await supabase
      .from('notifications')
      .select(`
        *,
        clients:client_id (
          id,
          box_number,
          principal_key_holder,
          telephone_cell
        )
      `)
      .eq('user_id', decoded.userId)
      .eq('client_id', client_id)
      .eq('type', 'callback')
      .eq('is_sent', false)
      .order('scheduled_for', { ascending: true })

    if (error) {
      console.error('Error fetching pending callbacks:', error)
      return NextResponse.json({ error: 'Failed to fetch callbacks' }, { status: 500 })
    }

    // Determine if any callbacks are due now
    const now = new Date()
    const dueNow = pendingCallbacks?.filter(callback => 
      new Date(callback.scheduled_for) <= now
    ) || []

    const dueSoon = pendingCallbacks?.filter(callback => {
      const scheduledTime = new Date(callback.scheduled_for)
      const oneMinuteFromNow = new Date(now.getTime() + 60000)
      return scheduledTime > now && scheduledTime <= oneMinuteFromNow
    }) || []

    return NextResponse.json({
      client_id,
      pending_callbacks: pendingCallbacks || [],
      due_now: dueNow,
      due_soon: dueSoon,
      has_urgent_callbacks: dueNow.length > 0 || dueSoon.length > 0
    })
  } catch (error) {
    console.error('Error in callback action GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}