import { googleCalendarAPI } from './google-calendar.js';
import http from 'http';
import url from 'url';
import open from 'open';
import fs from 'fs/promises';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

async function authenticateGoogleCalendar() {
  console.log('Starting Google Calendar authentication...');

  try {
    // Initialize the API
    await googleCalendarAPI.initialize();

    if (googleCalendarAPI.isAuthenticated) {
      console.log('Already authenticated!');
      return true;
    }

    // Generate auth URL
    const authUrl = googleCalendarAPI.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      prompt: 'consent'
    });

    console.log('Visit this URL to authenticate:');
    console.log(authUrl);

    // Start local server to receive OAuth callback
    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);
      
      if (parsedUrl.pathname === '/oauth/callback') {
        const { code } = parsedUrl.query;
        
        if (code) {
          try {
            // Exchange authorization code for tokens
            const { tokens } = await googleCalendarAPI.oauth2Client.getToken(code);
            
            // Set the tokens
            await googleCalendarAPI.setTokens(tokens);
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body>
                  <h1>Authentication Successful!</h1>
                  <p>You can now close this window and return to your application.</p>
                  <script>window.close();</script>
                </body>
              </html>
            `);
            
            console.log('Authentication successful!');
            server.close();
            
          } catch (error) {
            console.error('Error exchanging code for tokens:', error);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body>
                  <h1>Authentication Failed</h1>
                  <p>Error: ${error.message}</p>
                </body>
              </html>
            `);
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>Authentication Failed</h1>
                <p>No authorization code received.</p>
              </body>
            </html>
          `);
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      }
    });

    // Start server on available port
    const startServer = (port) => {
      return new Promise((resolve, reject) => {
        server.listen(port, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`OAuth callback server running on http://localhost:${port}`);
            resolve(port);
          }
        });
      });
    };

    let serverPort = 3000;
    let serverStarted = false;
    
    // Try ports 3000-3010
    for (let port = 3000; port <= 3010; port++) {
      try {
        serverPort = await startServer(port);
        serverStarted = true;
        break;
      } catch (error) {
        if (port === 3010) {
          throw new Error('Could not start OAuth callback server. All ports 3000-3010 are in use.');
        }
      }
    }

    if (!serverStarted) {
      throw new Error('Failed to start OAuth callback server');
    }

    // Update redirect URI for this session
    const redirectUri = `http://localhost:${serverPort}/oauth/callback`;
    googleCalendarAPI.oauth2Client.redirectUri = redirectUri;

    // Generate new auth URL with correct redirect URI
    const finalAuthUrl = googleCalendarAPI.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      prompt: 'consent',
      redirect_uri: redirectUri
    });

    console.log('\\nUpdated authentication URL:');
    console.log(finalAuthUrl);

    // Try to open browser automatically
    try {
      await open(finalAuthUrl);
      console.log('\\nOpened authentication URL in your default browser.');
    } catch (error) {
      console.log('\\nCould not open browser automatically. Please copy and paste the URL above.');
    }

    // Wait for authentication to complete
    return new Promise((resolve) => {
      const checkAuth = setInterval(() => {
        if (googleCalendarAPI.isAuthenticated) {
          clearInterval(checkAuth);
          console.log('Google Calendar authentication completed successfully!');
          resolve(true);
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkAuth);
        server.close();
        console.log('Authentication timeout. Please try again.');
        resolve(false);
      }, 300000);
    });

  } catch (error) {
    console.error('Authentication failed:', error);
    return false;
  }
}

// Test the authentication
async function testAuthentication() {
  console.log('Testing Google Calendar API access...');
  
  try {
    const result = await googleCalendarAPI.listCalendars();
    
    if (result.success) {
      console.log('✅ Authentication test successful!');
      console.log(`Found ${result.calendars.length} calendar(s):`);
      result.calendars.forEach(cal => {
        console.log(`  - ${cal.summary}${cal.primary ? ' (Primary)' : ''}`);
      });
      return true;
    } else {
      console.log('❌ Authentication test failed:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Authentication test failed:', error.message);
    return false;
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    // Test existing authentication
    await googleCalendarAPI.initialize();
    if (googleCalendarAPI.isAuthenticated) {
      await testAuthentication();
    } else {
      console.log('No authentication found. Run without --test flag to authenticate.');
    }
    return;
  }

  // Perform authentication
  const success = await authenticateGoogleCalendar();
  
  if (success) {
    console.log('\\n🎉 Authentication complete!');
    
    // Test the API
    await testAuthentication();
    
    console.log('\\n✅ Google Calendar integration is ready to use!');
  } else {
    console.log('\\n❌ Authentication failed. Please try again.');
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { authenticateGoogleCalendar, testAuthentication };
