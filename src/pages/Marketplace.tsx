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

// Mock data for development - replace with actual marketplace API
const mockCategories = [
  { id: '1', name: 'Productivity', slug: 'productivity', description: 'Tools to boost productivity' },
  { id: '2', name: 'Analytics', slug: 'analytics', description: 'Data analysis and reporting' },
  { id: '3', name: 'Communication', slug: 'communication', description: 'Team communication tools' },
  { id: '4', name: 'Finance', slug: 'finance', description: 'Financial management tools' },
];

const mockApps = [
  {
    id: '1',
    name: 'Knowledge Base',
    slug: 'knowledge-base',
    description: 'AI-powered knowledge management system',
    category: 'productivity',
    pricing_model: 'freemium',
    icon_name: 'book',
    version: '1.0.0',
    rating_average: 4.8,
    rating_count: 124,
    install_count: 2500,
    is_featured: true,
    created_at: new Date().toISOString(),
  }
];

// Extended interface for marketplace features with installation status
interface MarketplaceFeatureExtended {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  pricing_model: string;
  icon_name: string;
  version: string;
  rating_average: number;
  rating_count: number;
  install_count: number;
  created_at: string;
  status: 'available' | 'installed' | 'requires_upgrade';
  featured: boolean;
  isNew: boolean;
  displayName: string;
  iconName: string;
  longDescription: string;
  screenshots: string[];
  requirements: string[];
  permissions: string[];
  features: string[];
  compatibility: { minPlan: string; requiresIntegration: boolean; };
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
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [selectedFeature, setSelectedFeature] = useState<MarketplaceFeatureExtended | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Mock data state
  const apps = mockApps;
  const categories = mockCategories;
  const canInstall = role === 'admin' || role === 'super_admin';

  // Transform apps to extended interface
  const transformedApps = useMemo(() => {
    return apps.map(app => ({
      ...app,
      displayName: app.name,
      iconName: app.icon_name,
      status: 'available' as const,
      featured: app.is_featured,
      isNew: new Date(app.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      longDescription: app.description,
      screenshots: [],
      requirements: [],
      permissions: [],
      features: [],
      compatibility: { minPlan: 'free', requiresIntegration: false },
      pricing: app.pricing_model,
      rating: app.rating_average,
      reviewCount: app.rating_count,
      installCount: app.install_count,
    })) as MarketplaceFeatureExtended[];
  }, [apps]);

  const categoryOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Categories' }];
    categories.forEach(category => {
      options.push({ value: category.slug, label: category.name });
    });
    return options;
  }, [categories]);

  const filteredFeatures = useMemo(() => {
    return transformedApps.filter(feature => {
      const matchesSearch = feature.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           feature.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [transformedApps, searchQuery, selectedCategory]);

  const handleFeatureInstall = async (feature: any) => {
    toast({
      title: "App Installed",
      description: `${feature.name} has been installed successfully.`,
    });
    setShowDetailModal(false);
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-8">
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Feature Marketplace</h1>
              <p className="text-muted-foreground">
                Discover and install features to enhance your platform
              </p>
            </div>
          </div>

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
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeatures.map((feature) => (
            <Card key={feature.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>{feature.displayName}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full"
                  disabled={!canInstall}
                  onClick={() => {
                    setSelectedFeature(feature);
                    setShowDetailModal(true);
                  }}
                >
                  {canInstall ? 'Install' : 'Contact Admin'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

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