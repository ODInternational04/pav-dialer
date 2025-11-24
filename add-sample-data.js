// Quick script to add sample data for testing
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addSampleData() {
  console.log('🚀 Adding sample data for testing...')
  
  try {
    // Check if users exist
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .limit(5)
    
    console.log('📊 Found users:', users?.length || 0)
    
    if (users && users.length > 0) {
      // Check if clients exist
      const { data: clients } = await supabase
        .from('clients')
        .select('id, principal_key_holder, telephone_cell')
        .limit(5)
      
      console.log('📊 Found clients:', clients?.length || 0)
      
      if (clients && clients.length > 0) {
        // Add some sample call logs
        const now = new Date()
        const sampleCalls = []
        
        for (let i = 0; i < 10; i++) {
          const callDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)) // Last 10 days
          const user = users[Math.floor(Math.random() * users.length)]
          const client = clients[Math.floor(Math.random() * clients.length)]
          const statuses = ['completed', 'missed', 'declined', 'busy', 'no_answer']
          const status = statuses[Math.floor(Math.random() * statuses.length)]
          
          sampleCalls.push({
            user_id: user.id,
            client_id: client.id,
            call_status: status,
            call_type: 'outbound',
            call_duration: status === 'completed' ? Math.floor(Math.random() * 300) + 30 : 0,
            notes: `Sample call ${i + 1} - ${status}`,
            created_at: callDate.toISOString(),
            callback_requested: Math.random() > 0.7,
            callback_time: Math.random() > 0.5 ? new Date(callDate.getTime() + 24 * 60 * 60 * 1000).toISOString() : null
          })
        }
        
        // Insert sample calls
        const { data: insertedCalls, error } = await supabase
          .from('call_logs')
          .insert(sampleCalls)
          .select()
        
        if (error) {
          console.error('❌ Error inserting sample calls:', error)
        } else {
          console.log('✅ Added sample calls:', insertedCalls?.length || 0)
        }
      } else {
        console.log('⚠️ No clients found - cannot create sample calls')
      }
    } else {
      console.log('⚠️ No users found - cannot create sample calls')
    }
    
    // Check final data counts
    const { data: callLogsCount } = await supabase
      .from('call_logs')
      .select('id', { count: 'exact' })
    
    console.log('📈 Total call logs now:', callLogsCount?.length || 0)
    
  } catch (error) {
    console.error('❌ Error adding sample data:', error)
  }
}

if (require.main === module) {
  addSampleData()
}

module.exports = { addSampleData }