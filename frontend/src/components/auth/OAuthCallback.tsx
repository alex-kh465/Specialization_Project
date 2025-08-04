import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback from URL hash
        const { data, error } = await supabase.auth.getSession();
        
        console.log('OAuth callback - session data:', data);
        console.log('OAuth callback - error:', error);
        
        if (error) {
          console.error('OAuth error:', error);
          toast({
            title: 'Sign in failed',
            description: error.message,
            variant: 'destructive',
          });
          navigate('/login');
          return;
        }

        if (data?.session?.access_token) {
          // Store the token in localStorage for compatibility with existing app
          localStorage.setItem('token', data.session.access_token);
          
          console.log('OAuth success - token stored:', data.session.access_token.substring(0, 20) + '...');
          
          toast({
            title: 'Sign in successful',
            description: 'Welcome to GenEWA!',
          });

          // Check if profile is complete
          try {
            const profileRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/profile`, {
              headers: { 'Authorization': `Bearer ${data.session.access_token}` }
            });
            
            console.log('Profile check response status:', profileRes.status);
            
            if (!profileRes.ok) {
              // If there's no profile or an error, redirect to profile page
              console.log('Profile not found or error, redirecting to profile page for setup');
              navigate('/profile');
            } else {
              const profileData = await profileRes.json();
              console.log('Profile found:', profileData);
              
              // Check if profile has required fields
              if (!profileData.name || !profileData.college) {
                console.log('Profile incomplete, redirecting to profile page');
                navigate('/profile');
              } else {
                // If profile exists and is complete, redirect to homepage
                console.log('Profile complete, redirecting to dashboard');
                setTimeout(() => {
                  navigate('/', { replace: true });
                }, 100);
              }
            }
          } catch (fetchError) {
            console.error('Error checking profile:', fetchError);
            // On fetch error, redirect to profile page to be safe
            navigate('/profile');
          }
        } else {
          console.log('No session found, redirecting to login');
          navigate('/login');
        }
      } catch (err) {
        console.error('Unexpected OAuth error:', err);
        navigate('/login');
      }
    };

    // Check if we're actually coming from an OAuth redirect
    const urlHash = window.location.hash;
    console.log('Current URL hash:', urlHash);
    
    if (urlHash.includes('access_token') || urlHash.includes('type=recovery')) {
      handleAuthCallback();
    } else {
      // If no OAuth data in URL, redirect to login
      console.log('No OAuth data in URL, redirecting to login');
      navigate('/login');
    }
  }, [navigate, toast]);

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-100 to-purple-100">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
