import express from 'express';
import cors from 'cors';
import { calendarMCP } from './calendar/mcp/index.js';

const app = express();
app.use(cors());
app.use(express.json());

// Google Calendar OAuth callback endpoint (runs on port 3503)
app.get('/oauth2callback', async (req, res) => {
  try {
    const { code, error, state } = req.query;
    
    if (error) {
      console.error('OAuth error:', error);
      return res.send(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>Error: ${error}</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
    }
    
    if (!code) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>No authorization code received</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
    }
    
    console.log('OAuth callback received with code:', code.substring(0, 20) + '...');
    
    // Exchange code for tokens using the calendar MCP
    try {
      console.log('Attempting to exchange code for tokens...');
      const tokens = await calendarMCP.getAccessToken(code);
      console.log('Token exchange successful:', tokens ? 'Yes' : 'No');
      
      // Success page that closes the popup
      res.send(`
        <html>
          <body>
            <h1>Authorization Successful!</h1>
            <p>Your Google Calendar is now connected. You can close this window.</p>
            <p>Tokens have been saved successfully.</p>
            <script>
              // Send message to parent window and close popup
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
              }
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    } catch (tokenError) {
      console.error('Token exchange error:', tokenError);
      res.send(`
        <html>
          <body>
            <h1>Token Exchange Failed</h1>
            <p>Error: ${tokenError.message}</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
    }
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send(`
      <html>
        <body>
          <h1>Server Error</h1>
          <p>Error: ${err.message}</p>
          <script>window.close();</script>
        </body>
      </html>
    `);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    server: 'OAuth Server',
    port: 3503,
    timestamp: new Date().toISOString() 
  });
});

const PORT = 3503;

// Initialize calendar MCP before starting server
calendarMCP.init().then(() => {
  console.log('Calendar MCP initialized for OAuth server');
  
  app.listen(PORT, () => {
    console.log(`OAuth callback server running on port ${PORT}`);
    console.log(`OAuth callback URL: http://localhost:${PORT}/oauth2callback`);
  });
}).catch((error) => {
  console.warn('Calendar MCP initialization failed for OAuth server:', error.message);
  
  // Start server anyway - it will try to initialize on demand
  app.listen(PORT, () => {
    console.log(`OAuth callback server running on port ${PORT} (MCP will initialize on demand)`);
    console.log(`OAuth callback URL: http://localhost:${PORT}/oauth2callback`);
  });
});
