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

    // Timeout protection for Vercel (45 seconds max processing time for better completion)
    const startTime = Date.now()
    const MAX_PROCESSING_TIME = 45000 // 45 seconds (safer for Vercel's 60s limit)
    
    let page = 1
    let hasMore = true
    let syncedCount = 0
    let createdCount = 0
    let updatedCount = 0
    let skippedCount = 0
    const errors: string[] = []
    let timeoutReached = false
    
    // Collect all contacts first for batch processing
    const allContactsToProcess: any[] = []

    console.log('🔄 Starting Zoho contacts sync...')

    // Step 1: Fetch all contacts from all pages
    while (hasMore && !timeoutReached) {
      try {
        // Check if we're approaching timeout
        if (Date.now() - startTime > MAX_PROCESSING_TIME) {
          console.log('⏱️ Timeout approaching, stopping fetch early')
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
        
        // Add to batch for processing
        allContactsToProcess.push(...zohoContacts.data)

        // Check if there are more pages
        page++
        hasMore = zohoContacts.info?.more_records === true
        
      } catch (pageError: any) {
        console.error(`❌ Error fetching page ${page}:`, pageError.message)
        errors.push(`Page ${page}: ${pageError.message}`)
        hasMore = false
      }
    }

    console.log(`📦 Fetched ${allContactsToProcess.length} total contacts, processing in batches...`)

    // Step 2: Get all existing clients by phone for quick lookup
    const allPhones = allContactsToProcess
      .map(c => c.Phone || c.Mobile)
      .filter(Boolean)
    
    const { data: existingClients } = await supabase
      .from('clients')
      .select('id, phone, zoho_contact_id')
      .in('phone', allPhones)
    
    const phoneToClientMap = new Map(
      existingClients?.map(c => [c.phone, c]) || []
    )

    console.log(`🔍 Found ${existingClients?.length || 0} existing clients`)

    // Step 3: Prepare batch operations
    const toInsert: any[] = []
    const toUpdate: any[] = []

    for (const contact of allContactsToProcess) {
      try {
        const phone = contact.Phone || contact.Mobile
        if (!phone) {
          skippedCount++
          continue
        }

        const fullName = [contact.First_Name, contact.Last_Name]
          .filter(Boolean)
          .join(' ')
          .trim() || 'Unknown'

        // Extract custom fields
        const quotationValue = contact.Quotation_Done || contact.Quotation_done
        const quotationDone = typeof quotationValue === 'string' 
          ? quotationValue.toLowerCase() === 'yes' || quotationValue.toLowerCase() === 'true'
          : quotationValue === true

        const bookingValue = contact.Booking_status || contact.Booking_Status || 
                            contact['Booking status'] || contact.BookingStatus || null
        const bookingStatus = Array.isArray(bookingValue) && bookingValue.length > 0
          ? bookingValue[0]
          : typeof bookingValue === 'string' ? bookingValue : null

        const existing = phoneToClientMap.get(phone)

        if (existing) {
          // Update existing
          toUpdate.push({
            id: existing.id,
            zoho_contact_id: contact.id,
            zoho_synced_at: new Date().toISOString(),
            zoho_last_sync_status: 'success',
            quotation_done: quotationDone || false,
            booking_status: bookingStatus,
            name: fullName, // Update name in case it changed
            email: contact.Email || null
          })
          updatedCount++
        } else {
          // Insert new
          toInsert.push({
            name: fullName,
            phone: phone,
            email: contact.Email || null,
            notes: contact.Description ? `Imported from Zoho: ${contact.Description}` : 'Imported from Zoho Bigin',
            zoho_contact_id: contact.id,
            zoho_synced_at: new Date().toISOString(),
            zoho_last_sync_status: 'success',
            quotation_done: quotationDone || false,
            booking_status: bookingStatus,
            created_by: decoded.userId,
            last_updated_by: decoded.userId
          })
          createdCount++
        }

        syncedCount++
      } catch (contactError: any) {
        console.error(`❌ Error processing contact ${contact.id}:`, contactError.message)
        errors.push(`Contact ${contact.id}: ${contactError.message}`)
      }
    }

    // Step 4: Execute batch operations
    console.log(`💾 Inserting ${toInsert.length} new clients...`)
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('clients')
        .insert(toInsert)
      
      if (insertError) {
        console.error('❌ Batch insert error:', insertError.message)
        errors.push(`Batch insert failed: ${insertError.message}`)
      }
    }

    console.log(`🔄 Updating ${toUpdate.length} existing clients...`)
    // Update in batches of 50 for better performance
    const updateBatchSize = 50
    for (let i = 0; i < toUpdate.length; i += updateBatchSize) {
      const batch = toUpdate.slice(i, i + updateBatchSize)
      
      for (const update of batch) {
        const { error: updateError } = await supabase
          .from('clients')
          .update(update)
          .eq('id', update.id)
        
        if (updateError) {
          console.error(`❌ Update error for client ${update.id}:`, updateError.message)
        }
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
