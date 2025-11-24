#!/usr/bin/env node

/**
 * API Route Test Script
 * Tests the basic functionality of API routes before deployment
 */

const https = require('https');
const http = require('http');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const PRODUCTION_BASE = 'https://dialer-rouge.vercel.app';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, {
      method: 'GET',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testHealthCheck(baseUrl) {
  console.log(`\n🔍 Testing Health Check: ${baseUrl}/api/health`);
  
  try {
    const response = await makeRequest(`${baseUrl}/api/health`);
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log('✅ Health check passed');
      console.log(`Environment: ${data.environment}`);
      console.log(`Timestamp: ${data.timestamp}`);
    } else {
      console.log('❌ Health check failed');
      console.log('Response:', response.body);
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }
}

async function testLogin(baseUrl) {
  console.log(`\n🔍 Testing Login: ${baseUrl}/api/auth/login`);
  
  try {
    // Test OPTIONS request (CORS preflight)
    const optionsResponse = await makeRequest(`${baseUrl}/api/auth/login`, {
      method: 'OPTIONS'
    });
    
    console.log(`OPTIONS Status: ${optionsResponse.statusCode}`);
    
    if (optionsResponse.statusCode === 200) {
      console.log('✅ CORS preflight passed');
    } else {
      console.log('⚠️ CORS preflight warning');
    }
    
    // Test POST request
    const loginData = {
      email: 'admin@dialersystem.com',
      password: 'admin123'
    };
    
    const postResponse = await makeRequest(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify(loginData)
    });
    
    console.log(`POST Status: ${postResponse.statusCode}`);
    
    if (postResponse.statusCode === 200) {
      const data = JSON.parse(postResponse.body);
      console.log('✅ Login endpoint working');
      console.log(`User: ${data.user?.email || 'Unknown'}`);
    } else if (postResponse.statusCode === 401) {
      console.log('✅ Login endpoint responding (credentials may be invalid)');
    } else if (postResponse.statusCode === 405) {
      console.log('❌ Method Not Allowed - This is the error we need to fix!');
    } else {
      console.log('⚠️ Unexpected response');
      console.log('Response:', postResponse.body);
    }
    
  } catch (error) {
    console.log('❌ Login test error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 API Route Testing Script');
  console.log('=============================');
  
  // Test local development server
  if (process.argv.includes('--local')) {
    await testHealthCheck(API_BASE);
    await testLogin(API_BASE);
  }
  
  // Test production deployment
  if (process.argv.includes('--production')) {
    await testHealthCheck(PRODUCTION_BASE);
    await testLogin(PRODUCTION_BASE);
  }
  
  // Default: test both
  if (!process.argv.includes('--local') && !process.argv.includes('--production')) {
    console.log('\n📍 Testing Local Development:');
    await testHealthCheck(API_BASE);
    await testLogin(API_BASE);
    
    console.log('\n📍 Testing Production Deployment:');
    await testHealthCheck(PRODUCTION_BASE);
    await testLogin(PRODUCTION_BASE);
  }
  
  console.log('\n✨ Testing Complete');
}

runTests().catch(console.error);