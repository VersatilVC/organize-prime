import React from 'react';
import { Construction } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface KBPlaceholderPageProps {
  component: string;
  title: string;
  description?: string;
}

export function KBPlaceholderPage({ title }: KBPlaceholderPageProps) {
  return (
    <div className="container mx-auto py-16">
      <Card className="max-w-md mx-auto text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-muted">
              <Construction className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl">Page Under Construction</CardTitle>
          <CardDescription>
            This page is currently being developed.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Feel free to send us feedback about what you'd like to see here.
          </p>
          
          <Button asChild>
            <Link to="/feedback">
              Send Feedback
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}