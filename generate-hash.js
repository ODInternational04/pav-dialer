const bcrypt = require('bcryptjs')

const password = 'admin123'
const saltRounds = 10 // Match the $10 in the SQL file

console.log('Generating bcrypt hash for:', password)
console.log('Salt rounds:', saltRounds)

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error:', err)
    return
  }
  console.log('\nGenerated hash:')
  console.log(hash)
  
  // Verify it works
  bcrypt.compare(password, hash, (err, result) => {
    if (err) {
      console.error('Verification error:', err)
      return
    }
    console.log('\nVerification test:', result ? '✅ PASS' : '❌ FAIL')
  })
  
  // Test the existing hash from SQL file
  const existingHash = '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.E1OqV7E.Tm6cDRGzyVJTYqvLqCjBVMK'
  console.log('\nTesting existing hash from SQL file:')
  console.log(existingHash)
  
  bcrypt.compare(password, existingHash, (err, result) => {
    if (err) {
      console.error('Existing hash verification error:', err)
      return
    }
    console.log('Existing hash verification:', result ? '✅ PASS' : '❌ FAIL')
  })
})
