import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Wand2, Copy, RefreshCw } from 'lucide-react';
import { useContentGenerationWebhook } from '../hooks/useContentWebhooks';
import { CONTENT_TYPES, CONTENT_TONES } from '../types/contentCreationTypes';
import { toast } from 'sonner';

interface GenerationWithWebhookProps {
  projectId?: string;
  onContentGenerated?: (content: string) => void;
}

export const GenerationWithWebhook: React.FC<GenerationWithWebhookProps> = ({
  projectId,
  onContentGenerated
}) => {
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState('blog');
  const [tone, setTone] = useState('professional');
  const [targetAudience, setTargetAudience] = useState('');
  const [keywords, setKeywords] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');

  const { generateContent, isGenerating } = useContentGenerationWebhook();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt for content generation');
      return;
    }

    try {
      const result = await generateContent({
        prompt: prompt.trim(),
        content_type: contentType,
        tone,
        target_audience: targetAudience || undefined,
        keywords: keywords ? keywords.split(',').map(k => k.trim()) : undefined,
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        temperature: 0.7
      });

      if (result?.content) {
        setGeneratedContent(result.content);
        onContentGenerated?.(result.content);
        toast.success('Content generated successfully!');
      }
    } catch (error) {
      console.error('Content generation failed:', error);
      // Error handling is done in the webhook hook
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success('Content copied to clipboard');
  };

  const handleRegenerateWithSamePrompt = () => {
    handleGenerate();
  };

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            AI Content Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Content Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the content you want to generate..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Content Type</label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tone</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TONES.map((toneOption) => (
                    <SelectItem key={toneOption.value} value={toneOption.value}>
                      {toneOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Target Audience (Optional)</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                placeholder="e.g., Young professionals, Tech enthusiasts"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Keywords (Optional)</label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating Content...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Content */}
      {generatedContent && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Generated Content</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{contentType}</Badge>
              <Badge variant="outline">{tone}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                rows={12}
                className="resize-vertical"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCopyContent}
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Content
              </Button>
              
              <Button
                variant="outline"
                onClick={handleRegenerateWithSamePrompt}
                disabled={isGenerating}
                className="flex-1"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div>Word count: {generatedContent.split(/\s+/).length}</div>
              <div>Character count: {generatedContent.length}</div>
              <div>Estimated reading time: {Math.max(1, Math.round(generatedContent.split(/\s+/).length / 200))} min</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};