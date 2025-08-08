# 🔧 Chat Not Working - Troubleshooting Guide

## Quick Diagnosis Steps

### Step 1: Check if Backend is Running
1. **Start your backend server:**
   ```bash
   cd backend
   npm run dev
   ```
   
2. **Test if server responds:**
   - Open browser: `http://localhost:4000`
   - You should see an error (that's normal - no root endpoint)
   - If you see "Cannot GET /", the server is running!

### Step 2: Check Environment Variables
1. **Verify your `backend/.env` file contains:**
   ```env
   GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
   GROQ_API_KEY=your_groq_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
   SUPABASE_JWT_SECRET=your_jwt_secret
   PORT=4000
   ```

### Step 3: Test Chat Endpoint Directly
1. **Open a new terminal/command prompt**
2. **Test the endpoint:**
   ```bash
   curl -X POST http://localhost:4000/ai/chat ^
   -H "Content-Type: application/json" ^
   -H "Authorization: Bearer test-token" ^
   -d "{\"message\": \"Hello test\"}"
   ```

### Step 4: Check Frontend Network Tab
1. **Open browser Developer Tools (F12)**
2. **Go to Network tab**
3. **Try sending a message in chat**
4. **Look for failed requests to `/ai/chat`**

## Common Issues & Solutions

### Issue 1: "Cannot GET /oauth2callback"
**Solution:** See the OAUTH_FIX.md guide

### Issue 2: Backend Not Starting
**Symptoms:** Server won't start, npm errors
**Solutions:**
1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```
2. **Check for syntax errors in index.js**
3. **Verify .env file exists and has correct values**

### Issue 3: Authentication Errors
**Symptoms:** "No token provided" or "Invalid token"
**Solutions:**
1. **Make sure you're logged in**
2. **Check localStorage has token:**
   - F12 → Application → Local Storage
   - Look for "token" key
3. **Try logging out and back in**

### Issue 4: GROQ API Errors
**Symptoms:** "Failed to connect to Groq API"
**Solutions:**
1. **Verify GROQ_API_KEY is correct**
2. **Check GROQ_API_URL is exactly:**
   ```
   https://api.groq.com/openai/v1/chat/completions
   ```

### Issue 5: CORS Errors
**Symptoms:** Browser console shows CORS errors
**Solutions:**
1. **Make sure backend has cors enabled** (it should)
2. **Check frontend is calling correct URL** (`http://localhost:4000`)

## Emergency Fix - Simple Chat Test

If nothing else works, try this simplified version:

### 1. Create test-chat.js in backend folder:
```javascript
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/ai/chat', (req, res) => {
  console.log('Chat request:', req.body);
  res.json({ 
    response: 'Test response: ' + req.body.message + ' - Chat is working!' 
  });
});

app.listen(4002, () => {
  console.log('Test chat server on port 4002');
});
```

### 2. Run the test server:
```bash
node test-chat.js
```

### 3. Update frontend ChatInterface.tsx temporarily:
Change `API_URL` from `'http://localhost:4000'` to `'http://localhost:4002'`

## Advanced Debugging

### Check server logs:
When you send a chat message, your backend terminal should show:
```
Received message: your message here
Groq API response: {...}
```

If you don't see these logs, the request isn't reaching the backend.

### Network debugging:
1. **Open F12 → Network tab**
2. **Send a chat message**
3. **Look for the `/ai/chat` request**
4. **Check the response status and error**

## Most Likely Causes

1. **Backend server not running** (most common)
2. **Missing GROQ_API_KEY in .env file**
3. **Authentication token expired**
4. **Port conflict** (something else using port 4000)
5. **CORS issues** (less likely with our setup)

Start with Step 1 - making sure the backend is actually running!
