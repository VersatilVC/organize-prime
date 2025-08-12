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
    { label: 'Dashboard', to: '/features/knowledge-base/dashboard', icon: BookOpen },
    { label: 'Knowledge Bases', to: '/features/knowledge-base/databases', icon: Database },
    { label: 'Files', to: '/features/knowledge-base/files', icon: FileText },
    { label: 'Chat', to: '/features/knowledge-base/chat', icon: MessageSquare },
    { label: 'Analytics', to: '/features/knowledge-base/analytics', icon: BarChart3, adminOnly: true },
    { label: 'Settings', to: '/features/knowledge-base/settings', icon: Settings, adminOnly: true },
  ], []);

  // SEO: set document title
  React.useEffect(() => {
    const section = nav.find(n => pathname.startsWith(n.to))?.label ?? 'Dashboard';
    document.title = `Knowledge Base - ${section}`;
  }, [pathname, nav]);

  return (
    <KBProvider>

        <div className="p-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/features/knowledge-base/dashboard">Knowledge Base</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{nav.find(n => pathname.startsWith(n.to))?.label ?? 'Knowledgebase Management'}</BreadcrumbPage>
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
