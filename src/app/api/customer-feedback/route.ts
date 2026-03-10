import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { CreateCustomerFeedbackRequest, UpdateCustomerFeedbackRequest } from '@/types'
import { emailService } from '@/lib/emailService'
import { getAdminUsers, getAdminEmails, getUserById } from '@/lib/adminUtils'

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
    const feedbackType = searchParams.get('feedback_type')
    const priority = searchParams.get('priority')
    const isResolved = searchParams.get('is_resolved')
    const search = searchParams.get('search')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('customer_feedback')
      .select(`
        *,
        clients (
          id,
          name,
          phone,
          email
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

    // Apply filters
    if (feedbackType && feedbackType !== 'all') {
      query = query.eq('feedback_type', feedbackType)
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }

    if (isResolved !== null && isResolved !== 'all') {
      query = query.eq('is_resolved', isResolved === 'true')
    }

    if (search) {
      query = query.or(`subject.ilike.%${search}%,notes.ilike.%${search}%`)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Role-based filtering
    if (payload.role !== 'admin') {
      query = query.eq('user_id', payload.userId)
    }

    // Get total count for pagination
    const countQuery = supabase
      .from('customer_feedback')
      .select('*', { count: 'exact', head: true })

    // Apply same filters to count query
    if (feedbackType && feedbackType !== 'all') {
      countQuery.eq('feedback_type', feedbackType)
    }
    if (priority && priority !== 'all') {
      countQuery.eq('priority', priority)
    }
    if (isResolved !== null && isResolved !== 'all') {
      countQuery.eq('is_resolved', isResolved === 'true')
    }
    if (search) {
      countQuery.or(`subject.ilike.%${search}%,notes.ilike.%${search}%`)
    }
    if (startDate) {
      countQuery.gte('created_at', startDate)
    }
    if (endDate) {
      countQuery.lte('created_at', endDate)
    }
    if (payload.role !== 'admin') {
      countQuery.eq('user_id', payload.userId)
    }

    const [{ data: feedback, error }, { count, error: countError }] = await Promise.all([
      query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      countQuery
    ])

    if (error || countError) {
      console.error('Database error:', error || countError)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      feedback: feedback || [],
      pagination: {
        page,
        limit,
        totalCount: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching customer feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const body: CreateCustomerFeedbackRequest = await request.json()

    // Validate required fields
    if (!body.client_id || !body.feedback_type || !body.subject || !body.notes) {
      return NextResponse.json({ 
        error: 'Missing required fields: client_id, feedback_type, subject, notes' 
      }, { status: 400 })
    }

    // Validate enum values
    const validFeedbackTypes = ['complaint', 'happy', 'suggestion', 'general']
    const validPriorities = ['low', 'medium', 'high', 'urgent']

    if (!validFeedbackTypes.includes(body.feedback_type)) {
      return NextResponse.json({ 
        error: 'Invalid feedback_type. Must be: complaint, happy, suggestion, or general' 
      }, { status: 400 })
    }

    if (!validPriorities.includes(body.priority)) {
      return NextResponse.json({ 
        error: 'Invalid priority. Must be: low, medium, high, or urgent' 
      }, { status: 400 })
    }

    // Verify client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', body.client_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Verify call log exists if provided
    if (body.call_log_id) {
      const { data: callLog, error: callLogError } = await supabase
        .from('call_logs')
        .select('id')
        .eq('id', body.call_log_id)
        .single()

      if (callLogError || !callLog) {
        return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
      }
    }

    const { data: feedback, error } = await supabase
      .from('customer_feedback')
      .insert({
        client_id: body.client_id,
        user_id: payload.userId,
        call_log_id: body.call_log_id || null,
        feedback_type: body.feedback_type,
        subject: body.subject,
        notes: body.notes,
        priority: body.priority
      })
      .select(`
        *,
        clients (
          id,
          name,
          phone,
          email
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
        )
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        error: 'Failed to create feedback',
        details: error,
        insertData: {
          client_id: body.client_id,
          user_id: payload.userId,
          call_log_id: body.call_log_id || null,
          feedback_type: body.feedback_type,
          subject: body.subject,
          notes: body.notes,
          priority: body.priority
        }
      }, { status: 500 })
    }

    // Send email notifications to admins after successful feedback creation
    try {
      console.log('📧 Sending email notifications to admins...')
      
      // Get all admin users
      const adminUsers = await getAdminUsers()
      const adminEmails = getAdminEmails(adminUsers)
      
      // Get user who submitted the feedback
      const submittedByUser = await getUserById(payload.userId)
      
      if (adminEmails.length > 0 && submittedByUser && feedback) {
        console.log(`📧 Notifying ${adminEmails.length} admin(s):`, adminEmails)
        
        const emailSent = await emailService.notifyAdminsOfNewFeedback(
          feedback,
          submittedByUser,
          adminEmails
        )
        
        if (emailSent) {
          console.log('✅ Admin email notifications sent successfully')
        } else {
          console.log('❌ Failed to send admin email notifications')
        }
      } else {
        console.log('⚠️ No admins to notify or missing user/feedback data')
      }
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error('❌ Email notification error (non-blocking):', emailError)
    }

    return NextResponse.json({ feedback }, { status: 201 })

  } catch (error) {
    console.error('Error creating customer feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}