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

    // Get last 4 weeks of call data
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    let query = supabase
      .from('call_logs')
      .select('created_at, call_status')
      .gte('created_at', fourWeeksAgo.toISOString())
      .order('created_at', { ascending: true })

    // If not admin, filter by user
    if (decoded.role !== 'admin') {
      query = query.eq('user_id', decoded.userId)
    }

    const { data: calls, error } = await query

    if (error) {
      console.error('Error fetching weekly performance:', error)
      return NextResponse.json({ error: 'Failed to fetch weekly performance' }, { status: 500 })
    }

    // Group calls by week
    const weeklyData = []
    for (let week = 4; week >= 1; week--) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (week * 7))
      weekStart.setHours(0, 0, 0, 0)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)
      
      const weekCalls = calls?.filter(call => {
        const callDate = new Date(call.created_at)
        return callDate >= weekStart && callDate <= weekEnd
      }) || []
      
      const successfulCalls = weekCalls.filter(call => 
        call.call_status === 'completed'
      ).length

      weeklyData.push({
        week: `Week ${5 - week}`,
        calls: weekCalls.length,
        success: successfulCalls
      })
    }

    return NextResponse.json({
      data: weeklyData
    })
  } catch (error) {
    console.error('Error in weekly performance GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}