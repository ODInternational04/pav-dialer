-- Sample Data for Testing Reports
-- Run this after setting up the main schema

-- Insert sample call logs for testing (only if no call logs exist)
DO $$
DECLARE
    user1_id UUID;
    user2_id UUID;
    client1_id UUID;
    client2_id UUID;
    client3_id UUID;
    call_log_count INTEGER;
BEGIN
    -- Get user IDs
    SELECT id INTO user1_id FROM users WHERE email = 'user1@dialersystem.com';
    SELECT id INTO user2_id FROM users WHERE email = 'user2@dialersystem.com';
    
    -- Get client IDs
    SELECT id INTO client1_id FROM clients WHERE box_number = 'BOX001';
    SELECT id INTO client2_id FROM clients WHERE box_number = 'BOX002';
    SELECT id INTO client3_id FROM clients WHERE box_number = 'BOX003';
    
    -- Check if call logs already exist
    SELECT COUNT(*) INTO call_log_count FROM call_logs;
    
    -- Only insert if we have the required data and no call logs exist
    IF user1_id IS NOT NULL AND user2_id IS NOT NULL AND 
       client1_id IS NOT NULL AND client2_id IS NOT NULL AND client3_id IS NOT NULL AND
       call_log_count = 0 THEN
       
        -- Insert sample call logs for the past week
        INSERT INTO call_logs (
            user_id, client_id, call_type, call_status, call_duration, 
            notes, callback_requested, callback_time, created_at
        ) VALUES 
        -- Today's calls
        (user1_id, client1_id, 'outbound', 'completed', 180, 'Successful contact, discussed contract renewal', false, NULL, NOW() - INTERVAL '2 hours'),
        (user2_id, client2_id, 'outbound', 'completed', 120, 'Client requested callback tomorrow', true, NOW() + INTERVAL '1 day', NOW() - INTERVAL '1 hour'),
        (user1_id, client3_id, 'outbound', 'missed', 0, 'No answer, will try again', false, NULL, NOW() - INTERVAL '30 minutes'),
        
        -- Yesterday's calls
        (user1_id, client1_id, 'outbound', 'completed', 240, 'Follow-up call completed successfully', false, NULL, NOW() - INTERVAL '1 day' - INTERVAL '3 hours'),
        (user2_id, client2_id, 'outbound', 'declined', 0, 'Client declined to speak', false, NULL, NOW() - INTERVAL '1 day' - INTERVAL '2 hours'),
        (user1_id, client3_id, 'outbound', 'completed', 300, 'Long discussion about services', false, NULL, NOW() - INTERVAL '1 day' - INTERVAL '1 hour'),
        (user2_id, client1_id, 'outbound', 'missed', 0, 'Voicemail left', true, NOW() + INTERVAL '2 days', NOW() - INTERVAL '1 day'),
        
        -- 2 days ago
        (user1_id, client2_id, 'outbound', 'completed', 150, 'Quick check-in call', false, NULL, NOW() - INTERVAL '2 days' - INTERVAL '4 hours'),
        (user2_id, client3_id, 'outbound', 'completed', 200, 'Policy update discussion', false, NULL, NOW() - INTERVAL '2 days' - INTERVAL '2 hours'),
        (user1_id, client1_id, 'outbound', 'busy', 0, 'Line was busy', false, NULL, NOW() - INTERVAL '2 days' - INTERVAL '1 hour'),
        
        -- 3 days ago
        (user2_id, client2_id, 'outbound', 'completed', 180, 'Contract details clarified', false, NULL, NOW() - INTERVAL '3 days' - INTERVAL '3 hours'),
        (user1_id, client3_id, 'outbound', 'missed', 0, 'No response', true, NOW() + INTERVAL '1 week', NOW() - INTERVAL '3 days' - INTERVAL '2 hours'),
        (user2_id, client1_id, 'outbound', 'completed', 220, 'Successful follow-up', false, NULL, NOW() - INTERVAL '3 days' - INTERVAL '1 hour'),
        
        -- 4 days ago  
        (user1_id, client2_id, 'outbound', 'declined', 0, 'Client was unavailable', false, NULL, NOW() - INTERVAL '4 days' - INTERVAL '4 hours'),
        (user2_id, client3_id, 'outbound', 'completed', 160, 'Brief status update', false, NULL, NOW() - INTERVAL '4 days' - INTERVAL '2 hours'),
        (user1_id, client1_id, 'outbound', 'completed', 280, 'Detailed service discussion', false, NULL, NOW() - INTERVAL '4 days' - INTERVAL '1 hour'),
        
        -- 5 days ago
        (user2_id, client2_id, 'outbound', 'missed', 0, 'Will try again later', false, NULL, NOW() - INTERVAL '5 days' - INTERVAL '3 hours'),
        (user1_id, client3_id, 'outbound', 'completed', 190, 'Regular check-in', false, NULL, NOW() - INTERVAL '5 days' - INTERVAL '2 hours'),
        (user2_id, client1_id, 'outbound', 'busy', 0, 'Busy signal received', false, NULL, NOW() - INTERVAL '5 days' - INTERVAL '1 hour'),
        
        -- 6 days ago
        (user1_id, client2_id, 'outbound', 'completed', 210, 'Payment discussion', false, NULL, NOW() - INTERVAL '6 days' - INTERVAL '4 hours'),
        (user2_id, client3_id, 'outbound', 'completed', 170, 'Service inquiry handled', false, NULL, NOW() - INTERVAL '6 days' - INTERVAL '2 hours'),
        (user1_id, client1_id, 'outbound', 'missed', 0, 'Left detailed message', true, NOW() + INTERVAL '3 days', NOW() - INTERVAL '6 days' - INTERVAL '1 hour'),
        
        -- Last week
        (user2_id, client2_id, 'outbound', 'completed', 250, 'Weekly review call', false, NULL, NOW() - INTERVAL '7 days' - INTERVAL '3 hours'),
        (user1_id, client3_id, 'outbound', 'declined', 0, 'Client requested email instead', false, NULL, NOW() - INTERVAL '7 days' - INTERVAL '2 hours'),
        (user2_id, client1_id, 'outbound', 'completed', 130, 'Quick confirmation call', false, NULL, NOW() - INTERVAL '7 days' - INTERVAL '1 hour'),
        
        -- Older calls for monthly data
        (user1_id, client1_id, 'outbound', 'completed', 200, 'Monthly check-in', false, NULL, NOW() - INTERVAL '10 days'),
        (user2_id, client2_id, 'outbound', 'completed', 180, 'Service renewal', false, NULL, NOW() - INTERVAL '12 days'),
        (user1_id, client3_id, 'outbound', 'missed', 0, 'No answer during business hours', false, NULL, NOW() - INTERVAL '15 days'),
        (user2_id, client1_id, 'outbound', 'completed', 220, 'Quarterly review', false, NULL, NOW() - INTERVAL '18 days'),
        (user1_id, client2_id, 'outbound', 'completed', 160, 'Account update', false, NULL, NOW() - INTERVAL '20 days');
        
        RAISE NOTICE 'Inserted sample call logs successfully!';
    ELSE
        IF call_log_count > 0 THEN
            RAISE NOTICE 'Call logs already exist, skipping sample data insertion.';
        ELSE
            RAISE NOTICE 'Required users or clients not found, cannot insert sample call logs.';
        END IF;
    END IF;
END $$;

-- Insert some callback records
INSERT INTO callbacks (
    user_id, client_id, scheduled_time, notes, is_completed, created_at
)
SELECT 
    cl.user_id,
    cl.client_id,
    cl.callback_time,
    CASE 
        WHEN cl.callback_time < NOW() THEN 'Overdue callback - needs immediate attention'
        ELSE 'Scheduled callback as requested by client'
    END,
    false,
    cl.created_at
FROM call_logs cl
WHERE cl.callback_requested = true AND cl.callback_time IS NOT NULL
ON CONFLICT DO NOTHING;

-- Update call statistics (this will be helpful for reports)
INSERT INTO call_statistics (
    user_id, date, total_calls, completed_calls, missed_calls, 
    declined_calls, busy_calls, no_answer_calls, average_call_duration, success_rate
)
SELECT 
    cl.user_id,
    DATE(cl.created_at) as call_date,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END) as completed_calls,
    COUNT(CASE WHEN cl.call_status = 'missed' THEN 1 END) as missed_calls,
    COUNT(CASE WHEN cl.call_status = 'declined' THEN 1 END) as declined_calls,
    COUNT(CASE WHEN cl.call_status = 'busy' THEN 1 END) as busy_calls,
    COUNT(CASE WHEN cl.call_status = 'no_answer' THEN 1 END) as no_answer_calls,
    AVG(CASE WHEN cl.call_duration > 0 THEN cl.call_duration END) as avg_duration,
    ROUND(
        (COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END)::decimal / COUNT(*)) * 100, 
        2
    ) as success_rate
FROM call_logs cl
WHERE cl.created_at >= NOW() - INTERVAL '30 days'
GROUP BY cl.user_id, DATE(cl.created_at)
ON CONFLICT (user_id, date) DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    completed_calls = EXCLUDED.completed_calls,
    missed_calls = EXCLUDED.missed_calls,
    declined_calls = EXCLUDED.declined_calls,
    busy_calls = EXCLUDED.busy_calls,
    no_answer_calls = EXCLUDED.no_answer_calls,
    average_call_duration = EXCLUDED.average_call_duration,
    success_rate = EXCLUDED.success_rate,
    updated_at = NOW();