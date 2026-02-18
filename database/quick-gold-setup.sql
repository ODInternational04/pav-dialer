-- ============================================
-- QUICK FIX: Setup Gold Sales User  
-- Copy and paste this entire script into Supabase SQL Editor
-- ============================================

-- 1. Update the gold sales user permissions
UPDATE users 
SET 
    can_access_vault_clients = false,
    can_access_gold_clients = true
WHERE email = 'goldsales1@ibvglobal.com';

-- 2. Create 3 test gold clients
INSERT INTO clients (
    client_type,
    principal_key_holder,
    principal_key_holder_email_address,
    telephone_cell,
    notes,
    box_number,
    contract_no,
    size,
    principal_key_holder_id_number,
    occupation,
    contract_start_date,
    contract_end_date,
    created_at,
    updated_at,
    created_by,
    last_updated_by
) 
SELECT 
    'gold',
    'John Gold Customer',
    'john.gold@example.com',
    '+27123456789',
    'Premium gold client - VIP services',
    'GOLD-1001',
    'GOLD-1001',
    'N/A',
    'N/A',
    'N/A',
    NOW(),
    NOW() + INTERVAL '1 year',
    NOW(),
    NOW(),
    u.id,
    u.id
FROM users u WHERE u.email = 'goldsales1@ibvglobal.com'

UNION ALL

SELECT 
    'gold',
    'Sarah VIP Member',
    'sarah.vip@example.com',
    '+27987654321',
    'Elite gold member - priority support',
    'GOLD-1002',
    'GOLD-1002',
    'N/A',
    'N/A',
    'N/A',
    NOW(),
    NOW() + INTERVAL '1 year',
    NOW(),
    NOW(),
    u.id,
    u.id
FROM users u WHERE u.email = 'goldsales1@ibvglobal.com'

UNION ALL

SELECT 
    'gold',
    'Michael Elite',
    'michael.elite@example.com',
    '+27555123456',
    'Gold tier - special handling required',
    'GOLD-1003',
    'GOLD-1003',
    'N/A',
    'N/A',
    'N/A',
    NOW(),
    NOW() + INTERVAL '1 year',
    NOW(),
    NOW(),
    u.id,
    u.id
FROM users u WHERE u.email = 'goldsales1@ibvglobal.com';

-- 3. Verify setup
SELECT 
    '✅ Gold Sales User' as check_type,
    email,
    can_access_vault_clients as vault_access,
    can_access_gold_clients as gold_access
FROM users 
WHERE email = 'goldsales1@ibvglobal.com'

UNION ALL

SELECT 
    '📊 Gold Clients Count' as check_type,
    COUNT(*)::text as email,
    null as vault_access,
    null as gold_access
FROM clients 
WHERE client_type = 'gold';

-- 4. Show all gold clients
SELECT 
    client_type,
    principal_key_holder as name,
    principal_key_holder_email_address as email,
    telephone_cell as phone,
    notes,
    created_at
FROM clients
WHERE client_type = 'gold'
ORDER BY created_at DESC;
