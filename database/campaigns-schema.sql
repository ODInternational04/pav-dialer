-- Campaign System Database Schema
-- Run this in your Supabase SQL editor after the main schema

-- Create enum for campaign status
DO $$ BEGIN
    CREATE TYPE campaign_status AS ENUM ('active', 'inactive', 'completed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    department VARCHAR(100), -- e.g., 'gold', 'vaults', 'general'
    status campaign_status DEFAULT 'active' NOT NULL,
    criteria JSONB, -- Store filtering criteria like {"size": ["Large", "Medium"], "gender": "female"}
    client_fields JSONB, -- Per-campaign custom client fields schema
    target_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    start_date DATE,
    end_date DATE
);

-- User campaign assignments (many-to-many)
CREATE TABLE IF NOT EXISTS user_campaign_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, campaign_id)
);

-- Add campaign_id to clients table
DO $$ BEGIN
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'unknown'));
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS custom_fields JSONB; -- Dynamic fields per campaign
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_department ON campaigns(department);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_user_campaign_assignments_user_id ON user_campaign_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_campaign_assignments_campaign_id ON user_campaign_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_user_campaign_assignments_assigned_by ON user_campaign_assignments(assigned_by);

CREATE INDEX IF NOT EXISTS idx_clients_campaign_id ON clients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_clients_gender ON clients(gender);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_custom_fields ON clients USING GIN (custom_fields);

-- Trigger for updated_at on campaigns
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get user's assigned campaigns
CREATE OR REPLACE FUNCTION get_user_campaigns(p_user_id UUID)
RETURNS TABLE (
    campaign_id UUID,
    campaign_name VARCHAR,
    campaign_description TEXT,
    department VARCHAR,
    status campaign_status,
    total_clients BIGINT,
    assigned_clients BIGINT,
    completed_calls BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as campaign_id,
        c.name as campaign_name,
        c.description as campaign_description,
        c.department,
        c.status,
        COUNT(DISTINCT cl.id) as total_clients,
        COUNT(DISTINCT CASE WHEN cl.assigned_to = p_user_id THEN cl.id END) as assigned_clients,
        COUNT(DISTINCT callog.id) as completed_calls
    FROM campaigns c
    INNER JOIN user_campaign_assignments uca ON c.id = uca.campaign_id
    LEFT JOIN clients cl ON c.id = cl.campaign_id
    LEFT JOIN call_logs callog ON cl.id = callog.client_id AND callog.user_id = p_user_id
    WHERE uca.user_id = p_user_id
    GROUP BY c.id, c.name, c.description, c.department, c.status
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get campaign statistics
CREATE OR REPLACE FUNCTION get_campaign_statistics(p_campaign_id UUID)
RETURNS TABLE (
    total_clients BIGINT,
    called_clients BIGINT,
    uncalled_clients BIGINT,
    total_calls BIGINT,
    completed_calls BIGINT,
    success_rate NUMERIC,
    assigned_users BIGINT,
    average_calls_per_client NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT CASE WHEN c.has_been_called = true THEN c.id END) as called_clients,
        COUNT(DISTINCT CASE WHEN c.has_been_called = false OR c.has_been_called IS NULL THEN c.id END) as uncalled_clients,
        COUNT(cl.id) as total_calls,
        COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END) as completed_calls,
        CASE 
            WHEN COUNT(cl.id) > 0 THEN 
                ROUND((COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END)::DECIMAL / COUNT(cl.id)) * 100, 2)
            ELSE 0 
        END as success_rate,
        COUNT(DISTINCT uca.user_id) as assigned_users,
        CASE 
            WHEN COUNT(DISTINCT c.id) > 0 THEN 
                ROUND(COUNT(cl.id)::DECIMAL / COUNT(DISTINCT c.id), 2)
            ELSE 0 
        END as average_calls_per_client
    FROM campaigns cam
    LEFT JOIN clients c ON cam.id = c.campaign_id
    LEFT JOIN call_logs cl ON c.id = cl.client_id
    LEFT JOIN user_campaign_assignments uca ON cam.id = uca.campaign_id
    WHERE cam.id = p_campaign_id
    GROUP BY cam.id;
END;
$$ LANGUAGE plpgsql;

-- Function to get clients for user based on campaign assignments
CREATE OR REPLACE FUNCTION get_user_accessible_clients(p_user_id UUID)
RETURNS TABLE (
    client_id UUID,
    campaign_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as client_id,
        c.campaign_id
    FROM clients c
    INNER JOIN campaigns camp ON c.campaign_id = camp.id
    INNER JOIN user_campaign_assignments uca ON camp.id = uca.campaign_id
    WHERE uca.user_id = p_user_id
    AND camp.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Sample campaign data (only if no campaigns exist)
DO $$
DECLARE
    admin_user_id UUID;
    campaign_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO campaign_count FROM campaigns;
    
    -- Only insert if no campaigns exist
    IF campaign_count = 0 THEN
        -- Get admin user
        SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
        
        IF admin_user_id IS NOT NULL THEN
            -- Create sample campaigns
            INSERT INTO campaigns (name, description, department, status, created_by, start_date)
            VALUES 
                ('Gold Members Campaign', 'Premium client outreach for gold membership holders', 'gold', 'active', admin_user_id, CURRENT_DATE),
                ('Vault Services Campaign', 'Contact vault storage clients for renewals', 'vaults', 'active', admin_user_id, CURRENT_DATE),
                ('General Outreach', 'General customer outreach campaign', 'general', 'active', admin_user_id, CURRENT_DATE);
            
            -- You can assign existing clients to campaigns manually or via CSV import
            RAISE NOTICE 'Sample campaigns created. Use CSV import or manual assignment to add clients to campaigns.';
        END IF;
    END IF;
END $$;
