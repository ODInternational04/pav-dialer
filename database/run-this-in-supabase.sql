-- =============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Fixes: customer_feedback table + audit_logs table
-- =============================================

-- 1. AUDIT LOGS TABLE
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
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs(operation);

-- 2. CUSTOMER FEEDBACK ENUM
DO $$ BEGIN
    CREATE TYPE feedback_type AS ENUM ('complaint', 'happy', 'suggestion', 'general');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. CUSTOMER FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS customer_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    feedback_type feedback_type NOT NULL,
    subject VARCHAR(255) NOT NULL,
    notes TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_resolved BOOLEAN DEFAULT false NOT NULL,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_client_id ON customer_feedback(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_user_id ON customer_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_type ON customer_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_created_at ON customer_feedback(created_at);

-- 4. AUTO-UPDATE updated_at (only create function if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_customer_feedback_updated_at ON customer_feedback;
CREATE TRIGGER update_customer_feedback_updated_at
    BEFORE UPDATE ON customer_feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SUCCESS
DO $$
BEGIN
    RAISE NOTICE '✅ Both tables created: audit_logs + customer_feedback';
END $$;
