#!/usr/bin/env node

/**
 * Calendar Integration Setup Test Script
 * This script helps verify that the calendar integration is properly set up
 */

import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking Calendar Integration Setup...\n');

// Check 1: MCP Server Build
const mcpServerPath = path.join(__dirname, 'calendar', 'google-calendar-mcp', 'build', 'index.js');
const mcpServerExists = existsSync(mcpServerPath);

console.log(`1. MCP Server Build: ${mcpServerExists ? '✅ Found' : '❌ Missing'}`);
if (!mcpServerExists) {
  console.log('   📋 To fix: Run "cd backend/calendar/google-calendar-mcp && npm run build"');
}

// Check 2: OAuth Credentials
const credentialsPath = path.join(__dirname, 'calendar', 'google-calendar-mcp', 'gcp-oauth.keys.json');
const credentialsExist = existsSync(credentialsPath);

console.log(`2. OAuth Credentials: ${credentialsExist ? '✅ Found' : '❌ Missing'}`);
if (!credentialsExist) {
  console.log('   📋 To fix: Follow GOOGLE_CALENDAR_SETUP.md to create OAuth credentials');
}

// Check 3: Node Modules
const nodeModulesPath = path.join(__dirname, 'calendar', 'google-calendar-mcp', 'node_modules');
const nodeModulesExist = existsSync(nodeModulesPath);

console.log(`3. MCP Dependencies: ${nodeModulesExist ? '✅ Installed' : '❌ Missing'}`);
if (!nodeModulesExist) {
  console.log('   📋 To fix: Run "cd backend/calendar/google-calendar-mcp && npm install"');
}

// Check 4: Environment Variables
const hasGroqKey = !!process.env.GROQ_API_KEY;
const hasSupabaseUrl = !!process.env.SUPABASE_URL;
const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasJwtSecret = !!process.env.SUPABASE_JWT_SECRET;

console.log(`4. Environment Variables:`);
console.log(`   - GROQ_API_KEY: ${hasGroqKey ? '✅ Set' : '❌ Missing'}`);
console.log(`   - SUPABASE_URL: ${hasSupabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`   - SUPABASE_SERVICE_ROLE_KEY: ${hasSupabaseKey ? '✅ Set' : '❌ Missing'}`);
console.log(`   - SUPABASE_JWT_SECRET: ${hasJwtSecret ? '✅ Set' : '❌ Missing'}`);

// Summary
const allChecks = [mcpServerExists, credentialsExist, nodeModulesExist, hasGroqKey, hasSupabaseUrl, hasSupabaseKey, hasJwtSecret];
const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log(`\n📊 Setup Status: ${passedChecks}/${totalChecks} checks passed`);

if (passedChecks === totalChecks) {
  console.log('🎉 All setup checks passed! Your calendar integration should work.');
  console.log('\n🚀 Next steps:');
  console.log('   1. Start the backend server: npm start');
  console.log('   2. Start the frontend: cd ../frontend && npm start');
  console.log('   3. Visit the calendar page and click "Connect Google Calendar"');
  console.log('   4. Follow the authentication URL in your terminal');
} else {
  console.log('⚠️  Some setup issues found. Please resolve them before proceeding.');
  console.log('\n📚 Documentation:');
  console.log('   - Calendar Setup: GOOGLE_CALENDAR_SETUP.md');
  console.log('   - MCP Setup: MCP_CALENDAR_SETUP.md');
}

console.log('\n🔧 Quick Setup Commands:');
console.log('   cd backend/calendar/google-calendar-mcp');
console.log('   npm install');
console.log('   npm run build');
console.log('   # Then configure OAuth credentials as per documentation');
