import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/ui/icons';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { FeatureDetailModal } from '@/components/marketplace/FeatureDetailModal';
import { MoreVertical, Settings, Trash2, Search, Star } from 'lucide-react';
import { 
  useMarketplaceApps, 
  useAppInstallations, 
  useInstallApp, 
  useUninstallApp, 
  useTrackAppView,
  type MarketplaceApp 
} from '@/hooks/database/useMarketplaceApps';
import { useAppCategories } from '@/hooks/database/useAppCategories';

// Extended interface for marketplace features with installation status
interface MarketplaceFeatureExtended extends MarketplaceApp {
  status: 'available' | 'installed' | 'requires_upgrade';
  featured: boolean;
  isNew: boolean;
  displayName: string;
  longDescription: string;
  iconName: string;
  requirements: string[];
  permissions: string[];
  features: string[];
  compatibility: {
    minPlan: string;
    requiresIntegration: boolean;
  };
  // Modal compatibility
  pricing: string;
  rating: number;
  reviewCount: number;
  installCount: number;
}

const sortOptions = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name' },
  { value: 'rating', label: 'Rating' },
  { value: 'installs', label: 'Install Count' }
];

export default function Marketplace() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [selectedFeature, setSelectedFeature] = useState<MarketplaceFeatureExtended | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Database queries
  const { data: apps = [], isLoading: appsLoading, error: appsError } = useMarketplaceApps();
  const { data: installations = [], isLoading: installationsLoading } = useAppInstallations();
  const { data: categories = [], isLoading: categoriesLoading } = useAppCategories();
  const installAppMutation = useInstallApp();
  const uninstallAppMutation = useUninstallApp();
  const trackAppViewMutation = useTrackAppView();

  const canInstall = role === 'admin' || role === 'super_admin';

  // Create lookup for installed apps
  const installedAppsLookup = useMemo(() => {
    const lookup: Record<string, boolean> = {};
    installations.forEach(installation => {
      lookup[installation.app_id] = true;
    });
    return lookup;
  }, [installations]);

  // Transform apps to extended interface
  const transformedApps = useMemo(() => {
    return apps.map(app => ({
      ...app,
      displayName: app.name,
      longDescription: app.long_description || app.description,
      iconName: app.icon_name,
      status: installedAppsLookup[app.id] ? 'installed' as const : 'available' as const,
      featured: app.is_featured,
      isNew: new Date(app.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // New if created in last 30 days
      requirements: app.app_config?.requirements || [],
      permissions: app.required_permissions || [],
      features: app.app_config?.features || [],
      compatibility: {
        minPlan: app.app_config?.minPlan || 'free',
        requiresIntegration: app.app_config?.requiresIntegration || false,
      },
      // Modal compatibility
      pricing: app.pricing_model,
      rating: app.rating_average,
      reviewCount: app.rating_count,
      installCount: app.install_count,
    })) as MarketplaceFeatureExtended[];
  }, [apps, installedAppsLookup]);

  // Category options from database
  const categoryOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Categories' }];
    categories.forEach(category => {
      options.push({ value: category.slug, label: category.name });
    });
    return options;
  }, [categories]);

  const navigateToFeatureDetails = (feature: MarketplaceFeatureExtended) => {
    setSelectedFeature(feature);
    setShowDetailModal(true);
    
    // Track app view
    trackAppViewMutation.mutate({ 
      appId: feature.id, 
      pageData: { source: 'marketplace', action: 'view_details' } 
    });
  };

  // Filter and sort features
  const filteredFeatures = useMemo(() => {
    let filtered = transformedApps.filter(feature => {
      const matchesSearch = feature.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           feature.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           feature.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort features
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'name':
          return a.displayName.localeCompare(b.displayName);
        case 'rating':
          return b.rating_average - a.rating_average;
        case 'installs':
          return b.install_count - a.install_count;
        case 'popular':
        default:
          return Number(b.featured) - Number(a.featured) || b.install_count - a.install_count;
      }
    });

    return filtered;
  }, [transformedApps, searchQuery, selectedCategory, sortBy]);

  const featuredFeatures = transformedApps.filter(f => f.featured);
  const newFeatures = transformedApps.filter(f => f.isNew);
  const installedCount = transformedApps.filter(f => f.status === 'installed').length;

  const handleFeatureAction = (feature: MarketplaceFeatureExtended) => {
    if (!canInstall) {
      toast({
        title: "Permission Required",
        description: "Please contact your admin to install features.",
        variant: "default"
      });
      return;
    }

    if (feature.status === 'installed') {
      navigateToFeatureDetails(feature);
      return;
    }

    // For available features, open detail modal for installation
    setSelectedFeature(feature);
    setShowDetailModal(true);
  };

  const handleFeatureInstall = async (feature: any) => {
    try {
      await installAppMutation.mutateAsync({ 
        appId: feature.id,
        appSettings: { 
          source: 'marketplace',
          installed_version: feature.version,
        }
      });
      setShowDetailModal(false);
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const handleUninstallFeature = async (feature: MarketplaceFeatureExtended) => {
    try {
      await uninstallAppMutation.mutateAsync(feature.id);
    } catch (error) {
      console.error('Uninstall failed:', error);
    }
  };

  const getPricingBadgeVariant = (pricing: string) => {
    switch (pricing) {
      case 'free': return 'outline';
      case 'paid': return 'default';
      case 'freemium': return 'secondary';
      default: return 'outline';
    }
  };

  const FeatureCard = ({ feature }: { feature: MarketplaceFeatureExtended }) => {
    const IconComponent = Icons[feature.iconName as keyof typeof Icons] || Icons.package;
    
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle 
                className="text-lg font-semibold hover:text-primary cursor-pointer line-clamp-1"
                onClick={() => navigateToFeatureDetails(feature)}
              >
                {feature.displayName}
                {feature.isNew && (
                  <Badge variant="secondary" className="text-xs ml-2">New</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {feature.description}
              </CardDescription>
              
              {/* Rating and install count */}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{feature.rating_average.toFixed(1)}</span>
                  <span>({feature.rating_count})</span>
                </div>
                <span>{feature.install_count.toLocaleString()} installs</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end flex-shrink-0 w-24">
              <Badge variant="secondary" className="text-xs capitalize w-full text-center justify-center">
                {feature.category}
              </Badge>
              <Badge variant={getPricingBadgeVariant(feature.pricing_model)} className="text-xs capitalize w-full text-center justify-center">
                {feature.pricing_model}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="w-full">
            {feature.status === 'installed' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <MoreVertical className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigateToFeatureDetails(feature)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleUninstallFeature(feature)}
                    className="text-red-600"
                    disabled={uninstallAppMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {uninstallAppMutation.isPending ? 'Uninstalling...' : 'Uninstall'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                size="sm" 
                className="w-full"
                variant={!canInstall ? "outline" : "default"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFeatureAction(feature);
                }}
                disabled={roleLoading || !canInstall || installAppMutation.isPending}
              >
                {roleLoading ? '...' : 
                 installAppMutation.isPending ? 'Installing...' :
                 !canInstall ? 'Contact Admin' : 'Install'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const LoadingSkeleton = () => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (appsError) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-600">Error Loading Marketplace</h1>
            <p className="text-muted-foreground">
              {appsError.message || 'Failed to load marketplace apps. Please try again later.'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Feature Marketplace</h1>
              <p className="text-muted-foreground">
                Discover and install features to enhance your platform
              </p>
            </div>
            <Badge variant="secondary" className="w-fit">
              {installedCount} Installed Features
            </Badge>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {(appsLoading || installationsLoading || categoriesLoading) && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 rounded-lg border">
              <Skeleton className="h-8 w-32 mb-4" />
              <LoadingSkeleton />
            </div>
          </div>
        )}

        {/* Content when loaded */}
        {!appsLoading && !installationsLoading && (
          <>
            {/* Featured Section */}
            {featuredFeatures.length > 0 && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 rounded-lg border">
                  <h2 className="text-2xl font-bold mb-4">Featured</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featuredFeatures.slice(0, 6).map((feature) => (
                      <FeatureCard key={feature.id} feature={feature} />
                    ))}
                  </div>
                </div>

                {/* New This Month */}
                {newFeatures.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">New This Month</h2>
                    <ScrollArea>
                      <div className="flex gap-4 pb-4">
                        {newFeatures.map((feature) => (
                          <div key={feature.id} className="flex-none w-72">
                            <FeatureCard feature={feature} />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}

            {/* All Features Grid */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">
                All Features 
                {searchQuery && ` (${filteredFeatures.length} results)`}
              </h2>
              
              {filteredFeatures.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFeatures.map((feature) => (
                    <FeatureCard key={feature.id} feature={feature} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="space-y-4">
                    <div className="text-muted-foreground">
                      <Icons.search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No features found</p>
                      <p className="text-sm">
                        {searchQuery 
                          ? `No features match "${searchQuery}"` 
                          : "No features available in this category"
                        }
                      </p>
                    </div>
                    {searchQuery && (
                      <Button variant="outline" onClick={() => setSearchQuery('')}>
                        Clear search
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Feature Detail Modal */}
      <FeatureDetailModal
        feature={selectedFeature}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onInstall={handleFeatureInstall}
        canInstall={canInstall}
      />
    </AppLayout>
  );
}