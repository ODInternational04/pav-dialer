import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const feedbackType = searchParams.get('feedback_type')
    const priority = searchParams.get('priority')
    const isResolved = searchParams.get('is_resolved')
    const search = searchParams.get('search')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('customer_feedback')
      .select(`
        id,
        feedback_type,
        subject,
        notes,
        priority,
        is_resolved,
        created_at,
        updated_at,
        resolved_at,
        resolution_notes,
        clients (
          name,
          phone,
          email
        ),
        users!customer_feedback_user_id_fkey (
          first_name,
          last_name,
          email
        ),
        call_logs (
          call_status,
          call_duration,
          notes
        ),
        resolved_by_user:users!customer_feedback_resolved_by_fkey (
          first_name,
          last_name,
          email
        )
      `)

    // Apply same filters as the main GET endpoint
    if (feedbackType && feedbackType !== 'all') {
      query = query.eq('feedback_type', feedbackType)
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }

    if (isResolved !== null && isResolved !== 'all') {
      query = query.eq('is_resolved', isResolved === 'true')
    }

    if (search) {
      query = query.or(`subject.ilike.%${search}%,notes.ilike.%${search}%`)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Role-based filtering
    if (payload.role !== 'admin') {
      query = query.eq('user_id', payload.userId)
    }

    const { data: feedback, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback for export' }, { status: 500 })
    }

    // Convert to CSV format
    const csvHeaders = [
      'ID',
      'Type',
      'Subject',
      'Notes',
      'Priority',
      'Status',
      'Client Name',
      'Client Email',
      'Client Phone',
      'Submitted By',
      'Submitted By Email',
      'Call Status',
      'Call Duration (s)',
      'Call Notes',
      'Created Date',
      'Resolved Date',
      'Resolved By',
      'Resolution Notes'
    ]

    const csvRows = feedback?.map(item => {
      // Supabase returns arrays for joined tables, so get the first element
      const client = Array.isArray(item.clients) ? item.clients[0] : item.clients
      const user = Array.isArray(item.users) ? item.users[0] : item.users
      const callLog = Array.isArray(item.call_logs) ? item.call_logs[0] : item.call_logs
      const resolvedByUser = Array.isArray(item.resolved_by_user) ? item.resolved_by_user[0] : item.resolved_by_user

      return [
        item.id,
        item.feedback_type,
        `"${item.subject.replace(/"/g, '""')}"`, // Escape quotes in CSV
        `"${item.notes.replace(/"/g, '""')}"`,
        item.priority,
        item.is_resolved ? 'Resolved' : 'Pending',
        client?.name || '',
        client?.email || '',
        client?.phone || '',
        `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
        user?.email || '',
        callLog?.call_status || '',
        callLog?.call_duration || '',
        `"${(callLog?.notes || '').replace(/"/g, '""')}"`,
        new Date(item.created_at).toLocaleString(),
        item.resolved_at ? new Date(item.resolved_at).toLocaleString() : '',
        resolvedByUser ? `${resolvedByUser.first_name} ${resolvedByUser.last_name}`.trim() : '',
        `"${(item.resolution_notes || '').replace(/"/g, '""')}"`
      ]
    }) || []

    // Combine headers and rows
    const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')

    // Generate filename with current date
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `customer-feedback-export-${timestamp}.csv`

    // Return CSV as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Error exporting customer feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}