import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Automatic extraction queue item
interface ExtractionQueueItem {
  content_type_id: string;
  organization_id: string;
  examples: Array<{
    type: 'file' | 'url';
    value: string;
    description?: string;
  }>;
  trigger_time: string;
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

// Extraction result for individual item
interface ItemExtractionResult {
  success: boolean;
  markdown?: string;
  metadata?: any;
  error?: string;
}

// Deno-compatible utilities
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function getFileType(filename: string): string {
  return filename.toLowerCase().split('.').pop() || 'unknown';
}

async function extractFromUrl(url: string): Promise<ItemExtractionResult> {
  try {
    const urlObj = new URL(url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OrganizePrime Content Extractor/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
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
    
    let extractedText: string;
    if (contentType.includes('text/plain')) {
      extractedText = htmlContent.trim();
    } else {
      // Extract text from HTML
      extractedText = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<\/?>(p|div|h[1-6]|br|li|tr)[^>]*>/gi, '\n')
        .replace(/<\/?>(ul|ol|td|th)[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
    }

    if (!extractedText || extractedText.length < 10) {
      throw new Error('No meaningful content extracted from URL');
    }

    const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
    const markdownContent = `# ${urlObj.hostname}\n\n**Source URL:** ${url}\n\n**Extracted Content:**\n\n${extractedText}`;

    return {
      success: true,
      markdown: markdownContent,
      metadata: {
        originalFormat: 'url',
        extractionTime: 0,
        wordCount: wordCount,
        fileSize: extractedText.length,
        convertApiUsed: false,
        sourceUrl: url,
        hostname: urlObj.hostname,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to extract content from URL',
      metadata: {
        originalFormat: 'url',
        extractionTime: 0,
        wordCount: 0,
        fileSize: 0,
        sourceUrl: url,
      },
    };
  }
}

async function extractFromFile(fileUrl: string, filename: string): Promise<ItemExtractionResult> {
  try {
    // Fetch file content from the signed URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileSizeMB = arrayBuffer.byteLength / (1024 * 1024);
    
    console.log(`📄 File size: ${fileSizeMB.toFixed(2)} MB`);
    
    // Check file size limit (ConvertAPI has limits, typically 50MB for free accounts)
    if (fileSizeMB > 50) {
      throw new Error(`File too large: ${fileSizeMB.toFixed(2)} MB (limit: 50 MB)`);
    }
    
    // Convert to base64 safely to avoid call stack issues with large files
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    
    // Process in smaller chunks to avoid call stack overflow for large PDFs
    const chunkSize = 1024; // Reduced from 8192 for better stability
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      // Use manual loop instead of String.fromCharCode.apply for large chunks
      let chunkString = '';
      for (let j = 0; j < chunk.length; j++) {
        chunkString += String.fromCharCode(chunk[j]);
      }
      binaryString += chunkString;
    }
    
    const base64Content = btoa(binaryString);
    
    const fileExtension = getFileType(filename);
    
    if (fileExtension === 'txt') {
      const fileBytes = base64ToUint8Array(base64Content);
      const extractedText = uint8ArrayToText(fileBytes).trim();
      const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
      
      return {
        success: true,
        markdown: `# ${filename}\n\n${extractedText}`,
        metadata: {
          originalFormat: fileExtension,
          extractionTime: 0,
          wordCount: wordCount,
          fileSize: arrayBuffer.byteLength,
          convertApiUsed: false,
        },
      };
    } else {
      // Use ConvertAPI for other file formats
      const convertApiSecret = Deno.env.get('CONVERTAPI_SECRET');
      if (!convertApiSecret) {
        throw new Error('ConvertAPI secret not configured');
      }

      const supportedFormats = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf', 'odt', 'ods', 'odp'];
      if (!supportedFormats.includes(fileExtension)) {
        throw new Error(`Unsupported file format: ${fileExtension}`);
      }
      
      const convertAPIRequest: ConvertAPIRequest = {
        Parameters: [
          {
            Name: 'File',
            FileValue: {
              Name: filename,
              Data: base64Content
            }
          }
        ]
      };
      
      const convertResponse = await fetch(`https://v2.convertapi.com/convert/${fileExtension}/to/txt?Secret=${convertApiSecret}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(convertAPIRequest),
      });
      
      if (!convertResponse.ok) {
        const errorText = await convertResponse.text();
        throw new Error(`ConvertAPI error: ${convertResponse.status} ${convertResponse.statusText} - ${errorText}`);
      }
      
      const convertResult: ConvertAPIResponse = await convertResponse.json();
      
      if (convertResult.Files && convertResult.Files.length > 0) {
        const firstFile = convertResult.Files[0];
        let extractedText: string;
        
        if (firstFile.FileData) {
          const fileBytes = base64ToUint8Array(firstFile.FileData);
          extractedText = uint8ArrayToText(fileBytes);
        } else if (firstFile.Url) {
          const textResponse = await fetch(firstFile.Url);
          if (!textResponse.ok) {
            throw new Error(`Failed to download converted file: ${textResponse.status} ${textResponse.statusText}`);
          }
          extractedText = await textResponse.text();
        } else {
          throw new Error('ConvertAPI returned no usable content');
        }
        
        const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
        
        return {
          success: true,
          markdown: `# ${filename}\n\n${extractedText}`,
          metadata: {
            originalFormat: fileExtension,
            extractionTime: 0,
            wordCount: wordCount,
            fileSize: firstFile.FileSize || arrayBuffer.byteLength,
            convertApiUsed: true,
          },
        };
      } else {
        throw new Error('ConvertAPI returned no files');
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to extract content from file',
      metadata: {
        originalFormat: getFileType(filename),
        extractionTime: 0,
        wordCount: 0,
        fileSize: 0,
      },
    };
  }
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🤖 Automatic content extraction worker started');
    
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    const queueItem = await req.json() as ExtractionQueueItem;
    console.log('📥 Processing automatic extraction for content_type_id:', queueItem.content_type_id);

    // Update status to processing
    await supabase
      .from('content_types')
      .update({
        extraction_status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueItem.content_type_id);

    // Process each example
    const extractionResults = [];
    let successCount = 0;
    let totalWordCount = 0;
    let combinedMarkdown = '';

    // Check if extraction logs already exist to prevent duplicates
    // Also check for any status to avoid race conditions
    const { data: existingLogs } = await supabase
      .from('content_extraction_logs')
      .select('file_name, status, markdown_content, extraction_metadata')
      .eq('content_type_id', queueItem.content_type_id);
    
    const processedFiles = new Set(existingLogs?.map(log => log.file_name) || []);
    const completedFiles = new Set(existingLogs?.filter(log => log.status === 'completed').map(log => log.file_name) || []);
    console.log(`📋 Found ${processedFiles.size} total files (${completedFiles.size} completed) for content_type_id: ${queueItem.content_type_id}`);

    for (let i = 0; i < queueItem.examples.length; i++) {
      const example = queueItem.examples[i];
      const fileName = example.description || example.value;
      
      // Skip if already processed (any status) to prevent duplicates
      if (processedFiles.has(fileName)) {
        console.log(`⏭️ Skipping already processed file: ${fileName}`);
        
        // Get existing content to include in combined markdown (only if completed)
        const existingLog = existingLogs?.find(log => log.file_name === fileName && log.status === 'completed');
        if (existingLog && existingLog.markdown_content) {
          combinedMarkdown += existingLog.markdown_content + '\n\n---\n\n';
          totalWordCount += existingLog.extraction_metadata?.wordCount || 0;
          successCount++;
        }
        
        continue;
      }
      
      console.log(`📄 Processing example ${i + 1}/${queueItem.examples.length}: ${example.type}`, example.value.substring(0, 50));
      
      let result: ItemExtractionResult;
      
      if (example.type === 'url') {
        result = await extractFromUrl(example.value);
      } else if (example.type === 'file') {
        result = await extractFromFile(example.value, example.description || `file-${i}`);
      } else {
        result = {
          success: false,
          error: `Unsupported example type: ${example.type}`,
        };
      }

      // Log extraction to content_extraction_logs
      await supabase.from('content_extraction_logs').insert({
        organization_id: queueItem.organization_id,
        content_type_id: queueItem.content_type_id,
        file_name: example.description || example.value,
        file_type: example.type,
        extraction_method: example.type === 'url' ? 'web_scraping' : 'convertapi',
        status: result.success ? 'completed' : 'failed',
        markdown_content: result.success ? result.markdown?.substring(0, 100000) : null,
        extraction_metadata: result.metadata,
        processing_time_ms: Date.now() - startTime,
        error_message: result.error || null,
      });

      if (result.success) {
        successCount++;
        totalWordCount += result.metadata?.wordCount || 0;
        combinedMarkdown += (combinedMarkdown ? '\n\n---\n\n' : '') + (result.markdown || '');
      }

      extractionResults.push(result);
    }

    // Update content type with results
    const extractionStatus = successCount > 0 ? 'completed' : 'failed';
    const extractionError = successCount === 0 ? 'All extractions failed' : null;

    // Always use the database function for consistent updates
    // This ensures reliable status updates without trigger conflicts
    console.log(`🔄 Updating content type status to: ${extractionStatus}`);
    
    try {
      const functionResult = await supabase.rpc('safe_update_content_types_no_triggers', {
        p_content_type_id: queueItem.content_type_id,
        p_markdown: combinedMarkdown,
        p_word_count: totalWordCount,
        p_extraction_metadata: {
          totalWordCount,
          successfulExtractions: successCount,
          totalExamples: queueItem.examples.length,
          extractionTime: Date.now() - startTime,
          isAutomatic: true,
          extractionStatus: extractionStatus,
          extractionError: extractionError
        }
      });

      if (!functionResult.data) {
        console.error(`⚠️ Warning: Content type update may have failed for ${queueItem.content_type_id}`);
        // Fallback direct update to ensure status is set correctly
        await supabase
          .from('content_types')
          .update({
            extraction_status: extractionStatus,
            extraction_error: extractionError,
            last_extracted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', queueItem.content_type_id);
        
        console.log(`🔄 Applied fallback status update for ${queueItem.content_type_id}`);
      } else {
        console.log(`✅ Content type status updated successfully: ${extractionStatus}`);
      }
    } catch (error) {
      console.error(`❌ Error updating content type status:`, error);
      // Always ensure status is updated, even if other fields fail
      await supabase
        .from('content_types')
        .update({
          extraction_status: extractionStatus,
          extraction_error: extractionError,
          last_extracted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', queueItem.content_type_id);
      
      console.log(`🔄 Applied error fallback status update for ${queueItem.content_type_id}`);
    }

    console.log(`✅ Automatic extraction completed for ${queueItem.content_type_id}: ${successCount}/${queueItem.examples.length} successful`);

    return new Response(JSON.stringify({
      success: true,
      contentTypeId: queueItem.content_type_id,
      successfulExtractions: successCount,
      totalExamples: queueItem.examples.length,
      totalWordCount,
      extractionTime: Date.now() - startTime
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ Automatic extraction error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown automatic extraction error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});