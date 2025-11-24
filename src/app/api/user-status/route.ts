import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

// Get all users with their call status
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/user-status called - using telephone_cell column')
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        is_on_call,
        call_started_at,
        current_call_client_id,
        clients:current_call_client_id (
          id,
          principal_key_holder,
          box_number,
          telephone_cell
        )
      `)
      .eq('is_active', true)
      .order('first_name')

    if (error) {
      console.error('❌ Error fetching users call status:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    console.log('✅ Successfully fetched user call status, users count:', users?.length || 0)
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error in user status GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update user call status
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { action, client_id } = body

    if (action === 'start_call') {
      if (!client_id) {
        return NextResponse.json({ error: 'Client ID is required for start_call' }, { status: 400 })
      }

      // Check if user is already on a call
      const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('is_on_call, current_call_client_id')
        .eq('id', decoded.userId)
        .single()

      if (userError) {
        console.error('Error checking current user status:', userError)
        return NextResponse.json({ error: 'Failed to check user status' }, { status: 500 })
      }

      if (currentUser.is_on_call) {
        return NextResponse.json({ 
          error: 'You are already on a call. Please end your current call first.' 
        }, { status: 409 })
      }

      // Check if another user is already calling this client
      const { data: clientCaller, error: clientError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('current_call_client_id', client_id)
        .eq('is_on_call', true)
        .neq('id', decoded.userId)
        .maybeSingle()

      if (clientError) {
        console.error('Error checking client call status:', clientError)
        return NextResponse.json({ error: 'Failed to check client availability' }, { status: 500 })
      }

      if (clientCaller) {
        return NextResponse.json({ 
          error: `This client is already being called by ${clientCaller.first_name} ${clientCaller.last_name}. Please try again later.` 
        }, { status: 409 })
      }

      // Start the call
      const { data, error } = await supabase
        .from('users')
        .update({
          is_on_call: true,
          current_call_client_id: client_id,
          call_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', decoded.userId)
        .select(`
          id,
          first_name,
          last_name,
          email,
          role,
          is_on_call,
          current_call_client_id,
          call_started_at
        `)
        .single()

      if (error) {
        console.error('Error starting call status:', error)
        return NextResponse.json({ error: 'Failed to start call status' }, { status: 500 })
      }

      return NextResponse.json({ user: data, message: 'Call started successfully' })

    } else if (action === 'end_call') {
      // End the call
      const { data, error } = await supabase
        .from('users')
        .update({
          is_on_call: false,
          current_call_client_id: null,
          call_started_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', decoded.userId)
        .select(`
          id,
          first_name,
          last_name,
          email,
          role,
          is_on_call,
          current_call_client_id,
          call_started_at
        `)
        .single()

      if (error) {
        console.error('Error ending call status:', error)
        return NextResponse.json({ error: 'Failed to end call status' }, { status: 500 })
      }

      return NextResponse.json({ user: data, message: 'Call ended successfully' })

    } else {
      return NextResponse.json({ error: 'Invalid action. Use "start_call" or "end_call"' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in user status PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Clean up stale call statuses (calls that have been active for too long)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Clear calls that have been active for more than 2 hours (likely stale)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('users')
      .update({
        is_on_call: false,
        current_call_client_id: null,
        call_started_at: null
      })
      .lt('call_started_at', twoHoursAgo)
      .eq('is_on_call', true)
      .select('id, first_name, last_name')

    if (error) {
      console.error('Error cleaning up stale calls:', error)
      return NextResponse.json({ error: 'Failed to cleanup stale calls' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Cleaned up ${data.length} stale call statuses`,
      cleaned_users: data 
    })
  } catch (error) {
    console.error('Error in call cleanup POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}