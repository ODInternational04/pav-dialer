// Simple test script to check reports API
// Run this in browser console while logged in as admin

async function testReportsAPI() {
  try {
    const token = localStorage.getItem('token');
    console.log('Token found:', !!token);
    
    if (!token) {
      console.error('No token found. Please log in first.');
      return;
    }

    const response = await fetch('/api/reports?reportType=weekly', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (response.ok) {
      const data = await response.json();
      console.log('API Response:', data);
      
      // Check for data
      console.log('User Stats:', data.userStats?.length || 0, 'users');
      console.log('System Stats:', data.systemStats);
      console.log('Call Logs:', data.detailedCallLogs?.length || 0, 'calls');
      console.log('Client Interactions:', data.clientInteractions?.length || 0, 'clients');
      
    } else {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Run the test
testReportsAPI();