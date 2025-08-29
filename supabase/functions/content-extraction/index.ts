import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Service request format (what the frontend sends)
interface ServiceRequest {
  type: 'file' | 'url';
  content: string; // Base64 for files, URL for URLs
  filename: string;
  contentTypeId: string; // Maps to content_type_id in database
  options?: {
    maxPages?: number;
    preserveFormatting?: boolean;
    includeImages?: boolean;
    timeout?: number;
  };
}

// Legacy request format (for backwards compatibility)
interface LegacyRequest {
  content: string;
  filename: string;
  kb_config_id: string;
}

// Response format
interface ExtractContentResponse {
  success: boolean;
  markdown?: string;
  metadata?: {
    originalFormat: string;
    extractionTime: number;
    wordCount: number;
    fileSize: number;
    convertApiUsed?: boolean;
  };
  error?: string;
}

// ConvertAPI request format
interface ConvertAPIRequest {
  Parameters: Array<{
    Name: string;
    FileValue?: {
      Name: string;
      Data: string;
    };
  }>;
}

// ConvertAPI response format
interface ConvertAPIResponse {
  ConversionTime?: number;
  Files?: Array<{
    FileName?: string;
    FileSize?: number;
    FileData?: string;
    Url?: string;
  }>;
}

// Deno-compatible base64 decoding
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Deno-compatible text decoding
function uint8ArrayToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

// Get file size from base64
function getFileSizeFromBase64(base64: string): number {
  return Math.ceil(base64.length * 3 / 4);
}

// Get file type from filename
function getFileType(filename: string): string {
  return filename.toLowerCase().split('.').pop() || 'unknown';
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  let result: ExtractContentResponse;
  let extractionLogId: string | null = null;

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🚀 Content extraction request received');
    
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
      console.log('🔄 Handling CORS preflight request');
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    
    if (req.method !== 'POST') {
      console.error('❌ Invalid method:', req.method);
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
          } 
        }
      );
    }

    // Get authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
          } 
        }
      );
    }

    // Verify user session and get user info
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
          } 
        }
      );
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ success: false, error: 'No active organization membership found' }),
        { 
          status: 403, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
          } 
        }
      );
    }

    const requestData = await req.json();
    console.log('📄 Processing request:', {
      type: requestData.type || 'legacy',
      filename: requestData.filename,
      contentLength: requestData.content?.length || 0,
      contentTypeId: requestData.contentTypeId || requestData.kb_config_id
    });

    // Handle both new service format and legacy format
    let filename: string;
    let content: string;
    let contentTypeId: string;
    let extractionType: 'file' | 'url';

    if (requestData.type) {
      // New service format
      const serviceReq = requestData as ServiceRequest;
      filename = serviceReq.filename;
      content = serviceReq.content;
      contentTypeId = serviceReq.contentTypeId;
      extractionType = serviceReq.type;
    } else {
      // Legacy format
      const legacyReq = requestData as LegacyRequest;
      filename = legacyReq.filename;
      content = legacyReq.content;
      contentTypeId = legacyReq.kb_config_id;
      extractionType = 'file'; // Assume file for legacy
    }

    if (!content || !filename || !contentTypeId) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: content, filename, and contentTypeId/kb_config_id' 
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
          } 
        }
      );
    }

    // Extract file extension
    const fileExtension = getFileType(filename);
    const fileSize = extractionType === 'file' ? getFileSizeFromBase64(content) : null;
    
    console.log('📊 File analysis:', {
      filename,
      extension: fileExtension,
      size: fileSize,
      type: extractionType
    });

    // Create extraction log entry
    try {
      const { data: logData, error: logError } = await supabase
        .from('content_extraction_logs')
        .insert({
          organization_id: membership.organization_id,
          content_type_id: contentTypeId,
          file_name: filename,
          file_size: fileSize,
          file_type: fileExtension,
          extraction_method: extractionType === 'file' ? 'convert_api' : 'web_scraping',
          status: 'processing',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (logError) {
        console.error('❌ Failed to create extraction log:', logError);
      } else {
        extractionLogId = logData.id;
        console.log('📝 Created extraction log:', extractionLogId);
      }
    } catch (error) {
      console.error('❌ Error creating extraction log:', error);
    }

    // Handle URL extraction differently
    if (extractionType === 'url') {
      console.log('🌐 Processing URL extraction:', content);
      
      try {
        // Validate URL format
        let url: URL;
        try {
          url = new URL(content);
        } catch (error) {
          throw new Error(`Invalid URL format: ${content}`);
        }
        
        // Fetch the webpage content
        console.log('📡 Fetching URL content...');
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; OrganizePrime Content Extractor/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          // 30 second timeout
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
          throw new Error(`Unsupported content type: ${contentType}. Only HTML and plain text URLs are supported.`);
        }

        const htmlContent = await response.text();
        console.log('📄 Retrieved HTML content:', htmlContent.length, 'characters');

        // Extract text content from HTML
        let extractedText: string;
        
        if (contentType.includes('text/plain')) {
          // Plain text content
          extractedText = htmlContent.trim();
        } else {
          // HTML content - extract text using simple regex patterns
          extractedText = htmlContent
            // Remove script and style elements
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            // Remove HTML comments
            .replace(/<!--[\s\S]*?-->/g, '')
            // Replace common block elements with line breaks
            .replace(/<\/?(p|div|h[1-6]|br|li|tr)[^>]*>/gi, '\n')
            // Replace list items and table cells with spacing
            .replace(/<\/?(ul|ol|td|th)[^>]*>/gi, '\n')
            // Remove all remaining HTML tags
            .replace(/<[^>]+>/g, ' ')
            // Decode common HTML entities
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            // Clean up whitespace
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
        }

        if (!extractedText || extractedText.length < 10) {
          throw new Error('No meaningful content extracted from URL');
        }

        const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
        const extractionTime = Date.now() - startTime;
        
        // Format as markdown with URL info
        const markdownContent = `# ${url.hostname}\n\n**Source URL:** ${content}\n\n**Extracted Content:**\n\n${extractedText}`;

        console.log('✅ URL extraction completed:', {
          wordCount,
          contentLength: extractedText.length,
          extractionTime
        });

        result = {
          success: true,
          markdown: markdownContent,
          metadata: {
            originalFormat: 'url',
            extractionTime: extractionTime,
            wordCount: wordCount,
            fileSize: extractedText.length,
            convertApiUsed: false,
            sourceUrl: content,
            hostname: url.hostname,
          },
        };

      } catch (error) {
        console.error('❌ URL extraction error:', error);
        result = {
          success: false,
          error: error.message || 'Failed to extract content from URL',
          metadata: {
            originalFormat: 'url',
            extractionTime: Date.now() - startTime,
            wordCount: 0,
            fileSize: 0,
            sourceUrl: content,
          },
        };
      }
    } else {
      // Handle file extraction
      if (fileExtension === 'txt') {
        console.log('📝 Processing text file directly');
        const fileBytes = base64ToUint8Array(content);
        const extractedText = uint8ArrayToText(fileBytes).trim();
        const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
        
        result = {
          success: true,
          markdown: `# ${filename}\n\n${extractedText}`,
          metadata: {
            originalFormat: fileExtension,
            extractionTime: Date.now() - startTime,
            wordCount: wordCount,
            fileSize: fileSize || 0,
            convertApiUsed: false,
          },
        };
      } else {
        // Use ConvertAPI for other file formats
        console.log('🔄 Using ConvertAPI for file conversion');
        
        const convertApiSecret = Deno.env.get('CONVERTAPI_SECRET');
        if (!convertApiSecret) {
          console.error('❌ ConvertAPI secret not configured');
          throw new Error('ConvertAPI secret not configured');
        }

        // Validate file extension is supported
        const supportedFormats = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf', 'odt', 'ods', 'odp'];
        if (!supportedFormats.includes(fileExtension)) {
          throw new Error(`Unsupported file format: ${fileExtension}. Supported formats: ${supportedFormats.join(', ')}`);
        }
        
        // Create ConvertAPI JSON request
        const convertAPIRequest: ConvertAPIRequest = {
          Parameters: [
            {
              Name: 'File',
              FileValue: {
                Name: filename,
                Data: content
              }
            }
          ]
        };
        
        console.log('🔄 Calling ConvertAPI with JSON format for file:', filename);
        const convertResponse = await fetch(`https://v2.convertapi.com/convert/${fileExtension}/to/txt?Secret=${convertApiSecret}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(convertAPIRequest),
        });
        
        console.log('📡 ConvertAPI response status:', convertResponse.status);
        
        if (!convertResponse.ok) {
          const errorText = await convertResponse.text();
          console.error('❌ ConvertAPI error response:', errorText);
          
          // Handle specific ConvertAPI error codes
          let errorMessage = `ConvertAPI error: ${convertResponse.status} ${convertResponse.statusText}`;
          
          if (convertResponse.status === 401) {
            errorMessage = 'ConvertAPI authentication failed. Check API secret.';
          } else if (convertResponse.status === 400) {
            errorMessage = 'ConvertAPI request format error. Invalid file or parameters.';
          } else if (convertResponse.status === 500) {
            errorMessage = 'ConvertAPI conversion failed. File may be corrupted or unsupported.';
          } else if (convertResponse.status === 503) {
            errorMessage = 'ConvertAPI rate limit exceeded. Please retry in a few seconds.';
          }
          
          throw new Error(`${errorMessage} - ${errorText}`);
        }
        
        const convertResult: ConvertAPIResponse = await convertResponse.json();
        console.log('📥 ConvertAPI result structure:', {
          hasFiles: !!convertResult.Files,
          filesCount: convertResult.Files?.length || 0,
          conversionTime: convertResult.ConversionTime || 'undefined',
          firstFileName: convertResult.Files?.[0]?.FileName || 'undefined',
          firstFileSize: convertResult.Files?.[0]?.FileSize || 'undefined',
          firstFileData: convertResult.Files?.[0]?.FileData ? 'BASE64_DATA_PRESENT' : 'NO_BASE64_DATA'
        });
        
        if (convertResult.Files && convertResult.Files.length > 0) {
          const firstFile = convertResult.Files[0];
          let extractedText: string;
          
          if (firstFile.FileData) {
            // Process Base64 FileData (primary ConvertAPI response format)
            console.log('📄 Processing Base64 FileData from ConvertAPI');
            const fileBytes = base64ToUint8Array(firstFile.FileData);
            extractedText = uint8ArrayToText(fileBytes);
          } else if (firstFile.Url) {
            // Download from URL (alternative format)
            console.log('📄 Downloading from URL:', firstFile.Url);
            const textResponse = await fetch(firstFile.Url);
            if (!textResponse.ok) {
              throw new Error(`Failed to download converted file: ${textResponse.status} ${textResponse.statusText}`);
            }
            extractedText = await textResponse.text();
          } else {
            // Enhanced error logging
            console.error('❌ ConvertAPI response structure:', JSON.stringify(firstFile, null, 2));
            throw new Error('ConvertAPI returned a file entry but neither FileData nor Url is present. Available properties: ' + Object.keys(firstFile).join(', '));
          }
          
          const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
          
          result = {
            success: true,
            markdown: `# ${filename}\n\n${extractedText}`,
            metadata: {
              originalFormat: fileExtension,
              extractionTime: Date.now() - startTime,
              wordCount: wordCount,
              fileSize: firstFile.FileSize || fileSize || 0,
              convertApiUsed: true,
            },
          };
        } else {
          console.error('❌ ConvertAPI returned no files');
          console.error('❌ Full ConvertAPI response:', JSON.stringify(convertResult, null, 2));
          throw new Error('ConvertAPI returned no files in the response');
        }
      }
    }

    // Update extraction log with results (limit content size for logs too)
    if (extractionLogId) {
      try {
        const maxLogContentLength = 100000; // 100KB limit for extraction logs
        let logContent = null;
        
        if (result.success && result.markdown) {
          if (result.markdown.length > maxLogContentLength) {
            logContent = result.markdown.substring(0, maxLogContentLength) + '\n\n... (content truncated due to size limits)';
            console.log('⚠️ Log content truncated:', result.markdown.length, 'chars →', logContent.length, 'chars');
          } else {
            logContent = result.markdown;
          }
        }

        const updateData = {
          status: result.success ? 'completed' : 'failed',
          markdown_content: logContent,
          extraction_metadata: result.metadata,
          processing_time_ms: result.metadata?.extractionTime,
          error_message: result.error || null,
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from('content_extraction_logs')
          .update(updateData)
          .eq('id', extractionLogId);

        if (updateError) {
          console.error('❌ Failed to update extraction log:', updateError);
        } else {
          console.log('✅ Updated extraction log with results');
        }
      } catch (error) {
        console.error('❌ Error updating extraction log:', error);
      }
    }

    // Update content_types table with chunked approach for large content
    if (result.success && result.markdown) {
      try {
        const contentLength = result.markdown.length;
        console.log('📝 Updating content_types table, content size:', contentLength);
        
        // For very large content (>50KB), use direct table update to avoid function parameter limits
        if (contentLength > 50000) {
          console.log('⚠️ Large content detected, using direct table update approach');
          
          // Truncate content for the content_types table (10KB limit)
          const maxContentLength = 10000;
          const truncatedContent = contentLength > maxContentLength 
            ? result.markdown.substring(0, maxContentLength - 100) + '\n\n... (content truncated, see extraction logs for full content)'
            : result.markdown;

          const { data: dbResult, error: dbError } = await supabase
            .from('content_types')
            .update({
              extracted_content: {
                markdown: truncatedContent,
                wordCount: result.metadata?.wordCount || 0,
                lastUpdate: new Date().toISOString(),
                isTruncated: contentLength > maxContentLength,
                fullContentSize: contentLength
              },
              extraction_status: 'completed',
              extraction_error: null,
              last_extracted_at: new Date().toISOString(),
              extraction_metadata: result.metadata || {},
              updated_at: new Date().toISOString()
            })
            .eq('id', contentTypeId)
            .select('id');

          if (dbError) {
            console.error('❌ Direct table update error:', dbError);
          } else if (dbResult && dbResult.length > 0) {
            console.log('✅ Successfully updated content_types using direct table update');
            console.log('⚠️ Content was truncated for content_types table, full content stored in extraction logs');
          } else {
            console.error('❌ Content type not found for direct update');
          }
        } else {
          // For smaller content, use the database function
          console.log('📝 Using database function for smaller content');
          const { data: dbResult, error: dbError } = await supabase.rpc('safe_update_content_types_no_triggers', {
            p_content_type_id: contentTypeId,
            p_markdown: result.markdown,
            p_word_count: result.metadata?.wordCount || 0,
            p_extraction_metadata: result.metadata || {}
          });

          if (dbError) {
            console.error('❌ Database function error:', dbError);
          } else if (dbResult) {
            console.log('✅ Successfully updated content_types using database function');
            if (result.markdown.length > 10000) {
              console.log('⚠️ Content was truncated for content_types table, full content stored in extraction logs');
            }
          } else {
            console.error('❌ Database function returned false - content_type not found');
          }
        }
      } catch (error) {
        console.error('❌ Error updating content_types:', error);
      }
    }

  } catch (error) {
    console.error('🔥 Content extraction error:', error);
    result = {
      success: false,
      error: error.message,
      metadata: {
        originalFormat: 'unknown',
        extractionTime: Date.now() - startTime,
        wordCount: 0,
        fileSize: 0,
      },
    };

    // Update extraction log with error
    if (extractionLogId) {
      try {
        await supabase
          .from('content_extraction_logs')
          .update({
            status: 'failed',
            error_message: error.message,
            processing_time_ms: Date.now() - startTime,
            updated_at: new Date().toISOString(),
          })
          .eq('id', extractionLogId);
      } catch (updateError) {
        console.error('❌ Error updating extraction log with error:', updateError);
      }
    }
  }

  console.log('✅ Content extraction completed:', {
    success: result.success,
    wordCount: result.metadata?.wordCount || 0,
    extractionTime: result.metadata?.extractionTime || 0,
    error: result.error || null,
    logId: extractionLogId
  });

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
});