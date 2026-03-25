# Fix Zoho Integration on Vercel - Enhanced

## Problem
The error "Error syncing with Zoho Bigin" appears on the live system (pav-dialer.vercel.app) but works fine on localhost. This can be caused by:
- Missing or incorrect environment variables on Vercel
- Serverless function timeout (Vercel has time limits)
- Expired Zoho refresh token
- API connectivity issues

## Recent Updates
✅ **Added timeout protection** - Sync now stops before Vercel timeout limit
✅ **Better error logging** - Detailed error messages to identify issues
✅ **Connection testing** - Visit `/api/zoho/status` to test Zoho API connection
✅ **Increased function timeout** - Extended to 60 seconds (requires Pro plan)

## Diagnostic Steps

### 1. Test Zoho Connection
Visit this URL after logging in as admin:
```
https://pav-dialer.vercel.app/api/zoho/status
```

This will tell you:
- ✅ If Zoho credentials are configured
- ✅ If the connection to Zoho API works
- ❌ Specific error messages if something is wrong

### 2. Check Vercel Logs
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **pav-dialer** project
3. Click **Logs** tab
4. Try syncing again and watch for error messages

## Solution Steps

### Option A: If Environment Variables Are Missing
1. Visit [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your **pav-dialer** project
3. Go to **Settings** → **Environment Variables**

### 2. Add These Environment Variables

Add each of these variables (one at a time):

```bash
# Zoho Bigin API Credentials
ZOHO_CLIENT_ID=1000.JNPVLQ1FFZQQP1PEHR0SLUYWQPYGMB
ZOHO_CLIENT_SECRET=aff1c8e39ab86624157ee2bc44240c1dd95a24170e
ZOHO_REFRESH_TOKEN=1000.92948f2daef78b4ae6b48e92bdc6eceb.929c1da9a3f342f66a3b45d92e91fbbb
ZOHO_API_DOMAIN=https://www.zohoapis.com
ZOHO_REDIRECT_URI=https://pav-dialer.vercel.app/api/zoho/callback
```

**Important:** 
- For **ZOHO_REDIRECT_URI**, use your Vercel domain: `https://pav-dialer.vercel.app/api/zoho/callback`
- Make sure all variables are set for **Production**, **Preview**, and **Development** environments

### 3. Redeploy Your Application

After adding the environment variables:

1. Go to the **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Select **Redeploy**
4. Wait for the deployment to complete (usually 1-2 minutes)

### 4. Verify the Fix

Once redeployed:
1. Go to your live site: [https://pav-dialer.vercel.app/dashboard/clients](https://pav-dialer.vercel.app/dashboard/clients)
2. Click the **"Syncing..." / "Sync Zoho Bigin"** button
3. You should now see a success message instead of the error

## Why This Happens

- **Local (localhost)**: Uses `.env.local` file which has all Zoho credentials
- **Production (Vercel)**: Needs environment variables configured through Vercel dashboard
- The `.env.local` file is never uploaded to Vercel (it's in `.gitignore` for security)

## Alternative: Quick Command Line Method

If you have Vercel CLI installed, you can add variables from terminal:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add ZOHO_CLIENT_ID
vercel env add ZOHO_CLIENT_SECRET
vercel env add ZOHO_REFRESH_TOKEN
vercel env add ZOHO_API_DOMAIN
vercel env add ZOHO_REDIRECT_URI

# Redeploy
vercel --prod
```

## Troubleshooting

### If the error persists after verifying env variables:

**1. Check Connection Status**
- Visit: `https://pav-dialer.vercel.app/api/zoho/status`
- Look for the `connectionTest` result
- If it shows an error, the issue is with Zoho credentials

**2. Timeout Issues (Large Contact Lists)**
- The sync now has timeout protection
- If you have 200+ contacts, you may need to run sync 2-3 times
- Each run processes ~200 contacts before timing out safely
- The message will say "⏱️ Partial sync completed - Run sync again to continue"

**3. Expired Refresh Token**
If you see "Failed to refresh Zoho token":
- Your Zoho refresh token may have expired
- You need to re-authenticate with Zoho
- Contact support for help generating a new refresh token

**4. Check Vercel Logs**
- Go to Vercel Dashboard → pav-dialer → Logs
- Click "Sync Zoho" on your live site
- Watch the real-time logs for specific error messages
- Look for lines starting with ❌ or 🔴

**5. Verify Environment Variables Match**
Make sure Vercel has the EXACT same values as your `.env.local`:
```bash
ZOHO_CLIENT_ID=1000.JNPVLQ1FFZQQP1PEHR0SLUYWQPYGMB
ZOHO_CLIENT_SECRET=aff1c8e39ab86624157ee2bc44240c1dd95a24170e
ZOHO_REFRESH_TOKEN=1000.92948f2daef78b4ae6b48e92bdc6eceb.929c1da9a3f342f66a3b45d92e91fbbb
ZOHO_API_DOMAIN=https://www.zohoapis.com
```

**6. Network/Firewall Issues**
- Vercel servers are located in different regions than your computer
- Zoho might have IP restrictions or rate limits
- Check if Zoho API is accessible from Vercel's IP ranges

## Need to Deploy the Fix?

The code has been updated with better error handling. To deploy:

```powershell
# Commit the changes
git add .
git commit -m "Fix: Enhanced Zoho sync with timeout protection and better error handling"
git push origin main
```

Vercel will automatically deploy the new version.

## What Was Fixed

1. **Timeout Protection**: Sync stops before hitting Vercel's 30-second limit
2. **Better Error Messages**: Now shows specific error details instead of generic message
3. **Connection Testing**: New `/api/zoho/status` endpoint to diagnose issues
4. **Extended Timeout**: `vercel.json` now allows 60 seconds (Pro plan only)
5. **Improved Logging**: Console logs show exactly where sync fails

## Contact Support

If none of these solutions work, provide:
- Screenshot of `/api/zoho/status` response
- Vercel logs from when you click "Sync Zoho"
- Number of contacts in your Zoho Bigin account
