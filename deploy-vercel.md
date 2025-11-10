# Vercel Deployment Instructions

## 🚀 Quick Deployment to Vercel

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Deploy from Project Root
```bash
# Navigate to your project folder
cd "C:\Users\PC\Documents\IBV\DialerSystem\Original"

# Deploy to Vercel
vercel
```

### Step 3: Follow Prompts
- **Login**: Login to your Vercel account
- **Project Name**: `dialer-system` (or your choice)
- **Framework**: Next.js (auto-detected)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)

### Step 4: Configure Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL = your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_supabase_anon_key
JWT_SECRET = your_secure_jwt_secret_key
```

### Step 5: Custom Domain (Optional)
- Go to Vercel Dashboard → Domains
- Add your custom domain
- Follow DNS configuration instructions

## 📁 Files Vercel Needs (Already in your project)
✅ package.json
✅ src/ folder
✅ next.config.js
✅ All source code

## ❌ Files NOT needed
- .next/ folder (Vercel builds this)
- node_modules/ (Vercel installs dependencies)

## 🔧 Automatic Features
- SSL Certificate (HTTPS)
- Global CDN
- Automatic builds on code changes
- Serverless API routes
- Database connections work automatically

## 📞 Your Dialer System Will Have:
- Authentication system
- User dashboards  
- Client management
- Call logging
- Reports and analytics
- Real-time notifications

## 🌐 Access Your App
After deployment: `https://your-project-name.vercel.app`
With custom domain: `https://yourdomain.com`

## Support
If deployment fails, check:
1. Environment variables are set
2. Supabase database is accessible
3. All dependencies in package.json