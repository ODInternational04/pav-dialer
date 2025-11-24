# Fix Vercel Deployment Issues

This guide addresses the 405 Method Not Allowed error on Vercel deployment.

## Changes Made:

### 1. Fixed Middleware Configuration
- Updated `src/middleware.ts` to include API routes in the matcher
- Previously API routes were excluded, which could cause routing issues

### 2. Enhanced Next.js Configuration
- Added proper CORS headers for API routes
- Configured external packages for server components
- Added security headers

### 3. Updated Vercel Configuration
- Added explicit function configuration for API routes
- Added proper CORS headers in `vercel.json`
- Set appropriate timeout limits

### 4. Added OPTIONS Handler
- Added OPTIONS method handler to `login/route.ts` for CORS preflight

## To Deploy:

1. Commit all changes:
```bash
git add .
git commit -m "Fix API routes for Vercel deployment"
git push
```

2. Redeploy on Vercel (it should auto-deploy from git)

3. Test the health check endpoint first:
```
GET https://dialer-rouge.vercel.app/api/health
```

4. Then test the login endpoint:
```
POST https://dialer-rouge.vercel.app/api/auth/login
```

## Common Issues and Solutions:

### If 405 Error Persists:
1. Check Vercel function logs in the dashboard
2. Ensure all API routes have proper export statements
3. Verify middleware isn't blocking requests

### If CORS Issues:
1. Check browser network tab for preflight requests
2. Verify OPTIONS handlers are present
3. Check CORS headers in response

### Environment Variables:
Make sure these are set in Vercel:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`  
- `JWT_SECRET`
- `NEXTAUTH_SECRET`
- `NODE_ENV=production`

## Testing Locally:
```bash
npm run build
npm start
```

Then test: `http://localhost:3000/api/auth/login`