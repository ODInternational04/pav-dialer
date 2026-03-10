# 🚀 Quick Start Guide - Pavilion Hotel Dialer Tracking

## ✅ Step 1: Database Credentials (DONE)
Your Supabase credentials have been added to `.env.local`

## 📋 Step 2: Run the Database Schema

### Option A: Supabase Dashboard (Recommended)
1. **Open your Supabase SQL Editor:**
   👉 https://supabase.com/dashboard/project/vqasbztejzbmplvnfkdb/sql

2. **Copy the entire contents** of this file:
   📁 `database/simplified-schema.sql`

3. **Paste into the SQL Editor** and click **"RUN"**

4. **Wait for success message** - you should see tables created

### Option B: Using Node Script (Alternative)
```bash
npm run setup:db
```

## 🧪 Step 3: Test the Setup

After running the schema, test your database connection:

```bash
npm run dev
```

Then open: http://localhost:3000

## 🔐 Step 4: Login

Use the default admin account:
- **Email:** `admin@pavilionhotel.com`
- **Password:** `admin123`

⚠️ **IMPORTANT:** Change this password immediately after first login!

## 📊 What's Been Set Up

### Database Tables Created:
✅ **users** - Admin and user accounts
✅ **clients** - Simple client records (name, phone, email, notes)
✅ **call_logs** - Call history with feedback field
✅ **notifications** - Callback reminders

### Key Features:
- ✅ Simple 4-field client records
- ✅ Call logging with feedback
- ✅ Callback scheduling
- ✅ Automatic timestamps
- ✅ User tracking

## 🔧 Next Steps After Login

1. **Change admin password**
2. **Create your first client**
3. **Log a test call**
4. **Schedule a callback**
5. **Add team members (users)**

## ⚙️ Still Need Setup

Email notifications require SMTP configuration in `.env.local`:
```env
EMAIL_HOST=your-smtp-host
EMAIL_PORT=587
EMAIL_USER=your-email-user
EMAIL_PASS=your-email-password
```

## 🆘 Troubleshooting

### Schema won't run?
- Make sure you're logged into Supabase
- Check that you selected the correct project
- Try running sections of the schema one at a time

### Can't connect to database?
- Verify credentials in `.env.local`
- Check Supabase project is active
- Ensure no typos in environment variables

### Login not working?
- Make sure schema ran successfully
- Check that default admin user was created
- Try resetting your Supabase password

## 📞 Support

Check these files for more info:
- `SIMPLIFICATION_SUMMARY.md` - Full system overview
- `CLIENT_FIELDS_OVERVIEW.md` - Field structure documentation
- `README.md` - General project information

---

## 🎯 System Overview

Your system now has:
- **Simple client management** (name, phone, email, notes)
- **Call tracking** with notes and feedback
- **Callback scheduling** with notifications
- **User management** (admin/user roles)
- **Green color scheme** (Pavilion Hotel branding)
- **Clean, modern interface**

Everything is ready to go! 🎉
