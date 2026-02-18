import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/campaigns/[id] - Get single campaign with details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const campaignId = params.id

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        created_by_user:users!campaigns_created_by_fkey(id, first_name, last_name, email)
      `)
      .eq('id', campaignId)
      .single()

    if (campaignError) throw campaignError

    // Check if user has access to this campaign
    if (payload.role !== 'admin') {
      const { data: assignment } = await supabase
        .from('user_campaign_assignments')
        .select('id')
        .eq('user_id', payload.userId)
        .eq('campaign_id', campaignId)
        .single()

      if (!assignment) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Get assigned users
    const { data: assignments } = await supabase
      .from('user_campaign_assignments')
      .select(`
        *,
        users:users!user_campaign_assignments_user_id_fkey(id, first_name, last_name, email, role),
        assigned_by_user:users!user_campaign_assignments_assigned_by_fkey(id, first_name, last_name)
      `)
      .eq('campaign_id', campaignId)

    // Get campaign statistics
    const { data: stats } = await supabase
      .rpc('get_campaign_statistics', { p_campaign_id: campaignId })

    return NextResponse.json({
      ...campaign,
      assigned_users: assignments || [],
      statistics: stats && stats.length > 0 ? stats[0] : null,
    })
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}
