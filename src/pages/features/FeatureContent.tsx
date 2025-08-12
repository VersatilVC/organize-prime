import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useFeatureContext } from '@/contexts/FeatureContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { Link } from 'react-router-dom';
import { PlaceholderPage } from '@/components/ui/placeholder-page';

export default function FeatureContent() {
  const { feature } = useFeatureContext();
  const location = useLocation();
  const params = useParams();
  
  // Extract the sub-path after /features/{slug}/
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentPath = pathSegments.slice(2).join('/'); // Remove 'features' and slug

  if (!feature) {
    return <div>Loading...</div>;
  }

  // Find matching navigation item for the current path
  const currentNavItem = feature.navigation.find(item => 
    item.path.replace('/', '') === currentPath || 
    (item.path !== '/dashboard' && currentPath.startsWith(item.path.replace('/', '')))
  );

  const renderKnowledgeBaseContent = () => {
    switch (currentPath) {
      case 'documents':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
                <p className="text-muted-foreground">Manage your knowledge base documents</p>
              </div>
              <Button>Upload Document</Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-base">Document {i}</CardTitle>
                    <CardDescription>Sample document for demonstration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">PDF</Badge>
                      <span className="text-sm text-muted-foreground">2MB</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      
      case 'search':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Search</h2>
              <p className="text-muted-foreground">Find information across your knowledge base</p>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Icons.search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Advanced Search</h3>
                  <p className="text-muted-foreground">Search functionality would be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'collections':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Collections</h2>
                <p className="text-muted-foreground">Organize documents into collections</p>
              </div>
              <Button>Create Collection</Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {['General', 'Marketing', 'Technical', 'Legal'].map(collection => (
                <Card key={collection}>
                  <CardHeader>
                    <CardTitle className="text-base">{collection}</CardTitle>
                    <CardDescription>Collection of {collection.toLowerCase()} documents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">12 documents</span>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      
      default:
        return renderGenericContent();
    }
  };

  const renderContentCreationContent = () => {
    switch (currentPath) {
      case 'projects':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
                <p className="text-muted-foreground">Manage your content creation projects</p>
              </div>
              <Button>New Project</Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {['Blog Series', 'Social Campaign', 'Product Launch', 'Newsletter'].map(project => (
                <Card key={project}>
                  <CardHeader>
                    <CardTitle className="text-base">{project}</CardTitle>
                    <CardDescription>Content project for {project.toLowerCase()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">In Progress</Badge>
                      <span className="text-sm text-muted-foreground">75% complete</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      
      default:
        return renderGenericContent();
    }
  };

  const renderMarketIntelContent = () => {
    switch (currentPath) {
      case 'funding':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Funding Activity</h2>
              <p className="text-muted-foreground">Track funding rounds and investment activity</p>
            </div>
            
            <div className="space-y-4">
              {[
                { company: 'TechCorp', amount: '$10M', round: 'Series A', date: '2 days ago' },
                { company: 'StartupXYZ', amount: '$5M', round: 'Seed', date: '1 week ago' },
                { company: 'InnovateCo', amount: '$25M', round: 'Series B', date: '2 weeks ago' }
              ].map((funding, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{funding.company}</h3>
                        <p className="text-sm text-muted-foreground">{funding.round}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{funding.amount}</p>
                        <p className="text-sm text-muted-foreground">{funding.date}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      
      case 'signals':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Market Signals</h2>
              <p className="text-muted-foreground">Monitor market indicators and signals</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Active Signals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-sm text-muted-foreground">+2 from yesterday</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Signal Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">94%</div>
                  <p className="text-sm text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      
      default:
        return renderGenericContent();
    }
  };

  const renderGenericContent = () => {
    const componentName = currentPath.split('/').pop() || 'dashboard';
    const displayName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
    
    return (
      <PlaceholderPage 
        title={`${displayName} - Coming Soon`}
        description={`The ${displayName} feature is currently under development.`}
      />
    );
  };

  // Route to specific feature content based on feature type
  switch (feature.slug) {
    case 'knowledge-base':
      return renderKnowledgeBaseContent();
    case 'content-creation':
      return renderContentCreationContent();
    case 'market-intel':
      return renderMarketIntelContent();
    default:
      return renderGenericContent();
  }
}