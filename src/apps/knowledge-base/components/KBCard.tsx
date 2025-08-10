import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { KBPermissionGuard } from './shared/KBPermissionGuard';

interface KBConfig {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  status?: string;
  is_premium?: boolean;
  is_default?: boolean;
  file_count?: number;
  total_vectors?: number;
  updated_at?: string;
  created_by?: string;
}

interface KBCardProps {
  config: KBConfig;
  onDuplicate?: (config: KBConfig) => void;
  onDelete?: (config: KBConfig) => void;
}

export function KBCard({ config, onDuplicate, onDelete }: KBCardProps) {
  const statusVariant = config.status === 'active' ? 'secondary' : config.status === 'processing' ? 'outline' : 'destructive';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {config.display_name || config.name}
            {config.is_default && <Badge variant="outline">Default</Badge>}
            {config.is_premium && <Badge>Premium</Badge>}
          </CardTitle>
          <Badge variant={statusVariant as any} className="capitalize">{config.status ?? 'active'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground line-clamp-2">{config.description || 'No description provided.'}</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-xs text-muted-foreground">Files</div>
            <div className="font-medium">{config.file_count ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Vectors</div>
            <div className="font-medium">{config.total_vectors ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Updated</div>
            <div className="font-medium">{config.updated_at ? new Date(config.updated_at).toLocaleDateString() : '-'}</div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">ID: {config.id}</div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to={`/apps/knowledge-base/files?kbId=${config.id}`}>View Files</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to={`/apps/knowledge-base/chat?kbId=${config.id}`}>Start Chat</Link>
          </Button>
          <KBPermissionGuard can="can_manage_files">
            <Button asChild size="sm" variant="outline">
              <Link to={`/apps/knowledge-base/settings?kbId=${config.id}`}>Settings</Link>
            </Button>
          </KBPermissionGuard>
        </div>
      </CardFooter>
      <CardFooter className="flex items-center justify-end gap-2 pt-0">
        <KBPermissionGuard can="can_create_kb">
          <Button size="sm" variant="secondary" onClick={() => onDuplicate?.(config)}>Duplicate</Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete?.(config)} disabled={config.is_default}>Delete</Button>
        </KBPermissionGuard>
      </CardFooter>
    </Card>
  );
}
