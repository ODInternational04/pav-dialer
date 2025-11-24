import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get all call logs without any filtering first
    const { data: allCalls, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        clients:client_id (principal_key_holder),
        users:user_id (first_name, last_name)
      `)
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get total count
    const { count } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })

    // Get today's calls (last 24 hours)
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const { count: todayCount } = await supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo.toISOString())

    return NextResponse.json({
      totalCalls: count,
      todayCount,
      sampleCalls: allCalls,
      currentTime: new Date().toISOString(),
      twentyFourHoursAgo: twentyFourHoursAgo.toISOString()
    })
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}