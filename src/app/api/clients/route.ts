import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { CreateClientRequest } from '@/types'
import { serverCache } from '@/lib/cache'

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
      .select('*', { count: 'exact' })

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
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

    // Efficiently get call counts for the current page of clients only
    let enhancedClients = clients || []
    
    if (clients && clients.length > 0 && (callStatus === 'called' || callStatus === 'not_called' || callStatus === 'all')) {
      const clientIds = clients.map(c => c.id)
      
      // Get call counts in a single query
      const { data: callCounts } = await supabase
        .from('call_logs')
        .select('client_id')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false })
      
      // Create a map of client_id to call info
      const callMap = new Map<string, { count: number, lastCallDate: string | null }>()
      
      if (callCounts) {
        callCounts.forEach(log => {
          const existing = callMap.get(log.client_id)
          if (existing) {
            existing.count++
          } else {
            callMap.set(log.client_id, { count: 1, lastCallDate: null })
          }
        })
      }
      
      // Get last call dates efficiently
      if (callCounts && callCounts.length > 0) {
        const { data: lastCalls } = await supabase
          .from('call_logs')
          .select('client_id, created_at')
          .in('client_id', clientIds)
          .order('created_at', { ascending: false })
          .limit(clientIds.length)
        
        if (lastCalls) {
          const lastCallMap = new Map<string, string>()
          lastCalls.forEach(call => {
            if (!lastCallMap.has(call.client_id)) {
              lastCallMap.set(call.client_id, call.created_at)
            }
          })
          
          // Update call map with last call dates
          lastCallMap.forEach((date, clientId) => {
            const info = callMap.get(clientId)
            if (info) {
              info.lastCallDate = date
            }
          })
        }
      }

      // Filter and enhance clients based on call status
      enhancedClients = clients
        .map(client => {
          const callInfo = callMap.get(client.id) || { count: 0, lastCallDate: null }
          return {
            ...client,
            total_calls: callInfo.count,
            has_been_called: callInfo.count > 0,
            last_call_date: callInfo.lastCallDate
          }
        })
        .filter(client => {
          if (callStatus === 'called') return client.has_been_called
          if (callStatus === 'not_called') return !client.has_been_called
          return true
        })
    } else {
      enhancedClients = clients?.map(client => ({
        ...client,
        total_calls: 0,
        has_been_called: false,
        last_call_date: null
      })) || []
    }

    const response = NextResponse.json({
      clients: enhancedClients,
      totalCount: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
    
    // Add cache headers (15 second cache for client list)
    response.headers.set('Cache-Control', 'private, s-maxage=15, stale-while-revalidate=30')
    
    return response

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
