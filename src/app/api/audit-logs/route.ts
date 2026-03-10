import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { serverCache } from '@/lib/cache'

/**
 * GET /api/audit-logs - Retrieve audit logs with comprehensive filtering
 * Only accessible by admin users
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

    // Only admins can access audit logs
    if (payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const start = (page - 1) * limit
    const end = start + limit - 1

    // Filters
    const tableName = searchParams.get('table')
    const operation = searchParams.get('operation')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })

    // Apply filters
    if (tableName) {
      query = query.eq('table_name', tableName)
    }

    if (operation) {
      query = query.eq('operation', operation)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString())
    }

    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
      query = query.lte('created_at', endDateTime.toISOString())
    }

    if (search) {
      query = query.or(`user_email.ilike.%${search}%,ip_address.ilike.%${search}%`)
    }

    // Execute query with pagination
    const { data: auditLogs, error, count } = await query
      .order('created_at', { ascending: false })
      .range(start, end)

    if (error) {
      console.error('Error fetching audit logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch audit logs', details: error.message },
        { status: 500 }
      )
    }

    const response = NextResponse.json({
      auditLogs: auditLogs || [],
      totalCount: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })

    // Short cache for audit logs (10 seconds)
    response.headers.set('Cache-Control', 'private, s-maxage=10, stale-while-revalidate=20')

    return response

  } catch (error) {
    console.error('Error in GET /api/audit-logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/audit-logs - Create audit log entry
 * Can be called from server-side code
 */
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    
    const {
      table_name,
      operation,
      record_id,
      old_data,
      new_data
    } = body

    if (!table_name || !operation) {
      return NextResponse.json(
        { error: 'table_name and operation are required' },
        { status: 400 }
      )
    }

    // Get client info from headers
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const { data: auditLog, error } = await supabase
      .from('audit_logs')
      .insert({
        table_name,
        operation,
        user_id: payload.userId,
        user_email: payload.email,
        user_role: payload.role,
        record_id,
        old_data,
        new_data,
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating audit log:', error)
      return NextResponse.json(
        { error: 'Failed to create audit log' },
        { status: 500 }
      )
    }

    return NextResponse.json({ auditLog })

  } catch (error) {
    console.error('Error in POST /api/audit-logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
