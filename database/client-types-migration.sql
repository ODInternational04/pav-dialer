-- Migration to add two-tier client system (Vault and Gold clients)
-- Run this script in your Supabase SQL editor

-- Step 1: Create client_type enum
DO $$ BEGIN
    CREATE TYPE client_type AS ENUM ('vault', 'gold');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add client_type column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS client_type client_type DEFAULT 'vault' NOT NULL;

-- Step 3: Make vault-specific fields nullable for Gold clients
ALTER TABLE clients 
ALTER COLUMN box_number DROP NOT NULL,
ALTER COLUMN size DROP NOT NULL,
ALTER COLUMN contract_no DROP NOT NULL,
ALTER COLUMN principal_key_holder_id_number DROP NOT NULL,
ALTER COLUMN contract_start_date DROP NOT NULL,
ALTER COLUMN contract_end_date DROP NOT NULL,
ALTER COLUMN occupation DROP NOT NULL;

-- Step 4: Drop unique constraints on box_number and contract_no (we'll handle this in application logic)
-- This allows Gold clients to use placeholder values
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_box_number_key;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_contract_no_key;

-- Step 5: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_client_type ON clients(client_type);
CREATE INDEX IF NOT EXISTS idx_clients_box_number ON clients(box_number) WHERE client_type = 'vault';
CREATE INDEX IF NOT EXISTS idx_clients_contract_no ON clients(contract_no) WHERE client_type = 'vault';

-- Step 6: Update users table to add client access permissions
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS can_access_vault_clients BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS can_access_gold_clients BOOLEAN DEFAULT false NOT NULL;

-- Step 7: Grant admins access to both client types by default
UPDATE users 
SET can_access_vault_clients = true, 
    can_access_gold_clients = true 
WHERE role = 'admin';

-- Step 8: Create a view for easy querying of vault clients
CREATE OR REPLACE VIEW vault_clients AS
SELECT * FROM clients WHERE client_type = 'vault';

-- Step 9: Create a view for easy querying of gold clients
CREATE OR REPLACE VIEW gold_clients AS
SELECT * FROM clients WHERE client_type = 'gold';

-- Step 10: Add comments for documentation
COMMENT ON COLUMN clients.client_type IS 'Type of client: vault (full details) or gold (simplified)';
COMMENT ON COLUMN users.can_access_vault_clients IS 'Whether user can view/edit vault clients';
COMMENT ON COLUMN users.can_access_gold_clients IS 'Whether user can view/edit gold clients';

-- Step 11: Create function to check user client access
CREATE OR REPLACE FUNCTION user_can_access_client(
    p_user_id UUID,
    p_client_type client_type
)
RETURNS BOOLEAN AS $$
DECLARE
    v_can_access_vault BOOLEAN;
    v_can_access_gold BOOLEAN;
BEGIN
    SELECT can_access_vault_clients, can_access_gold_clients
    INTO v_can_access_vault, v_can_access_gold
    FROM users
    WHERE id = p_user_id;
    
    IF p_client_type = 'vault' THEN
        RETURN v_can_access_vault;
    ELSIF p_client_type = 'gold' THEN
        RETURN v_can_access_gold;
    ELSE
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Add unique constraint for vault clients only
-- This ensures vault clients have unique box_number and contract_no
CREATE UNIQUE INDEX IF NOT EXISTS unique_vault_box_number 
ON clients(box_number) WHERE client_type = 'vault';

CREATE UNIQUE INDEX IF NOT EXISTS unique_vault_contract_no 
ON clients(contract_no) WHERE client_type = 'vault';

-- Step 13: Display migration success message
DO $$
BEGIN
    RAISE NOTICE 'Client types migration completed successfully!';
    RAISE NOTICE 'Two-tier client system is now active:';
    RAISE NOTICE '  - Vault Clients: Full details (box_number, size, contract info, etc.)';
    RAISE NOTICE '  - Gold Clients: Simplified (name, surname, cell, email, notes)';
    RAISE NOTICE 'Please run this migration in your Supabase SQL editor.';
END $$;
