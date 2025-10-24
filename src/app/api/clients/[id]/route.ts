import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { UpdateClientRequest } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        *,
        created_by_user:users!clients_created_by_fkey(first_name, last_name),
        last_updated_by_user:users!clients_last_updated_by_fkey(first_name, last_name)
      `)
      .eq('id', params.id)
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
  { params }: { params: { id: string } }
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

    const body: UpdateClientRequest = await request.json()
    const { id, ...updateData } = body

    // Remove undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    // Add last_updated_by
    cleanUpdateData.last_updated_by = payload.userId

    const { data: updatedClient, error } = await supabase
      .from('clients')
      .update(cleanUpdateData)
      .eq('id', params.id)
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

    return NextResponse.json({
      message: 'Client updated successfully',
      client: updatedClient
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
  { params }: { params: { id: string } }
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

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', params.id)

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