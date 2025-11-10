# Customer Feedback System Setup & Troubleshooting

## 🚨 Issue: Feedback Not Saving to Database

### **Root Cause**
The `customer_feedback` table doesn't exist in your Supabase database yet.

### **📋 Fix Steps**

#### **1. Apply Database Schema**

**Go to Supabase → SQL Editor and run this:**

```sql
-- Customer Feedback System Database Extension
-- Run this in your Supabase SQL editor after the main schema

-- Create enum for feedback types
DO $$ BEGIN
    CREATE TYPE feedback_type AS ENUM ('complaint', 'happy', 'suggestion', 'general');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Customer feedback table
CREATE TABLE IF NOT EXISTS customer_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    feedback_type feedback_type NOT NULL,
    subject VARCHAR(255) NOT NULL,
    notes TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_resolved BOOLEAN DEFAULT false NOT NULL,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_feedback_client_id ON customer_feedback(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_user_id ON customer_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_call_log_id ON customer_feedback(call_log_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_type ON customer_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_priority ON customer_feedback(priority);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_is_resolved ON customer_feedback(is_resolved);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_created_at ON customer_feedback(created_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_customer_feedback_updated_at ON customer_feedback;
CREATE TRIGGER update_customer_feedback_updated_at BEFORE UPDATE ON customer_feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get feedback statistics
CREATE OR REPLACE FUNCTION get_feedback_statistics(start_date timestamp, end_date timestamp)
RETURNS TABLE (
    total_feedback BIGINT,
    complaints_count BIGINT,
    happy_count BIGINT,
    suggestions_count BIGINT,
    general_count BIGINT,
    resolved_count BIGINT,
    pending_count BIGINT,
    high_priority_count BIGINT,
    urgent_priority_count BIGINT,
    average_resolution_time_hours NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN cf.feedback_type = 'complaint' THEN 1 END) as complaints_count,
        COUNT(CASE WHEN cf.feedback_type = 'happy' THEN 1 END) as happy_count,
        COUNT(CASE WHEN cf.feedback_type = 'suggestion' THEN 1 END) as suggestions_count,
        COUNT(CASE WHEN cf.feedback_type = 'general' THEN 1 END) as general_count,
        COUNT(CASE WHEN cf.is_resolved = true THEN 1 END) as resolved_count,
        COUNT(CASE WHEN cf.is_resolved = false THEN 1 END) as pending_count,
        COUNT(CASE WHEN cf.priority = 'high' THEN 1 END) as high_priority_count,
        COUNT(CASE WHEN cf.priority = 'urgent' THEN 1 END) as urgent_priority_count,
        ROUND(
            AVG(
                CASE 
                    WHEN cf.is_resolved = true AND cf.resolved_at IS NOT NULL THEN 
                        EXTRACT(EPOCH FROM (cf.resolved_at - cf.created_at)) / 3600
                    ELSE NULL 
                END
            ), 2
        ) as average_resolution_time_hours
    FROM customer_feedback cf
    WHERE cf.created_at >= start_date AND cf.created_at <= end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get unresolved urgent feedback
CREATE OR REPLACE FUNCTION get_urgent_unresolved_feedback()
RETURNS TABLE (
    id UUID,
    client_name VARCHAR,
    client_phone VARCHAR,
    feedback_type feedback_type,
    subject VARCHAR,
    priority VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    days_pending INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cf.id,
        c.principal_key_holder as client_name,
        c.telephone_cell as client_phone,
        cf.feedback_type,
        cf.subject,
        cf.priority,
        cf.created_at,
        EXTRACT(DAY FROM NOW() - cf.created_at)::INTEGER as days_pending
    FROM customer_feedback cf
    JOIN clients c ON cf.client_id = c.id
    WHERE cf.is_resolved = false 
    AND cf.priority IN ('urgent', 'high')
    ORDER BY 
        CASE cf.priority 
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            ELSE 3
        END,
        cf.created_at ASC;
END;
$$ LANGUAGE plpgsql;
```

#### **2. Verify Schema Applied**

After running the SQL, check if it worked:
- Visit: `http://localhost:3001/api/test/customer-feedback`
- Should show: `"success": true, "tableExists": true`

#### **3. Test Feedback Creation**

1. **Login to your app**: http://localhost:3001
2. **Go to Clients page**
3. **Click "Call" on any client**
4. **Check "Add Customer Feedback"**
5. **Fill out feedback form**
6. **Save the call log**

#### **4. Verify Feedback Saved**

- Go to "Customer Feedback" in sidebar
- Should see your feedback listed
- Or visit: `http://localhost:3001/api/customer-feedback` (with auth)

### **🔍 Debugging Steps**

#### **Check Database Connection:**
- Visit: `http://localhost:3001/api/test/db`
- Should show users and database connection working

#### **Check Browser Console:**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Try creating feedback again
4. Look for error messages

#### **Common Issues:**

1. **"Table doesn't exist"** → Run the SQL schema above
2. **"Authentication failed"** → Make sure you're logged in
3. **"Network error"** → Check if dev server is running
4. **"CORS error"** → Restart the dev server

### **🚀 Quick Test**

Run this in your browser console after logging in:

```javascript
fetch('/api/customer-feedback', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({
    client_id: 'test-client-id',
    feedback_type: 'general',
    subject: 'Test feedback',
    notes: 'This is a test feedback',
    priority: 'medium'
  })
})
.then(r => r.json())
.then(data => console.log('Feedback API response:', data))
```

### **💡 Expected Behavior After Fix**

1. ✅ Feedback form appears in call log modal
2. ✅ Feedback saves when call log is submitted  
3. ✅ Feedback appears in "Customer Feedback" page
4. ✅ Can filter by complaint/happy/suggestion/general
5. ✅ Can set priority and resolution status

---

**If you're still having issues after running the SQL schema, let me know what error messages you see!**