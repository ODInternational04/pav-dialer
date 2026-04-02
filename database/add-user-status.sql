-- Add user status tracking for breaks and availability
-- Run this in Supabase SQL Editor

-- Create user status enum type
DO $$ BEGIN
    CREATE TYPE user_status_type AS ENUM (
        'available',
        'on_call',
        'lunch_break',
        'comfort_break',
        'meeting',
        'coaching',
        'unavailable'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add status column to users table
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS user_status user_status_type DEFAULT 'available' NOT NULL,
    ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(user_status);
CREATE INDEX IF NOT EXISTS idx_users_status_active ON users(user_status, is_active) WHERE is_active = true;

-- Add a trigger to update status_changed_at automatically
CREATE OR REPLACE FUNCTION update_user_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_status IS DISTINCT FROM OLD.user_status THEN
        NEW.status_changed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_status_timestamp ON users;
CREATE TRIGGER trigger_update_user_status_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_status_timestamp();

-- Update existing users to have 'available' status
UPDATE users 
SET user_status = 'available', 
    status_changed_at = NOW()
WHERE user_status IS NULL;

-- Automatically set status to 'on_call' when is_on_call is true
CREATE OR REPLACE FUNCTION sync_call_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_on_call = true AND OLD.is_on_call = false THEN
        NEW.user_status = 'on_call';
    ELSIF NEW.is_on_call = false AND OLD.is_on_call = true AND NEW.user_status = 'on_call' THEN
        NEW.user_status = 'available';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_call_status ON users;
CREATE TRIGGER trigger_sync_call_status
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_call_status();

-- Create a view for easy status monitoring
CREATE OR REPLACE VIEW user_status_summary AS
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    u.user_status,
    u.status_changed_at,
    u.status_reason,
    u.is_on_call,
    u.call_started_at,
    u.current_call_client_id,
    c.name as current_client_name,
    c.phone as current_client_phone,
    CASE 
        WHEN u.user_status = 'on_call' THEN 
            EXTRACT(EPOCH FROM (NOW() - u.call_started_at)) / 60
        WHEN u.user_status != 'available' THEN 
            EXTRACT(EPOCH FROM (NOW() - u.status_changed_at)) / 60
        ELSE 0
    END as minutes_in_status
FROM users u
LEFT JOIN clients c ON u.current_call_client_id = c.id
WHERE u.is_active = true
ORDER BY u.first_name;

-- Grant permissions
GRANT SELECT ON user_status_summary TO authenticated;
GRANT ALL ON users TO authenticated;

COMMENT ON COLUMN users.user_status IS 'Current availability status of the user';
COMMENT ON COLUMN users.status_changed_at IS 'Timestamp when status was last changed';
COMMENT ON COLUMN users.status_reason IS 'Optional reason or note for the current status';
