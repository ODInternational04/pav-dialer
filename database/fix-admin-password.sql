-- Fix the admin password hash
-- Run this in your Supabase SQL Editor

UPDATE users 
SET password_hash = '$2a$10$e4/da0TQ77hADP2ZBF8T6O9.QrGPGZZ7knHzircgUsax8T5n/qIgS'
WHERE email = 'admin@pavilionhotel.com';

-- Verify the update
SELECT email, role, is_active, created_at 
FROM users 
WHERE email = 'admin@pavilionhotel.com';
