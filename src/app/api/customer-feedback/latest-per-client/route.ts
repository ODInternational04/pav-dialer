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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // First, get all distinct client IDs that have feedback
    let clientQuery = supabase
      .from('customer_feedback')
      .select('client_id')

    // Apply filters to find relevant clients
    if (feedbackType && feedbackType !== 'all') {
      clientQuery = clientQuery.eq('feedback_type', feedbackType)
    }

    if (priority && priority !== 'all') {
      clientQuery = clientQuery.eq('priority', priority)
    }

    if (isResolved !== null && isResolved !== 'all') {
      clientQuery = clientQuery.eq('is_resolved', isResolved === 'true')
    }

    if (search) {
      clientQuery = clientQuery.or(`subject.ilike.%${search}%,notes.ilike.%${search}%`)
    }

    if (startDate) {
      clientQuery = clientQuery.gte('created_at', startDate)
    }

    if (endDate) {
      clientQuery = clientQuery.lte('created_at', endDate)
    }

    const { data: clientIds, error: clientError } = await clientQuery

    if (clientError) {
      console.error('Client query error:', clientError)
      return NextResponse.json({ error: 'Failed to fetch client data' }, { status: 500 })
    }

    const uniqueClientIds = [...new Set(clientIds?.map(c => c.client_id) || [])]
    
    if (uniqueClientIds.length === 0) {
      return NextResponse.json({
        feedback: [],
        pagination: {
          page: 1,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      })
    }

    // For each client, get their latest feedback
    const latestFeedbackPromises = uniqueClientIds.map(async (clientId) => {
      let query = supabase
        .from('customer_feedback')
        .select(`
          *,
          clients (
            id,
            box_number,
            principal_key_holder,
            telephone_cell,
            contract_no
          ),
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
        .limit(1)

      const { data, error } = await query

      if (error) {
        console.error(`Error fetching latest feedback for client ${clientId}:`, error)
        return null
      }

      return data?.[0] || null
    })

    const latestFeedbackResults = await Promise.all(latestFeedbackPromises)
    const latestFeedback = latestFeedbackResults
      .filter(Boolean)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Apply pagination
    const paginatedFeedback = latestFeedback.slice(offset, offset + limit)
    const totalCount = latestFeedback.length
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      feedback: paginatedFeedback,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching latest feedback per client:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}