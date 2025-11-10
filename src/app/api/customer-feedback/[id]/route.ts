import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { UpdateCustomerFeedbackRequest } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    let query = supabase
      .from('customer_feedback')
      .select(`
        *,
        clients (
          id,
          box_number,
          principal_key_holder,
          telephone_cell,
          contract_no
        ),
        users!customer_feedback_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        call_logs (
          id,
          call_status,
          notes,
          created_at
        ),
        resolved_by_user:users!customer_feedback_resolved_by_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', id)

    // Role-based filtering
    if (payload.role !== 'admin') {
      query = query.eq('user_id', payload.userId)
    }

    const { data: feedback, error } = await query.single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    return NextResponse.json({ feedback })

  } catch (error) {
    console.error('Error fetching customer feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params
    const body: UpdateCustomerFeedbackRequest = await request.json()

    // Check if feedback exists and user has permission
    let existingQuery = supabase
      .from('customer_feedback')
      .select('*')
      .eq('id', id)

    if (payload.role !== 'admin') {
      existingQuery = existingQuery.eq('user_id', payload.userId)
    }

    const { data: existingFeedback, error: existingError } = await existingQuery.single()

    if (existingError || !existingFeedback) {
      return NextResponse.json({ error: 'Feedback not found or access denied' }, { status: 404 })
    }

    // Prepare update object
    const updateData: any = {}

    if (body.feedback_type !== undefined) updateData.feedback_type = body.feedback_type
    if (body.subject !== undefined) updateData.subject = body.subject
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.priority !== undefined) updateData.priority = body.priority

    // Handle resolution (admin only or if resolving own feedback)
    if (body.is_resolved !== undefined) {
      updateData.is_resolved = body.is_resolved
      
      if (body.is_resolved) {
        updateData.resolved_by = payload.userId
        updateData.resolved_at = new Date().toISOString()
        if (body.resolution_notes) {
          updateData.resolution_notes = body.resolution_notes
        }
      } else {
        updateData.resolved_by = null
        updateData.resolved_at = null
        updateData.resolution_notes = null
      }
    }

    // Validate enum values if provided
    if (body.feedback_type) {
      const validFeedbackTypes = ['complaint', 'happy', 'suggestion', 'general']
      if (!validFeedbackTypes.includes(body.feedback_type)) {
        return NextResponse.json({ 
          error: 'Invalid feedback_type. Must be: complaint, happy, suggestion, or general' 
        }, { status: 400 })
      }
    }

    if (body.priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent']
      if (!validPriorities.includes(body.priority)) {
        return NextResponse.json({ 
          error: 'Invalid priority. Must be: low, medium, high, or urgent' 
        }, { status: 400 })
      }
    }

    const { data: updatedFeedback, error } = await supabase
      .from('customer_feedback')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        clients (
          id,
          box_number,
          principal_key_holder,
          telephone_cell,
          contract_no
        ),
        users!customer_feedback_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        call_logs (
          id,
          call_status,
          notes,
          created_at
        ),
        resolved_by_user:users!customer_feedback_resolved_by_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 })
    }

    return NextResponse.json({ feedback: updatedFeedback })

  } catch (error) {
    console.error('Error updating customer feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    // Check if feedback exists and user has permission
    let existingQuery = supabase
      .from('customer_feedback')
      .select('*')
      .eq('id', id)

    // Only admin or feedback creator can delete
    if (payload.role !== 'admin') {
      existingQuery = existingQuery.eq('user_id', payload.userId)
    }

    const { data: existingFeedback, error: existingError } = await existingQuery.single()

    if (existingError || !existingFeedback) {
      return NextResponse.json({ error: 'Feedback not found or access denied' }, { status: 404 })
    }

    const { error } = await supabase
      .from('customer_feedback')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Feedback deleted successfully' })

  } catch (error) {
    console.error('Error deleting customer feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}