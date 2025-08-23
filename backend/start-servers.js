import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting GenEWA Backend Servers...\n');

// Start main backend server (port 4000)
console.log('📡 Starting main backend server on port 4000...');
const mainServer = spawn('node', ['index.js'], {
  cwd: __dirname,
  stdio: ['inherit', 'pipe', 'pipe']
});

mainServer.stdout.on('data', (data) => {
  console.log(`[MAIN] ${data.toString().trim()}`);
});

mainServer.stderr.on('data', (data) => {
  console.error(`[MAIN ERROR] ${data.toString().trim()}`);
});

// Start OAuth callback server (port 3503)
console.log('🔐 Starting OAuth callback server on port 3503...');
const oauthServer = spawn('node', ['oauth-server.js'], {
  cwd: __dirname,
  stdio: ['inherit', 'pipe', 'pipe']
});

oauthServer.stdout.on('data', (data) => {
  console.log(`[OAUTH] ${data.toString().trim()}`);
});

oauthServer.stderr.on('data', (data) => {
  console.error(`[OAUTH ERROR] ${data.toString().trim()}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping all servers...');
  mainServer.kill();
  oauthServer.kill();
  process.exit(0);
});

console.log('\n✅ Both servers are starting...');
console.log('📊 Main API: http://localhost:4000');
console.log('🔐 OAuth Callback: http://localhost:3503/oauth2callback');
console.log('\n📝 Use Ctrl+C to stop both servers\n');
