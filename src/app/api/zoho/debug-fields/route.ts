import { NextRequest, NextResponse } from 'next/server'
import { zohoClient } from '@/lib/zoho'
import { verifyToken } from '@/lib/auth'

/**
 * GET /api/zoho/debug-fields
 * Debug endpoint to see what fields Zoho is returning
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Check if Zoho is configured
    if (!process.env.ZOHO_REFRESH_TOKEN) {
      return NextResponse.json({
        error: 'Zoho integration not configured',
        message: 'Please complete OAuth setup at /api/zoho/auth first'
      }, { status: 400 })
    }

    console.log('🔍 Fetching first page of Zoho contacts for field inspection...')
    const zohoContacts = await zohoClient.getContacts(1, 5) // Get just 5 contacts
    
    if (!zohoContacts.data || zohoContacts.data.length === 0) {
      return NextResponse.json({
        error: 'No contacts found in Zoho',
        message: 'Add some contacts to Zoho Bigin first'
      }, { status: 404 })
    }

    // Extract field information from first contact
    const firstContact = zohoContacts.data[0]
    const allFields = Object.keys(firstContact)
    
    // Look for booking and quotation related fields
    const bookingFields = allFields.filter(field => 
      field.toLowerCase().includes('booking')
    )
    const quotationFields = allFields.filter(field => 
      field.toLowerCase().includes('quotation') || field.toLowerCase().includes('quote')
    )

    // Sample all contacts to see different field values
    const samples = zohoContacts.data.map(contact => ({
      id: contact.id,
      name: `${contact.First_Name || ''} ${contact.Last_Name || ''}`.trim(),
      booking_related: bookingFields.reduce((acc: any, field) => {
        acc[field] = contact[field]
        return acc
      }, {}),
      quotation_related: quotationFields.reduce((acc: any, field) => {
        acc[field] = contact[field]
        return acc
      }, {})
    }))

    return NextResponse.json({
      success: true,
      message: 'Field inspection complete',
      summary: {
        total_fields: allFields.length,
        booking_related_fields: bookingFields,
        quotation_related_fields: quotationFields
      },
      all_fields: allFields,
      sample_contacts: samples,
      instructions: [
        '1. Check the "booking_related_fields" to see the exact field name Zoho uses',
        '2. The field name is case-sensitive',
        '3. Update your Zoho sync configuration if needed',
        '4. Common field names: Booking_status, Booking_Status, Booking status'
      ]
    })
  } catch (error: any) {
    console.error('❌ Zoho field debug error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      message: error.message,
      details: 'Check server logs for more information'
    }, { status: 500 })
  }
}
