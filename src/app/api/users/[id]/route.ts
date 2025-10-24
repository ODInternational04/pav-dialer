import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, hashPassword } from '@/lib/auth'

interface Params {
  id: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Only admin can manage users or users can view their own profile
    if (decoded.role !== 'admin' && decoded.userId !== params.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { id } = params

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        is_active,
        created_at,
        updated_at,
        last_login
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      console.error('Error fetching user:', error)
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
    }

    // Get detailed call statistics for this user
    const { data: callStats } = await supabase
      .from('call_logs')
      .select('call_status, call_duration, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })

    const totalCalls = callStats?.length || 0
    const completedCalls = callStats?.filter(call => call.call_status === 'completed').length || 0
    const missedCalls = callStats?.filter(call => call.call_status === 'missed').length || 0
    const declinedCalls = callStats?.filter(call => call.call_status === 'declined').length || 0
    const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0
    const avgCallDuration = callStats && callStats.length > 0 
      ? callStats.reduce((sum, call) => sum + (call.call_duration || 0), 0) / callStats.length
      : 0

    // Get recent call activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const recentCalls = callStats?.filter(call => call.created_at >= sevenDaysAgo).length || 0

    return NextResponse.json({
      ...user,
      stats: {
        totalCalls,
        completedCalls,
        missedCalls,
        declinedCalls,
        successRate,
        avgCallDuration: Math.round(avgCallDuration),
        recentCalls,
      }
    })
  } catch (error) {
    console.error('Error in user GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { first_name, last_name, email, role, is_active, password } = body

    // Check permissions
    const isOwnProfile = decoded.userId === id
    const isAdmin = decoded.role === 'admin'

    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Non-admins can only update their own basic info
    if (!isAdmin && (role !== undefined || is_active !== undefined)) {
      return NextResponse.json({ error: 'Only admins can change role or active status' }, { status: 403 })
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
      }

      // Check if email already exists (excluding current user)
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .single()

      if (existingUser) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
      }
    }

    // Validate role if provided
    if (role && !['admin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Role must be either "admin" or "user"' }, { status: 400 })
    }

    // Validate password if provided
    if (password && password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    const updateData: any = {}
    if (first_name !== undefined) updateData.first_name = first_name
    if (last_name !== undefined) updateData.last_name = last_name
    if (email !== undefined) updateData.email = email
    if (isAdmin && role !== undefined) updateData.role = role
    if (isAdmin && is_active !== undefined) updateData.is_active = is_active
    if (password) updateData.password_hash = await hashPassword(password)

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        is_active,
        created_at,
        updated_at,
        last_login
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      console.error('Error updating user:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error in user PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Only admin can delete users
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = params

    // Prevent admin from deleting themselves
    if (decoded.userId === id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Check if user exists and get their info first
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 })
    }

    // Instead of deleting, deactivate the user to preserve data integrity
    const { data: deactivatedUser, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .select('id, email, first_name, last_name')
      .single()

    if (error) {
      console.error('Error deactivating user:', error)
      return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'User deactivated successfully',
      user: deactivatedUser
    })
  } catch (error) {
    console.error('Error in user DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}