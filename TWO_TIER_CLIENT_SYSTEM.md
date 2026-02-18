# Two-Tier Client System Implementation Guide

## Overview
Successfully implemented a two-tier client system with **Vault Clients** and **Gold Clients**, including separate forms, permissions, and filtering options.

---

## 🎯 What's Changed

### 1. **Client Types**
- **Vault Clients** (Full Details):
  - Box Number
  - Size (A-E)
  - Contract Number
  - Principal Key Holder Name
  - ID Number
  - Email Address
  - Cell Phone
  - Home Phone (optional)
  - Contract Start & End Dates
  - Occupation
  - Notes

- **Gold Clients** (Simplified):
  - Full Name
  - Email Address
  - Cell Phone
  - Home Phone (optional)
  - Notes

---

## 📋 Implementation Steps Required

### Step 1: Run Database Migration
Execute the migration script in your Supabase SQL editor:

```bash
Location: database/client-types-migration.sql
```

**This will:**
- Create `client_type` enum ('vault', 'gold')
- Add `client_type` column to clients table (defaults to 'vault')
- Add user permissions: `can_access_vault_clients` and `can_access_gold_clients`
- Grant admins access to both client types
- Create helper views and functions

### Step 2: Verify Changes
After running the migration, verify:
1. All existing clients are set to 'vault' type
2. Admin users have both permissions enabled
3. Regular users need permissions assigned based on your requirements

---

## 🎨 User Interface Changes

### Client Creation Modal
When adding a new client, users will now see:

1. **Client Type Selector** (for new clients only):
   - Visual buttons to choose Vault or Gold
   - Blue highlight for Vault, Yellow for Gold
   - Descriptive text explaining each type

2. **Dynamic Form Fields**:
   - Form adapts based on selected client type
   - Vault: Shows all detailed fields
   - Gold: Shows only simplified fields

3. **Edit Mode**:
   - Client type is displayed as a badge (cannot be changed after creation)
   - Fields shown match the client's type

### Clients Page
Now includes:

1. **Client Type Tabs**:
   - "All Clients" - Shows both types
   - "🔒 Vault Clients" - Filter to vault only
   - "⭐ Gold Clients" - Filter to gold only

2. **Enhanced Filtering**:
   - Combines with existing filters (Called/Not Called)
   - Works with search and sorting

---

## 👥 User Permission Management

### Setting Up User Access

#### Via SQL (Supabase):
```sql
-- Grant access to vault clients only
UPDATE users 
SET can_access_vault_clients = true, 
    can_access_gold_clients = false 
WHERE email = 'user@example.com';

-- Grant access to gold clients only
UPDATE users 
SET can_access_vault_clients = false, 
    can_access_gold_clients = true 
WHERE email = 'user@example.com';

-- Grant access to both (typical for admins)
UPDATE users 
SET can_access_vault_clients = true, 
    can_access_gold_clients = true 
WHERE role = 'admin';
```

### Future Enhancement Opportunities
You may want to add UI controls to manage these permissions in the admin dashboard. This would require:
- Update admin users page to show permission toggles
- API endpoint to update user permissions
- Permission checks before allowing access

---

## 🔄 API Changes

### GET /api/clients
**New Query Parameter:**
- `clientType`: 'all' | 'vault' | 'gold' (default: 'all')

**Example:**
```javascript
// Fetch only vault clients
fetch('/api/clients?clientType=vault', {
  headers: { Authorization: `Bearer ${token}` }
})

// Fetch only gold clients
fetch('/api/clients?clientType=gold', {
  headers: { Authorization: `Bearer ${token}` }
})
```

### POST /api/clients
**Required Field:**
- `client_type`: 'vault' | 'gold'

**Validation:**
- Vault clients: All vault fields required
- Gold clients: Only name, email, cell phone required
- Box number/contract number uniqueness checked only for vault clients

---

## 📊 Database Schema Updates

### New Columns

#### `clients` table:
```sql
client_type client_type NOT NULL DEFAULT 'vault'
```

#### `users` table:
```sql
can_access_vault_clients BOOLEAN NOT NULL DEFAULT true
can_access_gold_clients BOOLEAN NOT NULL DEFAULT false
```

### New Views
- `vault_clients` - Quick access to vault clients only
- `gold_clients` - Quick access to gold clients only

### New Functions
- `user_can_access_client(user_id, client_type)` - Check if user can access a specific client type

---

## ✅ Validation Rules

### Vault Clients (All Required):
- ✓ Box Number: Alphanumeric, hyphens, underscores
- ✓ Size: One of A, B, C, D, E
- ✓ Contract Number: Alphanumeric, unique
- ✓ Name: Letters, spaces, hyphens, apostrophes
- ✓ ID Number: Alphanumeric, min 5 chars
- ✓ Email: Valid email format
- ✓ Cell Phone: Valid phone format
- ✓ Start Date: YYYY-MM-DD format
- ✓ End Date: YYYY-MM-DD, must be after start date
- ✓ Occupation: Letters, spaces, hyphens

### Gold Clients (Required):
- ✓ Name: Letters, spaces, hyphens, apostrophes
- ✓ Email: Valid email format
- ✓ Cell Phone: Valid phone format
- ○ Home Phone: Optional
- ○ Notes: Optional

---

## 🔒 Security Considerations

1. **Permission Enforcement**: Currently implemented at API level
   - Consider adding client-side permission checks in future
   - Hide/show client type tabs based on user permissions

2. **Data Validation**: Both client types go through strict validation
   - XSS protection via input sanitization
   - SQL injection protection via parameterized queries
   - Type safety via Zod schemas

3. **Audit Trail**: Maintained through existing created_by/updated_by fields
   - Client type changes should be logged (future enhancement)

---

## 🎯 Usage Examples

### Example 1: Create a Vault Client
```javascript
const vaultClient = {
  client_type: 'vault',
  box_number: 'BOX123',
  size: 'A',
  contract_no: 'CON123',
  principal_key_holder: 'John Doe',
  principal_key_holder_id_number: '123456789',
  principal_key_holder_email_address: 'john@example.com',
  telephone_cell: '+27123456789',
  contract_start_date: '2024-01-01',
  contract_end_date: '2024-12-31',
  occupation: 'Engineer',
  notes: 'VIP client'
}

await fetch('/api/clients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(vaultClient)
})
```

### Example 2: Create a Gold Client
```javascript
const goldClient = {
  client_type: 'gold',
  principal_key_holder: 'Jane Smith',
  principal_key_holder_email_address: 'jane@example.com',
  telephone_cell: '+27987654321',
  notes: 'Referred by partner'
}

await fetch('/api/clients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(goldClient)
})
```

---

## 🐛 Troubleshooting

### Issue: Client type selector not showing
**Solution:** Clear browser cache and reload the page

### Issue: Validation errors on vault fields for gold clients
**Solution:** Ensure `client_type` is set to 'gold' before form submission

### Issue: Users can't see certain client types
**Solution:** Check user permissions in database:
```sql
SELECT email, can_access_vault_clients, can_access_gold_clients 
FROM users 
WHERE email = 'user@example.com';
```

### Issue: Database migration fails
**Solution:** Check if client_type enum already exists. If so, skip enum creation and continue with other steps.

---

## 📝 Notes

1. **Existing Clients**: All existing clients are automatically set to 'vault' type
2. **Client Type Lock**: Once created, a client's type cannot be changed (by design)
3. **Backwards Compatibility**: System maintains compatibility with existing vault client workflows
4. **Future Enhancements**: 
   - Client type migration tool (vault ↔ gold)
   - Bulk import with client type specification
   - Permission management UI in admin dashboard
   - Client type statistics on dashboard

---

## 📞 Support

If you encounter issues:
1. Check database migration completed successfully
2. Verify user permissions are set correctly
3. Clear browser cache
4. Check browser console for JavaScript errors
5. Review API error messages for validation details

---

**Implementation Date:** February 2026  
**Status:** ✅ Complete and Ready to Use  
**Migration Required:** Yes (database/client-types-migration.sql)
