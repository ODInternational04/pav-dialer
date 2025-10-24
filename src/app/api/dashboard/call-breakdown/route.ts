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

    // Get current month's call data
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    let query = supabase
      .from('call_logs')
      .select('call_status')
      .gte('created_at', startOfMonth.toISOString())

    // If not admin, filter by user
    if (decoded.role !== 'admin') {
      query = query.eq('user_id', decoded.userId)
    }

    const { data: calls, error } = await query

    if (error) {
      console.error('Error fetching call breakdown:', error)
      return NextResponse.json({ error: 'Failed to fetch call breakdown' }, { status: 500 })
    }

    // Count call statuses
    const statusCounts = {
      completed: 0,
      missed: 0,
      declined: 0,
      busy: 0,
      other: 0
    }

    calls?.forEach(call => {
      switch (call.call_status?.toLowerCase()) {
        case 'completed':
          statusCounts.completed++
          break
        case 'missed':
        case 'no_answer':
        case 'no answer':
          statusCounts.missed++
          break
        case 'declined':
          statusCounts.declined++
          break
        case 'busy':
          statusCounts.busy++
          break
        default:
          statusCounts.other++
      }
    })

    const totalCalls = calls?.length || 0
    const breakdownData = []

    if (statusCounts.completed > 0) {
      breakdownData.push({
        type: 'Completed',
        count: statusCounts.completed,
        percentage: parseFloat(((statusCounts.completed / totalCalls) * 100).toFixed(1))
      })
    }

    if (statusCounts.missed > 0) {
      breakdownData.push({
        type: 'No Answer',
        count: statusCounts.missed,
        percentage: parseFloat(((statusCounts.missed / totalCalls) * 100).toFixed(1))
      })
    }

    if (statusCounts.busy > 0) {
      breakdownData.push({
        type: 'Busy',
        count: statusCounts.busy,
        percentage: parseFloat(((statusCounts.busy / totalCalls) * 100).toFixed(1))
      })
    }

    if (statusCounts.declined > 0) {
      breakdownData.push({
        type: 'Declined',
        count: statusCounts.declined,
        percentage: parseFloat(((statusCounts.declined / totalCalls) * 100).toFixed(1))
      })
    }

    if (statusCounts.other > 0) {
      breakdownData.push({
        type: 'Other',
        count: statusCounts.other,
        percentage: parseFloat(((statusCounts.other / totalCalls) * 100).toFixed(1))
      })
    }

    return NextResponse.json({
      data: breakdownData
    })
  } catch (error) {
    console.error('Error in call breakdown GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}