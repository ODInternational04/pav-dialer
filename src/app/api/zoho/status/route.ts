import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

/**
 * GET /api/zoho/status
 * Check Zoho integration configuration status
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const status = {
      configured: !!process.env.ZOHO_REFRESH_TOKEN,
      has_client_id: !!process.env.ZOHO_CLIENT_ID,
      has_client_secret: !!process.env.ZOHO_CLIENT_SECRET,
      has_api_domain: !!process.env.ZOHO_API_DOMAIN,
      has_accounts_url: !!process.env.ZOHO_ACCOUNTS_URL,
      refresh_token_length: process.env.ZOHO_REFRESH_TOKEN?.length || 0
    }

    return NextResponse.json({
      status: status.configured ? 'configured' : 'not_configured',
      details: status,
      message: status.configured 
        ? 'Zoho Bigin integration is configured' 
        : 'Zoho Bigin integration is NOT configured. Set environment variables to enable auto-sync.'
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to check status',
      message: error.message
    }, { status: 500 })
  }
}
