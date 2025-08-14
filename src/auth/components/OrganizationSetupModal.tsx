import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Plus } from 'lucide-react';
import { useDomainLogic } from '../hooks/useDomainLogic';

export function OrganizationSetupModal() {
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { showOrgSetup, setShowOrgSetup, createPersonalOrganization, setupUser } = useDomainLogic();

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    
    setLoading(true);
    try {
      await createPersonalOrganization(orgName.trim());
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setShowOrgSetup(false);
    // For now, just close. In a real app, you might want to handle this differently
  };

  return (
    <Dialog open={showOrgSetup} onOpenChange={setShowOrgSetup}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Welcome to OrganizePrime!</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <Building2 className="h-12 w-12 text-primary mx-auto" />
            <h3 className="text-lg font-semibold">Set up your organization</h3>
            <p className="text-sm text-muted-foreground">
              Since you're using a personal email ({setupUser?.email}), you can create your own organization or join an existing one.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Organization
              </CardTitle>
              <CardDescription>
                Start fresh with your own organization where you'll be the admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  placeholder="My Company"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <Button 
                onClick={handleCreateOrg} 
                className="w-full"
                disabled={loading || !orgName.trim()}
              >
                {loading ? "Creating..." : "Create Organization"}
              </Button>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              You can set this up later in your profile settings
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}