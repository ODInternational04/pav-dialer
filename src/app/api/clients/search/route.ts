import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Quick search for clients by phone, name, box number, or contract number
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim()

    if (!query) {
      return NextResponse.json({ clients: [] })
    }

    // Search across multiple fields
    const { data: clients, error } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        phone,
        email,
        notes,
        created_at,
        updated_at,
        created_by,
        last_updated_by
      `)
      .or(`phone.ilike.%${query}%,name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json(
        { error: 'Failed to search clients', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ clients: clients || [] })
  } catch (error: any) {
    console.error('Unexpected error in client search:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    )
  }
}
