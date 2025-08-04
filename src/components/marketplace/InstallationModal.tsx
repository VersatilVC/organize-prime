import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Shield, 
  Settings, 
  Download,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarketplaceFeature {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  permissions: string[];
  requirements: string[];
  compatibility: {
    minPlan: string;
    requiresIntegration: boolean;
  };
}

interface InstallationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  error?: string;
}

interface InstallationModalProps {
  feature: MarketplaceFeature;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function InstallationModal({ feature, isOpen, onClose, onComplete }: InstallationModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [acceptedPermissions, setAcceptedPermissions] = useState<string[]>([]);
  const [installationSteps, setInstallationSteps] = useState<InstallationStep[]>([
    {
      id: 'compatibility',
      title: 'Checking Compatibility',
      description: 'Verifying system requirements and plan compatibility',
      status: 'pending'
    },
    {
      id: 'permissions',
      title: 'Configuring Permissions',
      description: 'Setting up required access permissions',
      status: 'pending'
    },
    {
      id: 'installation',
      title: 'Installing Feature',
      description: 'Downloading and configuring feature components',
      status: 'pending'
    },
    {
      id: 'finalization',
      title: 'Finalizing Setup',
      description: 'Completing installation and running tests',
      status: 'pending'
    }
  ]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setIsInstalling(false);
      setInstallProgress(0);
      setAcceptedPermissions([]);
      setInstallationSteps(steps => steps.map(step => ({ ...step, status: 'pending' })));
    }
  }, [isOpen]);

  const simulateCompatibilityCheck = async () => {
    setIsInstalling(true);
    
    // Simulate checking compatibility
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock compatibility result (could fail based on feature requirements)
    const isCompatible = Math.random() > 0.1; // 90% success rate
    
    if (isCompatible) {
      setCurrentStep(2);
      toast({
        title: "Compatibility Check Passed",
        description: "Your system meets all requirements for this feature.",
      });
    } else {
      toast({
        title: "Compatibility Issue",
        description: "Your current plan doesn't support this feature. Please upgrade.",
        variant: "destructive"
      });
    }
    
    setIsInstalling(false);
    return isCompatible;
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setAcceptedPermissions(prev => [...prev, permission]);
    } else {
      setAcceptedPermissions(prev => prev.filter(p => p !== permission));
    }
  };

  const allPermissionsAccepted = acceptedPermissions.length === feature.permissions.length;

  const startInstallation = async () => {
    setCurrentStep(4);
    setIsInstalling(true);
    
    try {
      // Simulate installation process
      const steps = [...installationSteps];
      
      for (let i = 0; i < steps.length; i++) {
        steps[i].status = 'in-progress';
        setInstallationSteps([...steps]);
        
        // Simulate step duration
        const stepDuration = 1500 + Math.random() * 1000;
        const startTime = Date.now();
        
        while (Date.now() - startTime < stepDuration) {
          const elapsed = Date.now() - startTime;
          const stepProgress = Math.min((elapsed / stepDuration) * 100, 100);
          const totalProgress = ((i * 100) + stepProgress) / steps.length;
          setInstallProgress(totalProgress);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Random chance of error on non-critical steps
        if (i < 2 && Math.random() < 0.05) {
          steps[i].status = 'error';
          steps[i].error = 'Network timeout. Please try again.';
          setInstallationSteps([...steps]);
          setIsInstalling(false);
          return;
        }
        
        steps[i].status = 'completed';
        setInstallationSteps([...steps]);
      }
      
      setInstallProgress(100);
      setCurrentStep(5);
      
      toast({
        title: "Installation Complete!",
        description: `${feature.displayName} has been successfully installed.`,
      });
      
    } catch (error) {
      toast({
        title: "Installation Failed",
        description: "An error occurred during installation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const getStepIcon = (step: number) => {
    if (step < currentStep) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (step === currentStep) return <div className="h-5 w-5 rounded-full bg-primary" />;
    return <div className="h-5 w-5 rounded-full bg-muted" />;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <Shield className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">Compatibility Check</h3>
                <p className="text-muted-foreground">
                  We'll verify that your system meets all requirements for {feature.displayName}.
                </p>
                <div className="space-y-2 text-left">
                  <h4 className="font-medium">Requirements:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {feature.requirements.map((req, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button 
                  onClick={simulateCompatibilityCheck} 
                  disabled={isInstalling}
                  className="w-full"
                >
                  {isInstalling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Start Compatibility Check'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <Shield className="h-12 w-12 mx-auto text-primary mb-4" />
                  <h3 className="text-lg font-semibold">Permission Requests</h3>
                  <p className="text-muted-foreground">
                    {feature.displayName} requires the following permissions to function properly.
                  </p>
                </div>
                
                <div className="space-y-3">
                  {feature.permissions.map((permission, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Checkbox
                        id={`permission-${index}`}
                        checked={acceptedPermissions.includes(permission)}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(permission, checked as boolean)
                        }
                      />
                      <label 
                        htmlFor={`permission-${index}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {permission}
                      </label>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(3)} 
                    disabled={!allPermissionsAccepted}
                    className="flex-1"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <Settings className="h-12 w-12 mx-auto text-primary mb-4" />
                  <h3 className="text-lg font-semibold">Configuration Preview</h3>
                  <p className="text-muted-foreground">
                    Review the settings before installation.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Feature:</span>
                      <p className="text-muted-foreground">{feature.displayName}</p>
                    </div>
                    <div>
                      <span className="font-medium">Required Plan:</span>
                      <Badge variant="outline" className="ml-1 capitalize">
                        {feature.compatibility.minPlan}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Permissions:</span>
                      <p className="text-muted-foreground">{acceptedPermissions.length} granted</p>
                    </div>
                    <div>
                      <span className="font-medium">Integration:</span>
                      <p className="text-muted-foreground">
                        {feature.compatibility.requiresIntegration ? 'Required' : 'Not required'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={startInstallation} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Install Feature
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="text-center">
                  <Download className="h-12 w-12 mx-auto text-primary mb-4" />
                  <h3 className="text-lg font-semibold">Installing {feature.displayName}</h3>
                  <p className="text-muted-foreground">
                    Please wait while we install and configure the feature.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Installation Progress</span>
                      <span>{Math.round(installProgress)}%</span>
                    </div>
                    <Progress value={installProgress} className="h-2" />
                  </div>

                  <div className="space-y-3">
                    {installationSteps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        {step.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {step.status === 'in-progress' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                        {step.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                        {step.status === 'pending' && <div className="h-5 w-5 rounded-full bg-muted" />}
                        
                        <div className="flex-1">
                          <div className="font-medium text-sm">{step.title}</div>
                          <div className="text-xs text-muted-foreground">{step.description}</div>
                          {step.error && (
                            <div className="text-xs text-red-500 mt-1">{step.error}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
                <h3 className="text-xl font-semibold">Installation Complete!</h3>
                <p className="text-muted-foreground">
                  {feature.displayName} has been successfully installed and is ready to use.
                </p>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Close
                  </Button>
                  <Button onClick={onComplete} className="flex-1">
                    Get Started
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl">Install {feature.displayName}</DialogTitle>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-between mt-4">
            {[1, 2, 3, 4, 5].map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  {getStepIcon(step)}
                  <span className="text-xs mt-1 text-muted-foreground">
                    Step {step}
                  </span>
                </div>
                {index < 4 && (
                  <div className={`flex-1 h-px mx-2 ${
                    step < currentStep ? 'bg-green-500' : 'bg-muted'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </DialogHeader>

        <div className="py-4">
          {renderStepContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}