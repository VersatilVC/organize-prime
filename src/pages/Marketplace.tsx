import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  category: string;
  iconName: keyof typeof Icons;
  pricing: 'free' | 'premium';
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
    description: 'Create and manage comprehensive documentation and knowledge articles for your team',
    category: 'productivity',
    iconName: 'book',
    pricing: 'free',
    status: 'available',
    featured: true,
    isNew: false
  },
  {
    id: '2',
    slug: 'usage-analytics',
    displayName: 'Usage Analytics',
    description: 'Advanced insights into user behavior and platform performance with detailed reports',
    category: 'analytics',
    iconName: 'barChart',
    pricing: 'premium',
    status: 'installed',
    featured: true,
    isNew: false
  },
  {
    id: '3',
    slug: 'workflow-builder',
    displayName: 'Workflow Builder',
    description: 'Visual workflow automation with drag-and-drop interface for complex processes',
    category: 'automation',
    iconName: 'workflow',
    pricing: 'premium',
    status: 'requires_upgrade',
    featured: true,
    isNew: true
  },
  // New This Month
  {
    id: '4',
    slug: 'market-research',
    displayName: 'Market Research',
    description: 'AI-powered market analysis and competitor intelligence for strategic planning',
    category: 'intelligence',
    iconName: 'trendingUp',
    pricing: 'premium',
    status: 'available',
    featured: false,
    isNew: true
  },
  {
    id: '5',
    slug: 'content-creation',
    displayName: 'Content Creation',
    description: 'AI-assisted content generation and editing tools for marketing teams',
    category: 'productivity',
    iconName: 'edit',
    pricing: 'premium',
    status: 'available',
    featured: false,
    isNew: true
  },
  // Productivity
  {
    id: '6',
    slug: 'project-management',
    displayName: 'Project Management',
    description: 'Complete project tracking with Gantt charts and team collaboration tools',
    category: 'productivity',
    iconName: 'checkSquare',
    pricing: 'free',
    status: 'available',
    featured: false,
    isNew: false
  },
  // Analytics
  {
    id: '7',
    slug: 'financial-reports',
    displayName: 'Financial Reports',
    description: 'Comprehensive financial analytics and automated reporting for business insights',
    category: 'analytics',
    iconName: 'dollarSign',
    pricing: 'premium',
    status: 'available',
    featured: false,
    isNew: false
  },
  {
    id: '8',
    slug: 'competitor-tracking',
    displayName: 'Competitor Tracking',
    description: 'Monitor competitor activities and market positioning in real-time',
    category: 'analytics',
    iconName: 'target',
    pricing: 'premium',
    status: 'available',
    featured: false,
    isNew: false
  },
  // Automation
  {
    id: '9',
    slug: 'api-integration',
    displayName: 'API Integration',
    description: 'Connect with external services through custom API configurations and webhooks',
    category: 'automation',
    iconName: 'link',
    pricing: 'premium',
    status: 'installed',
    featured: false,
    isNew: false
  },
  {
    id: '10',
    slug: 'data-sync',
    displayName: 'Data Sync',
    description: 'Real-time data synchronization across multiple platforms and services',
    category: 'automation',
    iconName: 'refresh',
    pricing: 'premium',
    status: 'available',
    featured: false,
    isNew: false
  },
  // Intelligence
  {
    id: '11',
    slug: 'funding-tracker',
    displayName: 'Funding Tracker',
    description: 'Track startup funding rounds and investment opportunities in your market',
    category: 'intelligence',
    iconName: 'piggyBank',
    pricing: 'premium',
    status: 'available',
    featured: false,
    isNew: false
  },
  {
    id: '12',
    slug: 'job-posting-monitor',
    displayName: 'Job Posting Monitor',
    description: 'Monitor competitor job postings and hiring trends for talent intelligence',
    category: 'intelligence',
    iconName: 'briefcase',
    pricing: 'free',
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
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [loading, setLoading] = useState(false);

  const canInstall = role === 'admin' || role === 'super_admin';

  const navigateToFeatureDetails = (slug: string) => {
    navigate(`/marketplace/feature/${slug}`);
  };

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
        case 'popular':
        default:
          return Number(b.featured) - Number(a.featured);
      }
    });

    return filtered;
  }, [searchQuery, selectedCategory, sortBy]);

  const featuredFeatures = mockFeatures.filter(f => f.featured);
  const newFeatures = mockFeatures.filter(f => f.isNew);
  const installedCount = mockFeatures.filter(f => f.status === 'installed').length;

  const handleFeatureAction = (feature: MarketplaceFeature) => {
    if (!canInstall) {
      toast({
        title: "Permission Required",
        description: "Please contact your admin to install features.",
        variant: "default"
      });
      return;
    }

    if (feature.status === 'installed') {
      navigateToFeatureDetails(feature.slug);
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
      case 'free': return 'outline';
      case 'premium': return 'default';
      default: return 'outline';
    }
  };

  const FeatureCard = ({ feature }: { feature: MarketplaceFeature }) => {
    const IconComponent = Icons[feature.iconName];
    
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle 
                className="text-lg font-semibold hover:text-primary cursor-pointer line-clamp-1"
                onClick={() => navigateToFeatureDetails(feature.slug)}
              >
                {feature.displayName}
                {feature.isNew && (
                  <Badge variant="secondary" className="text-xs ml-2">New</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {feature.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs capitalize">
                {feature.category}
              </Badge>
              <Badge variant={getPricingBadgeVariant(feature.pricing)} className="text-xs capitalize">
                {feature.pricing}
              </Badge>
            </div>
            <Button 
              size="sm" 
              variant={feature.status === 'installed' ? 'outline' : 'default'}
              onClick={(e) => {
                e.stopPropagation();
                handleFeatureAction(feature);
              }}
              disabled={loading || roleLoading}
            >
              {roleLoading ? '...' : 
               !canInstall ? 'Contact Admin' :
               feature.status === 'installed' ? 'Configure' : 'Install'}
            </Button>
          </div>
        </CardContent>
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