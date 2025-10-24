-- Dialer System Database Schema for Supabase
-- Run this in your Supabase SQL editor

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;

-- Create enum types (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE call_status AS ENUM ('completed', 'missed', 'declined', 'busy', 'no_answer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE call_type AS ENUM ('outbound', 'inbound');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('callback', 'reminder', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table (without foreign key initially)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'user' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_on_call BOOLEAN DEFAULT false NOT NULL,
    current_call_client_id UUID,
    call_started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    box_number VARCHAR(50) UNIQUE NOT NULL,
    size VARCHAR(50) NOT NULL,
    contract_no VARCHAR(100) UNIQUE NOT NULL,
    principal_key_holder VARCHAR(255) NOT NULL,
    principal_key_holder_id_number VARCHAR(50) NOT NULL,
    principal_key_holder_email_address VARCHAR(255) NOT NULL,
    telephone_cell VARCHAR(20) NOT NULL,
    telephone_home VARCHAR(20),
    contract_start_date DATE NOT NULL,
    contract_end_date DATE NOT NULL,
    occupation VARCHAR(200) NOT NULL,
    notes TEXT DEFAULT '' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    last_updated_by UUID NOT NULL REFERENCES users(id)
);

-- Call logs table
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    call_type call_type NOT NULL,
    call_status call_status NOT NULL,
    call_duration INTEGER, -- in seconds
    notes TEXT DEFAULT '' NOT NULL,
    callback_requested BOOLEAN DEFAULT false NOT NULL,
    callback_time TIMESTAMP WITH TIME ZONE,
    call_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    call_ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    is_sent BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Call statistics view (daily aggregation)
CREATE OR REPLACE VIEW call_statistics AS
SELECT 
    cl.user_id,
    DATE(cl.created_at) as date,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END) as completed_calls,
    COUNT(CASE WHEN cl.call_status = 'missed' THEN 1 END) as missed_calls,
    COUNT(CASE WHEN cl.call_status = 'declined' THEN 1 END) as declined_calls,
    ROUND(
        (COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as success_rate,
    ROUND(AVG(cl.call_duration), 2) as average_call_duration
FROM call_logs cl
GROUP BY cl.user_id, DATE(cl.created_at);

-- Add foreign key constraint after all tables are created
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_users_current_call_client'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_current_call_client 
        FOREIGN KEY (current_call_client_id) REFERENCES clients(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Indexes for better performance (only create if they don't exist)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_is_on_call ON users(is_on_call);
CREATE INDEX IF NOT EXISTS idx_users_current_call ON users(current_call_client_id);

CREATE INDEX IF NOT EXISTS idx_clients_box_number ON clients(box_number);
CREATE INDEX IF NOT EXISTS idx_clients_contract_no ON clients(contract_no);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_telephone_cell ON clients(telephone_cell);

CREATE INDEX IF NOT EXISTS idx_call_logs_client_id ON call_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_status ON call_logs(call_status);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_call_logs_callback_requested ON call_logs(callback_requested);
CREATE INDEX IF NOT EXISTS idx_call_logs_callback_time ON call_logs(callback_time);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_sent ON notifications(is_sent);

-- Functions to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to get user call statistics
CREATE OR REPLACE FUNCTION get_user_call_statistics(start_date timestamp, end_date timestamp)
RETURNS TABLE (
    user_id UUID,
    first_name VARCHAR,
    last_name VARCHAR,
    email VARCHAR,
    total_calls BIGINT,
    completed_calls BIGINT,
    missed_calls BIGINT,
    declined_calls BIGINT,
    busy_calls BIGINT,
    no_answer_calls BIGINT,
    success_rate NUMERIC,
    average_call_duration NUMERIC,
    callbacks_requested BIGINT,
    total_call_time BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.email,
        COUNT(cl.id) as total_calls,
        COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END) as completed_calls,
        COUNT(CASE WHEN cl.call_status = 'missed' THEN 1 END) as missed_calls,
        COUNT(CASE WHEN cl.call_status = 'declined' THEN 1 END) as declined_calls,
        COUNT(CASE WHEN cl.call_status = 'busy' THEN 1 END) as busy_calls,
        COUNT(CASE WHEN cl.call_status = 'no_answer' THEN 1 END) as no_answer_calls,
        CASE 
            WHEN COUNT(cl.id) > 0 THEN 
                ROUND((COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END)::DECIMAL / COUNT(cl.id)) * 100, 2)
            ELSE 0 
        END as success_rate,
        ROUND(AVG(cl.call_duration), 2) as average_call_duration,
        COUNT(CASE WHEN cl.callback_requested = true THEN 1 END) as callbacks_requested,
        SUM(COALESCE(cl.call_duration, 0)) as total_call_time
    FROM users u
    LEFT JOIN call_logs cl ON u.id = cl.user_id 
        AND cl.created_at >= start_date 
        AND cl.created_at <= end_date
    WHERE u.role = 'user' AND u.is_active = true
    GROUP BY u.id, u.first_name, u.last_name, u.email
    ORDER BY success_rate DESC, total_calls DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get system-wide statistics
CREATE OR REPLACE FUNCTION get_system_statistics(start_date timestamp, end_date timestamp)
RETURNS TABLE (
    total_calls BIGINT,
    completed_calls BIGINT,
    missed_calls BIGINT,
    declined_calls BIGINT,
    busy_calls BIGINT,
    no_answer_calls BIGINT,
    overall_success_rate NUMERIC,
    average_call_duration NUMERIC,
    total_users BIGINT,
    active_users BIGINT,
    total_clients BIGINT,
    callbacks_pending BIGINT,
    callbacks_overdue BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(cl.id) as total_calls,
        COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END) as completed_calls,
        COUNT(CASE WHEN cl.call_status = 'missed' THEN 1 END) as missed_calls,
        COUNT(CASE WHEN cl.call_status = 'declined' THEN 1 END) as declined_calls,
        COUNT(CASE WHEN cl.call_status = 'busy' THEN 1 END) as busy_calls,
        COUNT(CASE WHEN cl.call_status = 'no_answer' THEN 1 END) as no_answer_calls,
        CASE 
            WHEN COUNT(cl.id) > 0 THEN 
                ROUND((COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END)::DECIMAL / COUNT(cl.id)) * 100, 2)
            ELSE 0 
        END as overall_success_rate,
        ROUND(AVG(cl.call_duration), 2) as average_call_duration,
        (SELECT COUNT(*) FROM users WHERE role = 'user') as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'user' AND is_active = true) as active_users,
        (SELECT COUNT(*) FROM clients) as total_clients,
        (SELECT COUNT(*) FROM call_logs 
         WHERE callback_requested = true 
         AND callback_time > NOW() 
         AND created_at >= start_date 
         AND created_at <= end_date) as callbacks_pending,
        (SELECT COUNT(*) FROM call_logs 
         WHERE callback_requested = true 
         AND callback_time < NOW() 
         AND created_at >= start_date 
         AND created_at <= end_date) as callbacks_overdue
    FROM call_logs cl
    WHERE cl.created_at >= start_date AND cl.created_at <= end_date;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (only if it doesn't exist)
INSERT INTO users (email, password_hash, first_name, last_name, role) 
SELECT 'admin@dialersystem.com', '$2a$12$4aUKc26gPGX/23imWKVYleU42E5QTjiOhBV4r7ErL/a5K7gOG2d86', 'System', 'Admin', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@dialersystem.com');

-- Insert sample data for testing (only if they don't exist)
INSERT INTO users (email, password_hash, first_name, last_name, role) 
SELECT 'user1@dialersystem.com', '$2a$12$4aUKc26gPGX/23imWKVYleU42E5QTjiOhBV4r7ErL/a5K7gOG2d86', 'John', 'Doe', 'user'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'user1@dialersystem.com');

INSERT INTO users (email, password_hash, first_name, last_name, role) 
SELECT 'user2@dialersystem.com', '$2a$12$4aUKc26gPGX/23imWKVYleU42E5QTjiOhBV4r7ErL/a5K7gOG2d86', 'Jane', 'Smith', 'user'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'user2@dialersystem.com');

-- Get the user IDs for sample data (only insert clients if users exist and clients don't exist)
DO $$
DECLARE
    admin_id UUID;
    user1_id UUID;
    client_count INTEGER;
BEGIN
    SELECT id INTO admin_id FROM users WHERE email = 'admin@dialersystem.com';
    SELECT id INTO user1_id FROM users WHERE email = 'user1@dialersystem.com';
    SELECT COUNT(*) INTO client_count FROM clients;
    
    -- Only insert sample clients if we have admin user and no clients exist yet
    IF admin_id IS NOT NULL AND client_count = 0 THEN
        INSERT INTO clients (
            box_number, size, contract_no, principal_key_holder, 
            principal_key_holder_id_number, principal_key_holder_email_address,
            telephone_cell, telephone_home, contract_start_date, contract_end_date,
            occupation, notes, created_by, last_updated_by
        ) VALUES
        ('BOX001', 'Large', 'CON001', 'Michael Johnson', '8001015009080', 'michael.johnson@email.com', 
         '+27123456789', '+27987654321', '2024-01-01', '2024-12-31', 'Engineer', 
         'Prefers morning calls', admin_id, admin_id),
        ('BOX002', 'Medium', 'CON002', 'Sarah Williams', '8502025009080', 'sarah.williams@email.com',
         '+27123456790', NULL, '2024-02-01', '2024-12-31', 'Teacher',
         'Available weekdays only', admin_id, admin_id),
        ('BOX003', 'Small', 'CON003', 'David Brown', '8003035009080', 'david.brown@email.com',
         '+27123456791', '+27987654322', '2024-03-01', '2024-12-31', 'Doctor',
         'Emergency contact priority', admin_id, admin_id);
    END IF;
END $$;
