-- Add Zoho Bigin custom fields to clients table
-- These fields sync from Zoho Bigin and can be edited in the dialer system
-- Run this in your Supabase SQL Editor

DO $$ 
BEGIN
    -- Add quotation_done column (boolean field)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'quotation_done'
    ) THEN
        ALTER TABLE clients ADD COLUMN quotation_done BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added quotation_done column';
    ELSE
        RAISE NOTICE '⏭️ quotation_done column already exists';
    END IF;

    -- Add booking_status column (text field)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'booking_status'
    ) THEN
        ALTER TABLE clients ADD COLUMN booking_status VARCHAR(100);
        RAISE NOTICE '✅ Added booking_status column';
    ELSE
        RAISE NOTICE '⏭️ booking_status column already exists';
    END IF;

    RAISE NOTICE '✅ Zoho custom fields migration completed successfully';
END $$;

-- Create index for booking_status for faster filtering
CREATE INDEX IF NOT EXISTS idx_clients_booking_status ON clients(booking_status);
CREATE INDEX IF NOT EXISTS idx_clients_quotation_done ON clients(quotation_done);

-- Show confirmation
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' 
  AND column_name IN ('quotation_done', 'booking_status')
ORDER BY column_name;
