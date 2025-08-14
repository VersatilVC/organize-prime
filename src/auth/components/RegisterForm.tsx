import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/ui/icons';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '../AuthProvider';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signUp, signInWithGoogle, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || password !== confirmPassword) return;

    setLoading(true);
    clearError();
    
    try {
      await signUp(email, password);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    clearError();
    
    try {
      await signInWithGoogle();
    } finally {
      setLoading(false);
    }
  };

  const isPersonalDomain = (email: string): boolean => {
    const personalDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com', 'aol.com', 'protonmail.com', 'mail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    return personalDomains.includes(domain);
  };

  const getDomainMessage = () => {
    if (!email) return null;
    
    const domain = email.split('@')[1];
    if (!domain) return null;

    if (isPersonalDomain(email)) {
      return (
        <Alert>
          <AlertDescription>
            <strong>Personal email detected.</strong> You'll be able to create or join an organization after registration.
          </AlertDescription>
        </Alert>
      );
    } else {
      return (
        <Alert>
          <AlertDescription>
            <strong>Business email detected.</strong> An organization will be created for {domain} if you're the first user.
          </AlertDescription>
        </Alert>
      );
    }
  };

  const passwordsMatch = password === confirmPassword;
  const isValid = email && password && confirmPassword && passwordsMatch;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your details to get started
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button 
        variant="outline" 
        className="w-full" 
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <Icons.google className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or register with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {getDomainMessage()}
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />
          {confirmPassword && !passwordsMatch && (
            <p className="text-sm text-destructive">Passwords do not match</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading || !isValid}>
          {loading ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}