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
    <AppLayout appId="knowledge-base" appName="Knowledge Base" permissions={[]}>
      <KBProvider>
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded hover:bg-muted" aria-label="Toggle KB navigation" onClick={() => setShowNav((v) => !v)}>
              <Menu className="h-5 w-5" />
            </button>
            <BookOpen className="h-5 w-5" />
            <div>
              <h1 className="text-base font-semibold">Knowledge Base</h1>
              <p className="text-sm text-muted-foreground">{currentOrganization?.name ?? 'Organization'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <KBPermissionGuard can="can_create_kb">
              <Button asChild size="sm">
                <Link to="/features/knowledge-base/databases">Create KB</Link>
              </Button>
            </KBPermissionGuard>
            <KBPermissionGuard can="can_upload">
              <Button asChild size="sm" variant="secondary">
                <Link to="/features/knowledge-base/files">Upload Files</Link>
              </Button>
            </KBPermissionGuard>
            <KBPermissionGuard can="can_chat">
              <Button asChild size="sm" variant="outline">
                <Link to="/features/knowledge-base/chat">New Chat</Link>
              </Button>
            </KBPermissionGuard>
          </div>
        </header>

        <nav className={`gap-1 p-2 border-b overflow-x-auto ${showNav ? 'flex' : 'hidden md:flex'}`}>
          {nav.map(item => (
            <KBPermissionGuard key={item.to} adminOnly={item.adminOnly}>
              <Link
                to={item.to}
                className={`px-3 py-2 rounded-md text-sm flex items-center gap-2 hover:bg-muted ${pathname.startsWith(item.to) ? 'bg-muted font-medium' : ''}`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.label === 'Files' && (stats?.overview.processing_files ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-1">{stats?.overview.processing_files}</Badge>
                )}
                {item.label === 'Chat' && (stats?.overview.conversations ?? 0) > 0 && (
                  <Badge variant="outline" className="ml-1">{stats?.overview.conversations}</Badge>
                )}
              </Link>
            </KBPermissionGuard>
          ))}
        </nav>

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
                <BreadcrumbPage>{nav.find(n => pathname.startsWith(n.to))?.label ?? 'Dashboard'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <main className="mt-4">
            {children}
          </main>
        </div>
      </KBProvider>
    </AppLayout>
  );
}
