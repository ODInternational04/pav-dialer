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

    // Only admins can see all user performance
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get current month's call data with user information
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: calls, error } = await supabase
      .from('call_logs')
      .select(`
        call_status,
        user_id,
        users!inner(first_name, last_name)
      `)
      .gte('created_at', startOfMonth.toISOString())

    if (error) {
      console.error('Error fetching user performance:', error)
      return NextResponse.json({ error: 'Failed to fetch user performance' }, { status: 500 })
    }

    // Group calls by user
    const userStats: { [key: string]: { name: string; calls: number; successful: number } } = {}

    calls?.forEach((call: any) => {
      const userId = call.user_id
      const userName = `${call.users.first_name} ${call.users.last_name}`
      
      if (!userStats[userId]) {
        userStats[userId] = {
          name: userName,
          calls: 0,
          successful: 0
        }
      }
      
      userStats[userId].calls++
      if (call.call_status === 'completed') {
        userStats[userId].successful++
      }
    })

    // Convert to array and calculate success rates
    const performanceData = Object.values(userStats)
      .map(user => ({
        name: user.name,
        calls: user.calls,
        successRate: user.calls > 0 ? parseFloat(((user.successful / user.calls) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.successRate - a.successRate) // Sort by success rate
      .slice(0, 10) // Top 10 performers

    return NextResponse.json({
      data: performanceData
    })
  } catch (error) {
    console.error('Error in user performance GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}