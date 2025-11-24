import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/emailService'
import { getAdminUsers, getAdminEmails, getUserById } from '@/lib/adminUtils'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing email notification system...')

    // Get admin users
    const adminUsers = await getAdminUsers()
    console.log(`Found ${adminUsers.length} admin users:`, adminUsers.map(u => u.email))

    if (adminUsers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No admin users found to notify',
        adminCount: 0
      }, { status: 400 })
    }

    const adminEmails = getAdminEmails(adminUsers)
    console.log('Admin emails:', adminEmails)

    // Create mock feedback data for testing
    const mockFeedback = {
      id: 'test-feedback-id',
      client_id: 'test-client-id',
      user_id: 'test-user-id',
      feedback_type: 'complaint' as const,
      subject: 'Test Email Notification',
      notes: 'This is a test customer feedback to verify that email notifications are working properly for admin users.',
      priority: 'high' as const,
      is_resolved: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      clients: {
        id: 'test-client-id',
        principal_key_holder: 'Test Client',
        box_number: 'BOX001',
        telephone_cell: '555-0123',
        contract_no: 'CONTRACT001'
      }
    }

    const mockUser = {
      id: 'test-user-id',
      email: 'testuser@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'user' as const
    }

    // Test sending email
    console.log('📧 Attempting to send test email...')
    const emailSent = await emailService.notifyAdminsOfNewFeedback(
      mockFeedback,
      mockUser,
      adminEmails
    )

    return NextResponse.json({
      success: true,
      emailSent,
      adminCount: adminUsers.length,
      adminEmails,
      testData: {
        feedback: mockFeedback,
        submittedBy: mockUser
      },
      message: emailSent 
        ? 'Test email notification sent successfully' 
        : 'Email notification failed (but this is expected in development without email config)'
    })

  } catch (error) {
    console.error('❌ Email test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Email test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}