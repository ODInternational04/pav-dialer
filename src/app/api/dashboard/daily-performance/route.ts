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

    // Group calls by date using South African Standard Time (SAST = UTC+2)
    const sastOffset = 2 * 60 * 60 * 1000 // 2 hours in milliseconds
    const dailyData = []
    
    for (let i = 6; i >= 0; i--) {
      // Calculate date in SAST
      const sastNow = new Date(new Date().getTime() + sastOffset)
      const sastDate = new Date(sastNow.getFullYear(), sastNow.getMonth(), sastNow.getDate() - i)
      
      // Get UTC range for this SAST date
      const startOfDayUTC = new Date(sastDate.getTime() - sastOffset)
      const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000)
      
      const dayCalls = calls?.filter(call => {
        const callDate = new Date(call.created_at)
        return callDate >= startOfDayUTC && callDate < endOfDayUTC
      }) || []
      
      const successfulCalls = dayCalls.filter(call => 
        call.call_status === 'completed'
      ).length

      dailyData.push({
        date: sastDate.toISOString().split('T')[0], // Use SAST date for display
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