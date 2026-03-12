import { NextRequest, NextResponse } from 'next/server'

/**
 * Debug endpoint to see what OAuth URL is being generated
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.ZOHO_CLIENT_ID
  const redirectUri = process.env.ZOHO_REDIRECT_URI
  const scope = 'ZohoBigin.modules.ALL,ZohoBigin.users.READ'
  
  const authUrl = `https://accounts.zoho.com/oauth/v2/auth?` +
    `scope=${encodeURIComponent(scope)}&` +
    `client_id=${encodeURIComponent(clientId!)}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri!)}&` +
    `access_type=offline&` +
    `prompt=consent`

  return NextResponse.json({
    clientId,
    redirectUri,
    scope,
    fullAuthUrl: authUrl,
    message: 'Check if redirect_uri matches what you have in Zoho Console'
  })
}
