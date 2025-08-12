import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppLayout } from '@/apps/shared/components/AppLayout';
import { useOrganizationData } from '@/contexts/OrganizationContext';
import { KBPermissionGuard } from './shared/KBPermissionGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { BookOpen, Settings, BarChart3, Database, FileText, MessageSquare, Menu } from 'lucide-react';
import { KBProvider } from '../context/KBContext';
import { useKBData } from '../hooks/useKBData';

interface KBLayoutProps {
  children: React.ReactNode;
}

export function KBLayout({ children }: KBLayoutProps) {
  const { currentOrganization } = useOrganizationData();
  const { pathname } = useLocation();
  const { stats } = useKBData();
  const [showNav, setShowNav] = React.useState(false);

  const nav = useMemo(() => [
    { label: 'Dashboard', to: '/apps/knowledge-base/dashboard', icon: BookOpen },
    { label: 'Knowledge Bases', to: '/apps/knowledge-base/databases', icon: Database },
    { label: 'Upload Files', to: '/apps/knowledge-base/files', icon: FileText },
    { label: 'AI Chat', to: '/apps/knowledge-base/chat', icon: MessageSquare },
    { label: 'Analytics', to: '/apps/knowledge-base/analytics', icon: BarChart3, adminOnly: true },
    { label: 'Settings', to: '/apps/knowledge-base/settings', icon: Settings, adminOnly: true },
  ], []);

  // Current page title for breadcrumbs
  const currentPageTitle = React.useMemo(() => {
    const currentNav = nav.find(n => pathname.startsWith(n.to));
    return currentNav?.label ?? 'Dashboard';
  }, [pathname, nav]);

  // SEO: set document title
  React.useEffect(() => {
    document.title = `Knowledge Base - ${currentPageTitle}`;
  }, [currentPageTitle]);

  return (
    <KBProvider>

        <div className="p-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/apps/knowledge-base/dashboard">Knowledge Base</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{currentPageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <main className="mt-4">
            {children}
          </main>
        </div>
    </KBProvider>
  );
}
