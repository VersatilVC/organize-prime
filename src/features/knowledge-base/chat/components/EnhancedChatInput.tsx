import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Smile,
  Type,
  Code,
  Bold,
  Italic,
  Hash,
  AtSign,
  Sparkles,
  FileText,
  Save,
  X,
  ChevronUp,
  History,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useChatDraft, useMessageTemplates, type MessageTemplate } from '../services/ChatDraftService';
import { useToast } from '@/hooks/use-toast';

interface EnhancedChatInputProps {
  conversationId: string;
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
  selectedKbIds?: string[];
  className?: string;
}

interface SlashCommand {
  command: string;
  description: string;
  action: () => void;
  icon: React.ReactNode;
}

export function EnhancedChatInput({
  conversationId,
  onSendMessage,
  disabled = false,
  isProcessing = false,
  placeholder = "Type your message...",
  selectedKbIds = [],
  className
}: EnhancedChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const [selectedCommand, setSelectedCommand] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  // Draft management
  const { draft, updateDraft, clearDraft } = useChatDraft(conversationId);
  
  // Template management
  const { 
    templates, 
    saveTemplate, 
    applyTemplate, 
    getTemplatesByCategory, 
    getCategories,
    extractVariables 
  } = useMessageTemplates();

  // Initialize message from draft
  useEffect(() => {
    if (draft && !message) {
      setMessage(draft);
    }
  }, [draft, message]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max height of ~6 lines
      textarea.style.height = `${newHeight}px`;
      setIsExpanded(newHeight > 40);
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Handle message change and draft saving
  const handleMessageChange = (value: string) => {
    setMessage(value);
    updateDraft(value, selectedKbIds);
    
    // Check for slash commands
    if (value.startsWith('/')) {
      setShowCommands(true);
      setCommandFilter(value.slice(1));
    } else {
      setShowCommands(false);
      setCommandFilter('');
    }
  };

  // Slash commands
  const slashCommands: SlashCommand[] = [
    {
      command: '/help',
      description: 'Show available commands',
      icon: <Hash className="h-4 w-4" />,
      action: () => {
        setMessage('What commands and features are available in this chat? Please provide a comprehensive guide.');
      }
    },
    {
      command: '/clear',
      description: 'Clear current input',
      icon: <X className="h-4 w-4" />,
      action: () => {
        setMessage('');
        clearDraft();
      }
    },
    {
      command: '/template',
      description: 'Insert message template',
      icon: <FileText className="h-4 w-4" />,
      action: () => {
        setShowTemplates(true);
        setShowCommands(false);
      }
    },
    {
      command: '/summarize',
      description: 'Summarize conversation',
      icon: <Type className="h-4 w-4" />,
      action: () => {
        setMessage('Please provide a summary of our conversation so far, highlighting the key points and conclusions.');
      }
    }
  ];

  const filteredCommands = slashCommands.filter(cmd => 
    cmd.command.toLowerCase().includes(commandFilter.toLowerCase())
  );

  // Handle send message
  const handleSend = () => {
    if (!message.trim() || disabled || isProcessing) return;
    
    onSendMessage(message.trim());
    setMessage('');
    clearDraft();
    
    // Reset UI state
    setShowCommands(false);
    setShowTemplates(false);
    setIsExpanded(false);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: new line
        return;
      } else if (showCommands && filteredCommands.length > 0) {
        // Enter with commands: execute command
        e.preventDefault();
        filteredCommands[selectedCommand]?.action();
        setShowCommands(false);
      } else {
        // Enter: send message
        e.preventDefault();
        handleSend();
      }
    } else if (e.key === 'ArrowUp' && showCommands) {
      e.preventDefault();
      setSelectedCommand(Math.max(0, selectedCommand - 1));
    } else if (e.key === 'ArrowDown' && showCommands) {
      e.preventDefault();
      setSelectedCommand(Math.min(filteredCommands.length - 1, selectedCommand + 1));
    } else if (e.key === 'Escape') {
      setShowCommands(false);
      setShowTemplates(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: 'Voice Input Not Supported',
        description: 'Your browser does not support voice input.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        // TODO: Implement speech-to-text conversion
        toast({
          title: 'Voice Recording',
          description: 'Speech-to-text conversion will be implemented soon.',
        });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: 'Recording Error',
        description: 'Failed to start recording. Please check your microphone permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Template application
  const handleApplyTemplate = (template: MessageTemplate, variables: Record<string, string>) => {
    const content = applyTemplate(template, variables);
    setMessage(content);
    updateDraft(content, selectedKbIds);
    setShowTemplates(false);
  };

  // Format text
  const formatText = (format: 'bold' | 'italic' | 'code') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);
    
    let formattedText = selectedText;
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'code':
        formattedText = selectedText.includes('\n') 
          ? `\`\`\`\n${selectedText}\n\`\`\``
          : `\`${selectedText}\``;
        break;
    }

    const newMessage = message.substring(0, start) + formattedText + message.substring(end);
    setMessage(newMessage);
    updateDraft(newMessage, selectedKbIds);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + formattedText.length,
        start + formattedText.length
      );
    }, 0);
  };

  return (
    <div className={cn("border-t bg-background p-4", className)}>
      {/* Slash Commands Dropdown */}
      {showCommands && filteredCommands.length > 0 && (
        <Card className="mb-2">
          <CardContent className="p-2">
            <div className="space-y-1">
              {filteredCommands.map((command, index) => (
                <div
                  key={command.command}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded cursor-pointer",
                    index === selectedCommand ? "bg-accent" : "hover:bg-accent/50"
                  )}
                  onClick={() => {
                    command.action();
                    setShowCommands(false);
                  }}
                >
                  {command.icon}
                  <span className="font-mono text-sm">{command.command}</span>
                  <span className="text-sm text-muted-foreground">{command.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {/* Main Input Area */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-h-[40px] max-h-[120px] resize-none border-0 shadow-none focus-visible:ring-0 p-3 pr-20",
              "transition-all duration-200"
            )}
            style={{ height: '40px' }}
          />

          {/* Formatting Toolbar */}
          {isExpanded && (
            <div className="absolute top-1 right-1 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => formatText('bold')}
                title="Bold"
              >
                <Bold className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => formatText('italic')}
                title="Italic"
              >
                <Italic className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => formatText('code')}
                title="Code"
              >
                <Code className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="absolute bottom-1 right-1 flex items-center gap-1">
            {/* Template Button */}
            <TemplateSelector
              templates={templates}
              onApplyTemplate={handleApplyTemplate}
              onSaveTemplate={saveTemplate}
              extractVariables={extractVariables}
            />

            {/* Voice Input */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={isRecording ? stopRecording : startRecording}
              title={isRecording ? "Stop Recording" : "Voice Input"}
            >
              {isRecording ? (
                <MicOff className="h-3 w-3 text-red-500" />
              ) : (
                <Mic className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled || isProcessing}
          className="self-end"
        >
          {isProcessing ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Draft Indicator */}
      {draft && draft !== message && (
        <div className="mt-2 text-xs text-muted-foreground">
          💾 Draft saved automatically
        </div>
      )}
    </div>
  );
}

// Template Selector Component
interface TemplateSelectorProps {
  templates: MessageTemplate[];
  onApplyTemplate: (template: MessageTemplate, variables: Record<string, string>) => void;
  onSaveTemplate: (template: Omit<MessageTemplate, 'id' | 'createdAt'>) => Promise<MessageTemplate>;
  extractVariables: (content: string) => string[];
}

function TemplateSelector({ 
  templates, 
  onApplyTemplate, 
  onSaveTemplate,
  extractVariables 
}: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    content: '',
    category: 'Custom'
  });

  const { toast } = useToast();

  const categories = ['All', ...new Set(templates.map(t => t.category))];
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredTemplates = selectedCategory === 'All' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const handleTemplateSelect = (template: MessageTemplate) => {
    if (template.variables.length > 0) {
      setSelectedTemplate(template);
      const initialVariables: Record<string, string> = {};
      template.variables.forEach(variable => {
        initialVariables[variable] = '';
      });
      setVariables(initialVariables);
    } else {
      onApplyTemplate(template, {});
      setOpen(false);
    }
  };

  const handleApplyWithVariables = () => {
    if (selectedTemplate) {
      onApplyTemplate(selectedTemplate, variables);
      setOpen(false);
      setSelectedTemplate(null);
      setVariables({});
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.title.trim() || !newTemplate.content.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both title and content for the template.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const variables = extractVariables(newTemplate.content);
      await onSaveTemplate({
        title: newTemplate.title,
        content: newTemplate.content,
        category: newTemplate.category,
        variables
      });

      toast({
        title: 'Template Saved',
        description: 'Your template has been saved successfully.',
      });

      setShowCreateDialog(false);
      setNewTemplate({ title: '', content: '', category: 'Custom' });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save template. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            title="Message Templates"
          >
            <FileText className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <Command>
            <CommandInput placeholder="Search templates..." />
            <CommandList>
              <CommandEmpty>No templates found.</CommandEmpty>
              
              <CommandGroup heading="Categories">
                {categories.map((category) => (
                  <CommandItem
                    key={category}
                    value={category}
                    onSelect={() => setSelectedCategory(category)}
                  >
                    <Badge variant={selectedCategory === category ? "default" : "outline"}>
                      {category}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Templates">
                {filteredTemplates.map((template) => (
                  <CommandItem
                    key={template.id}
                    value={template.title}
                    onSelect={() => handleTemplateSelect(template)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{template.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {template.content}
                      </div>
                      {template.variables.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {template.variables.map(variable => (
                            <Badge key={variable} variant="outline" className="text-xs">
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup>
                <CommandItem onSelect={() => setShowCreateDialog(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create New Template
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Variable Input Dialog */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fill Template Variables</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {selectedTemplate.content}
              </div>
              {selectedTemplate.variables.map((variable) => (
                <div key={variable}>
                  <Label>{variable}</Label>
                  <Input
                    value={variables[variable] || ''}
                    onChange={(e) => setVariables(prev => ({
                      ...prev,
                      [variable]: e.target.value
                    }))}
                    placeholder={`Enter ${variable}`}
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <Button onClick={handleApplyWithVariables} className="flex-1">
                  Apply Template
                </Button>
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={newTemplate.title}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Template title"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={newTemplate.category}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Category"
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={newTemplate.content}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Template content. Use {variable} for variables."
                rows={4}
              />
              <div className="text-xs text-muted-foreground mt-1">
                Use {`{variable}`} to create variables that can be filled when using the template.
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateTemplate} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}