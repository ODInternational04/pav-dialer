# 🔗 Zoho Bigin Integration - Complete Setup Guide

## 📋 Overview

Your dialer system is now integrated with Zoho Bigin CRM! This integration provides:

✅ **Automatic Call Logging** - Every call is synced to Zoho as an activity  
✅ **Contact Sync** - Import Zoho contacts to your system  
✅ **Bi-directional Updates** - Changes sync both ways  
✅ **Visual Indicators** - See which clients are synced with Zoho  

---

## 🚀 Quick Start (5 Steps)

### **Step 1: Run Database Migration**

Execute this in your **Supabase SQL Editor**:

```bash
# Copy the contents of database/zoho-integration.sql
# Paste into Supabase SQL Editor and execute
```

Or run the file directly:
```sql
-- In Supabase SQL Editor
\i database/zoho-integration.sql
```

**✅ Expected Output:**
- Added `zoho_contact_id` and `zoho_synced_at` to `clients` table
- Added `zoho_activity_id` and `zoho_synced_at` to `call_logs` table
- Created `zoho_sync_log` table
- Created helper functions

---

### **Step 2: Configure Environment Variables**

Create or update `.env.local`:

```bash
# Zoho Bigin API Configuration
ZOHO_CLIENT_ID=1000.JNPVLQ1FFZQQP1PEHR0SLUYWQPYGMB
ZOHO_CLIENT_SECRET=aff1c8e39ab86624157ee2bc44240c1dd95a24170e
ZOHO_REDIRECT_URI=http://localhost:3000/api/zoho/callback
ZOHO_REFRESH_TOKEN=  # Leave empty for now - we'll get this in Step 3
ZOHO_API_DOMAIN=https://www.zohoapis.com
ZOHO_USER_ID=
```

**📝 Note:** Change `ZOHO_REDIRECT_URI` to your production URL when deploying.

---

### **Step 3: Complete OAuth Flow (ONE TIME ONLY)**

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Visit the OAuth page:**
   ```
   http://localhost:3000/api/zoho/auth
   ```

3. **Follow the prompts:**
   - You'll be redirected to Zoho
   - Login with your Zoho Bigin account
   - Authorize the app
   - You'll be redirected back with your **Refresh Token**

4. **Copy the Refresh Token** displayed on the success page

5. **Add to `.env.local`:**
   ```bash
   ZOHO_REFRESH_TOKEN=1000.abc123def456...  # Your actual token
   ```

6. **Restart dev server:**
   ```bash
   # Press Ctrl+C to stop
   npm run dev
   ```

---

### **Step 4: Test the Integration**

1. **Go to Clients page:**
   ```
   http://localhost:3000/dashboard/clients
   ```

2. **Click "Sync Zoho Bigin" button** (Admin only)

3. **Verify sync:**
   - Check the success message
   - Look for the green "Zoho" badges on synced clients
   - Verify contacts imported from Zoho

4. **Make a test call:**
   - Click "Call" on any client
   - Complete the call and add notes
   - Check your Zoho Bigin account - the call should appear as an activity!

---

### **Step 5: Verify in Zoho Bigin**

1. Login to your Zoho Bigin account
2. Go to **Contacts**
3. Open a contact you called
4. Check **Activities** section
5. You should see the call with:
   - Call type (Inbound/Outbound)
   - Duration
   - Status
   - Notes

---

## 🎯 How It Works

### **Automatic Call Sync**

When a call is logged in your dialer:

1. **Call log created** in your database
2. **Background sync triggered** (non-blocking)
3. **Contact search** in Zoho by phone number
4. **Contact created** in Zoho if not found
5. **Activity created** in Zoho with call details
6. **Status updated** in your database

```
Your System → Call Log Created → Zoho Bigin Activity
     ↓
Client Record ← Zoho Contact ID ← Zoho Contact
```

### **Manual Contact Sync**

When admin clicks "Sync Zoho Bigin":

1. **Fetch contacts** from Zoho (paginated)
2. **Match by phone** number
3. **Update existing** clients with Zoho ID
4. **Create new** clients from Zoho contacts
5. **Show summary** of imported/updated contacts

---

## 📊 Features

### **In Your Dialer System:**

✅ **Visual Indicators**
- Green "Zoho" badge on synced clients
- Shows which clients exist in Zoho

✅ **Automatic Sync**
- Every call automatically syncs
- Runs in background (non-blocking)
- Error logging for troubleshooting

✅ **Manual Sync Button**
- Import all Zoho contacts
- Update existing matches
- Create new clients

✅ **Sync Status Tracking**
- `zoho_sync_log` table for audit trail
- Success/failure status per sync
- Error messages for debugging

### **In Zoho Bigin:**

✅ **Call Activities**
- All calls logged as activities
- Linked to contact records
- Duration, status, notes included

✅ **Contact Management**
- Auto-created from your dialer
- Kept in sync with updates
- Phone/email/name populated

---

## 🔍 API Endpoints

### **1. OAuth Authentication**
```
GET /api/zoho/auth
```
Initiates OAuth flow with Zoho

### **2. OAuth Callback**
```
GET /api/zoho/callback
```
Handles Zoho redirect after authorization

### **3. Sync Contacts**
```
POST /api/zoho/sync-contacts
Authorization: Bearer <token>
```
Import contacts from Zoho (Admin only)

**Response:**
```json
{
  "success": true,
  "message": "Successfully synced 150 contacts from Zoho Bigin",
  "details": {
    "processed": 150,
    "created": 45,
    "updated": 105,
    "skipped": 0,
    "errors": null
  }
}
```

### **4. Get Sync Stats**
```
GET /api/zoho/sync-contacts
Authorization: Bearer <token>
```
Get synchronization statistics

**Response:**
```json
{
  "totalClients": 200,
  "syncedClients": 150,
  "notSynced": 50,
  "recentSyncs": [...]
}
```

---

## 🛠️ Database Schema

### **Clients Table** (additions)
```sql
zoho_contact_id VARCHAR(255)      -- Zoho CRM Contact ID
zoho_synced_at TIMESTAMP          -- Last sync timestamp
zoho_last_sync_status VARCHAR(50) -- success/failed/pending
```

### **Call Logs Table** (additions)
```sql
zoho_activity_id VARCHAR(255)  -- Zoho CRM Activity ID
zoho_synced_at TIMESTAMP       -- Sync timestamp
zoho_sync_status VARCHAR(50)   -- success/failed/pending
zoho_sync_error TEXT           -- Error message if failed
```

### **Zoho Sync Log Table** (new)
```sql
CREATE TABLE zoho_sync_log (
    id UUID PRIMARY KEY,
    sync_type VARCHAR(50),      -- 'contact', 'activity', 'bulk_import'
    entity_type VARCHAR(50),    -- 'client', 'call_log'
    entity_id UUID,
    zoho_id VARCHAR(255),
    status VARCHAR(50),         -- 'success', 'failed', 'pending'
    error_message TEXT,
    request_data JSONB,
    response_data JSONB,
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

---

## 🔐 Security Considerations

### **Credentials Storage**
- ✅ Client ID and Secret in `.env.local` (not committed)
- ✅ Refresh token encrypted at rest
- ✅ Access tokens cached in memory (expires hourly)
- ✅ No credentials exposed to frontend

### **API Security**
- ✅ OAuth 2.0 with offline access
- ✅ JWT authentication required
- ✅ Admin-only sync endpoints
- ✅ Rate limiting via Zoho API limits

### **Data Privacy**
- ✅ Only necessary fields synced
- ✅ Sensitive data encrypted in database
- ✅ Audit trail in `zoho_sync_log`

---

## ⚙️ Configuration Options

### **Environment Variables**

| Variable | Description | Required |
|----------|-------------|----------|
| `ZOHO_CLIENT_ID` | Your Zoho OAuth client ID | ✅ Yes |
| `ZOHO_CLIENT_SECRET` | Your Zoho OAuth client secret | ✅ Yes |
| `ZOHO_REDIRECT_URI` | OAuth callback URL | ✅ Yes |
| `ZOHO_REFRESH_TOKEN` | OAuth refresh token (from setup) | ✅ Yes |
| `ZOHO_API_DOMAIN` | Zoho API domain (regional) | ✅ Yes |
| `ZOHO_USER_ID` | Your Zoho user ID (optional) | ❌ No |

### **Regional API Domains**

Choose based on your Zoho data center:

- **US**: `https://www.zohoapis.com`
- **EU**: `https://www.zohoapis.eu`
- **India**: `https://www.zohoapis.in`
- **Australia**: `https://www.zohoapis.com.au`
- **China**: `https://www.zohoapis.com.cn`

---

## 🐛 Troubleshooting

### **"ZOHO_REFRESH_TOKEN not configured"**
**Solution:** Complete OAuth flow at `/api/zoho/auth`

### **"Failed to refresh Zoho token"**
**Possible causes:**
- Expired refresh token (re-run OAuth)
- Invalid client ID/secret
- Wrong API domain

**Solution:** Run OAuth flow again or verify credentials

### **"Failed to create Zoho contact"**
**Possible causes:**
- Duplicate phone number in Zoho
- Invalid contact data
- API rate limits

**Check:** `zoho_sync_log` table for error details

### **"Sync button not visible"**
**Cause:** User is not admin

**Solution:** Only admins can trigger manual sync

### **Calls not appearing in Zoho**
**Check:**
1. Call log has `zoho_activity_id` (successful sync)
2. `zoho_sync_log` table for errors
3. Client has `zoho_contact_id` (contact exists in Zoho)
4. Console logs for sync errors

### **Slow performance**
**Solutions:**
- Sync runs in background (shouldn't affect calls)
- If many errors, check API rate limits
- Consider running bulk imports during off-hours

---

## 📈 Monitoring

### **Check Sync Status**

**Query recent syncs:**
```sql
SELECT * FROM zoho_sync_log 
ORDER BY created_at DESC 
LIMIT 50;
```

**Count sync failures:**
```sql
SELECT status, COUNT(*) as count 
FROM zoho_sync_log 
GROUP BY status;
```

**Find clients not synced:**
```sql
SELECT id, name, phone 
FROM clients 
WHERE zoho_contact_id IS NULL 
LIMIT 100;
```

### **Dashboard Stats View**
```sql
SELECT * FROM zoho_sync_stats;
```

---

## 🚀 Production Deployment

### **Before Deploying:**

1. **Update redirect URI:**
   ```bash
   ZOHO_REDIRECT_URI=https://yourdomain.com/api/zoho/callback
   ```

2. **Update in Zoho Console:**
   - Go to https://api-console.zoho.com/
   - Edit your app
   - Add production redirect URI
   - Save changes

3. **Re-run OAuth flow in production:**
   - Visit `https://yourdomain.com/api/zoho/auth`
   - Complete authorization
   - Update `ZOHO_REFRESH_TOKEN` in production env

4. **Test thoroughly:**
   - Make test calls
   - Verify Zoho sync
   - Check error logs

### **Environment Variables (Production)**

Set these in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Build & Deploy → Environment
- AWS: ECS Task Definition or Lambda Environment Variables

---

## 📞 Support

### **Need Help?**

1. **Check logs:** Browser console + server console
2. **Check database:** `zoho_sync_log` table
3. **Verify OAuth:** Re-run `/api/zoho/auth` if issues
4. **API limits:** Zoho has rate limits (check their docs)

### **Common Questions**

**Q: How often does sync happen?**  
A: Every call syncs immediately (background). Manual sync imports all contacts.

**Q: Can users see Zoho integration?**  
A: Users see "Zoho" badges on synced clients. Only admins can trigger manual sync.

**Q: What happens if Zoho is down?**  
A: Calls still save locally. Sync errors are logged. Retry manually later.

**Q: Can I disable auto-sync?**  
A: Yes, remove `ZOHO_REFRESH_TOKEN` from env. Calls will still work without Zoho sync.

**Q: Does sync work both ways?**  
A: Your calls → Zoho (automatic). Zoho → Your system (manual import via button).

---

## ✅ Post-Setup Checklist

- [ ] Database migration executed
- [ ] Environment variables configured
- [ ] OAuth flow completed
- [ ] Refresh token added to `.env.local`
- [ ] Dev server restarted
- [ ] Test call made and appeared in Zoho
- [ ] Manual sync tested (imported contacts)
- [ ] Green "Zoho" badges visible on clients
- [ ] Production redirect URI updated (when deploying)

---

## 🎉 You're All Set!

Your dialer system is now fully integrated with Zoho Bigin. Every call you make will automatically sync to Zoho as an activity, and you can import Zoho contacts anytime!

**Need to make changes?** All integration code is in:
- `src/lib/zoho.ts` - Zoho API client
- `src/app/api/zoho/` - API endpoints
- `src/app/api/call-logs/route.ts` - Auto-sync logic
- `database/zoho-integration.sql` - Database schema

---

**📚 Additional Resources:**
- [Zoho Bigin API Docs](https://www.zoho.com/bigin/developer/api/)
- [OAuth 2.0 Guide](https://www.zoho.com/accounts/protocol/oauth.html)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
