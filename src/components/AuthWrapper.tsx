import React, { useState, useEffect } from 'react';
import { User, LogIn, Mail, Lock, Eye, EyeOff, UserPlus, Github } from 'lucide-react';
import { supabase, testSupabaseConnection } from '../lib/supabase';
import UserSettings from './UserSettings';

interface UserType {
  id: string;
  email: string;
}

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Handle OAuth callback first
    handleOAuthCallback();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_IN' && session) {
          console.log('User signed in successfully:', session.user.email);
          setUser({ id: session.user.id, email: session.user.email || '' });
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('Token refreshed:', session.user.email);
          setUser({ id: session.user.id, email: session.user.email || '' });
          setLoading(false);
        } else {
          setUser(session?.user ? { id: session.user.id, email: session.user.email || '' } : null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      console.log('Checking for OAuth callback...', {
        hash: window.location.hash,
        search: window.location.search,
        pathname: window.location.pathname
      });

      // Check if we have OAuth tokens in the URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlParams = new URLSearchParams(window.location.search);

      const hasAccessToken = hashParams.get('access_token');
      const hasCode = urlParams.get('code');
      const hasError = hashParams.get('error') || urlParams.get('error');

      if (hasError) {
        const errorDescription = hashParams.get('error_description') || urlParams.get('error_description') || hasError;
        console.error('OAuth error in URL:', hasError, errorDescription);

        // Show user-friendly error message
        const decodedError = decodeURIComponent(errorDescription).replace(/\+/g, ' ');
        alert(`Sign-in failed: ${decodedError}`);

        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setLoading(false);
        return;
      }

      if (hasAccessToken || hasCode) {
        console.log('OAuth callback detected, exchanging tokens...', {
          hasAccessToken: !!hasAccessToken,
          hasCode: !!hasCode
        });

        // First, try to exchange the session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);

          // Try to handle the OAuth callback explicitly
          const { data: callbackData, error: callbackError } = await supabase.auth.getUser();

          if (callbackError) {
            console.error('Error in OAuth callback:', callbackError);
            setLoading(false);
            return;
          }

          if (callbackData.user) {
            console.log('User found via getUser:', callbackData.user.email);
            setUser({
              id: callbackData.user.id,
              email: callbackData.user.email || ''
            });
            setLoading(false);

            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }
        }

        if (sessionData.session) {
          console.log('OAuth session established:', sessionData.session.user.email);
          setUser({
            id: sessionData.session.user.id,
            email: sessionData.session.user.email || ''
          });
          setLoading(false);

          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        } else {
          console.log('No session found after OAuth callback, trying refresh...');

          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (!refreshError && refreshData.session) {
            console.log('Session refreshed successfully:', refreshData.session.user.email);
            setUser({
              id: refreshData.session.user.id,
              email: refreshData.session.user.email || ''
            });
            setLoading(false);

            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }
        }
      }

      // No OAuth callback, check for existing session
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }

      if (data.session) {
        console.log('Existing session found:', data.session.user.email);
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || ''
        });
        setLoading(false);
      } else {
        console.log('No session found, checking user...');
        checkUser();
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      checkUser();
    }
  };

  const checkUser = async () => {
    console.log('Starting user authentication check...');
    
    // First test the connection
    const connectionTest = await testSupabaseConnection();
    if (!connectionTest.success) {
      console.error('Supabase connection failed:', connectionTest.error);
      setUser(null);
      setLoading(false);
      return;
    }
    
    try {
      console.log('Getting current user from Supabase...');
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('Supabase getUser response:', { user: !!user, error });
      
      if (error) {
        console.error('Supabase auth error:', error);
        setUser(null);
      } else {
        console.log('User authenticated successfully:', user?.email);
        setUser(user ? { id: user.id, email: user.email || '' } : null);
      }
    } catch (error) {
      console.error('Failed to check user authentication:', error);
      
      // Enhanced error diagnostics
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        console.error('=== SUPABASE CONNECTION FAILED ===');
        console.error('This usually indicates one of the following issues:');
        console.error('1. Network connectivity problem');
        console.error('2. Supabase project is paused or inactive');
        console.error('3. CORS configuration issue in Supabase');
        console.error('4. Invalid Supabase URL format');
        console.error('');
        console.error('Current configuration:');
        console.error('SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
        console.error('ANON_KEY length:', import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0);
        console.error('');
        console.error('Please check:');
        console.error('- Your Supabase project is active');
        console.error('- The URL is accessible from your browser');
        console.error('- CORS settings allow localhost:5173');
        
        // Try to provide more specific guidance
        try {
          const url = new URL(import.meta.env.VITE_SUPABASE_URL);
          console.error('- Try visiting this URL in your browser:', `${url.origin}/rest/v1/`);
        } catch (urlError) {
          console.error('- The SUPABASE_URL appears to be malformed');
        }
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) throw error;
        if (data.user) {
          // For signUp, user might need to confirm email
          if (!data.session) {
            alert('Please check your email for a confirmation link.');
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        if (data.user) {
          setUser({ id: data.user.id, email: data.user.email || '' });
        }
      }
    } catch (error: any) {
      alert(error.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    setAuthLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: provider === 'google' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined,
        }
      });

      if (error) throw error;

      // The redirect will happen automatically
      console.log(`${provider} OAuth initiated:`, data);
    } catch (error: any) {
      console.error(`${provider} sign-in error:`, error);
      alert(error.message || `${provider} sign-in failed`);
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setEmail('');
    setPassword('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src="/generated-image.png" 
              alt="Unstack Logo" 
              className="h-16 w-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-600">
              {authMode === 'signin' 
                ? 'Sign in to Unstack' 
                : 'Join Unstack to start creating books'
              }
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {authMode === 'signin' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                </>
              )}
            </button>
          </form>

          {/* OAuth Options */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleOAuthSignIn('github')}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors duration-200"
              >
                <Github className="w-5 h-5" />
                <span className="ml-2">GitHub</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuthSignIn('google')}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="ml-2">Google</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {authMode === 'signin' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* User menu */}
      <div className="absolute top-4 right-4 z-20">
        <div className="relative">
          <div className="flex items-center gap-3 bg-white rounded-full px-4 py-2 shadow-lg">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-gray-700">{user.email}</span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 px-2"
            >
              Settings
            </button>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors duration-200"
            >
              Sign out
            </button>
          </div>
          
          {showSettings && (
            <UserSettings onClose={() => setShowSettings(false)} />
          )}
        </div>
      </div>
      
      {children}
    </div>
  );
};

export default AuthWrapper;