import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Star, Download, Shield, Zap, Users, X } from 'lucide-react';
import { Icons } from '@/components/ui/icons';
import { FeatureReviews } from './FeatureReviews';
import { InstallationModal } from './InstallationModal';

interface MarketplaceFeature {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  longDescription: string;
  category: string;
  iconName: string;
  screenshots: string[] | null;
  pricing: string;
  rating: number;
  reviewCount: number;
  installCount: number;
  requirements: string[];
  permissions: string[];
  features: string[];
  status: 'available' | 'installed' | 'requires_upgrade';
  compatibility: {
    minPlan: string;
    requiresIntegration: boolean;
  };
}

interface FeatureDetailModalProps {
  feature: MarketplaceFeature | null;
  isOpen: boolean;
  onClose: () => void;
  onInstall: (feature: MarketplaceFeature) => void;
  canInstall: boolean;
}

export function FeatureDetailModal({ feature, isOpen, onClose, onInstall, canInstall }: FeatureDetailModalProps) {
  const [showInstallModal, setShowInstallModal] = useState(false);

  if (!feature) return null;

  const IconComponent = Icons[feature.iconName];
  
  const handleInstall = () => {
    if (canInstall) {
      setShowInstallModal(true);
    }
  };

  const getPricingBadgeVariant = (pricing: string) => {
    switch (pricing) {
      case 'free': return 'outline';
      case 'premium': return 'default';
      case 'enterprise': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'installed': return 'text-green-600';
      case 'requires_upgrade': return 'text-orange-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <IconComponent className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">{feature.displayName}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="capitalize">
                      {feature.category}
                    </Badge>
                    <Badge variant={getPricingBadgeVariant(feature.pricing)} className="capitalize">
                      {feature.pricing}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{feature.rating}</span>
                      <span>({feature.reviewCount} reviews)</span>
                    </div>
                  </div>
                </div>
              </div>
              <DialogClose asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="overview" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4">
                <TabsContent value="overview" className="space-y-6 mt-0">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground">{feature.longDescription}</p>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">Key Features</h3>
                        <ul className="space-y-2">
                          {feature.features.map((item, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-primary" />
                              <span className="text-sm">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <Download className="h-5 w-5 mx-auto mb-1 text-primary" />
                          <div className="text-sm font-medium">{feature.installCount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">Installs</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                          <div className="text-sm font-medium">{feature.rating}/5</div>
                          <div className="text-xs text-muted-foreground">Rating</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <Users className="h-5 w-5 mx-auto mb-1 text-green-500" />
                          <div className="text-sm font-medium">{feature.reviewCount}</div>
                          <div className="text-xs text-muted-foreground">Reviews</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Screenshots</h3>
                      <Carousel className="w-full max-w-xs mx-auto">
                        <CarouselContent>
                          {(feature.screenshots || []).map((screenshot, index) => (
                            <CarouselItem key={index}>
                              <div className="p-1">
                                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                  <span className="text-muted-foreground">Screenshot {index + 1}</span>
                                </div>
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                      </Carousel>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="requirements" className="space-y-6 mt-0">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Technical Requirements
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {feature.requirements.map((req, index) => (
                            <li key={index} className="text-sm text-muted-foreground">
                              • {req}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Plan Compatibility
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm font-medium">Minimum Plan:</span>
                            <Badge variant="outline" className="ml-2 capitalize">
                              {feature.compatibility.minPlan}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-sm font-medium">Integration Required:</span>
                            <span className="ml-2 text-sm text-muted-foreground">
                              {feature.compatibility.requiresIntegration ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div>
                            <span className="text-sm font-medium">Permissions:</span>
                            <ul className="mt-2 space-y-1">
                              {feature.permissions.map((permission, index) => (
                                <li key={index} className="text-sm text-muted-foreground">
                                  • {permission}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="reviews" className="mt-0">
                  <FeatureReviews featureId={feature.id} />
                </TabsContent>
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getStatusColor(feature.status)}`}>
                      {feature.status === 'installed' ? 'Installed' : 
                       feature.status === 'requires_upgrade' ? 'Requires Upgrade' : 'Available'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose}>
                      Close
                    </Button>
                    {feature.status === 'installed' ? (
                      <Button variant="outline">
                        Configure
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleInstall}
                        disabled={!canInstall || feature.status === 'requires_upgrade'}
                      >
                        {!canInstall ? 'Contact Admin' : 
                         feature.status === 'requires_upgrade' ? 'Upgrade Required' : 'Install'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <InstallationModal
        feature={feature}
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        onComplete={() => {
          setShowInstallModal(false);
          onInstall(feature);
          onClose();
        }}
      />
    </>
  );
}