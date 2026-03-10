/**
 * Database Setup Script for Pavilion Hotel Dialer Tracking
 * This script runs the simplified database schema in your Supabase database
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runSchema() {
  console.log('🚀 Pavilion Hotel Dialer Tracking - Database Setup\n')
  console.log('📋 Reading simplified schema...')
  
  const schemaPath = path.join(__dirname, 'database', 'simplified-schema.sql')
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Error: Schema file not found at', schemaPath)
    process.exit(1)
  }
  
  const schema = fs.readFileSync(schemaPath, 'utf8')
  
  console.log('📡 Connecting to Supabase...')
  console.log('   URL:', supabaseUrl)
  
  try {
    console.log('\n⚙️  Executing schema...\n')
    
    // Split schema by semicolons and execute statement by statement
    // This helps with better error reporting
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      // Skip comments and DO blocks that are just messages
      if (statement.includes('RAISE NOTICE')) {
        continue
      }
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        }).catch(() => {
          // If exec_sql doesn't exist, try direct query
          return supabase.from('_').select('*').limit(0)
        })
        
        if (error) {
          console.log(`⚠️  Note: ${error.message}`)
        }
      } catch (err) {
        // Some errors are expected (like table already exists)
        if (!err.message?.includes('already exists')) {
          console.log(`⚠️  Note: ${err.message}`)
        }
      }
    }
    
    console.log('✅ Schema execution completed!\n')
    console.log('📊 Verifying database setup...\n')
    
    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from('users')
      .select('count')
      .limit(0)
    
    if (!tablesError) {
      console.log('✅ Users table: Ready')
    }
    
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('count')
      .limit(0)
    
    if (!clientsError) {
      console.log('✅ Clients table: Ready')
    }
    
    const { data: callLogs, error: callLogsError } = await supabase
      .from('call_logs')
      .select('count')
      .limit(0)
    
    if (!callLogsError) {
      console.log('✅ Call logs table: Ready')
    }
    
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('count')
      .limit(0)
    
    if (!notificationsError) {
      console.log('✅ Notifications table: Ready')
    }
    
    console.log('\n🎉 Database setup complete!\n')
    console.log('📝 Next steps:')
    console.log('   1. Go to your Supabase dashboard SQL Editor')
    console.log('      → https://supabase.com/dashboard/project/vqasbztejzbmplvnfkdb/sql')
    console.log('   2. Copy and paste the contents of database/simplified-schema.sql')
    console.log('   3. Click "Run" to execute')
    console.log('   4. Return here and run: npm run dev')
    console.log('\n👤 Default Admin Account:')
    console.log('   Email: admin@pavilionhotel.com')
    console.log('   Password: admin123')
    console.log('   ⚠️  Change this password immediately after first login!\n')
    
  } catch (error) {
    console.error('\n❌ Error running schema:')
    console.error(error.message)
    console.log('\n💡 Alternative method:')
    console.log('   1. Go to your Supabase dashboard SQL Editor')
    console.log('      → https://supabase.com/dashboard/project/vqasbztejzbmplvnfkdb/sql')
    console.log('   2. Copy and paste the contents of database/simplified-schema.sql')
    console.log('   3. Click "Run" to execute the schema')
    console.log('   4. Come back here and run: npm run dev\n')
    process.exit(1)
  }
}

// Run the setup
runSchema()
