-- Pavilion Hotel Dialer Tracking - Simplified Database Schema
-- Simple, focused schema for call tracking and client management
-- Run this in your Supabase SQL editor

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;

-- Create enum types
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

-- Users table
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

-- Simplified Clients table - Only essential fields
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    last_updated_by UUID NOT NULL REFERENCES users(id)
);

-- Call logs table with feedback
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    call_type call_type NOT NULL,
    call_status call_status NOT NULL,
    call_duration INTEGER, -- in seconds
    notes TEXT DEFAULT '',
    feedback TEXT DEFAULT '', -- Customer feedback/comments during call
    callback_requested BOOLEAN DEFAULT false NOT NULL,
    callback_time TIMESTAMP WITH TIME ZONE,
    call_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    call_ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Notifications table for callbacks
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

-- Add foreign key for current call tracking
ALTER TABLE users 
ADD CONSTRAINT fk_users_current_call_client 
FOREIGN KEY (current_call_client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_call_logs_client_id ON call_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_callback ON call_logs(callback_requested, callback_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_users_is_on_call ON users(is_on_call);
CREATE INDEX IF NOT EXISTS idx_users_current_call ON users(current_call_client_id);

-- Add compound indexes for common query patterns (performance boost)
CREATE INDEX IF NOT EXISTS idx_call_logs_user_status ON call_logs(user_id, call_status);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_created ON call_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_client_created ON call_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_callback_user ON call_logs(callback_requested, user_id, callback_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_scheduled ON notifications(user_id, is_read, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_clients_search ON clients USING gin(to_tsvector('english', name || ' ' || phone || ' ' || COALESCE(email, '')));

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
-- Change this password immediately after first login!
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
VALUES (
    'admin@pavilionhotel.com',
    '$2a$10$e4/da0TQ77hADP2ZBF8T6O9.QrGPGZZ7knHzircgUsax8T5n/qIgS', -- admin123
    'Admin',
    'User',
    'admin',
    true
)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ Pavilion Hotel Dialer Tracking schema created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Simplified Client Fields:';
    RAISE NOTICE '   - Name';
    RAISE NOTICE '   - Phone';
    RAISE NOTICE '   - Email';
    RAISE NOTICE '   - Notes';
    RAISE NOTICE '';
    RAISE NOTICE '📞 Call Features:';
    RAISE NOTICE '   - Call logging with feedback';
    RAISE NOTICE '   - Callback scheduling';
    RAISE NOTICE '   - Notifications';
    RAISE NOTICE '';
    RAISE NOTICE '👤 Default Admin Login:';
    RAISE NOTICE '   Email: admin@pavilionhotel.com';
    RAISE NOTICE '   Password: admin123';
    RAISE NOTICE '   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!';
END $$;
