import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { validateInput, clientValidationSchema, sanitizeObject } from '@/lib/validation'
import { CreateClientRequest } from '@/types'

/**
 * GET /api/clients - Retrieve clients with pagination and filtering
 * Security: Requires valid JWT token, applies rate limiting via middleware
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'MISSING_TOKEN' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
        { status: 401 }
      )
    }

    // Input validation and sanitization
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10'))) // Max 100 per page
    const search = sanitizeString(searchParams.get('search') || '')
    const callStatus = validateCallStatus(searchParams.get('callStatus') || 'all')
    const clientType = validateClientType(searchParams.get('clientType') || 'all')
    const sortBy = validateSortBy(searchParams.get('sortBy') || 'created_at')
    const sortOrder = validateSortOrder(searchParams.get('sortOrder') || 'desc')
    const campaignId = searchParams.get('campaign_id') || ''
    
    const start = (page - 1) * limit
    const end = start + limit - 1

    // Check user's campaign access if not admin
    let allowedCampaignIds: string[] = []
    if (payload.role !== 'admin') {
      const { data: userCampaigns } = await supabase
        .from('user_campaign_assignments')
        .select('campaign_id')
        .eq('user_id', payload.userId)
      
      allowedCampaignIds = userCampaigns?.map(uc => uc.campaign_id) || []
      
      // If user has no campaigns assigned, return empty result
      if (allowedCampaignIds.length === 0) {
        return NextResponse.json({
          clients: [],
          totalCount: 0,
          page,
          limit,
          totalPages: 0,
          metadata: {
            requestId: request.headers.get('x-request-id'),
            timestamp: new Date().toISOString(),
            userId: payload.userId
          }
        })
      }
    }

    let clientsData
    let totalCount = 0

    try {
      if (callStatus === 'called') {
        // Get clients who have been called (have call logs)
        let query = supabase
          .from('clients')
          .select(`
            *,
            created_by_user:users!clients_created_by_fkey(first_name, last_name),
            last_updated_by_user:users!clients_last_updated_by_fkey(first_name, last_name),
            campaigns(id, name, department, status),
            call_logs(id, call_status, created_at, call_type)
          `, { count: 'exact' })
          .not('call_logs', 'is', null)
        
        // Apply client type filtering
        if (clientType !== 'all') {
          query = query.eq('client_type', clientType)
        }
        
        // Apply campaign filtering
        if (campaignId && campaignId !== 'all') {
          query = query.eq('campaign_id', campaignId)
        } else if (payload.role !== 'admin' && allowedCampaignIds.length > 0) {
          query = query.in('campaign_id', allowedCampaignIds)
        }
        
        const { data: clientsWithCalls, error: callError, count } = await query
          .range(start, end)
          .order(mapSortByToColumn(sortBy), { ascending: sortOrder === 'asc' })

        if (callError) throw callError

        if (search && clientsWithCalls) {
          const filteredClients = clientsWithCalls.filter(client =>
            searchInClient(client, search)
          )
          clientsData = filteredClients
          totalCount = filteredClients.length
        } else {
          clientsData = clientsWithCalls
          totalCount = count || 0
        }

      } else if (callStatus === 'not_called') {
        // Get all clients first
        let clientQuery = supabase
          .from('clients')
          .select(`
            *,
            created_by_user:users!clients_created_by_fkey(first_name, last_name),
            last_updated_by_user:users!clients_last_updated_by_fkey(first_name, last_name),
            campaigns(id, name, department, status)
          `)
        
        // Apply client type filtering
        if (clientType !== 'all') {
          clientQuery = clientQuery.eq('client_type', clientType)
        }
        
        // Apply campaign filtering
        if (campaignId && campaignId !== 'all') {
          clientQuery = clientQuery.eq('campaign_id', campaignId)
        } else if (payload.role !== 'admin' && allowedCampaignIds.length > 0) {
          clientQuery = clientQuery.in('campaign_id', allowedCampaignIds)
        }
        
        const { data: allClients, error: allError } = await clientQuery

        if (allError) throw allError

        // Get clients who have call logs
        const { data: calledClientIds, error: calledError } = await supabase
          .from('call_logs')
          .select('client_id')

        if (calledError) throw calledError

        const calledIds = new Set(calledClientIds?.map(log => log.client_id) || [])
        
        // Filter out clients who have been called
        let notCalledClients = allClients?.filter(client => !calledIds.has(client.id)) || []

        // Apply search filter
        if (search) {
          notCalledClients = notCalledClients.filter(client =>
            searchInClient(client, search)
          )
        }

        // Apply sorting
        notCalledClients.sort((a, b) => sortClients(a, b, sortBy, sortOrder))

        totalCount = notCalledClients.length
        clientsData = notCalledClients.slice(start, end)

      } else {
        // Get all clients with call log counts
        let allQuery = supabase
          .from('clients')
          .select(`
            *,
            created_by_user:users!clients_created_by_fkey(first_name, last_name),
            last_updated_by_user:users!clients_last_updated_by_fkey(first_name, last_name),
            campaigns(id, name, department, status),
            call_logs(id, call_status, created_at, call_type)
          `, { count: 'exact' })
        
        // Apply client type filtering
        if (clientType !== 'all') {
          allQuery = allQuery.eq('client_type', clientType)
        }
        
        // Apply campaign filtering
        if (campaignId && campaignId !== 'all') {
          allQuery = allQuery.eq('campaign_id', campaignId)
        } else if (payload.role !== 'admin' && allowedCampaignIds.length > 0) {
          allQuery = allQuery.in('campaign_id', allowedCampaignIds)
        }
        
        const { data: allClientsData, error: allError, count } = await allQuery
          .range(start, end)
          .order(mapSortByToColumn(sortBy), { ascending: sortOrder === 'asc' })

        if (allError) throw allError

        if (search && allClientsData) {
          const filteredClients = allClientsData.filter(client =>
            searchInClient(client, search)
          )
          clientsData = filteredClients
          totalCount = filteredClients.length
        } else {
          clientsData = allClientsData
          totalCount = count || 0
        }
      }

      // Add call statistics to each client (sanitized)
      const clientsWithStats = clientsData?.map(client => ({
        ...sanitizeClientData(client),
        total_calls: client.call_logs?.length || 0,
        last_call_date: client.call_logs && client.call_logs.length > 0 
          ? client.call_logs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
          : null,
        has_been_called: client.call_logs && client.call_logs.length > 0
      })) || []

      return NextResponse.json({
        clients: clientsWithStats,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        metadata: {
          requestId: request.headers.get('x-request-id'),
          timestamp: new Date().toISOString(),
          userId: payload.userId
        }
      })

    } catch (dbError) {
      console.error('Database error in clients GET:', dbError)
      return NextResponse.json(
        { error: 'Database operation failed', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in clients GET:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clients - Create a new client
 * Security: Requires valid JWT token, input validation, sanitization
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'MISSING_TOKEN' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
        { status: 401 }
      )
    }

    // Parse and validate input
    let body: CreateClientRequest
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON payload', code: 'INVALID_JSON' },
        { status: 400 }
      )
    }

    // Sanitize input object
    const sanitizedBody = sanitizeObject(body)

    // Validate input with Zod schema
    const validation = validateInput(clientValidationSchema, sanitizedBody)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          code: 'VALIDATION_ERROR',
          details: validation.errors 
        },
        { status: 400 }
      )
    }

    const validatedData = validation.data

    try {
      // Check if box number or contract number already exists (only for vault clients)
      if (validatedData.client_type === 'vault' && validatedData.box_number && validatedData.contract_no) {
        const { data: existingClient, error: checkError } = await supabase
          .from('clients')
          .select('id, box_number, contract_no')
          .or(`box_number.eq.${validatedData.box_number},contract_no.eq.${validatedData.contract_no}`)
          .single()

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found (expected)
          throw checkError
        }

        if (existingClient) {
          const field = existingClient.box_number === validatedData.box_number ? 'Box number' : 'Contract number'
          return NextResponse.json(
            { 
              error: `${field} already exists`, 
              code: 'DUPLICATE_ENTRY',
              field: field.toLowerCase().replace(' ', '_')
            },
            { status: 409 }
          )
        }
      }

      // Create client with validated data
      const now = new Date().toISOString()
      const { data: newClient, error: insertError } = await supabase
        .from('clients')
        .insert({
          ...validatedData,
          notes: validatedData.notes || '',
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

      if (insertError) {
        console.error('Error creating client:', insertError)
        
        // Return appropriate error based on error type
        if (insertError.code === '23505') { // Unique violation
          return NextResponse.json(
            { error: 'Duplicate entry detected', code: 'DUPLICATE_ENTRY' },
            { status: 409 }
          )
        }
        
        throw insertError
      }

      return NextResponse.json(
        { 
          message: 'Client created successfully',
          client: sanitizeClientData(newClient),
          metadata: {
            requestId: request.headers.get('x-request-id'),
            timestamp: new Date().toISOString(),
            createdBy: payload.userId
          }
        },
        { status: 201 }
      )

    } catch (dbError) {
      console.error('Database error in client creation:', dbError)
      return NextResponse.json(
        { error: 'Database operation failed', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in client creation:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Sanitizes string input to prevent XSS
 */
function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

/**
 * Validates call status parameter
 */
function validateCallStatus(status: string): string {
  const validStatuses = ['all', 'called', 'not_called']
  return validStatuses.includes(status) ? status : 'all'
}

/**
 * Validates client type parameter
 */
function validateClientType(type: string): string {
  const validTypes = ['all', 'vault', 'gold']
  return validTypes.includes(type) ? type : 'all'
}

/**
 * Validates sort by parameter
 */
function validateSortBy(sortBy: string): string {
  const validSortFields = ['name', 'phone', 'contract', 'box_number', 'created_at']
  return validSortFields.includes(sortBy) ? sortBy : 'created_at'
}

/**
 * Validates sort order parameter
 */
function validateSortOrder(order: string): string {
  return ['asc', 'desc'].includes(order) ? order : 'desc'
}

/**
 * Maps frontend sort fields to database columns
 */
function mapSortByToColumn(sortBy: string): string {
  const mapping: Record<string, string> = {
    'name': 'principal_key_holder',
    'phone': 'telephone_cell',
    'contract': 'contract_no',
    'box_number': 'box_number',
    'created_at': 'created_at'
  }
  return mapping[sortBy] || 'created_at'
}

/**
 * Searches within client data (case-insensitive)
 */
function searchInClient(client: any, search: string): boolean {
  const searchLower = search.toLowerCase()
  return (
    client.box_number.toLowerCase().includes(searchLower) ||
    client.contract_no.toLowerCase().includes(searchLower) ||
    client.principal_key_holder.toLowerCase().includes(searchLower) ||
    client.telephone_cell.includes(search) ||
    client.principal_key_holder_email_address.toLowerCase().includes(searchLower)
  )
}

/**
 * Sorts clients based on field and order
 */
function sortClients(a: any, b: any, sortBy: string, sortOrder: string): number {
  let aValue: any, bValue: any
  
  switch (sortBy) {
    case 'name':
      aValue = a.principal_key_holder
      bValue = b.principal_key_holder
      break
    case 'phone':
      aValue = a.telephone_cell
      bValue = b.telephone_cell
      break
    case 'contract':
      aValue = a.contract_no
      bValue = b.contract_no
      break
    case 'box_number':
      aValue = a.box_number
      bValue = b.box_number
      break
    default:
      aValue = a.created_at
      bValue = b.created_at
  }

  const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
  return sortOrder === 'asc' ? comparison : -comparison
}

/**
 * Sanitizes client data for response (removes sensitive fields)
 */
function sanitizeClientData(client: any): any {
  const sanitized = { ...client }
  
  // Remove any internal fields that shouldn't be exposed
  delete sanitized.internal_notes
  delete sanitized.admin_flags
  
  // Ensure email is properly formatted
  if (sanitized.principal_key_holder_email_address) {
    sanitized.principal_key_holder_email_address = sanitized.principal_key_holder_email_address.toLowerCase()
  }
  
  return sanitized
}