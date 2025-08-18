import React from 'react';
import { Check, ChevronDown, Database, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { KnowledgeBase } from '@/features/knowledge-base/hooks/useKnowledgeBases';

interface KBSelectorProps {
  knowledgeBases: KnowledgeBase[];
  selectedKBId?: string;
  onKBSelect: (kbId: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function KBSelector({
  knowledgeBases,
  selectedKBId,
  onKBSelect,
  isLoading = false,
  className = ''
}: KBSelectorProps) {
  const selectedKB = knowledgeBases.find(kb => kb.id === selectedKBId);

  // Auto-select default KB if none selected
  React.useEffect(() => {
    if (!selectedKBId && knowledgeBases.length > 0) {
      const defaultKB = knowledgeBases.find(kb => kb.is_default) || knowledgeBases[0];
      onKBSelect(defaultKB.id);
    }
  }, [knowledgeBases, selectedKBId, onKBSelect]);

  if (isLoading) {
    return (
      <div className={`h-10 bg-muted rounded-md animate-pulse ${className}`} />
    );
  }

  if (knowledgeBases.length === 0) {
    return (
      <div className={`p-3 border rounded-lg bg-muted/50 ${className}`}>
        <p className="text-sm text-muted-foreground text-center">
          No knowledge bases available. Create one to start chatting.
        </p>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-between ${className}`}
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Database className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {selectedKB?.display_name || 'Select Knowledge Base'}
            </span>
            {selectedKB?.is_default && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                Default
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-80">
        {knowledgeBases.map((kb) => (
          <DropdownMenuItem
            key={kb.id}
            onClick={() => onKBSelect(kb.id)}
            className="flex items-center justify-between p-3"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Database className="h-4 w-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{kb.display_name}</span>
                  {kb.is_default && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      Default
                    </Badge>
                  )}
                  {kb.is_premium && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      Premium
                    </Badge>
                  )}
                </div>
                {kb.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {kb.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    {kb.file_count} files
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Database className="h-3 w-3" />
                    {kb.total_vectors} vectors
                  </div>
                </div>
              </div>
            </div>
            
            {selectedKBId === kb.id && (
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        
        {knowledgeBases.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Switch knowledge bases to access different document collections
              </p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}