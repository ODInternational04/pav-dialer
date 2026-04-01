import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    
    console.log('Received credentials:', { username, password })
    console.log('Username match:', username === 'stats')
    console.log('Password match:', password === 'stats123')

    // Validate credentials
    if (username !== 'stats' || password !== 'stats123') {
      console.log('Invalid credentials - rejecting')
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get total calls for today
    const { data: calls, error: callsError } = await supabase
      .from('call_logs')
      .select('id, created_at, user_id')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())

    if (callsError) {
      console.error('Error fetching calls:', callsError)
      throw callsError
    }

    // Get new clients created today
    const { data: newClients, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())

    if (clientsError) {
      console.error('Error fetching new clients:', clientsError)
      throw clientsError
    }

    // Get user call counts
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw usersError
    }

    // Count calls per user
    const userCallCounts = users.map(user => {
      const userCalls = calls?.filter(call => call.user_id === user.id) || []
      return {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        callCount: userCalls.length
      }
    }).sort((a, b) => b.callCount - a.callCount)

    return NextResponse.json({
      totalCalls: calls?.length || 0,
      newClients: newClients?.length || 0,
      userStats: userCallCounts,
      date: today.toISOString()
    })

  } catch (error) {
    console.error('Statistics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
