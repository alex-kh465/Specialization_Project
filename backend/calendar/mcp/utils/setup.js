import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupCalendarMCP() {
  console.log('🔧 Setting up Calendar MCP Implementation\n');

  try {
    // 1. Check if OAuth credentials exist
    const credentialsPath = path.join(__dirname, '..', 'google-calendar-mcp', 'gcp-oauth.keys.json');
    console.log('1️⃣ Checking OAuth credentials...');
    
    try {
      await fs.access(credentialsPath);
      console.log('✅ OAuth credentials found');
    } catch (error) {
      console.log('❌ OAuth credentials not found at:', credentialsPath);
      console.log('   Please copy your Google OAuth credentials to this location');
      return false;
    }

    // 2. Check for existing tokens
    console.log('\n2️⃣ Checking for existing tokens...');
    const tokenPaths = [
      path.join(__dirname, 'tokens.json'),
      path.join(__dirname, '..', 'google-calendar-mcp', '.tokens.json'),
      path.join(__dirname, '..', '..', '.google-tokens.json')
    ];

    let tokensFound = false;
    for (const tokenPath of tokenPaths) {
      try {
        await fs.access(tokenPath);
        console.log('✅ Found tokens at:', tokenPath);
        tokensFound = true;
        break;
      } catch (error) {
        // Token file doesn't exist, continue checking
      }
    }

    if (!tokensFound) {
      console.log('❌ No authentication tokens found');
      console.log('   Run authentication first: node auth.js');
      return false;
    }

    // 3. Test credentials loading
    console.log('\n3️⃣ Testing credentials loading...');
    try {
      const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
      const hasClientId = !!(credentials.web?.client_id || credentials.installed?.client_id);
      const hasClientSecret = !!(credentials.web?.client_secret || credentials.installed?.client_secret);
      const hasRedirectUris = !!(credentials.web?.redirect_uris || credentials.installed?.redirect_uris);

      if (hasClientId && hasClientSecret && hasRedirectUris) {
        console.log('✅ OAuth credentials are valid');
      } else {
        console.log('❌ OAuth credentials are incomplete');
        console.log(`   Client ID: ${hasClientId ? '✅' : '❌'}`);
        console.log(`   Client Secret: ${hasClientSecret ? '✅' : '❌'}`);
        console.log(`   Redirect URIs: ${hasRedirectUris ? '✅' : '❌'}`);
        return false;
      }
    } catch (error) {
      console.log('❌ Failed to load credentials:', error.message);
      return false;
    }

    // 4. Check dependencies
    console.log('\n4️⃣ Checking dependencies...');
    try {
      const packagePath = path.join(__dirname, 'package.json');
      await fs.access(packagePath);
      console.log('✅ Package.json found');
      
      // Check if node_modules exists
      const nodeModulesPath = path.join(__dirname, 'node_modules');
      try {
        await fs.access(nodeModulesPath);
        console.log('✅ Dependencies installed');
      } catch (error) {
        console.log('❌ Dependencies not installed');
        console.log('   Run: npm install');
        return false;
      }
    } catch (error) {
      console.log('❌ Package.json not found');
      return false;
    }

    console.log('\n🎉 Setup verification completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. If not authenticated, run: node auth.js');
    console.log('2. Test the implementation: node test.js');
    console.log('3. Start the backend server to use API endpoints');

    return true;

  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupCalendarMCP().then(success => {
    if (!success) {
      process.exit(1);
    }
  }).catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

export { setupCalendarMCP };
