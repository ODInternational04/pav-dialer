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

    // Only admin can export reports
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')
    const format = searchParams.get('format') || 'csv'

    // Set default date range (last 30 days)
    const defaultEndDate = new Date()
    const defaultStartDate = new Date()
    defaultStartDate.setDate(defaultStartDate.getDate() - 30)

    const queryStartDate = startDate || defaultStartDate.toISOString()
    const queryEndDate = endDate || defaultEndDate.toISOString()

    // Get detailed call logs for export
    let callLogsQuery = supabase
      .from('call_logs')
      .select(`
        id,
        created_at,
        call_status,
        call_type,
        call_duration,
        notes,
        callback_requested,
        callback_time,
        users:user_id (
          first_name, 
          last_name, 
          email
        ),
        clients:client_id (
          principal_key_holder,
          box_number,
          telephone_cell,
          contract_no
        )
      `)
      .gte('created_at', queryStartDate)
      .lte('created_at', queryEndDate)
      .order('created_at', { ascending: false })

    if (userId) {
      callLogsQuery = callLogsQuery.eq('user_id', userId)
    }

    const { data: callLogs, error } = await callLogsQuery

    if (error) {
      console.error('Error fetching call logs for export:', error)
      return NextResponse.json({ error: 'Failed to fetch call logs' }, { status: 500 })
    }

    if (format === 'csv') {
      const csvContent = generateCSV(callLogs || [])
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="dialer-reports-${queryStartDate.split('T')[0]}-to-${queryEndDate.split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json({ callLogs: callLogs || [] })
  } catch (error) {
    console.error('Error in reports export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateCSV(callLogs: any[]): string {
  const headers = [
    'Date',
    'Time',
    'User Name',
    'User Email',
    'Client Name',
    'Client Phone',
    'Box Number',
    'Contract Number',
    'Call Type',
    'Call Status',
    'Duration (seconds)',
    'Duration (formatted)',
    'Notes',
    'Callback Requested',
    'Callback Time'
  ]

  const csvRows = [headers.join(',')]

  callLogs.forEach(log => {
    const date = new Date(log.created_at)
    const formattedDuration = log.call_duration 
      ? `${Math.floor(log.call_duration / 60)}:${(log.call_duration % 60).toString().padStart(2, '0')}`
      : 'N/A'
    
    const row = [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      `"${log.users?.first_name || ''} ${log.users?.last_name || ''}"`.trim(),
      log.users?.email || '',
      `"${log.clients?.principal_key_holder || ''}"`,
      log.clients?.telephone_cell || '',
      log.clients?.box_number || '',
      log.clients?.contract_no || '',
      log.call_type || '',
      log.call_status || '',
      log.call_duration || 0,
      formattedDuration,
      `"${(log.notes || '').replace(/"/g, '""')}"`,
      log.callback_requested ? 'Yes' : 'No',
      log.callback_time ? new Date(log.callback_time).toLocaleString() : ''
    ]

    csvRows.push(row.join(','))
  })

  return csvRows.join('\n')
}