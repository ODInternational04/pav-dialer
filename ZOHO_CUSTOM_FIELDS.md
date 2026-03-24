# 📋 Zoho Bigin Custom Fields Integration

## Overview

The dialer system now supports two additional custom fields from Zoho Bigin:
- **Quotation Done** - Boolean field to track if quotation has been completed
- **Booking Status** - Text field to track the status of bookings

These fields are **bidirectionally synced** between your dialer system and Zoho Bigin CRM.

---

## ✅ Setup Instructions

### Step 1: Run Database Migration

Execute this SQL in your **Supabase SQL Editor**:

```bash
# Run the file: database/add-zoho-fields.sql
```

Or copy and paste the contents of `database/add-zoho-fields.sql` into Supabase SQL Editor.

**This adds:**
- `quotation_done` (BOOLEAN) - Default: false
- `booking_status` (VARCHAR) - Default: null
- Performance indexes for both fields

---

### Step 2: Configure Zoho Bigin Fields

Make sure these fields exist in your **Zoho Bigin Contacts module**:

1. Log into Zoho Bigin
2. Go to **Settings** → **Modules & Fields**
3. Select **Contacts** module
4. Verify or create these custom fields:
   - **Field Name:** `Quotation_done` or `Quotation_Done`
     - **Type:** Checkbox (Boolean)
   - **Field Name:** `Booking_status` or `Booking_Status`
     - **Type:** Pick List (Text) or Single Line

**Note:** The system supports both capitalization formats: `Quotation_done` and `Quotation_Done`, `Booking_status` and `Booking_Status`.

---

### Step 3: Sync Data

After running the migration:

1. Go to your **Clients page** in the dialer system
2. Click **"Sync Zoho Bigin"** button (Admin only)
3. The system will:
   - Import these fields from existing Zoho contacts
   - Update local client records with the values

---

## 🔄 How Bidirectional Sync Works

### FROM Zoho → Dialer System

When you click "Sync Zoho Bigin":
- System fetches all contacts from Zoho
- Reads `Quotation_done` and `Booking_status` values
- Updates or creates local client records with these values

### FROM Dialer System → Zoho

When you **create** or **update** a client:
- System automatically syncs to Zoho (if configured)
- Sends `quotation_done` and `booking_status` values
- Updates the Zoho contact record

**Automatic sync happens on:**
- ✅ New client creation
- ✅ Client update/edit
- ✅ Manual "Sync Zoho Bigin" button click

---

## 📝 Field Details

### Quotation Done (`quotation_done`)

**Type:** Boolean (true/false)  
**Default:** false  
**Optional:** Yes (not required)

**What it tracks:**
- Whether a quotation has been sent/completed for this client
- Helps filter clients who need quotations vs. those who already received them

**API Usage:**
```json
{
  "name": "John Doe",
  "phone": "+27123456789",
  "email": "john@example.com",
  "quotation_done": true
}
```

**In Zoho Bigin:**
- Maps to `Quotation_done` or `Quotation_Done` checkbox field
- Checked = true, Unchecked = false

---

### Booking Status (`booking_status`)

**Type:** Text/String (max 100 characters)  
**Default:** null (empty)  
**Optional:** Yes (not required)

**What it tracks:**
- Current status of the booking process
- Examples: "Pending", "Confirmed", "Cancelled", "Completed"

**API Usage:**
```json
{
  "name": "Jane Smith",
  "phone": "+27987654321",
  "email": "jane@example.com",
  "booking_status": "Confirmed"
}
```

**In Zoho Bigin:**
- Maps to `Booking_status` or `Booking_Status` text/picklist field
- Stores any text value (recommend using consistent options)

**Recommended Options:**
- Pending
- Confirmed
- Cancelled
- Completed
- On Hold
- Follow Up Required

---

## 🛠️ Technical Implementation

### Database Schema

```sql
-- Added to clients table
ALTER TABLE clients ADD COLUMN quotation_done BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN booking_status VARCHAR(100);

-- Indexes for performance
CREATE INDEX idx_clients_booking_status ON clients(booking_status);
CREATE INDEX idx_clients_quotation_done ON clients(quotation_done);
```

### TypeScript Types

```typescript
export interface CreateClientRequest {
  name: string
  phone: string
  email?: string
  notes?: string
  quotation_done?: boolean      // NEW
  booking_status?: string        // NEW
  custom_fields?: Record<string, any>
}
```

### API Endpoints

**All existing endpoints support the new fields:**

#### POST /api/clients
Create a new client with optional fields:
```javascript
const response = await fetch('/api/clients', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    phone: '+27123456789',
    email: 'john@example.com',
    quotation_done: false,
    booking_status: 'Pending'
  })
})
```

#### PUT /api/clients/[id]
Update existing client:
```javascript
const response = await fetch(`/api/clients/${clientId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    quotation_done: true,
    booking_status: 'Confirmed'
  })
})
```

#### POST /api/zoho/sync-contacts
Import/sync from Zoho Bigin:
```javascript
const response = await fetch('/api/zoho/sync-contacts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

---

## 🔍 Usage Examples

### Example 1: Creating a Client with Custom Fields

```typescript
const newClient = {
  name: "Sarah Johnson",
  phone: "+27821234567",
  email: "sarah@example.com",
  notes: "Interested in premium package",
  quotation_done: false,
  booking_status: "Pending"
}

// Automatically syncs to Zoho Bigin if configured
const response = await createClient(newClient)
```

### Example 2: Updating Booking Status

```typescript
// After sending quotation
await updateClient(clientId, {
  quotation_done: true,
  booking_status: "Awaiting Confirmation"
})

// After client confirms
await updateClient(clientId, {
  booking_status: "Confirmed"
})
```

### Example 3: Filtering Clients

```sql
-- Get all clients who need quotations
SELECT * FROM clients 
WHERE quotation_done = false 
ORDER BY created_at DESC;

-- Get all confirmed bookings
SELECT * FROM clients 
WHERE booking_status = 'Confirmed';

-- Get clients with no booking status (new leads)
SELECT * FROM clients 
WHERE booking_status IS NULL 
  AND quotation_done = false;
```

---

## ⚠️ Important Notes

1. **Fields are Optional**
   - Both fields are optional and won't break existing functionality
   - Default values: `quotation_done = false`, `booking_status = null`

2. **Case Sensitivity**
   - Zoho field names are case-sensitive
   - System supports both: `Quotation_done` and `Quotation_Done`
   - Recommend using consistent naming in Zoho

3. **Sync Direction**
   - Changes in Zoho → Manual sync required (click "Sync Zoho Bigin")
   - Changes in Dialer → Automatic sync to Zoho (if configured)

4. **Existing Clients**
   - Existing clients will have default values until synced from Zoho
   - Run "Sync Zoho Bigin" to populate values for existing contacts

5. **Performance**
   - Indexes added for fast filtering
   - No impact on existing queries

---

## 🧪 Testing

### Test the Integration

1. **Create a test client in dialer:**
   - Name: "Test User"
   - Phone: "+27999999999"
   - Quotation Done: Yes (checked)
   - Booking Status: "Test"

2. **Check Zoho Bigin:**
   - Open Zoho Bigin Contacts
   - Find "Test User"
   - Verify `Quotation_done` checkbox is checked
   - Verify `Booking_status` shows "Test"

3. **Update in Zoho:**
   - Change `Booking_status` to "Confirmed"
   - Uncheck `Quotation_done`

4. **Sync back to dialer:**
   - Click "Sync Zoho Bigin" in dialer system
   - Refresh client list
   - Verify "Test User" shows updated values

---

## 🎯 Benefits

✅ **Streamlined Workflow** - Track quotation and booking status in one place  
✅ **Data Consistency** - Auto-sync keeps both systems up to date  
✅ **Better Reporting** - Filter and report on booking stages  
✅ **No Manual Entry** - Data flows automatically between systems  
✅ **Backward Compatible** - Existing functionality unchanged  

---

## 📞 Support

If you encounter issues:

1. **Check Zoho field names** - Must match exactly (case-sensitive)
2. **Verify OAuth token** - Re-run `/api/zoho/auth` if sync fails
3. **Check console logs** - Look for Zoho sync errors
4. **Database migration** - Ensure `add-zoho-fields.sql` was executed

---

## 📊 Next Steps

**Recommended Enhancements:**
- Add UI components to edit these fields in client forms
- Create filters in client list to show by booking status
- Add reports/analytics based on quotation and booking data
- Set up automation rules (e.g., auto-send quotations)

---

**Last Updated:** March 24, 2026  
**Version:** 1.0.0
