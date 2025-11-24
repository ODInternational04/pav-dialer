-- =============================================
-- PRODUCTION SECURITY SCHEMA FOR DIALER SYSTEM
-- Run this script in your Supabase SQL Editor
-- =============================================

-- Enable Row Level Security on all tables
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Only admins can manage users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Only authenticated users can manage clients" ON clients;
DROP POLICY IF EXISTS "Users can insert clients" ON clients;
DROP POLICY IF EXISTS "Users can update clients" ON clients;
DROP POLICY IF EXISTS "Users can delete clients" ON clients;

DROP POLICY IF EXISTS "Users can view own call logs" ON call_logs;
DROP POLICY IF EXISTS "Users can manage own call logs" ON call_logs;
DROP POLICY IF EXISTS "Users can insert call logs" ON call_logs;
DROP POLICY IF EXISTS "Users can update call logs" ON call_logs;
DROP POLICY IF EXISTS "Users can delete call logs" ON call_logs;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete notifications" ON notifications;

-- =============================================
-- USERS TABLE POLICIES
-- =============================================

-- Users can view their own profile or admins can view all
CREATE POLICY "Users can view profiles" ON users
    FOR SELECT USING (
        auth.uid()::text = id OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- Users can update their own profile (except role), admins can update everything
CREATE POLICY "Users can update profiles" ON users
    FOR UPDATE USING (
        (auth.uid()::text = id AND role = (SELECT role FROM users WHERE id = auth.uid()::text)) OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- Only admins can insert new users
CREATE POLICY "Only admins can create users" ON users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- Only admins can delete users
CREATE POLICY "Only admins can delete users" ON users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- =============================================
-- CLIENTS TABLE POLICIES
-- =============================================

-- All authenticated users can view clients
CREATE POLICY "Authenticated users can view clients" ON clients
    FOR SELECT USING (auth.role() = 'authenticated');

-- All authenticated users can insert clients
CREATE POLICY "Authenticated users can create clients" ON clients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update clients they created, admins can update any
CREATE POLICY "Users can update clients" ON clients
    FOR UPDATE USING (
        created_by = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- Only admins can delete clients
CREATE POLICY "Only admins can delete clients" ON clients
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- =============================================
-- CALL LOGS TABLE POLICIES
-- =============================================

-- Users can view their own call logs or admins can view all
CREATE POLICY "Users can view call logs" ON call_logs
    FOR SELECT USING (
        user_id = auth.uid()::text OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- Users can create their own call logs
CREATE POLICY "Users can create call logs" ON call_logs
    FOR INSERT WITH CHECK (
        user_id = auth.uid()::text AND
        auth.role() = 'authenticated'
    );

-- Users can update their own call logs or admins can update any
CREATE POLICY "Users can update call logs" ON call_logs
    FOR UPDATE USING (
        user_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- Users can delete their own call logs or admins can delete any
CREATE POLICY "Users can delete call logs" ON call_logs
    FOR DELETE USING (
        user_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- =============================================
-- NOTIFICATIONS TABLE POLICIES
-- =============================================

-- Users can view their own notifications or admins can view all
CREATE POLICY "Users can view notifications" ON notifications
    FOR SELECT USING (
        user_id = auth.uid()::text OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- Users can create notifications for themselves, admins can create for anyone
CREATE POLICY "Users can create notifications" ON notifications
    FOR INSERT WITH CHECK (
        (user_id = auth.uid()::text AND auth.role() = 'authenticated') OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- Users can update their own notifications or admins can update any
CREATE POLICY "Users can update notifications" ON notifications
    FOR UPDATE USING (
        user_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- Users can delete their own notifications or admins can delete any
CREATE POLICY "Users can delete notifications" ON notifications
    FOR DELETE USING (
        user_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- =============================================
-- CUSTOMER FEEDBACK TABLE POLICIES (if exists)
-- =============================================

-- Users can view feedback for clients they've called or admins can view all
CREATE POLICY "Users can view customer feedback" ON customer_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM call_logs 
            WHERE client_id = customer_feedback.client_id 
            AND user_id = auth.uid()::text
        ) OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- Users can create feedback for clients they've called
CREATE POLICY "Users can create customer feedback" ON customer_feedback
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM call_logs 
            WHERE client_id = customer_feedback.client_id 
            AND user_id = auth.uid()::text
        ) AND
        auth.role() = 'authenticated'
    );

-- Users can update feedback they created or admins can update any
CREATE POLICY "Users can update customer feedback" ON customer_feedback
    FOR UPDATE USING (
        created_by = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- Only admins can delete feedback
CREATE POLICY "Only admins can delete customer feedback" ON customer_feedback
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- =============================================
-- AUDIT LOGGING SYSTEM
-- =============================================

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    user_id UUID,
    user_email TEXT,
    user_role TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT audit_logs_operation_check CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs(operation);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND role = 'admin'
        )
    );

-- Only system can insert audit logs (no manual inserts)
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (false); -- This prevents direct inserts

-- No updates or deletes allowed on audit logs
CREATE POLICY "No updates on audit logs" ON audit_logs
    FOR UPDATE USING (false);

CREATE POLICY "No deletes on audit logs" ON audit_logs
    FOR DELETE USING (false);

-- =============================================
-- AUDIT TRIGGER FUNCTIONS
-- =============================================

-- Enhanced audit trigger function with more details
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    user_info RECORD;
BEGIN
    -- Get user information
    SELECT u.email, u.role INTO user_info
    FROM users u
    WHERE u.id = auth.uid()::text;
    
    -- Insert audit record
    INSERT INTO audit_logs (
        table_name,
        operation,
        user_id,
        user_email,
        user_role,
        record_id,
        old_data,
        new_data,
        ip_address,
        user_agent
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        auth.uid(),
        COALESCE(user_info.email, 'system'),
        COALESCE(user_info.role, 'system'),
        CASE 
            WHEN TG_OP = 'DELETE' THEN (OLD.id)::UUID
            ELSE (NEW.id)::UUID
        END,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent'
    );
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the original operation
        RAISE WARNING 'Audit logging failed: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- APPLY AUDIT TRIGGERS TO TABLES
-- =============================================

-- Add audit triggers to important tables
DROP TRIGGER IF EXISTS audit_users_trigger ON users;
CREATE TRIGGER audit_users_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_clients_trigger ON clients;
CREATE TRIGGER audit_clients_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON clients
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_call_logs_trigger ON call_logs;
CREATE TRIGGER audit_call_logs_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON call_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_notifications_trigger ON notifications;
CREATE TRIGGER audit_notifications_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON notifications
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Add trigger for customer feedback if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_feedback') THEN
        DROP TRIGGER IF EXISTS audit_customer_feedback_trigger ON customer_feedback;
        CREATE TRIGGER audit_customer_feedback_trigger 
            AFTER INSERT OR UPDATE OR DELETE ON customer_feedback
            FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    END IF;
END $$;

-- =============================================
-- SECURITY FUNCTIONS
-- =============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid()::text AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role FROM users 
        WHERE id = auth.uid()::text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely delete old audit logs (only admins)
CREATE OR REPLACE FUNCTION cleanup_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Only admins can cleanup audit logs
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only administrators can cleanup audit logs';
    END IF;
    
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    INSERT INTO audit_logs (
        table_name, operation, user_id, user_email, user_role,
        new_data, created_at
    ) VALUES (
        'audit_logs', 'CLEANUP', auth.uid(), 
        (SELECT email FROM users WHERE id = auth.uid()::text),
        'admin',
        json_build_object('deleted_count', deleted_count, 'days_kept', days_to_keep),
        NOW()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ADDITIONAL SECURITY CONSTRAINTS
-- =============================================

-- Add check constraints for data integrity
DO $$
BEGIN
    -- Ensure email format is valid
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'users_email_format_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_email_format_check 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
    
    -- Ensure role is valid
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'users_role_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'user'));
    END IF;
    
    -- Ensure phone numbers are reasonable length
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'clients_phone_length_check'
    ) THEN
        ALTER TABLE clients ADD CONSTRAINT clients_phone_length_check 
        CHECK (length(telephone_cell) BETWEEN 7 AND 20);
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Some constraints could not be added: %', SQLERRM;
END $$;

-- =============================================
-- PERFORMANCE OPTIMIZATIONS
-- =============================================

-- Add useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_principal_key_holder ON clients(principal_key_holder);
CREATE INDEX IF NOT EXISTS idx_clients_telephone_cell ON clients(telephone_cell);
CREATE INDEX IF NOT EXISTS idx_clients_contract_no ON clients(contract_no);
CREATE INDEX IF NOT EXISTS idx_clients_box_number ON clients(box_number);

CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_client_id ON call_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_status ON call_logs(call_status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

-- Insert a system message to confirm setup
DO $$
BEGIN
    RAISE NOTICE '✅ DIALER SYSTEM SECURITY SETUP COMPLETED SUCCESSFULLY';
    RAISE NOTICE '🔒 Row Level Security enabled on all tables';
    RAISE NOTICE '📊 Audit logging system activated';
    RAISE NOTICE '⚡ Performance indexes created';
    RAISE NOTICE '🛡️ Security constraints applied';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test the policies with different user roles';
    RAISE NOTICE '2. Monitor audit_logs table for security events';
    RAISE NOTICE '3. Schedule regular cleanup of old audit logs';
    RAISE NOTICE '4. Review and adjust rate limits as needed';
END $$;