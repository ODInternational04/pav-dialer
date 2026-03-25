import { NextRequest, NextResponse } from 'next/server'
import { zohoClient } from '@/lib/zoho'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

/**
 * POST /api/zoho/sync-contacts
 * Import contacts from Zoho Bigin to local database
 * Admin only
 */
export async function POST(request: NextRequest) {
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

    // Timeout protection for Vercel (20 seconds max processing time)
    const startTime = Date.now()
    const MAX_PROCESSING_TIME = 20000 // 20 seconds
    
    let page = 1
    let hasMore = true
    let syncedCount = 0
    let createdCount = 0
    let updatedCount = 0
    let skippedCount = 0
    const errors: string[] = []
    let timeoutReached = false

    console.log('🔄 Starting Zoho contacts sync...')

    while (hasMore && !timeoutReached) {
      try {
        // Check if we're approaching timeout
        if (Date.now() - startTime > MAX_PROCESSING_TIME) {
          console.log('⏱️ Timeout approaching, stopping sync early')
          timeoutReached = true
          break
        }

        console.log(`📥 Fetching Zoho contacts page ${page}...`)
        const zohoContacts = await zohoClient.getContacts(page)
        
        if (!zohoContacts.data || zohoContacts.data.length === 0) {
          hasMore = false
          break
        }

        console.log(`✅ Retrieved ${zohoContacts.data.length} contacts from page ${page}`)

        for (const contact of zohoContacts.data) {
          try {
            const phone = contact.Phone || contact.Mobile
            if (!phone) {
              console.log(`⏭️ Skipping contact ${contact.id}: No phone number`)
              skippedCount++
              continue
            }

            // Debug: Log all fields for the first contact to see what Zoho returns
            if (syncedCount === 0) {
              console.log('🔍 DEBUG - First contact fields from Zoho:', Object.keys(contact))
              console.log('🔍 DEBUG - Booking status field value:', {
                'Booking_status': contact.Booking_status,
                'Booking_Status': contact.Booking_Status,
                'Booking status': contact['Booking status'],
                'BookingStatus': contact.BookingStatus
              })
            }

            // Check if client exists by phone
            const { data: existing } = await supabase
              .from('clients')
              .select('id, zoho_contact_id, name')
              .eq('phone', phone)
              .single()

            const fullName = [contact.First_Name, contact.Last_Name]
              .filter(Boolean)
              .join(' ')
              .trim() || 'Unknown'

            if (existing) {
              // Update with Zoho ID and custom fields if missing or different
              const updateData: any = { 
                zoho_contact_id: contact.id,
                zoho_synced_at: new Date().toISOString(),
                zoho_last_sync_status: 'success'
              }

              // Sync quotation_done field from Zoho (supports various field names and formats)
              if (contact.hasOwnProperty('Quotation_Done') || contact.hasOwnProperty('Quotation_done')) {
                const quotationValue = contact.Quotation_Done || contact.Quotation_done
                // Convert "yes"/"no" strings to boolean
                if (typeof quotationValue === 'string') {
                  updateData.quotation_done = quotationValue.toLowerCase() === 'yes' || quotationValue.toLowerCase() === 'true'
                } else {
                  updateData.quotation_done = quotationValue === true
                }
                console.log(`  📝 Quotation_done: ${quotationValue} -> ${updateData.quotation_done}`)
              }

              // Sync booking_status field from Zoho (supports various field names)
              if (contact.hasOwnProperty('Booking_status') || contact.hasOwnProperty('Booking_Status') || 
                  contact.hasOwnProperty('Booking status') || contact.hasOwnProperty('BookingStatus')) {
                let bookingValue = contact.Booking_status || contact.Booking_Status || 
                                   contact['Booking status'] || contact.BookingStatus || null
                // Handle both array (multi-select) and string formats
                if (Array.isArray(bookingValue) && bookingValue.length > 0) {
                  updateData.booking_status = bookingValue[0]
                } else if (typeof bookingValue === 'string') {
                  updateData.booking_status = bookingValue
                } else {
                  updateData.booking_status = null
                }
                console.log(`  📋 Booking_status: ${JSON.stringify(bookingValue)} -> ${updateData.booking_status}`)
              }

              if (!existing.zoho_contact_id || existing.zoho_contact_id !== contact.id) {
                await supabase
                  .from('clients')
                  .update(updateData)
                  .eq('id', existing.id)
                
                console.log(`🔄 Updated client ${existing.name} with Zoho data`)
                updatedCount++
              } else {
                // Still update custom fields even if Zoho ID is already set
                await supabase
                  .from('clients')
                  .update(updateData)
                  .eq('id', existing.id)
                console.log(`✓ Client ${existing.name} synced with custom fields`)
              }
            } else {
              // Create new client from Zoho
              const insertData: any = {
                name: fullName,
                phone: phone,
                email: contact.Email || null,
                notes: contact.Description ? `Imported from Zoho Bigin: ${contact.Description}` : 'Imported from Zoho Bigin',
                zoho_contact_id: contact.id,
                zoho_synced_at: new Date().toISOString(),
                zoho_last_sync_status: 'success',
                created_by: decoded.userId,
                last_updated_by: decoded.userId
              }

              // Sync quotation_done field from Zoho (supports string "yes"/"no" or boolean)
              if (contact.hasOwnProperty('Quotation_Done') || contact.hasOwnProperty('Quotation_done')) {
                const quotationValue = contact.Quotation_Done || contact.Quotation_done
                // Convert "yes"/"no" strings to boolean
                if (typeof quotationValue === 'string') {
                  insertData.quotation_done = quotationValue.toLowerCase() === 'yes' || quotationValue.toLowerCase() === 'true'
                } else {
                  insertData.quotation_done = quotationValue === true
                }
                console.log(`  📝 Quotation_done: ${quotationValue} -> ${insertData.quotation_done}`)
              }

              // Sync booking_status field from Zoho
              if (contact.hasOwnProperty('Booking_status') || contact.hasOwnProperty('Booking_Status') || 
                  contact.hasOwnProperty('Booking status') || contact.hasOwnProperty('BookingStatus')) {
                let bookingValue = contact.Booking_status || contact.Booking_Status || 
                                   contact['Booking status'] || contact.BookingStatus || null
                // Handle both array (multi-select) and string formats
                if (Array.isArray(bookingValue) && bookingValue.length > 0) {
                  insertData.booking_status = bookingValue[0]
                } else if (typeof bookingValue === 'string') {
                  insertData.booking_status = bookingValue
                } else {
                  insertData.booking_status = null
                }
                console.log(`  📋 Booking_status: ${JSON.stringify(bookingValue)} -> ${insertData.booking_status}`)
              }

              const { error: insertError } = await supabase
                .from('clients')
                .insert(insertData)

              if (insertError) {
                console.error(`❌ Error creating client for ${fullName}:`, insertError.message)
                errors.push(`Failed to create ${fullName}: ${insertError.message}`)
              } else {
                console.log(`➕ Created new client ${fullName}`)
                createdCount++
              }
            }
            
            syncedCount++
          } catch (contactError: any) {
            console.error(`❌ Error processing contact ${contact.id}:`, contactError.message)
            errors.push(`Contact ${contact.id}: ${contactError.message}`)
          }
        }

        // Check if there are more pages
        page++
        hasMore = zohoContacts.info?.more_records === true
        
        if (hasMore) {
          console.log(`📄 More records available, fetching page ${page}...`)
        }
      } catch (pageError: any) {
        console.error(`❌ Error fetching page ${page}:`, pageError.message)
        errors.push(`Page ${page}: ${pageError.message}`)
        hasMore = false
      }
    }

    console.log(`✅ Sync completed: ${syncedCount} processed, ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped`)

    // Build response message
    let message = `Successfully synced ${syncedCount} contacts from Zoho Bigin`
    if (timeoutReached) {
      message = `⏱️ Partial sync completed (${syncedCount} contacts). Run sync again to continue.`
    }

    return NextResponse.json({
      success: true,
      message: message,
      details: {
        processed: syncedCount,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        timeoutReached: timeoutReached,
        lastPage: page,
        errors: errors.length > 0 ? errors : null
      }
    })
  } catch (error: any) {
    console.error('❌ Zoho sync error:', error)
    
    // Better error messages for common issues
    let errorMessage = error.message
    if (errorMessage.includes('ZOHO_REFRESH_TOKEN')) {
      errorMessage = 'Zoho authentication failed. Token may be expired. Please re-authenticate.'
    } else if (errorMessage.includes('Failed to refresh Zoho token')) {
      errorMessage = 'Failed to refresh Zoho access token. Please verify your Zoho credentials in environment variables.'
    } else if (errorMessage.includes('Failed to fetch Zoho contacts')) {
      errorMessage = 'Unable to connect to Zoho API. Please check your internet connection and Zoho API credentials.'
    }
    
    return NextResponse.json({
      error: 'Sync failed',
      message: errorMessage,
      details: error.stack
    }, { status: 500 })
  }
}

/**
 * GET /api/zoho/sync-contacts
 * Get sync statistics
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get counts
    const { data: totalClients, count: total } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })

    const { data: syncedClients, count: synced } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .not('zoho_contact_id', 'is', null)

    const { data: recentSyncs } = await supabase
      .from('zoho_sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      totalClients: total || 0,
      syncedClients: synced || 0,
      notSynced: (total || 0) - (synced || 0),
      recentSyncs: recentSyncs || []
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to get stats',
      message: error.message
    }, { status: 500 })
  }
}
