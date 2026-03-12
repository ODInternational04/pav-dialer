import { NextRequest, NextResponse } from 'next/server'

/**
 * Zoho OAuth Authentication Flow - Initial Authorization
 * 
 * This endpoint redirects to Zoho for OAuth authorization.
 * After user approves, Zoho redirects to /api/zoho/callback with code.
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.ZOHO_CLIENT_ID
    const redirectUri = process.env.ZOHO_REDIRECT_URI
    
    if (!clientId || !redirectUri) {
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: red;">❌ Configuration Error</h2>
          <p>ZOHO_CLIENT_ID or ZOHO_REDIRECT_URI not configured in .env.local</p>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      })
    }
    
    const scope = 'ZohoBigin.modules.ALL,ZohoBigin.users.READ'
    
    // Build URL with proper encoding
    const params = new URLSearchParams({
      scope: scope,
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      access_type: 'offline',
      prompt: 'consent'
    })
    
    const authUrl = `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`

    // Use proper HTTP redirect (307 to preserve GET method)
    return NextResponse.redirect(authUrl, 307)

  } catch (error: any) {
    console.error('OAuth error:', error)
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: red;">❌ Error</h2>
        <p>${error.message || 'OAuth flow failed'}</p>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
