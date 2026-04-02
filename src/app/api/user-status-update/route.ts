import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { UserStatus } from '@/types'

// GET current user's status
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

    const { data: user, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, user_status, status_changed_at, status_reason, is_on_call')
      .eq('id', decoded.userId)
      .single()

    if (error) {
      console.error('Error fetching user status:', error)
      return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error in GET /api/user-status-update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update user status
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
    const { status, reason } = body

    // Validate status
    const validStatuses: UserStatus[] = [
      'available',
      'on_call',
      'lunch_break',
      'comfort_break',
      'meeting',
      'coaching',
      'unavailable'
    ]

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status',
        validStatuses 
      }, { status: 400 })
    }

    // Check if user is currently on a call
    const { data: currentUser, error: checkError } = await supabase
      .from('users')
      .select('is_on_call, user_status')
      .eq('id', decoded.userId)
      .single()

    if (checkError) {
      console.error('Error checking current user:', checkError)
      return NextResponse.json({ error: 'Failed to check user status' }, { status: 500 })
    }

    // Prevent changing status while on a call (except to available when ending call)
    if (currentUser.is_on_call && status !== 'on_call' && status !== 'available') {
      return NextResponse.json({ 
        error: 'Cannot change status while on a call. Please end your call first.' 
      }, { status: 409 })
    }

    // Update user status
    const updateData: any = {
      user_status: status,
      status_changed_at: new Date().toISOString()
    }

    if (reason !== undefined) {
      updateData.status_reason = reason
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', decoded.userId)
      .select('id, first_name, last_name, user_status, status_changed_at, status_reason')
      .single()

    if (updateError) {
      console.error('Error updating user status:', updateError)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    console.log(`✅ User ${updatedUser.first_name} ${updatedUser.last_name} status updated to: ${status}`)

    return NextResponse.json({ 
      message: 'Status updated successfully',
      user: updatedUser 
    })
  } catch (error) {
    console.error('Error in PUT /api/user-status-update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
