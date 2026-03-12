-- =====================================================
-- Zoho Bigin Integration Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add Zoho sync fields to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS zoho_contact_id VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS zoho_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS zoho_last_sync_status VARCHAR(50); -- 'success', 'failed', 'pending'

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_zoho_contact_id ON clients(zoho_contact_id);
CREATE INDEX IF NOT EXISTS idx_clients_zoho_synced_at ON clients(zoho_synced_at);

-- Add Zoho sync fields to call_logs table
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS zoho_activity_id VARCHAR(255);
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS zoho_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS zoho_sync_status VARCHAR(50); -- 'success', 'failed', 'pending'
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS zoho_sync_error TEXT;

-- Create indexes for call logs
CREATE INDEX IF NOT EXISTS idx_call_logs_zoho_activity_id ON call_logs(zoho_activity_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_zoho_synced_at ON call_logs(zoho_synced_at);
CREATE INDEX IF NOT EXISTS idx_call_logs_zoho_sync_status ON call_logs(zoho_sync_status);

-- Create a table to track Zoho sync operations
CREATE TABLE IF NOT EXISTS zoho_sync_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL, -- 'contact', 'activity', 'bulk_import'
    entity_type VARCHAR(50) NOT NULL, -- 'client', 'call_log'
    entity_id UUID,
    zoho_id VARCHAR(255),
    status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'pending'
    error_message TEXT,
    request_data JSONB,
    response_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for sync log
CREATE INDEX IF NOT EXISTS idx_zoho_sync_log_entity ON zoho_sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_zoho_sync_log_status ON zoho_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_zoho_sync_log_created_at ON zoho_sync_log(created_at);

-- Create a view for Zoho sync statistics
CREATE OR REPLACE VIEW zoho_sync_stats AS
SELECT
    sync_type,
    entity_type,
    status,
    COUNT(*) as count,
    MAX(created_at) as last_sync_time
FROM zoho_sync_log
GROUP BY sync_type, entity_type, status;

-- Create function to get clients needing Zoho sync
CREATE OR REPLACE FUNCTION get_clients_needing_zoho_sync(limit_count INT DEFAULT 100)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    phone VARCHAR,
    email VARCHAR,
    notes TEXT,
    zoho_contact_id VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.phone,
        c.email,
        c.notes,
        c.zoho_contact_id
    FROM clients c
    WHERE c.zoho_contact_id IS NULL
       OR c.zoho_synced_at IS NULL
       OR c.zoho_synced_at < c.updated_at
    ORDER BY c.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get call logs needing Zoho sync
CREATE OR REPLACE FUNCTION get_call_logs_needing_zoho_sync(limit_count INT DEFAULT 100)
RETURNS TABLE (
    id UUID,
    client_id UUID,
    call_type VARCHAR,
    call_status VARCHAR,
    call_duration INTEGER,
    notes TEXT,
    zoho_activity_id VARCHAR,
    client_zoho_id VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cl.id,
        cl.client_id,
        cl.call_type::VARCHAR,
        cl.call_status::VARCHAR,
        cl.call_duration,
        cl.notes,
        cl.zoho_activity_id,
        c.zoho_contact_id
    FROM call_logs cl
    JOIN clients c ON c.id = cl.client_id
    WHERE cl.zoho_activity_id IS NULL
       OR cl.zoho_sync_status = 'failed'
    ORDER BY cl.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON zoho_sync_log TO authenticated;
GRANT SELECT ON zoho_sync_stats TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN clients.zoho_contact_id IS 'Zoho CRM Contact ID for bi-directional sync';
COMMENT ON COLUMN clients.zoho_synced_at IS 'Last successful sync timestamp with Zoho';
COMMENT ON COLUMN call_logs.zoho_activity_id IS 'Zoho CRM Activity ID for the call log';
COMMENT ON COLUMN call_logs.zoho_synced_at IS 'Timestamp when call was synced to Zoho';
COMMENT ON TABLE zoho_sync_log IS 'Audit trail for all Zoho CRM synchronization operations';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Zoho Bigin integration schema created successfully!';
    RAISE NOTICE '📊 Added sync fields to clients and call_logs tables';
    RAISE NOTICE '📝 Created zoho_sync_log table for audit trail';
    RAISE NOTICE '🔍 Created helper functions for bulk sync operations';
END $$;
