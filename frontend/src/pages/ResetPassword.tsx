import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const API_URL = 'http://localhost:4000';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Function to get tokens from either URL fragments or query params
  const getTokensFromUrl = () => {
    // First try to get from URL fragments (after #)
    const hash = location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    
    let access_token = hashParams.get('access_token');
    let refresh_token = hashParams.get('refresh_token');
    
    // If not found in hash, try query params
    if (!access_token || !refresh_token) {
      access_token = searchParams.get('access_token');
      refresh_token = searchParams.get('refresh_token');
    }
    
    return { access_token, refresh_token };
  };

  const { access_token, refresh_token } = getTokensFromUrl();

  useEffect(() => {
    console.log('URL:', location.pathname + location.search + location.hash);
    console.log('Access token:', access_token);
    console.log('Refresh token:', refresh_token);
    
    if (!access_token || !refresh_token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [access_token, refresh_token, location]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          access_token, 
          refresh_token, 
          new_password: password 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed');
      
      toast({
        title: 'Password updated successfully',
        description: 'You can now login with your new password.',
      });
      
      // Redirect to login page after success
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-100 to-purple-100">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-2">
            <span className="text-white text-xl font-bold">GWA</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Reset Password</h1>
          <p className="text-gray-500 text-sm font-semibold">Enter your new password</p>
        </div>
        
        {(!access_token || !refresh_token) ? (
          <div className="text-center">
            <p className="text-red-500 mb-4">Invalid reset link. Please request a new password reset.</p>
            <Button variant="outline" onClick={() => navigate('/login')}>
              Back to Login
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={handleResetPassword} className="w-full space-y-5">
              {error && <div className="text-red-500 text-center">{error}</div>}
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating Password...' : 'Update Password'}
              </Button>
            </form>
            <div className="mt-6 w-full flex flex-col items-center">
              <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
                Back to Login
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
