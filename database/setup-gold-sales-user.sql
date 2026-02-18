-- ============================================
-- Setup Gold Sales User and Test Data
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: First, ensure the migration has been run
-- Check if client_type column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clients' 
        AND column_name = 'client_type'
    ) THEN
        RAISE EXCEPTION 'ERROR: client_type column does not exist. Please run the client-types-migration.sql first!';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'can_access_gold_clients'
    ) THEN
        RAISE EXCEPTION 'ERROR: can_access_gold_clients column does not exist. Please run the client-types-migration.sql first!';
    END IF;
    
    RAISE NOTICE 'Schema check passed - columns exist';
END $$;

-- STEP 2: Configure the gold sales user
UPDATE users 
SET 
    can_access_vault_clients = false,
    can_access_gold_clients = true
WHERE email = 'goldsales1@ibvglobal.com';

-- Verify the user was updated
DO $$
DECLARE
    v_user_found BOOLEAN;
    v_can_access_vault BOOLEAN;
    v_can_access_gold BOOLEAN;
BEGIN
    SELECT 
        true,
        can_access_vault_clients,
        can_access_gold_clients
    INTO v_user_found, v_can_access_vault, v_can_access_gold
    FROM users
    WHERE email = 'goldsales1@ibvglobal.com';
    
    IF v_user_found IS NULL THEN
        RAISE EXCEPTION 'ERROR: User goldsales1@ibvglobal.com not found!';
    END IF;
    
    IF v_can_access_vault = true THEN
        RAISE WARNING 'WARNING: User still has vault access!';
    END IF;
    
    IF v_can_access_gold = false THEN
        RAISE EXCEPTION 'ERROR: User does not have gold client access!';
    END IF;
    
    RAISE NOTICE '✅ User goldsales1@ibvglobal.com configured correctly:';
    RAISE NOTICE '   - Vault Access: %', v_can_access_vault;
    RAISE NOTICE '   - Gold Access: %', v_can_access_gold;
END $$;

-- STEP 3: Check how many gold clients exist
DO $$
DECLARE
    v_gold_count INTEGER;
    v_vault_count INTEGER;
    v_null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_gold_count FROM clients WHERE client_type = 'gold';
    SELECT COUNT(*) INTO v_vault_count FROM clients WHERE client_type = 'vault';
    SELECT COUNT(*) INTO v_null_count FROM clients WHERE client_type IS NULL;
    
    RAISE NOTICE '📊 Client Statistics:';
    RAISE NOTICE '   - Gold Clients: %', v_gold_count;
    RAISE NOTICE '   - Vault Clients: %', v_vault_count;
    RAISE NOTICE '   - NULL Type: %', v_null_count;
    
    IF v_gold_count = 0 THEN
        RAISE WARNING '⚠️  No gold clients found! Creating test data...';
    END IF;
END $$;

-- STEP 4: Create test gold clients (only if none exist)
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
    occupation
)
SELECT 
    'gold',
    'John Gold Customer',
    'john.gold@example.com',
    '+27123456001',
    'Test gold client - high value customer',
    'GOLD-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'GOLD-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'N/A',
    'N/A',
    'N/A'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE client_type = 'gold' LIMIT 1)

UNION ALL

SELECT 
    'gold',
    'Sarah Gold VIP',
    'sarah.vip@example.com',
    '+27123456002',
    'Premium gold member - needs immediate attention',
    'GOLD-' || (EXTRACT(EPOCH FROM NOW()) + 1)::TEXT,
    'GOLD-' || (EXTRACT(EPOCH FROM NOW()) + 1)::TEXT,
    'N/A',
    'N/A',
    'N/A'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE client_type = 'gold' LIMIT 1)

UNION ALL

SELECT 
    'gold',
    'Michael Gold Elite',
    'michael.elite@example.com',
    '+27123456003',
    'Elite gold client - special services',
    'GOLD-' || (EXTRACT(EPOCH FROM NOW()) + 2)::TEXT,
    'GOLD-' || (EXTRACT(EPOCH FROM NOW()) + 2)::TEXT,
    'N/A',
    'N/A',
    'N/A'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE client_type = 'gold' LIMIT 1);

-- STEP 5: Final verification
DO $$
DECLARE
    v_gold_count INTEGER;
    v_user_id UUID;
    v_user_email TEXT;
    v_can_vault BOOLEAN;
    v_can_gold BOOLEAN;
BEGIN
    -- Count gold clients
    SELECT COUNT(*) INTO v_gold_count FROM clients WHERE client_type = 'gold';
    
    -- Get user details
    SELECT id, email, can_access_vault_clients, can_access_gold_clients
    INTO v_user_id, v_user_email, v_can_vault, v_can_gold
    FROM users
    WHERE email = 'goldsales1@ibvglobal.com';
    
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '✅ SETUP COMPLETE!';
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '👤 User: % (ID: %)', v_user_email, v_user_id;
    RAISE NOTICE '   Vault Access: %', v_can_vault;
    RAISE NOTICE '   Gold Access: %', v_can_gold;
    RAISE NOTICE '';
    RAISE NOTICE '📊 Gold Clients: %', v_gold_count;
    RAISE NOTICE '';
    
    IF v_gold_count = 0 THEN
        RAISE EXCEPTION '❌ FAILED: No gold clients were created!';
    END IF;
    
    IF v_can_gold = false THEN
        RAISE EXCEPTION '❌ FAILED: User does not have gold access!';
    END IF;
    
    IF v_can_vault = true THEN
        RAISE WARNING '⚠️  User still has vault access - should be false';
    END IF;
    
    RAISE NOTICE '✅ User should now see % gold client(s)', v_gold_count;
    RAISE NOTICE '🔄 Please logout and login again for changes to take effect';
    RAISE NOTICE '═══════════════════════════════════════';
END $$;

-- STEP 6: Show the gold clients that were created/exist
SELECT 
    id,
    client_type,
    principal_key_holder as name,
    principal_key_holder_email_address as email,
    telephone_cell as phone,
    notes,
    created_at
FROM clients
WHERE client_type = 'gold'
ORDER BY created_at DESC;
