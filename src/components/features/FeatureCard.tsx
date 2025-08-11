import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  feature: {
    id: string;
    name: string;
    display_name: string;
    description?: string | null;
    category: string;
    icon_name: string;
    color_hex: string;
    is_active: boolean;
  };
}

export function FeatureCard({ feature }: FeatureCardProps) {
  const handleNavigate = () => {
    window.location.href = `/features/${feature.name}`;
  };

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `/features/${feature.name}/settings`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleNavigate}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="p-2 rounded-lg w-10 h-10 flex items-center justify-center"
              style={{ backgroundColor: `${feature.color_hex}20` }}
            >
              <Package 
                className="h-5 w-5" 
                style={{ color: feature.color_hex }}
              />
            </div>
            <div>
              <CardTitle className="text-base">{feature.display_name}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {feature.category}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSettings}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {feature.description && (
        <CardContent>
          <CardDescription className="text-sm">
            {feature.description}
          </CardDescription>
        </CardContent>
      )}
    </Card>
  );
}