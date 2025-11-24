import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { emailService } from '@/lib/emailService'
import { getAdminUsers, getAdminEmails, getUserById } from '@/lib/adminUtils'

export async function POST(request: NextRequest) {
  console.log('🔍 DEBUG: Customer feedback API called')
  
  try {
    const authHeader = request.headers.get('authorization')
    console.log('🔍 Auth header present:', !!authHeader)
    
    const token = extractTokenFromHeader(authHeader)
    console.log('🔍 Token extracted:', !!token)
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const payload = verifyToken(token)
    console.log('🔍 Token verified:', !!payload, payload?.userId)
    
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    console.log('🔍 Request body:', JSON.stringify(body, null, 2))

    // Test if table exists
    const { data: tableTest, error: tableError } = await supabase
      .from('customer_feedback')
      .select('id')
      .limit(1)

    if (tableError) {
      console.error('❌ Table test failed:', tableError)
      return NextResponse.json({ 
        error: 'customer_feedback table does not exist or is not accessible',
        details: tableError,
        hint: 'Please run the customer-feedback-schema.sql in Supabase'
      }, { status: 500 })
    }

    console.log('✅ Table exists and is accessible')

    // Validate required fields
    if (!body.client_id || !body.feedback_type || !body.subject || !body.notes) {
      return NextResponse.json({ 
        error: 'Missing required fields: client_id, feedback_type, subject, notes',
        received: body
      }, { status: 400 })
    }

    // Check if client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, principal_key_holder')
      .eq('id', body.client_id)
      .single()

    if (clientError || !client) {
      console.error('❌ Client not found:', body.client_id, clientError)
      return NextResponse.json({ 
        error: 'Client not found',
        client_id: body.client_id,
        details: clientError
      }, { status: 404 })
    }

    console.log('✅ Client found:', client.principal_key_holder)

    // Try to insert feedback
    const insertData = {
      client_id: body.client_id,
      user_id: payload.userId,
      call_log_id: body.call_log_id || null,
      feedback_type: body.feedback_type,
      subject: body.subject,
      notes: body.notes,
      priority: body.priority || 'medium'
    }

    console.log('🔍 Inserting feedback:', JSON.stringify(insertData, null, 2))

    const { data: feedback, error } = await supabase
      .from('customer_feedback')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Database insert error:', error)
      return NextResponse.json({ 
        error: 'Failed to create feedback',
        details: error,
        insertData: insertData
      }, { status: 500 })
    }

    console.log('✅ Feedback created successfully:', feedback?.id)

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
        
        // We need to transform the feedback data to match the expected format
        const feedbackWithRelations = {
          ...feedback,
          clients: {
            principal_key_holder: client.principal_key_holder,
            box_number: 'Debug',
            telephone_cell: 'N/A'
          }
        }
        
        const emailSent = await emailService.notifyAdminsOfNewFeedback(
          feedbackWithRelations,
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

    return NextResponse.json({ 
      success: true,
      feedback,
      debug: {
        userId: payload.userId,
        clientId: body.client_id,
        feedbackType: body.feedback_type
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}