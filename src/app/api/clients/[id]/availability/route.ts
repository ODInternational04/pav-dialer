import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

// Check if a client is available for calling (not currently being called by another user)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: clientId } = await params

    // Check if any user is currently calling this client
    const { data: userOnCall, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        call_started_at
      `)
      .eq('current_call_client_id', clientId)
      .eq('is_on_call', true)
      .maybeSingle()

    if (error) {
      console.error('Error checking client availability:', error)
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
    }

    const isAvailable = !userOnCall
    
    return NextResponse.json({
      available: isAvailable,
      caller: userOnCall ? {
        id: userOnCall.id,
        name: `${userOnCall.first_name} ${userOnCall.last_name}`,
        call_started_at: userOnCall.call_started_at
      } : null
    })
  } catch (error) {
    console.error('Error in client availability check:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}