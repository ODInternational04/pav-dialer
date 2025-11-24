import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

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

    const isAdmin = payload.role === 'admin'
    const userId = payload.userId

    // Get all call logs for debugging
    let debugQuery = supabase
      .from('call_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (!isAdmin) {
      debugQuery = debugQuery.eq('user_id', userId)
    }
    
    const { data: allCalls } = await debugQuery

    // Get today's date info
    const today = new Date()
    const todayISO = today.toISOString().split('T')[0]
    const todayStart = `${todayISO}T00:00:00.000Z`
    const todayEnd = `${todayISO}T23:59:59.999Z`

    // Get today's calls with debug info
    let todayQuery = supabase
      .from('call_logs')
      .select('*')
      .gte('created_at', todayStart)
      .lt('created_at', todayEnd)
    
    if (!isAdmin) {
      todayQuery = todayQuery.eq('user_id', userId)
    }
    
    const { data: todayCalls } = await todayQuery

    const debug = {
      currentTime: new Date().toISOString(),
      todayISO,
      todayStart,
      todayEnd,
      userId,
      isAdmin,
      totalCallsFound: allCalls?.length || 0,
      todayCallsFound: todayCalls?.length || 0,
      allCalls: allCalls?.map(call => ({
        id: call.id,
        created_at: call.created_at,
        user_id: call.user_id,
        call_status: call.call_status,
        callback_requested: call.callback_requested
      })) || [],
      todayCalls: todayCalls?.map(call => ({
        id: call.id,
        created_at: call.created_at,
        user_id: call.user_id,
        call_status: call.call_status,
        callback_requested: call.callback_requested
      })) || []
    }

    return NextResponse.json(debug)
  } catch (error) {
    console.error('Error in debug stats:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}