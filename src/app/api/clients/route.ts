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
    const callStatus = searchParams.get('callStatus') || 'all' // all, called, not_called
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    const start = (page - 1) * limit
    const end = start + limit - 1

    let clientsData
    let totalCount = 0

    if (callStatus === 'called') {
      // Get clients who have been called (have call logs)
      const { data: clientsWithCalls, error: callError, count } = await supabase
        .from('clients')
        .select(`
          *,
          created_by_user:users!clients_created_by_fkey(first_name, last_name),
          last_updated_by_user:users!clients_last_updated_by_fkey(first_name, last_name),
          call_logs(id, call_status, created_at, call_type)
        `, { count: 'exact' })
        .not('call_logs', 'is', null)
        .range(start, end)
        .order(sortBy === 'name' ? 'principal_key_holder' : 
               sortBy === 'phone' ? 'telephone_cell' :
               sortBy === 'contract' ? 'contract_no' :
               sortBy === 'box_number' ? 'box_number' : 'created_at', 
               { ascending: sortOrder === 'asc' })

      if (search && clientsWithCalls) {
        const filteredClients = clientsWithCalls.filter(client =>
          client.box_number.toLowerCase().includes(search.toLowerCase()) ||
          client.contract_no.toLowerCase().includes(search.toLowerCase()) ||
          client.principal_key_holder.toLowerCase().includes(search.toLowerCase()) ||
          client.telephone_cell.includes(search) ||
          client.principal_key_holder_email_address.toLowerCase().includes(search.toLowerCase())
        )
        clientsData = filteredClients
        totalCount = filteredClients.length
      } else {
        clientsData = clientsWithCalls
        totalCount = count || 0
      }

    } else if (callStatus === 'not_called') {
      // Get all clients first
      const { data: allClients } = await supabase
        .from('clients')
        .select(`
          *,
          created_by_user:users!clients_created_by_fkey(first_name, last_name),
          last_updated_by_user:users!clients_last_updated_by_fkey(first_name, last_name)
        `)

      // Get clients who have call logs
      const { data: calledClientIds } = await supabase
        .from('call_logs')
        .select('client_id')

      const calledIds = new Set(calledClientIds?.map(log => log.client_id) || [])
      
      // Filter out clients who have been called
      let notCalledClients = allClients?.filter(client => !calledIds.has(client.id)) || []

      // Apply search filter
      if (search) {
        notCalledClients = notCalledClients.filter(client =>
          client.box_number.toLowerCase().includes(search.toLowerCase()) ||
          client.contract_no.toLowerCase().includes(search.toLowerCase()) ||
          client.principal_key_holder.toLowerCase().includes(search.toLowerCase()) ||
          client.telephone_cell.includes(search) ||
          client.principal_key_holder_email_address.toLowerCase().includes(search.toLowerCase())
        )
      }

      // Apply sorting
      notCalledClients.sort((a, b) => {
        let aValue, bValue
        if (sortBy === 'name') {
          aValue = a.principal_key_holder
          bValue = b.principal_key_holder
        } else if (sortBy === 'phone') {
          aValue = a.telephone_cell
          bValue = b.telephone_cell
        } else if (sortBy === 'contract') {
          aValue = a.contract_no
          bValue = b.contract_no
        } else if (sortBy === 'box_number') {
          aValue = a.box_number
          bValue = b.box_number
        } else {
          aValue = a.created_at
          bValue = b.created_at
        }

        if (sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })

      totalCount = notCalledClients.length
      clientsData = notCalledClients.slice(start, end)

    } else {
      // Get all clients with call log counts
      const { data: allClientsData, error: allError, count } = await supabase
        .from('clients')
        .select(`
          *,
          created_by_user:users!clients_created_by_fkey(first_name, last_name),
          last_updated_by_user:users!clients_last_updated_by_fkey(first_name, last_name),
          call_logs(id, call_status, created_at, call_type)
        `, { count: 'exact' })
        .range(start, end)
        .order(sortBy === 'name' ? 'principal_key_holder' : 
               sortBy === 'phone' ? 'telephone_cell' :
               sortBy === 'contract' ? 'contract_no' :
               sortBy === 'box_number' ? 'box_number' : 'created_at', 
               { ascending: sortOrder === 'asc' })

      if (search && allClientsData) {
        const filteredClients = allClientsData.filter(client =>
          client.box_number.toLowerCase().includes(search.toLowerCase()) ||
          client.contract_no.toLowerCase().includes(search.toLowerCase()) ||
          client.principal_key_holder.toLowerCase().includes(search.toLowerCase()) ||
          client.telephone_cell.includes(search) ||
          client.principal_key_holder_email_address.toLowerCase().includes(search.toLowerCase())
        )
        clientsData = filteredClients
        totalCount = filteredClients.length
      } else {
        clientsData = allClientsData
        totalCount = count || 0
      }
    }

    // Add call statistics to each client
    const clientsWithStats = clientsData?.map(client => ({
      ...client,
      total_calls: client.call_logs?.length || 0,
      last_call_date: client.call_logs && client.call_logs.length > 0 
        ? client.call_logs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null,
      has_been_called: client.call_logs && client.call_logs.length > 0
    })) || []

    return NextResponse.json({
      clients: clientsWithStats || [],
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
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
    const now = new Date().toISOString()
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
        created_at: now,
        updated_at: now,
      })
      .select(`
        *,
        created_by_user:users!clients_created_by_fkey(first_name, last_name),
        last_updated_by_user:users!clients_last_updated_by_fkey(first_name, last_name)
      `)
      .single()

    if (error) {
      console.error('Error creating client:', error)
      // Return the Supabase error message to help diagnose the failure during development.
      // In production you might want to remove or redact error details.
      const details = (error && (error.message || error.details)) || error
      return NextResponse.json(
        { error: 'Failed to create client', details },
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