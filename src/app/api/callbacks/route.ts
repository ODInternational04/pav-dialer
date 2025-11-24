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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') // 'pending', 'completed', 'overdue'

    const offset = (page - 1) * limit
    const now = new Date().toISOString()

    let query = supabase
      .from('call_logs')
      .select(`
        *,
        clients:client_id (
          id,
          box_number,
          principal_key_holder,
          telephone_cell,
          contract_no
        ),
        users:user_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('callback_requested', true)
      .not('callback_time', 'is', null)
      .order('callback_time', { ascending: true })

    // Apply status filter
    if (status === 'pending') {
      query = query.gte('callback_time', now)
    } else if (status === 'overdue') {
      query = query.lt('callback_time', now)
    }

    // For non-admin users, only show their own callbacks
    if (decoded.role !== 'admin') {
      query = query.eq('user_id', decoded.userId)
    }

    // Get total count with same filters
    let countQuery = supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .eq('callback_requested', true)
      .not('callback_time', 'is', null)

    if (status === 'pending') {
      countQuery = countQuery.gte('callback_time', now)
    } else if (status === 'overdue') {
      countQuery = countQuery.lt('callback_time', now)
    }

    if (decoded.role !== 'admin') {
      countQuery = countQuery.eq('user_id', decoded.userId)
    }

    const { count } = await countQuery

    // Get paginated data
    const { data: callbacks, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching callbacks:', error)
      return NextResponse.json({ error: 'Failed to fetch callbacks' }, { status: 500 })
    }

    // Add status to each callback
    const callbacksWithStatus = callbacks?.map(callback => ({
      ...callback,
      callback_status: new Date(callback.callback_time) < new Date() ? 'overdue' : 'pending'
    })) || []

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      callbacks: callbacksWithStatus,
      totalCount: count || 0,
      page,
      limit,
      totalPages,
    })
  } catch (error) {
    console.error('Error in callbacks GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}