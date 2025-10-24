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

    const { data: notification, error } = await supabase
      .from('notifications')
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
      .eq('id', id)
      .eq('user_id', decoded.userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }
      console.error('Error fetching notification:', error)
      return NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 })
    }

    return NextResponse.json(notification)
  } catch (error) {
    console.error('Error in notification GET:', error)
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
      is_read,
      is_sent,
      scheduled_for,
      title,
      message
    } = body

    const updateData: any = {}
    if (is_read !== undefined) updateData.is_read = is_read
    if (is_sent !== undefined) updateData.is_sent = is_sent
    if (scheduled_for !== undefined) updateData.scheduled_for = scheduled_for
    if (title !== undefined) updateData.title = title
    if (message !== undefined) updateData.message = message

    const { data: notification, error } = await supabase
      .from('notifications')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', decoded.userId)
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
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }
      console.error('Error updating notification:', error)
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
    }

    return NextResponse.json(notification)
  } catch (error) {
    console.error('Error in notification PUT:', error)
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

    const { id } = params

    const { data: notification, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', decoded.userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }
      console.error('Error deleting notification:', error)
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Notification deleted successfully' })
  } catch (error) {
    console.error('Error in notification DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}