import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasRefreshToken: !!process.env.ZOHO_REFRESH_TOKEN,
    refreshTokenLength: process.env.ZOHO_REFRESH_TOKEN?.length || 0,
    hasClientId: !!process.env.ZOHO_CLIENT_ID,
    hasClientSecret: !!process.env.ZOHO_CLIENT_SECRET,
    allZohoKeys: Object.keys(process.env).filter(key => key.startsWith('ZOHO'))
  })
}
