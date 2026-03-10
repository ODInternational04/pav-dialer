import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = searchParams.get('end_date') || new Date().toISOString()

    // Get feedback statistics using the database function
    const { data: stats, error: statsError } = await supabase
      .rpc('get_feedback_statistics', {
        start_date: startDate,
        end_date: endDate
      })

    if (statsError) {
      console.error('Error fetching feedback statistics:', statsError)
      return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
    }

    // Get urgent unresolved feedback
    const { data: urgentFeedback, error: urgentError } = await supabase
      .rpc('get_urgent_unresolved_feedback')

    if (urgentError) {
      console.error('Error fetching urgent feedback:', urgentError)
      return NextResponse.json({ error: 'Failed to fetch urgent feedback' }, { status: 500 })
    }

    // Get recent feedback activity
    let recentQuery = supabase
      .from('customer_feedback')
      .select(`
        *,
        clients (
          id,
          name,
          phone
        ),
        users!customer_feedback_user_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    // Filter by user if not admin
    if (payload.role !== 'admin') {
      recentQuery = recentQuery.eq('user_id', payload.userId)
    }

    const { data: recentFeedback, error: recentError } = await recentQuery

    if (recentError) {
      console.error('Error fetching recent feedback:', recentError)
      return NextResponse.json({ error: 'Failed to fetch recent feedback' }, { status: 500 })
    }

    return NextResponse.json({
      statistics: stats?.[0] || {
        total_feedback: 0,
        complaints_count: 0,
        happy_count: 0,
        suggestions_count: 0,
        general_count: 0,
        resolved_count: 0,
        pending_count: 0,
        high_priority_count: 0,
        urgent_priority_count: 0,
        average_resolution_time_hours: 0
      },
      urgentFeedback: urgentFeedback || [],
      recentFeedback: recentFeedback || []
    })

  } catch (error) {
    console.error('Error fetching feedback statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}