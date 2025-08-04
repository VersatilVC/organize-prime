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
import { Icons } from '@/components/ui/icons';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { FeatureDetailModal } from '@/components/marketplace/FeatureDetailModal';
import { MoreVertical, Settings, Trash2 } from 'lucide-react';

interface MarketplaceFeatureExtended {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  longDescription: string;
  category: string;
  iconName: keyof typeof Icons;
  pricing: 'free' | 'premium' | 'enterprise';
  status: 'available' | 'installed' | 'requires_upgrade';
  featured: boolean;
  isNew: boolean;
  screenshots: string[];
  rating: number;
  reviewCount: number;
  installCount: number;
  requirements: string[];
  permissions: string[];
  features: string[];
  compatibility: {
    minPlan: 'free' | 'basic' | 'pro' | 'enterprise';
    requiresIntegration: boolean;
  };
}

// Mock data with extended information
const mockFeatures: MarketplaceFeatureExtended[] = [
  // Featured
  {
    id: '1',
    slug: 'knowledge-base',
    displayName: 'Knowledge Base',
    description: 'Create and manage comprehensive documentation and knowledge articles for your team',
    longDescription: 'Transform your team\'s knowledge management with our comprehensive Knowledge Base feature. Create, organize, and maintain documentation that grows with your organization. Features advanced search capabilities, version control, and collaborative editing tools that make knowledge sharing seamless and efficient.',
    category: 'productivity',
    iconName: 'book',
    pricing: 'free',
    status: 'available',
    featured: true,
    isNew: false,
    screenshots: ['kb-1.jpg', 'kb-2.jpg', 'kb-3.jpg'],
    rating: 4.8,
    reviewCount: 127,
    installCount: 15420,
    requirements: [
      'Organization admin privileges',
      'Minimum 2GB storage space',
      'Modern web browser'
    ],
    permissions: [
      'Read and write access to knowledge articles',
      'Manage article categories and tags',
      'Access to user analytics'
    ],
    features: [
      'Rich text editor with markdown support',
      'Advanced search with filters',
      'Version history and rollback',
      'Collaborative editing',
      'Custom categorization',
      'Analytics and insights'
    ],
    compatibility: {
      minPlan: 'free',
      requiresIntegration: false
    }
  },
  {
    id: '2',
    slug: 'usage-analytics',
    displayName: 'Usage Analytics',
    description: 'Advanced insights into user behavior and platform performance with detailed reports',
    longDescription: 'Gain deep insights into how your platform is being used with our comprehensive Usage Analytics feature. Track user behavior, monitor performance metrics, and generate detailed reports that help you make data-driven decisions. Features real-time dashboards, custom report builders, and automated insights.',
    category: 'analytics',
    iconName: 'barChart',
    pricing: 'premium',
    status: 'installed',
    featured: true,
    isNew: false,
    screenshots: ['analytics-1.jpg', 'analytics-2.jpg', 'analytics-3.jpg'],
    rating: 4.6,
    reviewCount: 89,
    installCount: 8932,
    requirements: [
      'Premium plan or higher',
      'Analytics tracking enabled',
      'Data retention policy configured'
    ],
    permissions: [
      'Access to user activity logs',
      'View analytics dashboards',
      'Export analytics data',
      'Configure tracking settings'
    ],
    features: [
      'Real-time user activity tracking',
      'Custom dashboard builder',
      'Automated report generation',
      'Data export capabilities',
      'Performance monitoring',
      'User journey mapping'
    ],
    compatibility: {
      minPlan: 'basic',
      requiresIntegration: true
    }
  },
  {
    id: '3',
    slug: 'workflow-builder',
    displayName: 'Workflow Builder',
    description: 'Visual workflow automation with drag-and-drop interface for complex processes',
    longDescription: 'Streamline your business processes with our intuitive Workflow Builder. Create complex automation workflows using a simple drag-and-drop interface. Connect different systems, automate repetitive tasks, and ensure consistency across your organization with powerful workflow automation.',
    category: 'automation',
    iconName: 'workflow',
    pricing: 'premium',
    status: 'requires_upgrade',
    featured: true,
    isNew: true,
    screenshots: ['workflow-1.jpg', 'workflow-2.jpg', 'workflow-3.jpg'],
    rating: 4.9,
    reviewCount: 156,
    installCount: 12847,
    requirements: [
      'Pro plan or higher',
      'API access enabled',
      'Webhook support configured'
    ],
    permissions: [
      'Create and manage workflows',
      'Access to integration APIs',
      'Modify system automations',
      'View workflow execution logs'
    ],
    features: [
      'Visual drag-and-drop builder',
      'Pre-built workflow templates',
      'API integrations',
      'Conditional logic support',
      'Automated notifications',
      'Execution monitoring'
    ],
    compatibility: {
      minPlan: 'pro',
      requiresIntegration: true
    }
  },
  {
    id: '4',
    slug: 'market-research',
    displayName: 'Market Research',
    description: 'AI-powered market analysis and competitor intelligence for strategic planning',
    longDescription: 'Stay ahead of the competition with AI-powered market research tools. Analyze market trends, monitor competitors, and discover new opportunities with automated data collection and intelligent insights.',
    category: 'intelligence',
    iconName: 'trendingUp',
    pricing: 'premium',
    status: 'available',
    featured: false,
    isNew: true,
    screenshots: ['market-1.jpg', 'market-2.jpg'],
    rating: 4.3,
    reviewCount: 67,
    installCount: 5621,
    requirements: ['Enterprise plan', 'External API access'],
    permissions: ['Market data access', 'Competitor tracking'],
    features: ['AI market analysis', 'Competitor monitoring', 'Trend forecasting'],
    compatibility: {
      minPlan: 'enterprise',
      requiresIntegration: true
    }
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
  const [selectedFeature, setSelectedFeature] = useState<MarketplaceFeatureExtended | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const canInstall = role === 'admin' || role === 'super_admin';

  const navigateToFeatureDetails = (feature: MarketplaceFeatureExtended) => {
    setSelectedFeature(feature);
    setShowDetailModal(true);
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

  const handleFeatureInstall = (feature: MarketplaceFeatureExtended) => {
    // Update feature status to installed (in real app, this would update the backend)
    toast({
      title: "Feature Installed",
      description: `${feature.displayName} has been successfully installed.`,
    });
  };

  const handleUninstallFeature = (feature: MarketplaceFeatureExtended) => {
    // Update feature status to available (in real app, this would update the backend)
    toast({
      title: "Feature Uninstalled",
      description: `${feature.displayName} has been uninstalled.`,
    });
  };

  const getPricingBadgeVariant = (pricing: MarketplaceFeatureExtended['pricing']) => {
    switch (pricing) {
      case 'free': return 'outline';
      case 'premium': return 'default';
      case 'enterprise': return 'secondary';
      default: return 'outline';
    }
  };

  const FeatureCard = ({ feature }: { feature: MarketplaceFeatureExtended }) => {
    const IconComponent = Icons[feature.iconName];
    
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
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
            {feature.status === 'installed' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
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
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Uninstall
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                size="sm" 
                variant={
                  feature.status === 'requires_upgrade' ? "secondary" : 
                  !canInstall ? "outline" :
                  "default"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  handleFeatureAction(feature);
                }}
                disabled={roleLoading || (!canInstall && feature.status !== 'requires_upgrade')}
              >
                {roleLoading ? '...' : 
                 feature.status === 'requires_upgrade' ? 'Upgrade Required' :
                 !canInstall ? 'Contact Admin' : 'Install'}
              </Button>
            )}
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
          
          {filteredFeatures.length > 0 ? (
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

      {/* Feature Detail Modal */}
      <FeatureDetailModal
        feature={selectedFeature}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedFeature(null);
        }}
        onInstall={handleFeatureInstall}
        canInstall={canInstall}
      />
    </AppLayout>
  );
}