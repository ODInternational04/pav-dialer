import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Campaign, CreateCampaignRequest, UpdateCampaignRequest } from '@/types'

/**
 * GET /api/campaigns - List all campaigns
 * Query params: status, department, page, limit
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
    const status = searchParams.get('status')
    const department = searchParams.get('department')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabase
      .from('campaigns')
      .select(`
        *,
        created_by_user:users!campaigns_created_by_fkey(id, first_name, last_name, email)
      `, { count: 'exact' })

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by department
    if (department && department !== 'all') {
      query = query.eq('department', department)
    }

    // Only show campaigns user has access to (unless admin)
    if (payload.role !== 'admin') {
      // Get user's assigned campaigns
      const { data: assignments } = await supabase
        .from('user_campaign_assignments')
        .select('campaign_id')
        .eq('user_id', payload.userId)

      const campaignIds = assignments?.map(a => a.campaign_id) || []
      if (campaignIds.length > 0) {
        query = query.in('id', campaignIds)
      } else {
        // User has no campaigns assigned
        return NextResponse.json({
          campaigns: [],
          totalCount: 0,
          page,
          limit,
          totalPages: 0,
        })
      }
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      campaigns: data || [],
      totalCount: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/campaigns - Create a new campaign
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

    const body: CreateCampaignRequest = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name: body.name,
        description: body.description || null,
        department: body.department || null,
        status: body.status || 'active',
        criteria: body.criteria || null,
        client_fields: body.client_fields || null,
        target_count: body.target_count || 0,
        completed_count: 0,
        created_by: payload.userId,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/campaigns - Update a campaign
 */
export async function PUT(request: NextRequest) {
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

    const body: UpdateCampaignRequest = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.department !== undefined) updateData.department = body.department
    if (body.status !== undefined) updateData.status = body.status
    if (body.criteria !== undefined) updateData.criteria = body.criteria
    if (body.client_fields !== undefined) updateData.client_fields = body.client_fields
    if (body.target_count !== undefined) updateData.target_count = body.target_count
    if (body.start_date !== undefined) updateData.start_date = body.start_date
    if (body.end_date !== undefined) updateData.end_date = body.end_date

    const { data, error } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/campaigns - Delete a campaign
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
    const campaignId = searchParams.get('id')

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    )
  }
}
