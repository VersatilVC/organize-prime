import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';

export default function Billing() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <CreditCard className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Billing & Subscriptions</h1>
        <Badge variant="secondary">Coming Soon</Badge>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>
            Manage your subscription plans, billing information, and payment methods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-12">
            <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              This feature is currently in development. You'll soon be able to manage your subscription, 
              view billing history, and update payment methods.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Current Plan</h4>
              <p className="text-sm text-muted-foreground">
                View your active subscription and usage details
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Billing History</h4>
              <p className="text-sm text-muted-foreground">
                Download invoices and view payment history
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Payment Methods</h4>
              <p className="text-sm text-muted-foreground">
                Manage credit cards and payment options
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}