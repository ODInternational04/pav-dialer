-- Fix user table to add call status columns if they don't exist
-- Run this in your Supabase SQL editor if you're getting call status errors

DO $$ BEGIN
    -- Add is_on_call column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_on_call') THEN
        ALTER TABLE users ADD COLUMN is_on_call BOOLEAN DEFAULT false NOT NULL;
    END IF;
    
    -- Add current_call_client_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'current_call_client_id') THEN
        ALTER TABLE users ADD COLUMN current_call_client_id UUID;
    END IF;
    
    -- Add call_started_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'call_started_at') THEN
        ALTER TABLE users ADD COLUMN call_started_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist (only if clients table exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_users_current_call_client'
        ) THEN
            ALTER TABLE users ADD CONSTRAINT fk_users_current_call_client 
            FOREIGN KEY (current_call_client_id) REFERENCES clients(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_on_call ON users(is_on_call);
CREATE INDEX IF NOT EXISTS idx_users_current_call ON users(current_call_client_id);