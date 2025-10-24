import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

interface Params {
  id: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id } = params

    let query = supabase
      .from('call_logs')
      .select(`
        *,
        clients:client_id (
          id,
          box_number,
          principal_key_holder,
          telephone_cell,
          contract_no
        ),
        users:user_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', id)

    // For non-admin users, only show their own calls
    if (decoded.role !== 'admin') {
      query = query.eq('user_id', decoded.userId)
    }

    const { data: callLog, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
      }
      console.error('Error fetching call log:', error)
      return NextResponse.json({ error: 'Failed to fetch call log' }, { status: 500 })
    }

    return NextResponse.json(callLog)
  } catch (error) {
    console.error('Error in call log GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const {
      call_status,
      call_duration,
      notes,
      callback_requested,
      callback_time,
      call_ended_at
    } = body

    // Enforce mandatory notes
    if (notes !== undefined && (!notes || notes.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Notes are mandatory for all calls' },
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

    // First check if the call log exists and user has permission
    let existingQuery = supabase
      .from('call_logs')
      .select('*')
      .eq('id', id)

    if (decoded.role !== 'admin') {
      existingQuery = existingQuery.eq('user_id', decoded.userId)
    }

    const { data: existingCallLog, error: existingError } = await existingQuery.single()

    if (existingError) {
      if (existingError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to verify call log' }, { status: 500 })
    }

    const updateData: any = {}
    if (call_status !== undefined) updateData.call_status = call_status
    if (call_duration !== undefined) updateData.call_duration = call_duration
    if (notes !== undefined) updateData.notes = notes.trim()
    if (callback_requested !== undefined) updateData.callback_requested = callback_requested
    if (callback_time !== undefined) updateData.callback_time = callback_time
    if (call_ended_at !== undefined) updateData.call_ended_at = call_ended_at

    const { data: callLog, error } = await supabase
      .from('call_logs')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        clients:client_id (
          id,
          box_number,
          principal_key_holder,
          telephone_cell,
          contract_no
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
      console.error('Error updating call log:', error)
      return NextResponse.json({ error: 'Failed to update call log' }, { status: 500 })
    }

    // Handle callback notification updates
    if (callback_requested && callback_time) {
      // Check if notification already exists
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('call_log_id', id)
        .eq('type', 'callback')
        .single()

      if (existingNotification) {
        // Update existing notification
        await supabase
          .from('notifications')
          .update({
            scheduled_for: callback_time,
            message: `Callback scheduled for ${callLog.clients?.principal_key_holder} (${callLog.clients?.telephone_cell})`,
          })
          .eq('id', existingNotification.id)
      } else {
        // Create new notification
        await supabase
          .from('notifications')
          .insert({
            user_id: existingCallLog.user_id,
            client_id: existingCallLog.client_id,
            call_log_id: id,
            type: 'callback',
            title: 'Callback Reminder',
            message: `Callback scheduled for ${callLog.clients?.principal_key_holder} (${callLog.clients?.telephone_cell})`,
            scheduled_for: callback_time,
          })
      }
    } else if (callback_requested === false) {
      // Remove notification if callback is no longer requested
      await supabase
        .from('notifications')
        .delete()
        .eq('call_log_id', id)
        .eq('type', 'callback')
    }

    return NextResponse.json(callLog)
  } catch (error) {
    console.error('Error in call log PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Only admin can delete call logs
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { id } = params

    const { data: callLog, error } = await supabase
      .from('call_logs')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
      }
      console.error('Error deleting call log:', error)
      return NextResponse.json({ error: 'Failed to delete call log' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Call log deleted successfully' })
  } catch (error) {
    console.error('Error in call log DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}