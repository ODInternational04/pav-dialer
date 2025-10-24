-- Clean up script for Supabase - Run this first if you have existing tables
-- This will remove all existing tables and types so we can start fresh

-- Drop tables first (in correct order due to foreign key constraints)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS call_logs CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop views
DROP VIEW IF EXISTS call_statistics CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS call_type CASCADE;
DROP TYPE IF EXISTS call_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;