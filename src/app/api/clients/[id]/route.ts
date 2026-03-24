import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { UpdateClientRequest } from '@/types'
import { zohoClient } from '@/lib/zoho'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { id } = await params

    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        *,
        created_by_user:users!clients_created_by_fkey(first_name, last_name),
        last_updated_by_user:users!clients_last_updated_by_fkey(first_name, last_name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { id: clientId } = await params
    const body: UpdateClientRequest = await request.json()
    const { id, ...updateData } = body

    console.log('📝 Client update request:', { clientId, updateData })

    // Remove undefined values
    const cleanUpdateData: any = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    // Convert empty string to null for booking_status
    if (cleanUpdateData.booking_status === '') {
      cleanUpdateData.booking_status = null
    }

    // Add last_updated_by
    cleanUpdateData.last_updated_by = payload.userId

    console.log('🔄 Clean update data:', cleanUpdateData)

    const { data: updatedClient, error } = await supabase
      .from('clients')
      .update(cleanUpdateData)
      .eq('id', clientId)
      .select(`
        *,
        created_by_user:users!clients_created_by_fkey(first_name, last_name),
        last_updated_by_user:users!clients_last_updated_by_fkey(first_name, last_name)
      `)
      .single()

    if (error) {
      console.error('Error updating client:', error)
      return NextResponse.json(
        { error: 'Failed to update client' },
        { status: 500 }
      )
    }

    // Automatically sync to Zoho Bigin if configured and contact exists
    console.log('🔍 Checking Zoho sync...', {
      hasRefreshToken: !!process.env.ZOHO_REFRESH_TOKEN,
      hasClient: !!updatedClient,
      zohoContactId: updatedClient?.zoho_contact_id
    })

    if (process.env.ZOHO_REFRESH_TOKEN && updatedClient) {
      try {
        if (updatedClient.zoho_contact_id) {
          // Update existing Zoho contact
          console.log(`[Zoho] 🔄 Auto-syncing updated client: ${updatedClient.name}`)
          console.log('[Zoho] 📝 Data being sent:', {
            name: updatedClient.name,
            phone: updatedClient.phone,
            email: updatedClient.email,
            quotation_done: updatedClient.quotation_done,
            booking_status: updatedClient.booking_status
          })
          
          const result = await zohoClient.updateContact(updatedClient.zoho_contact_id, {
            name: updatedClient.name,
            phone: updatedClient.phone,
            email: updatedClient.email || null,
            notes: updatedClient.notes || '',
            quotation_done: updatedClient.quotation_done !== undefined ? updatedClient.quotation_done : false,
            booking_status: updatedClient.booking_status || null
          })

          console.log('[Zoho] ✅ Update result:', result)

          // Update sync timestamp
          await supabase
            .from('clients')
            .update({
              zoho_synced_at: new Date().toISOString(),
              zoho_last_sync_status: 'success'
            })
            .eq('id', updatedClient.id)

          console.log(`[Zoho] ✓ Client updated in Zoho. Contact ID: ${updatedClient.zoho_contact_id}`)
        } else {
          // Create new Zoho contact if doesn't exist
          console.log(`[Zoho] Creating new Zoho contact for: ${updatedClient.name}`)
          
          const zohoContact = await zohoClient.createContact({
            name: updatedClient.name,
            phone: updatedClient.phone,
            email: updatedClient.email || null,
            notes: updatedClient.notes || '',
            quotation_done: updatedClient.quotation_done !== undefined ? updatedClient.quotation_done : false,
            booking_status: updatedClient.booking_status || null
          })

          if (zohoContact?.data?.[0]?.details?.id) {
            const zohoId = zohoContact.data[0].details.id
            
            await supabase
              .from('clients')
              .update({
                zoho_contact_id: zohoId,
                zoho_synced_at: new Date().toISOString(),
                zoho_last_sync_status: 'success'
              })
              .eq('id', updatedClient.id)

            console.log(`[Zoho] ✓ Client synced to Zoho. Contact ID: ${zohoId}`)
            updatedClient.zoho_contact_id = zohoId
          }
        }
      } catch (zohoError: any) {
        console.error('[Zoho] ❌ Failed to sync client to Zoho:', zohoError)
        console.error('[Zoho] ❌ Error details:', zohoError.message, zohoError.stack)
        
        await supabase
          .from('clients')
          .update({ zoho_last_sync_status: 'failed' })
          .eq('id', updatedClient.id)
      }
    } else {
      console.log('⚠️ Zoho sync skipped - missing config or client data')
    }

    return NextResponse.json({
      message: 'Client updated successfully',
      client: updatedClient,
      zoho_synced: updatedClient.zoho_contact_id ? true : false,
      zoho_status: updatedClient.zoho_last_sync_status || 'not_synced'
    })
  } catch (error) {
    console.error('Error in client update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id: clientId } = await params

    // Get client data to check for Zoho ID
    const { data: client } = await supabase
      .from('clients')
      .select('zoho_contact_id, name')
      .eq('id', clientId)
      .single()

    // Delete from Zoho first if it exists there
    if (process.env.ZOHO_REFRESH_TOKEN && client?.zoho_contact_id) {
      try {
        console.log(`[Zoho] Deleting contact from Zoho: ${client.name} (${client.zoho_contact_id})`)
        await zohoClient.deleteContact(client.zoho_contact_id)
        console.log(`[Zoho] ✓ Contact deleted from Zoho`)
      } catch (zohoError: any) {
        console.error('[Zoho] Failed to delete from Zoho:', zohoError.message)
        // Continue with local deletion even if Zoho deletion fails
      }
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)

    if (error) {
      console.error('Error deleting client:', error)
      return NextResponse.json(
        { error: 'Failed to delete client' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Client deleted successfully'
    })
  } catch (error) {
    console.error('Error in client deletion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}