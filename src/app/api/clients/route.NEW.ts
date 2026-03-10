import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { CreateClientRequest } from '@/types'

/**
 * GET /api/clients - Retrieve clients with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const search = searchParams.get('search') || ''
    const callStatus = searchParams.get('callStatus') || 'all'
    
    const start = (page - 1) * limit
    const end = start + limit - 1

    let query = supabase
      .from('clients')
      .select(`
        *,
        call_logs(id, call_status, created_at)
      `, { count: 'exact' })

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply call status filter
    if (callStatus === 'called') {
      // Only clients with call logs
      query = query.not('call_logs', 'is', null)
    } else if (callStatus === 'not_called') {
      // Only clients without call logs
      query = query.is('call_logs', null)
    }

    const { data: clients, error, count } = await query
      .range(start, end)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      )
    }

    // Add computed fields
    const enhancedClients = clients?.map(client => ({
      ...client,
      total_calls: client.call_logs?.length || 0,
      has_been_called: (client.call_logs?.length || 0) > 0,
      last_call_date: client.call_logs?.[0]?.created_at || null
    })) || []

    return NextResponse.json({
      clients: enhancedClients,
      totalCount: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })

  } catch (error) {
    console.error('Error in GET /api/clients:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clients - Create a new client
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const body: CreateClientRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.phone) {
      return NextResponse.json(
        { error: 'Name and phone are required fields' },
        { status: 400 }
      )
    }

    // Check for duplicate phone number
    const { data: existing } = await supabase
      .from('clients')
      .select('id, name, phone')
      .eq('phone', body.phone)
      .single()

    if (existing) {
      return NextResponse.json(
        { 
          error: 'Client with this phone number already exists',
          details: `Phone number ${body.phone} is already registered to ${existing.name}`
        },
        { status: 409 }
      )
    }

    // Create client
    const clientData = {
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() || null,
      notes: body.notes?.trim() || '',
      created_by: payload.userId,
      last_updated_by: payload.userId
    }

    const { data: newClient, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json(
        { error: 'Failed to create client', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(newClient, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/clients:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
