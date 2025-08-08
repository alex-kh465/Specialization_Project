import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Simple test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Backend server is working!' });
});

// Test AI chat endpoint
app.post('/ai/chat', (req, res) => {
  console.log('Received chat request:', req.body);
  res.json({ 
    response: 'This is a test response from the backend server. The chat functionality is working!' 
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
