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

    // Get last 7 days of call data
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    let query = supabase
      .from('call_logs')
      .select('created_at, call_status')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // If not admin, filter by user
    if (decoded.role !== 'admin') {
      query = query.eq('user_id', decoded.userId)
    }

    const { data: calls, error } = await query

    if (error) {
      console.error('Error fetching daily performance:', error)
      return NextResponse.json({ error: 'Failed to fetch daily performance' }, { status: 500 })
    }

    // Group calls by date
    const dailyData = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayCalls = calls?.filter(call => 
        call.created_at.startsWith(dateStr)
      ) || []
      
      const successfulCalls = dayCalls.filter(call => 
        call.call_status === 'completed'
      ).length

      dailyData.push({
        date: dateStr,
        calls: dayCalls.length,
        success: successfulCalls
      })
    }

    return NextResponse.json({
      data: dailyData
    })
  } catch (error) {
    console.error('Error in daily performance GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}