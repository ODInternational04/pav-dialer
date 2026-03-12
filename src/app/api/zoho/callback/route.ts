import { NextRequest, NextResponse } from 'next/server'

/**
 * OAuth callback handler - handles the token exchange directly
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return new NextResponse(`
      <html>
        <body style="font-family: sans-serif; padding: 50px;">
          <h1 style="color: red;">❌ OAuth Error</h1>
          <p>Error: ${error}</p>
          <a href="/api/zoho/auth">Try Again</a>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  if (!code) {
    return new NextResponse(`
      <html>
        <body style="font-family: sans-serif; padding: 50px;">
          <h1 style="color: red;">❌ No Authorization Code</h1>
          <p>No code received from Zoho</p>
          <a href="/api/zoho/auth">Try Again</a>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  // Exchange code for tokens
  try {
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        redirect_uri: process.env.ZOHO_REDIRECT_URI!,
        grant_type: 'authorization_code'
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      return new NextResponse(`
        <html>
          <body style="font-family: sans-serif; padding: 50px;">
            <h1 style="color: red;">❌ Token Exchange Failed</h1>
            <p>Error: ${errorText}</p>
            <a href="/api/zoho/auth">Try Again</a>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const tokenData = await tokenResponse.json()

    // Success page with refresh token
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Zoho OAuth Success</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #28a745; }
          .token-box {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            word-break: break-all;
            margin: 20px 0;
          }
          .step {
            margin: 15px 0;
            padding: 10px;
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
          }
          code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✅ Zoho OAuth Successful!</h1>
          <p>Your Zoho Bigin account has been authorized. Follow these steps to complete the setup:</p>
          
          <div class="step">
            <h3>Step 1: Copy Your Refresh Token</h3>
            <div class="token-box">${tokenData.refresh_token}</div>
          </div>

          <div class="step">
            <h3>Step 2: Add to .env.local</h3>
            <p>Open <code>.env.local</code> and update this line:</p>
            <pre><code>ZOHO_REFRESH_TOKEN=${tokenData.refresh_token}</code></pre>
          </div>

          <div class="step">
            <h3>Step 3: Restart Your Dev Server</h3>
            <p>Stop your development server (Ctrl+C) and restart it with:</p>
            <pre><code>npm run dev</code></pre>
          </div>

          <div class="step">
            <h3>Step 4: Test the Integration</h3>
            <p>Go to your Clients page and click the "Sync with Zoho Bigin" button to test the connection.</p>
          </div>

          <hr style="margin: 30px 0;">
          
          <h3>📊 Token Information:</h3>
          <ul>
            <li><strong>Expires in:</strong> ${tokenData.expires_in} seconds</li>
            <li><strong>API Domain:</strong> ${tokenData.api_domain || process.env.ZOHO_API_DOMAIN}</li>
            <li><strong>Token Type:</strong> ${tokenData.token_type}</li>
          </ul>

          <p style="color: #dc3545; margin-top: 20px;">
            <strong>⚠️ Important:</strong> Keep your refresh token secure. Do not commit it to version control!
          </p>
        </div>
      </body>
      </html>
    `

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error: any) {
    return new NextResponse(`
      <html>
        <body style="font-family: sans-serif; padding: 50px;">
          <h1 style="color: red;">❌ Error</h1>
          <p>${error.message}</p>
          <a href="/api/zoho/auth">Try Again</a>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
