// Quick test to verify password hash
const bcrypt = require('bcryptjs');

// The hash from the database for admin@pavilionhotel.com
const dbHash = '$2a$10$e4/da0TQ77hADP2ZBF8T6O9.QrGPGZZ7knHzircgUsax8T5n/qIgS';
const password = 'admin123';

console.log('Testing password verification...\n');

// Test the verification
bcrypt.compare(password, dbHash, (err, result) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }
  
  console.log(`Password: "${password}"`);
  console.log(`Hash: ${dbHash}`);
  console.log(`Match: ${result ? '✅ YES' : '❌ NO'}`);
  
  if (!result) {
    console.log('\n⚠️  Password does not match! Let\'s generate a new hash...\n');
    
    // Generate new hash
    bcrypt.hash(password, 10, (err, newHash) => {
      if (err) {
        console.error('Error generating hash:', err);
        return;
      }
      
      console.log('New hash for "admin123":');
      console.log(newHash);
      console.log('\nRun this SQL in Supabase:');
      console.log(`UPDATE users SET password_hash = '${newHash}' WHERE email = 'admin@pavilionhotel.com';`);
    });
  }
});
