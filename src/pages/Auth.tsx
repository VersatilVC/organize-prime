import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth-migration';
import { logger } from '@/lib/secure-logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/ui/icons';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IframeUtils } from '@/lib/iframe-utils';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [iframeContext, setIframeContext] = useState<any>(null);
  
  const { user, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Initialize iframe context detection
  useEffect(() => {
    const context = IframeUtils.getIframeContext();
    setIframeContext(context);
    
    // Handle special OAuth flows from URL params
    const oauthParam = searchParams.get('oauth');
    const contextParam = searchParams.get('context');
    
    if (oauthParam === 'google' && contextParam === 'newtab') {
      // This is a new tab OAuth flow - auto-initiate Google OAuth
      handleGoogleSignInDirect();
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent, isSignUp: boolean) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (resetMode) {
        await resetPassword(email);
        setResetMode(false);
      } else if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      } catch (error) {
        logger.error('Auth error', error as Error, { component: 'Auth' });
      } finally {
      setLoading(false);
    }
  };

  // Direct Google sign-in (for new tab flows)
  const handleGoogleSignInDirect = async () => {
    setLoading(true);
    
    try {
      const result = await signInWithGoogle();
      
      if (result.error) {
        logger.error('Direct OAuth error', result.error, { component: 'Auth', action: 'handleGoogleSignInDirect' });
        
        // Send error back to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-complete',
            success: false,
            error: result.error.message
          }, '*');
        }
      } else {
        // Send success back to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-complete',
            success: true
          }, '*');
        }
      }
      
    } catch (error) {
      logger.error('Direct OAuth catch', error as Error, { component: 'Auth', action: 'handleGoogleSignInDirect' });
      
      if (window.opener) {
        window.opener.postMessage({
          type: 'oauth-complete',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, '*');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Google sign-in with iframe awareness
  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    try {
      // Import diagnostics for enhanced debugging
      const { AuthDiagnostics } = await import('@/lib/auth-diagnostics');
      
      // If in iframe context, check if we should use new tab approach
      if (iframeContext?.isInIframe) {
        
        toast({
          title: "OAuth in Preview Mode",
          description: "For the best experience, Google sign-in will open in a new tab.",
        });
        
        // Use new tab OAuth approach
        const result = await IframeUtils.handleOAuthInNewTab();
        
        if (result.error) {
          setLoading(false);
          toast({
            title: "Google Sign In Failed",
            description: result.error.message,
            variant: "destructive",
          });
        }
        // If successful, the page will reload automatically
        
        return;
      }
      
      // Standard OAuth flow for non-iframe context
      const result = await signInWithGoogle();
      
      if (result.error) {
        logger.error('Google sign-in error', result.error, { component: 'Auth', action: 'handleGoogleSignIn' });
        setLoading(false);
        
        // Enhanced error handling with specific guidance
        let errorDescription = result.error.message;
        
        if (errorDescription.includes('Domain configuration') || 
            errorDescription.includes('unauthorized_client') ||
            errorDescription.includes('redirect_uri_mismatch')) {
          errorDescription = AuthDiagnostics.getAuthGuideMessage();
        } else if (errorDescription.includes('code verifier') || 
                   errorDescription.includes('invalid request')) {
          errorDescription = `OAuth state error detected. This is usually caused by:
1. Browser closing during OAuth flow
2. Multiple sign-in attempts
3. Domain configuration issues

${AuthDiagnostics.getAuthGuideMessage()}`;
        }
        
        toast({
          title: "Google Sign In Failed",
          description: errorDescription,
          variant: "destructive",
        });
      } else {
        // Monitor for redirect with enhanced timeout
        const redirectTimeout = setTimeout(() => {
          if (window.location.pathname === '/auth') {
            setLoading(false);
            
            toast({
              title: "OAuth Redirect Timeout",
              description: `The OAuth redirect is taking longer than expected. Please check your configuration:\n\n${AuthDiagnostics.getAuthGuideMessage()}`,
              variant: "destructive",
            });
          }
        }, 8000); // Increased timeout
        
        // Clear timeout if component unmounts
        return () => clearTimeout(redirectTimeout);
      }
      
    } catch (error) {
      logger.error('Google sign-in catch block', error as Error, { component: 'Auth', action: 'handleGoogleSignIn' });
      setLoading(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: "Google Sign In Error", 
        description: `Authentication error: ${errorMessage}. Please try email/password sign in instead.`,
        variant: "destructive",
      });
    }
  };

  // Handle "Open in New Tab" button
  const handleOpenInNewTab = () => {
    const newTabUrl = IframeUtils.createNewTabUrl();
    window.open(newTabUrl, '_blank');
  };

  if (resetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Enter your email address and we'll send you a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setResetMode(false)}
              >
                Back to Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Welcome</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
              
              <Button
                type="button"
                variant="link"
                className="w-full text-sm"
                onClick={() => setResetMode(true)}
              >
                Forgot your password?
              </Button>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          
          {/* Iframe context notice */}
          {iframeContext?.isInIframe && (
            <Alert className="mt-4 mb-4">
              <Icons.google className="h-4 w-4" />
              <AlertDescription>
                You're using the preview mode. For Google sign-in, we recommend opening in a new tab for the best experience.
              </AlertDescription>
            </Alert>
          )}
          
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <Icons.google className="mr-2 h-4 w-4" />
            {iframeContext?.isInIframe ? 'Sign in with Google (New Tab)' : 'Google'}
          </Button>
          
          {/* Alternative new tab option for iframe context */}
          {iframeContext?.isInIframe && (
            <Button
              variant="ghost"
              className="w-full text-sm mt-2"
              onClick={handleOpenInNewTab}
              disabled={loading}
            >
              Or open sign-in page in new tab
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}