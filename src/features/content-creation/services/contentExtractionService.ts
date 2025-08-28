import { supabase } from '@/integrations/supabase/client';

/**
 * Content Extraction Service
 * Handles extraction of text content from various file formats using Supabase Edge Functions
 */

export interface ExtractionResult {
  success: boolean;
  markdown: string;
  metadata: {
    originalFormat: string;
    fileSize?: number;
    extractionTime: number;
    pageCount?: number;
    wordCount?: number;
  };
  error?: string;
}

export interface ExtractionOptions {
  maxPages?: number;
  preserveFormatting?: boolean;
  includeImages?: boolean;
  timeout?: number; // seconds
}

class ContentExtractionService {
  private readonly defaultTimeout = 120; // 2 minutes

  constructor() {
    // No longer need client-side API secrets since we use Edge Functions
  }

  /**
   * Extract text content from a file and convert to markdown
   */
  async extractFromFile(file: File, contentTypeId: string, options: ExtractionOptions = {}): Promise<ExtractionResult> {
    try {
      console.log('🔄 Starting file extraction for:', file.name);
      
      // Convert file to base64
      const base64Content = await this.fileToBase64(file);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Get Supabase URL for Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      // Call Edge Function directly with fetch
      console.log('📡 Calling Edge Function directly');
      const response = await fetch(`${supabaseUrl}/functions/v1/content-extraction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({
          type: 'file',
          content: base64Content,
          filename: file.name,
          contentTypeId,
          options
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Edge Function error:', response.status, errorText);
        throw new Error(`Edge Function error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ File extraction completed:', result.success);
      return result as ExtractionResult;
      
    } catch (error) {
      console.error('Content extraction failed:', error);
      
      return {
        success: false,
        markdown: '',
        metadata: { originalFormat: this.getFileType(file.name), extractionTime: 0 },
        error: error instanceof Error ? error.message : 'Unknown extraction error'
      };
    }
  }

  /**
   * Extract content from a URL
   */
  async extractFromUrl(url: string, contentTypeId: string, options: ExtractionOptions = {}): Promise<ExtractionResult> {
    try {
      console.log('🌍 SERVICE: extractFromUrl called');
      console.log('🌍 SERVICE: URL:', url);
      console.log('🌍 SERVICE: Content Type ID:', contentTypeId);
      
      // Get the current session token
      console.log('🔐 SERVICE: Getting session...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ SERVICE: No active session');
        throw new Error('No active session');
      }
      console.log('✅ SERVICE: Session obtained');

      // Get Supabase URL for Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      console.log('🔗 SERVICE: Supabase URL:', supabaseUrl);
      if (!supabaseUrl) {
        console.error('❌ SERVICE: Supabase URL not configured');
        throw new Error('Supabase URL not configured');
      }

      const requestBody = {
        type: 'url',
        content: url,
        filename: `url-${Date.now()}`,
        contentTypeId,
        options
      };
      console.log('📦 SERVICE: Request body:', JSON.stringify(requestBody, null, 2));

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/content-extraction`;
      console.log('📡 SERVICE: Calling Edge Function:', edgeFunctionUrl);
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 SERVICE: Response status:', response.status);
      console.log('📡 SERVICE: Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SERVICE: Edge Function error:', response.status, response.statusText);
        console.error('❌ SERVICE: Error text:', errorText);
        throw new Error(`Edge Function error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log('📥 SERVICE: Parsing response JSON...');
      const result = await response.json();
      console.log('📥 SERVICE: Result:', {
        success: result.success,
        error: result.error,
        markdownLength: result.markdown?.length || 0,
        metadata: result.metadata
      });
      
      console.log('✅ SERVICE: URL extraction completed');
      return result as ExtractionResult;
      
    } catch (error) {
      console.error('❌ SERVICE: URL extraction failed:', error);
      
      const errorResult = {
        success: false,
        markdown: '',
        metadata: { originalFormat: 'url', extractionTime: 0 },
        error: error instanceof Error ? error.message : 'Unknown URL extraction error'
      };
      console.log('❌ SERVICE: Returning error result:', errorResult);
      return errorResult;
    }
  }

  /**
   * Get file type from filename
   */
  private getFileType(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop() || '';
    return extension;
  }

  /**
   * Convert file to base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:type;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }


  /**
   * Check if extraction is configured (Edge Function should always be available)
   */
  isConfigured(): boolean {
    return true; // Edge Functions are always available
  }

  /**
   * Get supported file types
   */
  getSupportedFileTypes(): string[] {
    return [
      'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx',
      'txt', 'rtf', 'odt', 'ods', 'odp', 'md', 'html', 'htm'
    ];
  }
}

// Export singleton instance
export const contentExtractionService = new ContentExtractionService();
export default contentExtractionService;