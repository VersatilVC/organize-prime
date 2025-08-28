import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useAuth } from '@/auth/AuthProvider';
import { useUserRole } from '@/hooks/useUserRole';
import { Building, FileText, Users, Settings } from 'lucide-react';
import { ContentTypesTab } from '@/components/features/content-creation/ContentTypesTab';
import { TargetAudiencesTab } from '@/components/features/content-creation/TargetAudiencesTab';

export function ContentCreationSettings() {
  const { user } = useAuth();
  const { role, loading } = useUserRole();

  // Only company admins and super admins can access settings
  const canAccessSettings = role === 'admin' || role === 'super_admin';

  // Show loading state while checking permissions
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccessSettings) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              Only company administrators can access content creation settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/features">Features</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/features/content-creation">Content Creation</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <Settings className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Content Creation Settings</h1>
            <p className="text-muted-foreground">
              Configure content types and target audiences for your organization
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="content-types" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="content-types" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Content Types
          </TabsTrigger>
          <TabsTrigger value="target-audiences" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Target Audiences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content-types" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Content Types Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Define and manage the different types of content your organization creates. 
                Configure word count targets, tone preferences, and style guidelines for each type.
              </p>
            </CardHeader>
            <CardContent>
              <ContentTypesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="target-audiences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Target Audiences Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Define your target audiences with detailed demographics, industry information, 
                and communication preferences to create more effective content.
              </p>
            </CardHeader>
            <CardContent>
              <TargetAudiencesTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ContentCreationSettings;