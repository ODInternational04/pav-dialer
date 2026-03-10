import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url)
    const clientId = pathname.split('/').pop()

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Verify client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, phone, email')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get all feedback for this client, ordered by created_at descending
    let query = supabase
      .from('customer_feedback')
      .select(`
        *,
        users!customer_feedback_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        call_logs (
          id,
          call_status,
          notes,
          created_at
        ),
        resolved_by_user:users!customer_feedback_resolved_by_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('customer_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)

    if (countError) {
      console.error('Count error:', countError)
      return NextResponse.json({ error: 'Failed to count feedback' }, { status: 500 })
    }

    // Get paginated results
    const { data: feedback, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch client feedback history' }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    // Add client info to each feedback record for consistency
    const feedbackWithClient = feedback?.map(item => ({
      ...item,
      clients: client
    })) || []

    return NextResponse.json({
      client,
      feedback: feedbackWithClient,
      pagination: {
        page,
        limit,
        totalCount: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching client feedback history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}