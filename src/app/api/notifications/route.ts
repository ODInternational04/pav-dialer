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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const isRead = searchParams.get('isRead')
    const type = searchParams.get('type')
    const clientId = searchParams.get('client_id')
    const showPending = searchParams.get('showPending') === 'true'
    const includeClient = searchParams.get('include_client') === 'true'
    const adminView = searchParams.get('admin_view') === 'true' && decoded.role === 'admin'

    const offset = (page - 1) * limit

    let query = supabase
      .from('notifications')
      .select(includeClient ? `
        *,
        clients:client_id (
          id,
          box_number,
          principal_key_holder,
          telephone_cell,
          telephone_home,
          principal_key_holder_email_address
        ),
        call_logs:call_log_id (
          id,
          call_status,
          notes
        )
      ` : '*')

    // Apply user filter unless admin view is requested
    if (!adminView) {
      query = query.eq('user_id', decoded.userId)
    }

    query = query.order('scheduled_for', { ascending: true })

    // Apply filters
    if (isRead !== null) {
      query = query.eq('is_read', isRead === 'true')
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    if (showPending) {
      // Show only pending notifications (scheduled for now or past and not sent)
      const now = new Date().toISOString()
      query = query
        .lte('scheduled_for', now)
        .eq('is_sent', false)
    }

    // Get total count with same filters
    let countQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })

    if (!adminView) {
      countQuery = countQuery.eq('user_id', decoded.userId)
    }

    if (isRead !== null) {
      countQuery = countQuery.eq('is_read', isRead === 'true')
    }

    if (type) {
      countQuery = countQuery.eq('type', type)
    }

    if (clientId) {
      countQuery = countQuery.eq('client_id', clientId)
    }

    if (showPending) {
      const now = new Date().toISOString()
      countQuery = countQuery
        .lte('scheduled_for', now)
        .eq('is_sent', false)
    }

    const { count } = await countQuery

    // Get paginated data
    const { data: notifications, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      notifications,
      totalCount: count || 0,
      page,
      limit,
      totalPages,
    })
  } catch (error) {
    console.error('Error in notifications GET:', error)
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
      call_log_id,
      type,
      title,
      message,
      scheduled_for
    } = body

    // Validate required fields
    if (!client_id || !type || !title || !message || !scheduled_for) {
      return NextResponse.json(
        { error: 'Missing required fields: client_id, type, title, message, scheduled_for' },
        { status: 400 }
      )
    }

    // Validate notification type
    const validTypes = ['callback', 'reminder', 'system']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type. Must be one of: callback, reminder, system' },
        { status: 400 }
      )
    }

    const notificationData = {
      user_id: decoded.userId,
      client_id,
      call_log_id: call_log_id || null,
      type,
      title,
      message,
      scheduled_for,
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
      console.error('Error creating notification:', error)
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Error in notifications POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper endpoint for creating quick callback notifications
export async function PUT(request: NextRequest) {
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
    const { action, notificationIds } = body

    if (action === 'markAsRead' && notificationIds) {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', decoded.userId)
        .in('id', notificationIds)
        .select()

      if (error) {
        console.error('Error marking notifications as read:', error)
        return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
      }

      return NextResponse.json({ 
        message: `${data.length} notifications marked as read`,
        notifications: data 
      })
    }

    if (action === 'markAllAsRead') {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', decoded.userId)
        .eq('is_read', false)
        .select()

      if (error) {
        console.error('Error marking all notifications as read:', error)
        return NextResponse.json({ error: 'Failed to mark all notifications as read' }, { status: 500 })
      }

      return NextResponse.json({ 
        message: `${data.length} notifications marked as read`,
        notifications: data 
      })
    }

    if (action === 'markAsSent' && notificationIds) {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_sent: true })
        .eq('user_id', decoded.userId)
        .in('id', notificationIds)
        .select()

      if (error) {
        console.error('Error marking notifications as sent:', error)
        return NextResponse.json({ error: 'Failed to mark notifications as sent' }, { status: 500 })
      }

      return NextResponse.json({ 
        message: `${data.length} notifications marked as sent`,
        notifications: data 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in notifications PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete notifications (used when callback is completed)
export async function DELETE(request: NextRequest) {
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
    const { notificationIds } = body

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'notificationIds array is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', decoded.userId)
      .in('id', notificationIds)
      .select()

    if (error) {
      console.error('Error deleting notifications:', error)
      return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `${data.length} notifications deleted`,
      deletedNotifications: data 
    })
  } catch (error) {
    console.error('Error in notifications DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}