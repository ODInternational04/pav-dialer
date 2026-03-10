// Test login API
const testLogin = async () => {
  console.log('🧪 Testing login API...\n');
  
  const credentials = {
    email: 'admin@pavilionhotel.com',
    password: 'admin123'
  };
  
  console.log('Credentials:');
  console.log('  Email:', credentials.email);
  console.log('  Password:', credentials.password);
  console.log();
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    
    console.log('Response Status:', response.status, response.statusText);
    console.log();
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('\nUser data:');
      console.log(JSON.stringify(data.user, null, 2));
      console.log('\nToken:', data.token.substring(0, 50) + '...');
    } else {
      console.log('❌ Login failed!');
      console.log('\nError response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
};

testLogin();
