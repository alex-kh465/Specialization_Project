#!/usr/bin/env node

/**
 * Quick test to verify the ISO 8601 search fix
 */

// Generate a valid JWT token for testing (you'll need to replace this)
function generateTestToken() {
  // This is a placeholder - you'll need to use a real JWT token
  // You can get one by logging into your app and copying it from browser dev tools
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_token_here';
}

async function testSearchEndpoint() {
  const baseUrl = 'http://localhost:4000';
  const token = generateTestToken();
  
  try {
    console.log('🔍 Testing calendar search endpoint...');
    
    const response = await fetch(`${baseUrl}/calendar/mcp/events/search?query=test`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log('📥 Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Search endpoint working correctly!');
    } else if (response.status === 401) {
      console.log('🔑 Authentication required - please update the JWT token in the script');
    } else {
      console.log('❌ Search endpoint returned an error');
    }
    
  } catch (error) {
    console.error('❌ Error testing search endpoint:', error.message);
  }
}

async function testHealthEndpoint() {
  const baseUrl = 'http://localhost:4000';
  const token = generateTestToken();
  
  try {
    console.log('🏥 Testing calendar health endpoint...');
    
    const response = await fetch(`${baseUrl}/calendar/mcp/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log('📥 Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 200 && data.status === 'connected') {
      console.log('✅ Calendar service is healthy and connected!');
    } else {
      console.log('⚠️ Calendar service may need attention');
    }
    
  } catch (error) {
    console.error('❌ Error testing health endpoint:', error.message);
  }
}

async function main() {
  console.log('🚀 Quick Calendar MCP Test');
  console.log('=' .repeat(40));
  
  await testHealthEndpoint();
  await testSearchEndpoint();
  
  console.log('\n📝 Instructions:');
  console.log('1. If you see a 401 error, update the JWT token in this script');
  console.log('2. You can get a valid JWT token by:');
  console.log('   - Logging into your frontend app');
  console.log('   - Opening browser dev tools (F12)');
  console.log('   - Going to Application/Storage > localStorage');
  console.log('   - Copying the value of the "token" key');
  console.log('3. Replace the generateTestToken() function return value with your real token');
}

main().catch(console.error);
