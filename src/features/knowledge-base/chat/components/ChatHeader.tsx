import React, { useState } from 'react';
import {
  Settings,
  Brain,
  Download,
  Trash2,
  Edit3,
  Check,
  X,
  MessageSquare,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useKnowledgeBases } from '../../hooks/useKnowledgeBases';
import type { ChatSession } from '../services/ChatSessionService';

interface ChatHeaderProps {
  session: ChatSession;
  selectedKbIds: string[];
  onKbSelectionChange: (kbIds: string[]) => void;
  onTitleUpdate: (newTitle: string) => void;
  onModelConfigChange: (config: { model: string; temperature: number }) => void;
  onExportConversation: () => void;
  onClearConversation: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  className?: string;
}

export function ChatHeader({
  session,
  selectedKbIds,
  onKbSelectionChange,
  onTitleUpdate,
  onModelConfigChange,
  onExportConversation,
  onClearConversation,
  onToggleSidebar,
  isSidebarCollapsed = false,
  className
}: ChatHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(session.title);
  const { data: knowledgeBases } = useKnowledgeBases();

  const handleTitleSubmit = () => {
    const trimmedTitle = titleValue.trim();
    if (trimmedTitle && trimmedTitle !== session.title) {
      onTitleUpdate(trimmedTitle);
    } else {
      setTitleValue(session.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTitleValue(session.title);
    setIsEditingTitle(false);
  };

  const handleKbToggle = (kbId: string, checked: boolean) => {
    if (checked) {
      onKbSelectionChange([...selectedKbIds, kbId]);
    } else {
      onKbSelectionChange(selectedKbIds.filter(id => id !== kbId));
    }
  };

  const getSelectedKbNames = () => {
    if (!knowledgeBases) return [];
    return knowledgeBases
      .filter(kb => selectedKbIds.includes(kb.id))
      .map(kb => kb.display_name);
  };

  return (
    <div className={cn("border-b bg-background p-4", className)}>
      <div className="flex items-center justify-between gap-4">
        {/* Left Section: Title and KB Selection */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Sidebar Toggle (Mobile) */}
          {isSidebarCollapsed && onToggleSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="lg:hidden"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}

          {/* Session Title */}
          <div className="flex items-center gap-2 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSubmit();
                    if (e.key === 'Escape') handleTitleCancel();
                  }}
                  className="h-8 text-lg font-semibold"
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={handleTitleSubmit}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleTitleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setIsEditingTitle(true)}
              >
                <h1 className="text-lg font-semibold truncate">{session.title}</h1>
                <Edit3 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          {/* Knowledge Base Selector */}
          <KnowledgeBaseSelector
            knowledgeBases={knowledgeBases || []}
            selectedKbIds={selectedKbIds}
            onKbToggle={handleKbToggle}
            getSelectedKbNames={getSelectedKbNames}
          />
        </div>

        {/* Right Section: Stats and Settings */}
        <div className="flex items-center gap-2">
          {/* Session Stats */}
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">
              {session.message_count} messages
            </Badge>
            <Badge variant="outline">
              {session.model_config?.model || 'gpt-4'}
            </Badge>
          </div>

          {/* Settings Menu */}
          <ChatSettingsMenu
            session={session}
            onModelConfigChange={onModelConfigChange}
            onExportConversation={onExportConversation}
            onClearConversation={onClearConversation}
          />
        </div>
      </div>
    </div>
  );
}

interface KnowledgeBaseSelectorProps {
  knowledgeBases: Array<{ id: string; display_name: string; name: string }>;
  selectedKbIds: string[];
  onKbToggle: (kbId: string, checked: boolean) => void;
  getSelectedKbNames: () => string[];
}

function KnowledgeBaseSelector({
  knowledgeBases,
  selectedKbIds,
  onKbToggle,
  getSelectedKbNames
}: KnowledgeBaseSelectorProps) {
  const selectedNames = getSelectedKbNames();

  if (knowledgeBases.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Brain className="h-4 w-4" />
          <span className="hidden sm:inline">
            {selectedKbIds.length === 0
              ? 'Select Knowledge Bases'
              : selectedKbIds.length === 1
              ? selectedNames[0]
              : `${selectedKbIds.length} Knowledge Bases`}
          </span>
          <span className="sm:hidden">
            {selectedKbIds.length || 'KB'}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Select Knowledge Bases</h4>
            <p className="text-sm text-muted-foreground">
              Choose which knowledge bases to search for answers.
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {knowledgeBases.map((kb) => (
              <div key={kb.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`kb-${kb.id}`}
                  checked={selectedKbIds.includes(kb.id)}
                  onCheckedChange={(checked) => onKbToggle(kb.id, !!checked)}
                />
                <Label 
                  htmlFor={`kb-${kb.id}`}
                  className="text-sm flex-1 cursor-pointer"
                >
                  {kb.display_name}
                </Label>
              </div>
            ))}
          </div>
          
          {selectedKbIds.length > 0 && (
            <>
              <Separator />
              <div className="text-sm text-muted-foreground">
                {selectedKbIds.length} of {knowledgeBases.length} selected
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ChatSettingsMenuProps {
  session: ChatSession;
  onModelConfigChange: (config: { model: string; temperature: number }) => void;
  onExportConversation: () => void;
  onClearConversation: () => void;
}

function ChatSettingsMenu({
  session,
  onModelConfigChange,
  onExportConversation,
  onClearConversation
}: ChatSettingsMenuProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempModel, setTempModel] = useState(session.model_config?.model || 'gpt-4');
  const [tempTemperature, setTempTemperature] = useState([session.model_config?.temperature || 0.7]);

  const handleModelConfigSave = () => {
    onModelConfigChange({
      model: tempModel,
      temperature: tempTemperature[0]
    });
    setIsSettingsOpen(false);
  };

  return (
    <DropdownMenu open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Chat Settings
        </DropdownMenuLabel>
        
        <div className="p-3 space-y-4">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">AI Model</Label>
            <Select value={tempModel} onValueChange={setTempModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4">GPT-4 (Recommended)</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Creativity: {tempTemperature[0].toFixed(1)}
            </Label>
            <Slider
              value={tempTemperature}
              onValueChange={setTempTemperature}
              max={1}
              min={0}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Focused</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Save Button */}
          <Button onClick={handleModelConfigSave} className="w-full">
            Apply Settings
          </Button>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onExportConversation}>
          <Download className="h-4 w-4 mr-2" />
          Export Conversation
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={onClearConversation}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Conversation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}