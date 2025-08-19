import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Create a test token with a test user ID
const testPayload = {
  sub: 'test-user-123', // user_id
  email: 'test@example.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
};

const token = jwt.sign(testPayload, process.env.SUPABASE_JWT_SECRET.replace(/"/g, ''));
console.log('Test JWT Token:');
console.log(token);
