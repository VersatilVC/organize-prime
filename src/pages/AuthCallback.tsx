import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Loader2, CheckCircle } from 'lucide-react';

export default function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleAuthCallback = async () => {
      try {
        console.log('🔐 Auth Callback: Processing authentication callback');
        console.log('🔍 URL params:', Object.fromEntries(searchParams.entries()));
        console.log('🌐 Current domain:', window.location.origin);

        // Enhanced PKCE state logging
        const verifier = localStorage.getItem('pkce_code_verifier');
        const oauthState = localStorage.getItem('oauth_state');
        const authCode = searchParams.get('code');
        
        console.log('🔑 PKCE Debug Info:', {
          hasVerifier: !!verifier,
          verifierLength: verifier?.length,
          hasOAuthState: !!oauthState,
          hasAuthCode: !!authCode,
          authCodeLength: authCode?.length
        });

        // Set a timeout for the auth process
        timeoutId = setTimeout(() => {
          console.error('⏰ Auth Callback: Timeout reached');
          setError('Authentication process timed out. Please try again.');
          setLoading(false);
        }, 15000); // Extended to 15 seconds for better reliability

        // Check for error in URL params
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (errorParam) {
          console.error('🚨 Auth Callback: Error in URL params:', errorParam, errorDescription);
          
          // Enhanced PKCE error handling with specific detection
          const isPKCEError = errorDescription?.includes('code verifier') || 
                             errorDescription?.includes('invalid request') ||
                             errorDescription?.includes('code_challenge') ||
                             errorParam === 'invalid_request';
                             
          if (isPKCEError) {
            console.log('🔄 PKCE error detected:', { errorParam, errorDescription });
            
            // Track PKCE failures but don't clear state immediately
            const pkceFailures = parseInt(localStorage.getItem('pkce_failure_count') || '0') + 1;
            localStorage.setItem('pkce_failure_count', pkceFailures.toString());
            
            // Only clear OAuth state after multiple failures
            if (pkceFailures > 2) {
              console.log('🧹 Multiple PKCE failures, clearing OAuth state');
              const oauthKeys = ['pkce_code_verifier', 'oauth_state', 'auth_callback_url'];
              oauthKeys.forEach(key => {
                try {
                  localStorage.removeItem(key);
                } catch (e) {
                  console.warn('Could not clear OAuth key:', key);
                }
              });
              localStorage.removeItem('pkce_failure_count');
            }
            
            setError('OAuth authentication state error. Please try signing in again.');
          } else {
            setError(`Authentication failed: ${errorDescription || errorParam}`);
          }
          
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        // Validate required OAuth parameters before exchange
        if (!authCode) {
          console.error('🚨 Auth Callback: Missing authorization code');
          setError('Missing authorization code. Please try signing in again.');
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        if (!verifier) {
          console.error('🚨 Auth Callback: Missing PKCE code verifier');
          setError('Authentication state error. Please try signing in again.');
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        // Handle the OAuth callback with enhanced logging
        console.log('🔄 Auth Callback: Attempting code exchange for session');
        console.log('🔍 Current URL for exchange:', window.location.href);
        
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (exchangeError) {
          console.error('🚨 Auth Callback: Exchange error:', exchangeError);
          
          // Enhanced PKCE exchange error handling
          const isPKCEExchangeError = exchangeError.message.includes('code verifier') || 
                                     exchangeError.message.includes('invalid request') ||
                                     exchangeError.message.includes('code_challenge') ||
                                     exchangeError.message.includes('invalid_grant');
                                     
          if (isPKCEExchangeError) {
            console.log('🔄 PKCE exchange error detected:', exchangeError.message);
            
            // Implement retry logic for transient PKCE errors
            const retryCount = parseInt(sessionStorage.getItem('auth_retry_count') || '0');
            
            if (retryCount < 2) {
              console.log(`🔄 Attempting OAuth retry ${retryCount + 1}/2`);
              sessionStorage.setItem('auth_retry_count', (retryCount + 1).toString());
              
              // Clear current OAuth state and redirect back to auth
              const oauthKeys = ['pkce_code_verifier', 'oauth_state', 'auth_callback_url'];
              oauthKeys.forEach(key => {
                try {
                  localStorage.removeItem(key);
                } catch (e) {
                  console.warn('Could not clear OAuth key:', key);
                }
              });
              
              setTimeout(() => {
                navigate('/auth', { replace: true });
              }, 2000);
              
              setError('Authentication failed. Retrying automatically...');
              setLoading(false);
              clearTimeout(timeoutId);
              return;
            } else {
              console.log('🚨 Max retry attempts reached');
              sessionStorage.removeItem('auth_retry_count');
              
              // Clear OAuth state after failed retries
              const oauthKeys = ['pkce_code_verifier', 'oauth_state', 'auth_callback_url'];
              oauthKeys.forEach(key => {
                try {
                  localStorage.removeItem(key);
                } catch (e) {
                  console.warn('Could not clear OAuth key:', key);
                }
              });
            }
            
            setError('OAuth authentication failed after multiple attempts. Please try signing in again.');
          } else {
            setError(`Authentication failed: ${exchangeError.message}`);
          }
          
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        if (data.session) {
          console.log('✅ Auth Callback: Session established successfully');
          
          // Clear success-related storage items
          sessionStorage.removeItem('auth_retry_count');
          localStorage.removeItem('pkce_failure_count');
          localStorage.removeItem('oauth_error');
          
          toast({
            title: "Welcome!",
            description: "You have been signed in successfully.",
          });

          // Clear the timeout since we succeeded
          clearTimeout(timeoutId);
          
          // Redirect to dashboard after a brief delay
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1000);
        } else {
          console.warn('⚠️ Auth Callback: No session data received');
          setError('No session data received. Please try signing in again.');
          setLoading(false);
          clearTimeout(timeoutId);
        }
      } catch (err) {
        console.error('🚨 Auth Callback: Unexpected error:', err);
        setError(`Unexpected error: ${(err as Error).message}`);
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    handleAuthCallback();

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [searchParams, navigate, toast]);

  const handleRetry = () => {
    navigate('/auth', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Completing Sign In</CardTitle>
            <CardDescription className="text-center">
              Please wait while we complete your authentication...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <div className="text-center text-sm text-muted-foreground">
              This usually takes just a few seconds...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-destructive">
              Authentication Failed
            </CardTitle>
            <CardDescription className="text-center">
              We encountered an issue completing your sign in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full">
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/', { replace: true })}
                className="w-full"
              >
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state (brief display before redirect)
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-green-600">
            Success!
          </CardTitle>
          <CardDescription className="text-center">
            Redirecting you to the application...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}