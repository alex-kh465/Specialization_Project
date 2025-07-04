import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client (service role for backend operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware to extract user_id from Authorization header (JWT)
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    req.user_id = decoded.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Get all expenses for the authenticated user
app.get('/expenses', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', req.user_id)
    .order('date', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Add a new expense
app.post('/expenses', authenticate, async (req, res) => {
  const { amount, category, description, date } = req.body;
  const { data, error } = await supabase
    .from('expenses')
    .insert([{ user_id: req.user_id, amount, category, description, date }])
    .select();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data[0]);
});

// Update an expense
app.put('/expenses/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { amount, category, description, date } = req.body;
  const { data, error } = await supabase
    .from('expenses')
    .update({ amount, category, description, date })
    .eq('id', id)
    .eq('user_id', req.user_id)
    .select();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

// Delete an expense
app.delete('/expenses/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user_id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

// Get the authenticated user's profile
app.get('/profile', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', req.user_id)
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Create a profile for the authenticated user
app.post('/profile', authenticate, async (req, res) => {
  const { name, college, year, profile_picture, timezone, referral_code, is_premium } = req.body;
  const { data, error } = await supabase
    .from('profiles')
    .insert([
      {
        user_id: req.user_id,
        name,
        college,
        year,
        profile_picture,
        timezone,
        referral_code,
        is_premium: is_premium || false,
      },
    ])
    .select();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data[0]);
});

// Update the authenticated user's profile
app.put('/profile', authenticate, async (req, res) => {
  const { name, college, year, profile_picture, timezone, referral_code, is_premium } = req.body;
  const { data, error } = await supabase
    .from('profiles')
    .update({
      name,
      college,
      year,
      profile_picture,
      timezone,
      referral_code,
      is_premium,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', req.user_id)
    .select();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return res.status(401).json({ error: error?.message || 'Invalid credentials' });
    }
    // Return the access token (JWT)
    res.json({ token: data.session.access_token });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Signup endpoint
app.post('/auth/signup', async (req, res) => {
  const { email, password, name, college, year } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      return res.status(400).json({ error: error?.message || 'Signup failed' });
    }
    // Optionally create a profile row
    await supabase.from('profiles').insert([
      {
        user_id: data.user.id,
        name: name || '',
        college: college || '',
        year: year || '',
      },
    ]);
    // Return the access token (JWT) if available
    if (data.session && data.session.access_token) {
      res.json({ token: data.session.access_token });
    } else {
      res.json({ message: 'Signup successful. Please check your email to confirm your account.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Chat endpoint (Groq integration)
app.post('/ai/chat', authenticate, async (req, res) => {
  const { message } = req.body;
  console.log('Received message:', message);
  if (!message) return res.status(400).json({ error: 'Message is required' });
  try {
    const groqRes = await fetch(process.env.GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: message }
        ]
      })
    });
    const data = await groqRes.json();
    console.log('Groq API response:', data);
    if (!groqRes.ok) return res.status(500).json({ error: data.error || 'Groq API error' });
    res.json({ response: data.choices?.[0]?.message?.content || 'No response from AI.' });
  } catch (err) {
    console.error('Groq API error:', err);
    res.status(500).json({ error: 'Failed to connect to Groq API' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`);
}); 