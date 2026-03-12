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

    let page = 1
    let hasMore = true
    let syncedCount = 0
    let createdCount = 0
    let updatedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    console.log('🔄 Starting Zoho contacts sync...')

    while (hasMore) {
      try {
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
              // Update with Zoho ID if missing or different
              if (!existing.zoho_contact_id || existing.zoho_contact_id !== contact.id) {
                await supabase
                  .from('clients')
                  .update({ 
                    zoho_contact_id: contact.id,
                    zoho_synced_at: new Date().toISOString(),
                    zoho_last_sync_status: 'success'
                  })
                  .eq('id', existing.id)
                
                console.log(`🔄 Updated client ${existing.name} with Zoho ID`)
                updatedCount++
              } else {
                console.log(`✓ Client ${existing.name} already synced`)
              }
            } else {
              // Create new client from Zoho
              const { error: insertError } = await supabase
                .from('clients')
                .insert({
                  name: fullName,
                  phone: phone,
                  email: contact.Email || null,
                  notes: contact.Description ? `Imported from Zoho Bigin: ${contact.Description}` : 'Imported from Zoho Bigin',
                  zoho_contact_id: contact.id,
                  zoho_synced_at: new Date().toISOString(),
                  zoho_last_sync_status: 'success',
                  created_by: decoded.userId,
                  last_updated_by: decoded.userId
                })

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

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncedCount} contacts from Zoho Bigin`,
      details: {
        processed: syncedCount,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : null
      }
    })
  } catch (error: any) {
    console.error('❌ Zoho sync error:', error)
    return NextResponse.json({
      error: 'Sync failed',
      message: error.message
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
