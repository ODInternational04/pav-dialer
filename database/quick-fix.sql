-- Quick Database Fix for IBV Dialer Issues
-- Run this in your Supabase SQL editor to fix current errors

-- Step 1: Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_on_call BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_call_client_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS call_started_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Update existing users to have default values
UPDATE users SET is_on_call = false WHERE is_on_call IS NULL;
UPDATE users SET current_call_client_id = NULL WHERE current_call_client_id IS NULL;
UPDATE users SET call_started_at = NULL WHERE call_started_at IS NULL;

-- Step 3: Add foreign key constraint if clients table exists
DO $$ 
BEGIN
    -- Check if clients table exists and add foreign key if it does
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        -- Only add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_users_current_call_client'
        ) THEN
            ALTER TABLE users ADD CONSTRAINT fk_users_current_call_client 
            FOREIGN KEY (current_call_client_id) REFERENCES clients(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Step 4: Create missing functions
CREATE OR REPLACE FUNCTION get_user_call_statistics(start_date date, end_date date)
RETURNS TABLE(
    user_id uuid,
    user_name text,
    total_calls bigint,
    completed_calls bigint,
    missed_calls bigint,
    declined_calls bigint,
    success_rate numeric,
    average_duration numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cl.user_id,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        COUNT(*)::bigint as total_calls,
        COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END)::bigint as completed_calls,
        COUNT(CASE WHEN cl.call_status = 'missed' THEN 1 END)::bigint as missed_calls,
        COUNT(CASE WHEN cl.call_status = 'declined' THEN 1 END)::bigint as declined_calls,
        ROUND(
            (COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 
            2
        ) as success_rate,
        ROUND(AVG(cl.call_duration), 2) as average_duration
    FROM call_logs cl
    JOIN users u ON u.id = cl.user_id
    WHERE DATE(cl.created_at) BETWEEN start_date AND end_date
    GROUP BY cl.user_id, u.first_name, u.last_name
    ORDER BY total_calls DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_system_statistics(start_date date, end_date date)
RETURNS TABLE(
    total_calls bigint,
    completed_calls bigint,
    missed_calls bigint,
    declined_calls bigint,
    busy_calls bigint,
    no_answer_calls bigint,
    success_rate numeric,
    average_duration numeric,
    total_users bigint,
    active_users bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint as total_calls,
        COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END)::bigint as completed_calls,
        COUNT(CASE WHEN cl.call_status = 'missed' THEN 1 END)::bigint as missed_calls,
        COUNT(CASE WHEN cl.call_status = 'declined' THEN 1 END)::bigint as declined_calls,
        COUNT(CASE WHEN cl.call_status = 'busy' THEN 1 END)::bigint as busy_calls,
        COUNT(CASE WHEN cl.call_status = 'no_answer' THEN 1 END)::bigint as no_answer_calls,
        ROUND(
            (COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
            2
        ) as success_rate,
        ROUND(AVG(cl.call_duration), 2) as average_duration,
        (SELECT COUNT(*)::bigint FROM users WHERE is_active = true) as total_users,
        (SELECT COUNT(DISTINCT user_id)::bigint FROM call_logs WHERE DATE(created_at) BETWEEN start_date AND end_date) as active_users
    FROM call_logs cl
    WHERE DATE(cl.created_at) BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_on_call ON users(is_on_call);
CREATE INDEX IF NOT EXISTS idx_users_current_call ON users(current_call_client_id);
CREATE INDEX IF NOT EXISTS idx_users_call_started ON users(call_started_at);

-- Done! Your database should now work properly with the IBV Dialer.