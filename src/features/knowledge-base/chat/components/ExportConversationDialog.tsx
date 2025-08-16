import React, { useState } from 'react';
import {
  Download,
  FileText,
  FileImage,
  FileJson,
  Globe,
  Calendar,
  Settings,
  Info,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ConversationExportService, type ConversationExportOptions } from '../services/ConversationExportService';
import type { ChatMessage } from '../services/ChatMessageService';

interface ExportConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: ChatMessage[];
  conversationTitle: string;
  conversationId: string;
}

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
  recommended?: boolean;
}

const exportFormats: ExportFormat[] = [
  {
    id: 'markdown',
    name: 'Markdown',
    description: 'Structured text format, perfect for documentation',
    icon: <FileText className="h-4 w-4" />,
    extension: '.md',
    recommended: true
  },
  {
    id: 'pdf',
    name: 'PDF',
    description: 'Professional document format for sharing and printing',
    icon: <FileImage className="h-4 w-4" />,
    extension: '.pdf'
  },
  {
    id: 'html',
    name: 'HTML',
    description: 'Web format with rich formatting and styling',
    icon: <Globe className="h-4 w-4" />,
    extension: '.html'
  },
  {
    id: 'json',
    name: 'JSON',
    description: 'Structured data format for developers and integrations',
    icon: <FileJson className="h-4 w-4" />,
    extension: '.json'
  },
  {
    id: 'txt',
    name: 'Plain Text',
    description: 'Simple text format compatible with any text editor',
    icon: <FileText className="h-4 w-4" />,
    extension: '.txt'
  }
];

export function ExportConversationDialog({
  open,
  onOpenChange,
  messages,
  conversationTitle,
  conversationId
}: ExportConversationDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>('markdown');
  const [customTitle, setCustomTitle] = useState(conversationTitle);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeSources, setIncludeSources] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeSystemMessages, setIncludeSystemMessages] = useState(false);
  const [useDateRange, setUseDateRange] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');

  const { toast } = useToast();

  const selectedFormatInfo = exportFormats.find(f => f.id === selectedFormat);
  const filteredMessages = getFilteredMessages();
  const estimatedSize = ConversationExportService.getExportSizeEstimate(filteredMessages, selectedFormat);

  function getFilteredMessages(): ChatMessage[] {
    let filtered = [...messages];

    // Filter by date range
    if (useDateRange && startDate && endDate) {
      filtered = filtered.filter(msg => {
        const msgDate = new Date(msg.created_at);
        return msgDate >= startDate && msgDate <= endDate;
      });
    }

    // Filter system messages
    if (!includeSystemMessages) {
      filtered = filtered.filter(msg => msg.message_type !== 'system');
    }

    return filtered;
  }

  const handleExport = async () => {
    if (filteredMessages.length === 0) {
      toast({
        title: 'No Messages',
        description: 'There are no messages to export with the current filters.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setExportStatus('exporting');

    try {
      const options: ConversationExportOptions = {
        format: selectedFormat as any,
        includeMetadata,
        includeSources,
        includeTimestamps,
        includeSystemMessages,
        customTitle: customTitle !== conversationTitle ? customTitle : undefined,
        ...(useDateRange && startDate && endDate && {
          dateRange: { start: startDate, end: endDate }
        })
      };

      await ConversationExportService.exportConversation(
        filteredMessages,
        customTitle,
        options
      );

      setExportStatus('success');
      toast({
        title: 'Export Successful',
        description: `Conversation exported as ${selectedFormatInfo?.name} file.`,
      });

      // Close dialog after short delay
      setTimeout(() => {
        onOpenChange(false);
        setExportStatus('idle');
      }, 1500);

    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export conversation.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFormat('markdown');
    setCustomTitle(conversationTitle);
    setIncludeMetadata(true);
    setIncludeSources(true);
    setIncludeTimestamps(true);
    setIncludeSystemMessages(false);
    setUseDateRange(false);
    setStartDate(undefined);
    setEndDate(undefined);
    setExportStatus('idle');
  };

  const getStatusIcon = () => {
    switch (exportStatus) {
      case 'exporting':
        return <Clock className="h-4 w-4 animate-pulse text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Conversation
            {getStatusIcon()}
          </DialogTitle>
          <DialogDescription>
            Export your conversation in various formats with customizable options.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="format" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="format">Format</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="filters">Filters</TabsTrigger>
          </TabsList>

          {/* Format Selection */}
          <TabsContent value="format" className="space-y-4">
            <div>
              <Label className="text-base font-medium">Export Format</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Choose the format that best suits your needs.
              </p>
            </div>

            <RadioGroup value={selectedFormat} onValueChange={setSelectedFormat}>
              <div className="grid gap-3">
                {exportFormats.map((format) => (
                  <Card key={format.id} className={cn(
                    "cursor-pointer transition-colors",
                    selectedFormat === format.id ? "ring-2 ring-primary" : "hover:bg-accent"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value={format.id} id={format.id} />
                        <div className="flex items-center gap-2">
                          {format.icon}
                          <Label 
                            htmlFor={format.id} 
                            className="font-medium cursor-pointer"
                          >
                            {format.name}
                          </Label>
                          {format.recommended && (
                            <Badge variant="secondary" className="text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            {format.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {format.extension}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </RadioGroup>
          </TabsContent>

          {/* Content Options */}
          <TabsContent value="content" className="space-y-4">
            <div>
              <Label className="text-base font-medium">Content Options</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Customize what information to include in your export.
              </p>
            </div>

            <div className="space-y-4">
              {/* Custom Title */}
              <div className="space-y-2">
                <Label htmlFor="custom-title">Custom Title</Label>
                <Input
                  id="custom-title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Enter custom title..."
                />
              </div>

              {/* Content Toggles */}
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Include Metadata</Label>
                    <p className="text-sm text-muted-foreground">
                      Export date, message count, models used, etc.
                    </p>
                  </div>
                  <Switch
                    checked={includeMetadata}
                    onCheckedChange={setIncludeMetadata}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Include Sources</Label>
                    <p className="text-sm text-muted-foreground">
                      Document references and confidence scores
                    </p>
                  </div>
                  <Switch
                    checked={includeSources}
                    onCheckedChange={setIncludeSources}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Include Timestamps</Label>
                    <p className="text-sm text-muted-foreground">
                      When each message was sent
                    </p>
                  </div>
                  <Switch
                    checked={includeTimestamps}
                    onCheckedChange={setIncludeTimestamps}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Include System Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Internal system notifications and status updates
                    </p>
                  </div>
                  <Switch
                    checked={includeSystemMessages}
                    onCheckedChange={setIncludeSystemMessages}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Filters */}
          <TabsContent value="filters" className="space-y-4">
            <div>
              <Label className="text-base font-medium">Filters</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Filter messages by date range or other criteria.
              </p>
            </div>

            <div className="space-y-4">
              {/* Date Range Filter */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Filter by Date Range</Label>
                  <p className="text-sm text-muted-foreground">
                    Export only messages within a specific date range
                  </p>
                </div>
                <Switch
                  checked={useDateRange}
                  onCheckedChange={setUseDateRange}
                />
              </div>

              {useDateRange && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Export Summary */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Export Summary</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{filteredMessages.length} messages • {selectedFormatInfo?.name} format</p>
                  <p>Estimated size: {estimatedSize}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedFormatInfo?.icon}
                <span className="font-medium">{selectedFormatInfo?.name}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <Settings className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || filteredMessages.length === 0}
            className="flex-1"
          >
            {isExporting ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {selectedFormatInfo?.name}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}