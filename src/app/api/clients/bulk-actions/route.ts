import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

interface BulkActionRequest {
  action: 'mark_priority' | 'add_note' | 'update_status' | 'export' | 'schedule_callback'
  clientIds: string[]
  data?: {
    priority?: 'high' | 'medium' | 'low'
    note?: string
    status?: string
    callbackTime?: string
  }
}

export async function POST(request: NextRequest) {
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

    const body: BulkActionRequest = await request.json()
    const { action, clientIds, data } = body

    if (!action || !clientIds || clientIds.length === 0) {
      return NextResponse.json(
        { error: 'Action and client IDs are required' },
        { status: 400 }
      )
    }

    let result = null
    let message = ''

    switch (action) {
      case 'mark_priority':
        // This would require a priority field in the clients table
        // For now, we'll add it to notes
        if (data?.priority) {
          const priorityNote = `Priority: ${data.priority.toUpperCase()}`
          
          const { error } = await supabase
            .from('clients')
            .update({
              notes: `${priorityNote}`,
              updated_at: new Date().toISOString(),
              last_updated_by: payload.userId
            })
            .in('id', clientIds)

          if (error) throw error
          message = `${clientIds.length} clients marked as ${data.priority} priority`
        }
        break

      case 'add_note':
        if (data?.note) {
          const { error } = await supabase
            .from('clients')
            .update({
              notes: `${data.note}`,
              updated_at: new Date().toISOString(),
              last_updated_by: payload.userId
            })
            .in('id', clientIds)

          if (error) throw error
          message = `Note added to ${clientIds.length} clients`
        }
        break

      case 'export':
        // Get client data for export
        const { data: clients, error: exportError } = await supabase
          .from('clients')
          .select(`
            *,
            created_by_user:users!clients_created_by_fkey(first_name, last_name),
            call_logs(id, call_status, created_at, notes)
          `)
          .in('id', clientIds)

        if (exportError) throw exportError

        // Format data for export
        const exportData = clients?.map(client => ({
          box_number: client.box_number,
          contract_no: client.contract_no,
          principal_key_holder: client.principal_key_holder,
          telephone_cell: client.telephone_cell,
          telephone_home: client.telephone_home || '',
          email: client.principal_key_holder_email_address,
          occupation: client.occupation,
          contract_start: client.contract_start_date,
          contract_end: client.contract_end_date,
          total_calls: client.call_logs?.length || 0,
          last_call_date: client.call_logs && client.call_logs.length > 0 
            ? client.call_logs.sort((a: any, b: any) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0].created_at 
            : null,
          notes: client.notes,
          created_at: client.created_at,
          created_by: client.created_by_user?.first_name + ' ' + client.created_by_user?.last_name
        }))

        result = { exportData }
        message = `${clientIds.length} clients prepared for export`
        break

      case 'schedule_callback':
        if (data?.callbackTime) {
          // Create callback notifications for all clients
          const notifications = clientIds.map(clientId => ({
            user_id: payload.userId,
            client_id: clientId,
            type: 'callback' as const,
            title: 'Scheduled Callback',
            message: 'Follow-up call scheduled via bulk action',
            scheduled_for: data.callbackTime,
            is_read: false,
            is_sent: false,
            created_at: new Date().toISOString()
          }))

          const { error } = await supabase
            .from('notifications')
            .insert(notifications)

          if (error) throw error
          message = `Callback scheduled for ${clientIds.length} clients`
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      message,
      processedCount: clientIds.length,
      result
    })
  } catch (error) {
    console.error('Error processing bulk action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}