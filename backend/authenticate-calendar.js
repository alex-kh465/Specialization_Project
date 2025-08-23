import { OAuth2Client } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import url from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function authenticateCalendar() {
  try {
    console.log('🚀 Starting Google Calendar Authentication...\n');

    // Load OAuth2 credentials
    const credentialsPath = path.join(__dirname, 'calendar/mcp/config/gcp-oauth.keys.json');
    const tokenPath = path.join(__dirname, 'calendar/mcp/config/tokens.json');

    console.log('📖 Loading OAuth credentials...');
    const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
    const { client_id, client_secret, redirect_uris } = credentials.installed;

    // Create OAuth2 client
    const oauth2Client = new OAuth2Client(client_id, client_secret, redirect_uris[0]);

    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      prompt: 'consent'
    });

    console.log('🔐 Authentication URL generated');
    console.log('🌐 Opening browser for authentication...');
    
    // Try to open the URL in the default browser
    try {
      if (process.platform === 'win32') {
        await execAsync(`start "" "${authUrl}"`);
      } else if (process.platform === 'darwin') {
        await execAsync(`open "${authUrl}"`);
      } else {
        await execAsync(`xdg-open "${authUrl}"`);
      }
    } catch (error) {
      console.log('❌ Could not auto-open browser. Please manually open this URL:');
      console.log(`\n${authUrl}\n`);
    }

    console.log('\n📋 Please complete the authentication in your browser and return here.');
    console.log('⚡ Starting local server to capture the authentication callback...\n');

    // Create a promise that resolves when we get the auth code
    const getAuthCode = () => {
      return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
          const parsedUrl = url.parse(req.url, true);
          
          if (parsedUrl.pathname === '/oauth2callback') {
            const code = parsedUrl.query.code;
            
            if (code) {
              // Send success response to browser
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body>
                    <h1>✅ Authentication Successful!</h1>
                    <p>You can now close this window and return to your terminal.</p>
                    <script>setTimeout(() => window.close(), 3000);</script>
                  </body>
                </html>
              `);
              
              server.close();
              resolve(code);
            } else {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body>
                    <h1>❌ Authentication Failed</h1>
                    <p>No authorization code received. Please try again.</p>
                  </body>
                </html>
              `);
              server.close();
              reject(new Error('No authorization code received'));
            }
          } else {
            res.writeHead(404);
            res.end('Not found');
          }
        });

        server.listen(3503, () => {
          console.log('🎯 Callback server listening on http://localhost:3503');
        });

        // Timeout after 5 minutes
        setTimeout(() => {
          server.close();
          reject(new Error('Authentication timeout'));
        }, 300000);
      });
    };

    // Wait for the authorization code
    const code = await getAuthCode();
    console.log('✅ Authorization code received!');

    // Exchange code for tokens
    console.log('🔄 Exchanging authorization code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    
    // Set credentials
    oauth2Client.setCredentials(tokens);

    // Save tokens to file
    await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));
    console.log(`💾 Tokens saved to: ${tokenPath}`);

    // Also save to backup location
    const backupTokenPath = path.join(__dirname, 'calendar/.google-tokens.json');
    try {
      await fs.writeFile(backupTokenPath, JSON.stringify(tokens, null, 2));
      console.log(`💾 Backup tokens saved to: ${backupTokenPath}`);
    } catch (error) {
      console.log('⚠️  Could not save backup tokens (this is OK)');
    }

    console.log('\n🎉 Google Calendar authentication completed successfully!');
    console.log('🚀 You can now use the calendar features in your application.');
    
    // Test the authentication by making a simple API call
    console.log('\n🧪 Testing authentication...');
    const { google } = await import('googleapis');
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    try {
      const response = await calendar.calendarList.list();
      console.log(`✅ Test successful! Found ${response.data.items?.length || 0} calendars.`);
    } catch (testError) {
      console.log('⚠️  Authentication saved but test failed:', testError.message);
      console.log('   This might be due to API permissions. Try running your app now.');
    }

  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    process.exit(1);
  }
}

// Run the authentication
authenticateCalendar().catch(console.error);
