# Dialer System Deployment Guide

## Prerequisites
- Node.js 18+ installed on server
- Supabase database configured
- Environment variables set up

## Files to Upload to Server
```
- package.json
- package-lock.json
- next.config.js
- .next/ (after running npm run build)
- src/
- database/
- public/ (if any static assets)
```

## Server Setup Commands
```bash
# 1. Install dependencies
npm install --production

# 2. Set environment variables
# Create .env.local with:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret

# 3. Build the application
npm run build

# 4. Start the application
npm start
```

## Important Notes
- Application runs on port 3000 by default
- Requires Node.js server (cannot use static hosting)
- Database must be accessible from server
- Environment variables must be configured

## Recommended Hosting Providers
1. **Vercel** - Easiest for Next.js (vercel.com)
2. **Railway** - Simple Node.js hosting (railway.app)
3. **DigitalOcean App Platform** - Scalable hosting
4. **Render** - Free tier available (render.com)

## Custom Domain Setup
Most hosting providers allow custom domain configuration in their dashboard.

## Support
If you need help with specific hosting provider setup, please specify which service you're using.