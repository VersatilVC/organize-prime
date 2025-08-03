import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Icons } from '@/components/ui/icons';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

interface FeatureDetail {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  detailedDescription: string;
  category: string;
  iconName: keyof typeof Icons;
  pricing: 'free' | 'premium';
  status: 'available' | 'installed' | 'requires_upgrade';
  features: string[];
  screenshots: string[];
  version: string;
  lastUpdated: string;
}

// Mock data - in a real app this would come from an API
const mockFeatureDetails: Record<string, FeatureDetail> = {
  'knowledge-base': {
    id: '1',
    slug: 'knowledge-base',
    displayName: 'Knowledge Base',
    description: 'Create and manage comprehensive documentation and knowledge articles for your team',
    detailedDescription: 'The Knowledge Base feature provides a comprehensive solution for creating, organizing, and managing documentation within your organization. Build searchable articles, create category hierarchies, and enable team collaboration on documentation. Perfect for onboarding new team members, maintaining process documentation, and sharing institutional knowledge.',
    category: 'productivity',
    iconName: 'book',
    pricing: 'free',
    status: 'available',
    features: [
      'Rich text editor with markdown support',
      'Article categorization and tagging',
      'Advanced search functionality',
      'Team collaboration and comments',
      'Version history and revisions',
      'Public and private articles',
      'Analytics and usage tracking'
    ],
    screenshots: [],
    version: '2.1.0',
    lastUpdated: '2024-02-15'
  },
  'usage-analytics': {
    id: '2',
    slug: 'usage-analytics',
    displayName: 'Usage Analytics',
    description: 'Advanced insights into user behavior and platform performance with detailed reports',
    detailedDescription: 'Get deep insights into how your platform is being used with comprehensive analytics. Track user engagement, feature adoption, performance metrics, and generate custom reports. Make data-driven decisions to improve your platform and user experience.',
    category: 'analytics',
    iconName: 'barChart',
    pricing: 'premium',
    status: 'installed',
    features: [
      'Real-time user activity tracking',
      'Feature usage statistics',
      'Custom dashboard creation',
      'Automated report generation',
      'User journey analysis',
      'Performance monitoring',
      'Data export capabilities',
      'Integration with external tools'
    ],
    screenshots: [],
    version: '3.2.1',
    lastUpdated: '2024-02-20'
  }
};

export default function FeatureDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useUserRole();

  const feature = slug ? mockFeatureDetails[slug] : null;
  const canInstall = role === 'admin' || role === 'super_admin';

  if (!feature) {
    return (
      <AppLayout>
        <div className="container mx-auto px-6 py-6 max-w-4xl">
          <div className="text-center py-16">
            <Icons.search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Feature Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The feature you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/marketplace')}>
              Back to Marketplace
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const IconComponent = Icons[feature.iconName];

  const handleInstall = () => {
    if (!canInstall) {
      toast({
        title: "Permission Required",
        description: "Please contact your admin to install features.",
        variant: "default"
      });
      return;
    }

    toast({
      title: "Feature Installed",
      description: `${feature.displayName} has been successfully installed.`,
    });
  };

  const handleConfigure = () => {
    toast({
      title: "Configuration",
      description: `Opening configuration for ${feature.displayName}...`,
    });
  };

  const getPricingBadgeVariant = (pricing: string) => {
    return pricing === 'free' ? 'outline' : 'default';
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-6 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/marketplace">Feature Marketplace</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{feature.displayName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Feature Header */}
        <div className="mb-8">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-primary/10 rounded-lg">
              <IconComponent className="h-12 w-12 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{feature.displayName}</h1>
                <Badge variant="secondary" className="capitalize">
                  {feature.category}
                </Badge>
                <Badge variant={getPricingBadgeVariant(feature.pricing)} className="capitalize">
                  {feature.pricing}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground mb-4">
                {feature.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Version {feature.version}</span>
                <span>•</span>
                <span>Updated {new Date(feature.lastUpdated).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {feature.status === 'installed' ? (
                <Button onClick={handleConfigure}>
                  <Icons.settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              ) : (
                <Button onClick={handleInstall} disabled={!canInstall}>
                  <Icons.download className="h-4 w-4 mr-2" />
                  {canInstall ? 'Install' : 'Contact Admin'}
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate('/marketplace')}>
                <Icons.arrowLeft className="h-4 w-4 mr-2" />
                Back to Marketplace
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Feature</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.detailedDescription}
                </p>
              </CardContent>
            </Card>

            {/* Features List */}
            <Card>
              <CardHeader>
                <CardTitle>What's Included</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {feature.features.map((featureItem, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Icons.checkCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{featureItem}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Screenshots/Media Gallery Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Screenshots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i}
                      className="aspect-video bg-muted rounded-lg flex items-center justify-center"
                    >
                      <Icons.image className="h-8 w-8 text-muted-foreground" />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Screenshots and demo videos coming soon.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Installation Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Installation Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={feature.status === 'installed' ? 'default' : 'outline'}>
                      {feature.status === 'installed' ? 'Installed' : 'Available'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Version</span>
                    <span className="text-sm font-medium">{feature.version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pricing</span>
                    <Badge variant={getPricingBadgeVariant(feature.pricing)} className="capitalize">
                      {feature.pricing}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {feature.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Browse more features in this category
                </p>
              </CardContent>
            </Card>

            {/* Support */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Icons.book className="h-4 w-4 mr-2" />
                    Documentation
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Icons.messageSquare className="h-4 w-4 mr-2" />
                    Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}