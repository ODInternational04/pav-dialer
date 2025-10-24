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

    // Get last 3 months of call data
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    threeMonthsAgo.setDate(1)
    threeMonthsAgo.setHours(0, 0, 0, 0)

    let query = supabase
      .from('call_logs')
      .select('created_at, call_status')
      .gte('created_at', threeMonthsAgo.toISOString())
      .order('created_at', { ascending: true })

    // If not admin, filter by user
    if (decoded.role !== 'admin') {
      query = query.eq('user_id', decoded.userId)
    }

    const { data: calls, error } = await query

    if (error) {
      console.error('Error fetching monthly performance:', error)
      return NextResponse.json({ error: 'Failed to fetch monthly performance' }, { status: 500 })
    }

    // Group calls by month
    const monthlyData = []
    for (let i = 2; i >= 0; i--) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i)
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      
      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      monthEnd.setDate(0)
      monthEnd.setHours(23, 59, 59, 999)
      
      const monthCalls = calls?.filter(call => {
        const callDate = new Date(call.created_at)
        return callDate >= monthStart && callDate <= monthEnd
      }) || []
      
      const successfulCalls = monthCalls.filter(call => 
        call.call_status === 'completed'
      ).length

      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        calls: monthCalls.length,
        success: successfulCalls
      })
    }

    return NextResponse.json({
      data: monthlyData
    })
  } catch (error) {
    console.error('Error in monthly performance GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}