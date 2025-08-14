import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';
import { OrganizationSetupModal } from '../components/OrganizationSetupModal';
import { GuestGuard } from '../AuthGuard';

interface AuthPageProps {
  onAuthenticated?: () => void;
}

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [currentTab, setCurrentTab] = useState<'login' | 'register' | 'reset'>('login');

  const handleSwitchToRegister = () => setCurrentTab('register');
  const handleSwitchToLogin = () => setCurrentTab('login');
  const handleSwitchToReset = () => setCurrentTab('reset');

  if (currentTab === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <ForgotPasswordForm onBack={handleSwitchToLogin} />
          </CardContent>
        </Card>
        <OrganizationSetupModal />
      </div>
    );
  }

  return (
    <GuestGuard onAuthenticated={onAuthenticated}>
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-6">
                <LoginForm 
                  onSwitchToRegister={handleSwitchToRegister}
                  onSwitchToReset={handleSwitchToReset}
                />
              </TabsContent>
              
              <TabsContent value="register" className="mt-6">
                <RegisterForm onSwitchToLogin={handleSwitchToLogin} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <OrganizationSetupModal />
      </div>
    </GuestGuard>
  );
}