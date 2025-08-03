import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/ui/icons';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';

interface MarketplaceFeature {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  category: 'productivity' | 'analytics' | 'automation' | 'intelligence';
  iconName: keyof typeof Icons;
  pricing: 'free' | 'premium' | 'enterprise';
  rating: number; // 0-5
  installCount: number;
  status: 'available' | 'installed' | 'requires_upgrade';
  featured: boolean;
  isNew: boolean;
}

// Mock data
const mockFeatures: MarketplaceFeature[] = [
  // Featured
  {
    id: '1',
    slug: 'knowledge-base',
    displayName: 'Knowledge Base',
    description: 'Create and manage comprehensive documentation and knowledge articles',
    category: 'productivity',
    iconName: 'book',
    pricing: 'free',
    rating: 4.8,
    installCount: 15420,
    status: 'available',
    featured: true,
    isNew: false
  },
  {
    id: '2',
    slug: 'usage-analytics',
    displayName: 'Usage Analytics',
    description: 'Advanced insights into user behavior and platform performance',
    category: 'analytics',
    iconName: 'barChart',
    pricing: 'premium',
    rating: 4.9,
    installCount: 8930,
    status: 'installed',
    featured: true,
    isNew: false
  },
  {
    id: '3',
    slug: 'workflow-builder',
    displayName: 'Workflow Builder',
    description: 'Visual workflow automation with drag-and-drop interface',
    category: 'automation',
    iconName: 'workflow',
    pricing: 'enterprise',
    rating: 4.7,
    installCount: 5640,
    status: 'requires_upgrade',
    featured: true,
    isNew: true
  },
  // New This Month
  {
    id: '4',
    slug: 'market-research',
    displayName: 'Market Research',
    description: 'AI-powered market analysis and competitor intelligence',
    category: 'intelligence',
    iconName: 'trendingUp',
    pricing: 'premium',
    rating: 4.6,
    installCount: 2340,
    status: 'available',
    featured: false,
    isNew: true
  },
  {
    id: '5',
    slug: 'content-creation',
    displayName: 'Content Creation',
    description: 'AI-assisted content generation and editing tools',
    category: 'productivity',
    iconName: 'edit',
    pricing: 'premium',
    rating: 4.5,
    installCount: 3200,
    status: 'available',
    featured: false,
    isNew: true
  },
  // Productivity
  {
    id: '6',
    slug: 'project-management',
    displayName: 'Project Management',
    description: 'Complete project tracking with Gantt charts and team collaboration',
    category: 'productivity',
    iconName: 'checkSquare',
    pricing: 'free',
    rating: 4.4,
    installCount: 12800,
    status: 'available',
    featured: false,
    isNew: false
  },
  // Analytics
  {
    id: '7',
    slug: 'financial-reports',
    displayName: 'Financial Reports',
    description: 'Comprehensive financial analytics and automated reporting',
    category: 'analytics',
    iconName: 'dollarSign',
    pricing: 'enterprise',
    rating: 4.7,
    installCount: 4560,
    status: 'available',
    featured: false,
    isNew: false
  },
  {
    id: '8',
    slug: 'competitor-tracking',
    displayName: 'Competitor Tracking',
    description: 'Monitor competitor activities and market positioning',
    category: 'analytics',
    iconName: 'target',
    pricing: 'premium',
    rating: 4.3,
    installCount: 2870,
    status: 'available',
    featured: false,
    isNew: false
  },
  // Automation
  {
    id: '9',
    slug: 'api-integration',
    displayName: 'API Integration',
    description: 'Connect with external services through custom API configurations',
    category: 'automation',
    iconName: 'link',
    pricing: 'premium',
    rating: 4.6,
    installCount: 6740,
    status: 'installed',
    featured: false,
    isNew: false
  },
  {
    id: '10',
    slug: 'data-sync',
    displayName: 'Data Sync',
    description: 'Real-time data synchronization across multiple platforms',
    category: 'automation',
    iconName: 'refresh',
    pricing: 'enterprise',
    rating: 4.8,
    installCount: 3450,
    status: 'available',
    featured: false,
    isNew: false
  },
  // Intelligence
  {
    id: '11',
    slug: 'funding-tracker',
    displayName: 'Funding Tracker',
    description: 'Track startup funding rounds and investment opportunities',
    category: 'intelligence',
    iconName: 'piggyBank',
    pricing: 'premium',
    rating: 4.2,
    installCount: 1920,
    status: 'available',
    featured: false,
    isNew: false
  },
  {
    id: '12',
    slug: 'job-posting-monitor',
    displayName: 'Job Posting Monitor',
    description: 'Monitor competitor job postings and hiring trends',
    category: 'intelligence',
    iconName: 'briefcase',
    pricing: 'free',
    rating: 4.0,
    installCount: 5670,
    status: 'available',
    featured: false,
    isNew: false
  }
];

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'automation', label: 'Automation' },
  { value: 'intelligence', label: 'Intelligence' }
];

const sortOptions = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name' },
  { value: 'rating', label: 'Rating' }
];

export default function Marketplace() {
  const { role } = useUserRole();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [loading, setLoading] = useState(false);

  const canInstall = role === 'admin' || role === 'super_admin';

  // Filter and sort features
  const filteredFeatures = useMemo(() => {
    let filtered = mockFeatures.filter(feature => {
      const matchesSearch = feature.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           feature.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort features
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return Number(b.isNew) - Number(a.isNew);
        case 'name':
          return a.displayName.localeCompare(b.displayName);
        case 'rating':
          return b.rating - a.rating;
        case 'popular':
        default:
          return b.installCount - a.installCount;
      }
    });

    return filtered;
  }, [searchQuery, selectedCategory, sortBy]);

  const featuredFeatures = mockFeatures.filter(f => f.featured);
  const newFeatures = mockFeatures.filter(f => f.isNew);
  const installedCount = mockFeatures.filter(f => f.status === 'installed').length;

  const handleInstall = (feature: MarketplaceFeature) => {
    if (!canInstall) {
      toast({
        title: "Permission Required",
        description: "Please contact your admin to install features.",
        variant: "default"
      });
      return;
    }

    setLoading(true);
    // Simulate installation
    setTimeout(() => {
      toast({
        title: "Feature Installed",
        description: `${feature.displayName} has been successfully installed.`,
      });
      setLoading(false);
    }, 2000);
  };

  const getPricingBadgeVariant = (pricing: MarketplaceFeature['pricing']) => {
    switch (pricing) {
      case 'free': return 'secondary';
      case 'premium': return 'default';
      case 'enterprise': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusBadgeVariant = (status: MarketplaceFeature['status']) => {
    switch (status) {
      case 'installed': return 'default';
      case 'requires_upgrade': return 'destructive';
      case 'available': return 'outline';
      default: return 'outline';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Icons.star
            key={star}
            className={`h-3 w-3 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            }`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">{rating}</span>
      </div>
    );
  };

  const FeatureCard = ({ feature }: { feature: MarketplaceFeature }) => {
    const IconComponent = Icons[feature.iconName];
    
    return (
      <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <IconComponent className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base line-clamp-1">{feature.displayName}</CardTitle>
                {feature.isNew && (
                  <Badge variant="secondary" className="text-xs mt-1">New</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <CardDescription className="line-clamp-2 mb-3">
            {feature.description}
          </CardDescription>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {feature.category}
              </Badge>
              <Badge variant={getPricingBadgeVariant(feature.pricing)} className="text-xs">
                {feature.pricing}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              {renderStars(feature.rating)}
              <span className="text-xs text-muted-foreground">
                {feature.installCount.toLocaleString()} installs
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <div className="w-full space-y-2">
            <Badge 
              variant={getStatusBadgeVariant(feature.status)} 
              className="w-full justify-center text-xs"
            >
              {feature.status === 'installed' ? 'Installed' : 
               feature.status === 'requires_upgrade' ? 'Requires Upgrade' : 'Available'}
            </Badge>
            <Button
              className="w-full"
              size="sm"
              variant={feature.status === 'installed' ? 'outline' : 'default'}
              onClick={() => handleInstall(feature)}
              disabled={loading}
            >
              {!canInstall ? 'Contact Admin' :
               feature.status === 'installed' ? 'Configure' : 'Install'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };

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
              <Icons.search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

        {/* Featured Section */}
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 rounded-lg border">
            <h2 className="text-2xl font-bold mb-4">Featured</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredFeatures.map((feature) => (
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

        {/* All Features Grid */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">
            All Features 
            {searchQuery && ` (${filteredFeatures.length} results)`}
          </h2>
          
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredFeatures.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFeatures.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Icons.search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No features found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {searchQuery 
                  ? `No features match "${searchQuery}". Try adjusting your search or filters.`
                  : selectedCategory !== 'all' 
                    ? `No features available in the ${selectedCategory} category.`
                    : 'No features are currently available.'
                }
              </p>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}