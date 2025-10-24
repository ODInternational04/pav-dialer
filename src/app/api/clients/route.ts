import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { CreateClientRequest } from '@/types'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    
    const start = (page - 1) * limit
    const end = start + limit - 1

    let query = supabase
      .from('clients')
      .select(`
        *,
        created_by_user:users!clients_created_by_fkey(first_name, last_name),
        last_updated_by_user:users!clients_last_updated_by_fkey(first_name, last_name)
      `)
      .range(start, end)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`
        box_number.ilike.%${search}%,
        contract_no.ilike.%${search}%,
        principal_key_holder.ilike.%${search}%,
        telephone_cell.ilike.%${search}%,
        principal_key_holder_email_address.ilike.%${search}%
      `)
    }

    const { data: clients, error, count } = await query

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      clients: clients || [],
      totalCount: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error in clients GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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

    const body: CreateClientRequest = await request.json()
    const {
      box_number,
      size,
      contract_no,
      principal_key_holder,
      principal_key_holder_id_number,
      principal_key_holder_email_address,
      telephone_cell,
      telephone_home,
      contract_start_date,
      contract_end_date,
      occupation,
      notes,
    } = body

    // Validate required fields
    if (!box_number || !size || !contract_no || !principal_key_holder || 
        !principal_key_holder_id_number || !principal_key_holder_email_address || 
        !telephone_cell || !contract_start_date || !contract_end_date || !occupation) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    // Check if box number or contract number already exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, box_number, contract_no')
      .or(`box_number.eq.${box_number},contract_no.eq.${contract_no}`)
      .single()

    if (existingClient) {
      const field = existingClient.box_number === box_number ? 'Box number' : 'Contract number'
      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 409 }
      )
    }

    // Create client
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        box_number,
        size,
        contract_no,
        principal_key_holder,
        principal_key_holder_id_number,
        principal_key_holder_email_address,
        telephone_cell,
        telephone_home,
        contract_start_date,
        contract_end_date,
        occupation,
        notes: notes || '',
        created_by: payload.userId,
        last_updated_by: payload.userId,
      })
      .select(`
        *,
        created_by_user:users!clients_created_by_fkey(first_name, last_name),
        last_updated_by_user:users!clients_last_updated_by_fkey(first_name, last_name)
      `)
      .single()

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json(
        { error: 'Failed to create client' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Client created successfully',
        client: newClient
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in client creation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}