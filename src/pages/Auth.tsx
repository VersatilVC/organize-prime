import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/ui/icons';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  
  const { user, signIn, signUp, signInWithGoogle, resetPassword } = useEnhancedAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    try {
      console.log('🎯 Auth Page: Starting Google sign-in');
      console.log('🌐 Auth Page: Current domain:', window.location.origin);
      
      const result = await signInWithGoogle();
      
      console.log('🎯 Auth Page: Google sign-in result:', result);
      
      if (result.error) {
        console.error('🚨 Auth Page: Google sign-in error:', result.error);
        setLoading(false);
        
        // Enhanced error handling with domain-specific guidance
        let errorDescription = result.error.message;
        
        if (errorDescription.includes('Domain configuration') || 
            errorDescription.includes('unauthorized_client') ||
            errorDescription.includes('redirect_uri_mismatch')) {
          errorDescription += `\n\nTo fix this:\n1. Add ${window.location.origin} to Google Cloud Console\n2. Update Supabase Site URL to match\n3. Verify redirect URLs are configured correctly`;
        }
        
        toast({
          title: "Google Sign In Failed",
          description: errorDescription,
          variant: "destructive",
        });
      } else {
        console.log('🎯 Auth Page: OAuth initiated, monitoring for redirect...');
        
        // Monitor for successful redirect - if we're still here after 5 seconds, likely an issue
        const redirectTimeout = setTimeout(() => {
          if (window.location.pathname === '/auth') {
            console.warn('⚠️ Auth Page: Still on auth page after 5 seconds - possible redirect failure');
            setLoading(false);
            
            toast({
              title: "Redirect Issue",
              description: `Google sign-in redirect may have failed. Current domain: ${window.location.origin}. Please check domain configuration.`,
              variant: "destructive",
            });
          }
        }, 5000);
        
        // Clear timeout if component unmounts
        return () => clearTimeout(redirectTimeout);
      }
      
    } catch (error) {
      console.error('🚨 Auth Page: Google sign-in catch block:', error);
      setLoading(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: "Google Sign In Error",
        description: `Authentication error: ${errorMessage}. Please try email/password instead.`,
        variant: "destructive",
      });
    }
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
          
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <Icons.google className="mr-2 h-4 w-4" />
            Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}