import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { AssignUserToCampaignRequest } from '@/types'

/**
 * POST /api/campaigns/assign - Assign user to campaign
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body: AssignUserToCampaignRequest = await request.json()

    if (!body.user_id || !body.campaign_id) {
      return NextResponse.json(
        { error: 'User ID and Campaign ID are required' },
        { status: 400 }
      )
    }

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('user_campaign_assignments')
      .select('id')
      .eq('user_id', body.user_id)
      .eq('campaign_id', body.campaign_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'User is already assigned to this campaign' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('user_campaign_assignments')
      .insert({
        user_id: body.user_id,
        campaign_id: body.campaign_id,
        assigned_by: payload.userId,
      })
      .select(`
        *,
        users:users!user_campaign_assignments_user_id_fkey(id, first_name, last_name, email, role),
        campaigns(id, name, department, status)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error assigning user to campaign:', error)
    return NextResponse.json(
      { error: 'Failed to assign user to campaign' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/campaigns/assign - Remove user from campaign
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const campaignId = searchParams.get('campaign_id')

    if (!userId || !campaignId) {
      return NextResponse.json(
        { error: 'User ID and Campaign ID are required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('user_campaign_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing user from campaign:', error)
    return NextResponse.json(
      { error: 'Failed to remove user from campaign' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/campaigns/assign - Get all assignments
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')
    const userId = searchParams.get('user_id')

    let query = supabase
      .from('user_campaign_assignments')
      .select(`
        *,
        users:users!user_campaign_assignments_user_id_fkey(id, first_name, last_name, email, role),
        campaigns(id, name, department, status),
        assigned_by_user:users!user_campaign_assignments_assigned_by_fkey(id, first_name, last_name)
      `)

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.order('assigned_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}
