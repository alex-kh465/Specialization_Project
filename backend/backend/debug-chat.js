import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Simple authentication middleware for testing
function authenticate(req, res, next) {
  console.log('Authentication headers:', req.headers.authorization);
  next(); // Skip authentication for testing
}

// Basic endpoint to check server is running
app.get('/', (req, res) => {
  res.json({ message: 'Debug server is running!', timestamp: new Date().toISOString() });
});

// Debug AI Chat endpoint
app.post('/ai/chat', authenticate, async (req, res) => {
  console.log('=== DEBUG CHAT REQUEST ===');
  console.log('Request body:', req.body);
  console.log('Headers:', req.headers);
  console.log('Environment variables check:');
  console.log('- GROQ_API_URL:', process.env.GROQ_API_URL ? 'Present' : 'Missing');
  console.log('- GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'Present' : 'Missing');
  
  try {
    // Test response without calling external API
    const testResponse = {
      response: `Debug response: I received your message "${req.body.message}" at ${new Date().toISOString()}. The chat system is working!`,
      calendarEvent: null,
      calendarCreated: false
    };
    
    console.log('Sending test response:', testResponse);
    res.json(testResponse);
    
  } catch (error) {
    console.error('Debug chat error:', error);
    res.status(500).json({ 
      error: 'Debug chat error: ' + error.message,
      stack: error.stack 
    });
  }
});

const PORT = process.env.PORT || 4001; // Use different port to avoid conflicts
app.listen(PORT, () => {
  console.log(`=== DEBUG SERVER STARTED ===`);
  console.log(`Server running on port ${PORT}`);
  console.log('Environment check:');
  console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('- PORT:', process.env.PORT || 'not set (using default 4001)');
  console.log('- GROQ_API_URL:', process.env.GROQ_API_URL ? 'Present' : 'Missing');
  console.log('- GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'Present' : 'Missing');
  console.log('===============================');
});
