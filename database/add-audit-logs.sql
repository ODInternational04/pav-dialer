-- =============================================
-- ADD AUDIT LOGGING TO SIMPLIFIED SCHEMA
-- =============================================
-- Run this in your Supabase SQL Editor to add audit logging

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    user_email TEXT,
    user_role TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT audit_logs_operation_check CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT'))
);

-- Create indexes for audit logs (fast filtering)
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs(operation);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ Audit logs table created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Audit Log Features:';
    RAISE NOTICE '   - Track all database changes';
    RAISE NOTICE '   - User activity monitoring';
    RAISE NOTICE '   - Login/Logout tracking';
    RAISE NOTICE '   - Data export tracking';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security: Only admins can view audit logs';
END $$;
