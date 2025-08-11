import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Database, BarChart3, Tag, Trash2, Plus } from 'lucide-react';
import { useKnowledgeBaseStats } from '../hooks/useKnowledgeBaseData';

const PROCESSING_MODELS = [
  { value: 'standard', label: 'Standard Processing' },
  { value: 'enhanced', label: 'Enhanced Processing (OCR)' },
  { value: 'ai-powered', label: 'AI-Powered Extraction' },
];

const SEARCH_MODES = [
  { value: 'keyword', label: 'Keyword Search' },
  { value: 'semantic', label: 'Semantic Search' },
  { value: 'hybrid', label: 'Hybrid Search' },
];

export function KnowledgeBaseSettings() {
  const { data: stats } = useKnowledgeBaseStats();
  const [settings, setSettings] = useState({
    processing_model: 'standard',
    search_mode: 'keyword',
    auto_categorize: true,
    extract_metadata: true,
    enable_ocr: false,
    max_file_size: 50, // MB
    allowed_file_types: ['pdf', 'doc', 'docx', 'txt', 'md'],
  });

  const [customCategories, setCustomCategories] = useState([
    'general', 'documentation', 'policies', 'procedures', 'training', 'reference'
  ]);
  const [newCategory, setNewCategory] = useState('');

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !customCategories.includes(newCategory.trim().toLowerCase())) {
      setCustomCategories(prev => [...prev, newCategory.trim().toLowerCase()]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    if (customCategories.length > 1) { // Keep at least one category
      setCustomCategories(prev => prev.filter(cat => cat !== category));
    }
  };

  const handleSaveSettings = () => {
    // Save settings to backend
    console.log('Saving settings:', settings);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure processing, search, and organization settings
          </p>
        </div>
        <Button onClick={handleSaveSettings}>
          Save Settings
        </Button>
      </div>

      {/* Processing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Document Processing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="processing-model">Processing Model</Label>
              <Select
                value={settings.processing_model}
                onValueChange={(value) => handleSettingChange('processing_model', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROCESSING_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="max-file-size">Max File Size (MB)</Label>
              <Input
                id="max-file-size"
                type="number"
                value={settings.max_file_size}
                onChange={(e) => handleSettingChange('max_file_size', parseInt(e.target.value))}
                min="1"
                max="500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-categorize">Auto-categorize Documents</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically assign categories based on content analysis
                </p>
              </div>
              <Switch
                id="auto-categorize"
                checked={settings.auto_categorize}
                onCheckedChange={(checked) => handleSettingChange('auto_categorize', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="extract-metadata">Extract Metadata</Label>
                <p className="text-sm text-muted-foreground">
                  Extract author, creation date, and other metadata from documents
                </p>
              </div>
              <Switch
                id="extract-metadata"
                checked={settings.extract_metadata}
                onCheckedChange={(checked) => handleSettingChange('extract_metadata', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable-ocr">Enable OCR</Label>
                <p className="text-sm text-muted-foreground">
                  Extract text from images and scanned documents
                </p>
              </div>
              <Switch
                id="enable-ocr"
                checked={settings.enable_ocr}
                onCheckedChange={(checked) => handleSettingChange('enable_ocr', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Search Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="search-mode">Search Mode</Label>
            <Select
              value={settings.search_mode}
              onValueChange={(value) => handleSettingChange('search_mode', value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEARCH_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-2 text-sm text-muted-foreground">
              {settings.search_mode === 'keyword' && 'Fast text-based search using keywords'}
              {settings.search_mode === 'semantic' && 'AI-powered search that understands context and meaning'}
              {settings.search_mode === 'hybrid' && 'Combines keyword and semantic search for best results'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Category Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Current Categories</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {customCategories.map((category) => (
                <Badge key={category} variant="secondary" className="gap-2">
                  {category}
                  {customCategories.length > 1 && (
                    <button
                      onClick={() => handleRemoveCategory(category)}
                      className="hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="new-category">Add New Category</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="new-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter category name..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
              />
              <Button onClick={handleAddCategory} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Usage Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats?.total_documents || 0}</p>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats?.completed_documents || 0}</p>
              <p className="text-sm text-muted-foreground">Processed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats?.total_searches || 0}</p>
              <p className="text-sm text-muted-foreground">Total Searches</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {stats?.avg_search_results ? Math.round(stats.avg_search_results) : 0}
              </p>
              <p className="text-sm text-muted-foreground">Avg Results</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Type Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Allowed File Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {settings.allowed_file_types.map((type) => (
                <Badge key={type} variant="outline">
                  .{type}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Currently supporting: PDF, Word documents, text files, and Markdown files.
              Additional file types can be enabled in the processing settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default KnowledgeBaseSettings;