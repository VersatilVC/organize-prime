import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Request format
interface KBExtractionRequest {
  type: 'file' | 'url';
  content: string; // Base64 for files, URL for URLs
  filename: string;
  kbId: string;
  fileId?: string; // Optional for updates
  options?: {
    chunkSize?: number;
    chunkOverlap?: number;
    generateEmbeddings?: boolean;
  };
}

// Response format
interface KBExtractionResponse {
  success: boolean;
  fileId?: string;
  extractedContent?: string;
  chunks?: number;
  embeddings?: number;
  metadata?: {
    originalFormat: string;
    extractionTime: number;
    wordCount: number;
    fileSize: number;
    convertApiUsed?: boolean;
  };
  error?: string;
}

// ConvertAPI interfaces
interface ConvertAPIRequest {
  Parameters: Array<{
    Name: string;
    FileValue?: {
      Name: string;
      Data: string;
    };
  }>;
}

interface ConvertAPIResponse {
  ConversionTime?: number;
  Files?: Array<{
    FileName?: string;
    FileSize?: number;
    FileData?: string;
    Url?: string;
  }>;
}

// OpenAI interfaces
interface OpenAIEmbeddingRequest {
  input: string[];
  model: string;
}

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    total_tokens: number;
  };
}

// Utility functions
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

function getFileSizeFromBase64(base64: string): number {
  return Math.ceil(base64.length * 3 / 4);
}

// Text chunking function
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start + chunkSize * 0.5) {
        chunk = text.slice(start, breakPoint + 1);
        start = breakPoint + 1 - overlap;
      } else {
        start = end - overlap;
      }
    } else {
      start = end;
    }

    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
  }

  return chunks;
}

// Extract content from URL
async function extractFromUrl(url: string): Promise<{ success: boolean; markdown?: string; metadata?: any; error?: string }> {
  try {
    const urlObj = new URL(url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OrganizePrime KB Extractor/1.0)',
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
      throw new Error(`Unsupported content type: ${contentType}`);
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
        .replace(/<\/?(p|div|h[1-6]|br|li|tr)[^>]*>/gi, '\n')
        .replace(/<\/?(ul|ol|td|th)[^>]*>/gi, '\n')
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
    const markdownContent = `# ${urlObj.hostname}\n\n**Source URL:** ${url}\n\n${extractedText}`;

    return {
      success: true,
      markdown: markdownContent,
      metadata: {
        originalFormat: 'url',
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
      error: error instanceof Error ? error.message : 'Failed to extract content from URL',
    };
  }
}

// Generate embeddings using OpenAI
async function generateEmbeddings(chunks: string[], openaiApiKey: string): Promise<{ success: boolean; embeddings?: number[][]; tokensUsed?: number; error?: string }> {
  try {
    console.log(`🧠 Generating embeddings for ${chunks.length} chunks`);

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: chunks,
        model: 'text-embedding-ada-002'
      } as OpenAIEmbeddingRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result: OpenAIEmbeddingResponse = await response.json();
    
    const embeddings = result.data
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding);

    console.log(`✅ Generated ${embeddings.length} embeddings, used ${result.usage.total_tokens} tokens`);

    return {
      success: true,
      embeddings,
      tokensUsed: result.usage.total_tokens
    };
  } catch (error) {
    console.error('❌ Embedding generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate embeddings'
    };
  }
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  let result: KBExtractionResponse;
  let extractionLogId: string | null = null;

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🚀 KB file extraction request received');
    
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Get authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify user session
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Authentication failed');
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      throw new Error('No active organization membership found');
    }

    const requestData: KBExtractionRequest = await req.json();
    console.log('📄 Processing KB extraction:', {
      type: requestData.type,
      filename: requestData.filename,
      kbId: requestData.kbId,
      contentLength: requestData.content?.length || 0
    });

    // Validate required fields
    if (!requestData.content || !requestData.filename || !requestData.kbId) {
      throw new Error('Missing required fields: content, filename, kbId');
    }

    // Get KB configuration for chunking settings and vector table
    const { data: kbConfig, error: kbError } = await supabase
      .from('kb_configurations')
      .select('chunk_size, chunk_overlap, embedding_model, vector_table_name')
      .eq('id', requestData.kbId)
      .single();

    if (kbError || !kbConfig) {
      throw new Error('Knowledge base not found');
    }

    const chunkSize = requestData.options?.chunkSize || kbConfig.chunk_size || 1000;
    const chunkOverlap = requestData.options?.chunkOverlap || kbConfig.chunk_overlap || 200;

    // Create or update kb_file record
    let kbFileId = requestData.fileId;
    if (!kbFileId) {
      const { data: newFile, error: fileError } = await supabase
        .from('kb_files')
        .insert({
          kb_id: requestData.kbId,
          organization_id: membership.organization_id,
          file_name: requestData.filename,
          file_path: requestData.type === 'url' ? requestData.content : `${membership.organization_id}/kb-documents/${requestData.filename}`,
          source_type: requestData.type,
          source_url: requestData.type === 'url' ? requestData.content : null,
          mime_type: requestData.type === 'file' ? 'application/octet-stream' : 'text/html',
          file_size: requestData.type === 'file' ? getFileSizeFromBase64(requestData.content) : null,
          status: 'processing',
          extraction_status: 'processing',
          embedding_status: 'pending',
          uploaded_by: user.id
        })
        .select('id')
        .single();

      if (fileError || !newFile) {
        throw new Error(`Failed to create file record: ${fileError?.message}`);
      }
      
      kbFileId = newFile.id;
    } else {
      // Update existing file status
      await supabase
        .from('kb_files')
        .update({
          extraction_status: 'processing',
          embedding_status: 'pending'
        })
        .eq('id', kbFileId);
    }

    // Create extraction log
    const { data: logData, error: logError } = await supabase
      .from('kb_extraction_logs')
      .insert({
        kb_file_id: kbFileId,
        organization_id: membership.organization_id,
        extraction_method: requestData.type === 'file' ? 'convertapi' : 'web_scraping',
        status: 'processing'
      })
      .select('id')
      .single();

    if (logError) {
      console.error('❌ Failed to create extraction log:', logError);
    } else {
      extractionLogId = logData.id;
    }

    // Extract content based on type
    let extractionResult: { success: boolean; markdown?: string; metadata?: any; error?: string };

    if (requestData.type === 'url') {
      extractionResult = await extractFromUrl(requestData.content);
    } else {
      // Handle file extraction
      const fileExtension = getFileType(requestData.filename);
      
      if (fileExtension === 'txt' || fileExtension === 'md') {
        // Process text files directly
        const fileBytes = base64ToUint8Array(requestData.content);
        const extractedText = uint8ArrayToText(fileBytes).trim();
        const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
        
        extractionResult = {
          success: true,
          markdown: `# ${requestData.filename}\n\n${extractedText}`,
          metadata: {
            originalFormat: fileExtension,
            wordCount: wordCount,
            fileSize: getFileSizeFromBase64(requestData.content),
            convertApiUsed: false,
          },
        };
      } else {
        // Use ConvertAPI for other formats
        const convertApiSecret = Deno.env.get('CONVERTAPI_SECRET');
        console.log('🔧 ConvertAPI secret status:', {
          hasSecret: !!convertApiSecret,
          secretLength: convertApiSecret?.length || 0,
          secretStart: convertApiSecret ? convertApiSecret.substring(0, 8) + '...' : 'undefined'
        });
        
        if (!convertApiSecret) {
          throw new Error('ConvertAPI secret not configured');
        }

        const supportedFormats = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'rtf', 'odt'];
        if (!supportedFormats.includes(fileExtension)) {
          throw new Error(`Unsupported file format: ${fileExtension}`);
        }
        
        const convertAPIRequest: ConvertAPIRequest = {
          Parameters: [
            {
              Name: 'File',
              FileValue: {
                Name: requestData.filename,
                Data: requestData.content
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
              throw new Error(`Failed to download converted file: ${textResponse.status}`);
            }
            extractedText = await textResponse.text();
          } else {
            throw new Error('ConvertAPI returned no usable content');
          }
          
          const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
          
          extractionResult = {
            success: true,
            markdown: `# ${requestData.filename}\n\n${extractedText}`,
            metadata: {
              originalFormat: fileExtension,
              wordCount: wordCount,
              fileSize: firstFile.FileSize || getFileSizeFromBase64(requestData.content),
              convertApiUsed: true,
            },
          };
        } else {
          throw new Error('ConvertAPI returned no files');
        }
      }
    }

    if (!extractionResult.success || !extractionResult.markdown) {
      throw new Error(extractionResult.error || 'Content extraction failed');
    }

    // Chunk the extracted content
    const chunks = chunkText(extractionResult.markdown, chunkSize, chunkOverlap);
    console.log(`📝 Created ${chunks.length} chunks from extracted content`);

    // Generate embeddings if enabled
    let embeddings: number[][] = [];
    let tokensUsed = 0;
    
    const generateEmbeddingsFlag = requestData.options?.generateEmbeddings !== false; // Default to true
    if (generateEmbeddingsFlag) {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (openaiApiKey) {
        // Update embedding status
        await supabase
          .from('kb_files')
          .update({ embedding_status: 'processing' })
          .eq('id', kbFileId);

        const embeddingResult = await generateEmbeddings(chunks, openaiApiKey);
        
        if (embeddingResult.success && embeddingResult.embeddings) {
          embeddings = embeddingResult.embeddings;
          tokensUsed = embeddingResult.tokensUsed || 0;

          // Get the vector table name from the KB configuration
          const vectorTableName = kbConfig.vector_table_name || `org_vectors_${membership.organization_id.replace(/-/g, '_')}`;
          console.log(`🎯 Using vector table: ${vectorTableName} (KB-specific: ${!!kbConfig.vector_table_name})`);
          
          // Store vectors in the KB-specific vector table
          for (let i = 0; i < chunks.length; i++) {
            await supabase
              .from(vectorTableName)
              .insert({
                content: chunks[i],
                embedding: embeddings[i],
                metadata: {
                  source_file_id: kbFileId,
                  chunk_index: i,
                  chunk_size: chunks[i].length,
                  kb_id: requestData.kbId,
                  file_name: requestData.filename,
                  source_type: requestData.type,
                  ...extractionResult.metadata
                }
              });
          }

          console.log(`✅ Stored ${embeddings.length} embeddings in ${vectorTableName}`);
        } else {
          console.warn('⚠️ Embedding generation failed:', embeddingResult.error);
        }
      } else {
        console.warn('⚠️ OpenAI API key not configured, skipping embeddings');
      }
    }

    // Update kb_file record with results
    await supabase
      .from('kb_files')
      .update({
        extracted_content: extractionResult.markdown,
        extraction_status: 'completed',
        extraction_metadata: extractionResult.metadata,
        embedding_status: embeddings.length > 0 ? 'completed' : (generateEmbeddingsFlag ? 'failed' : 'pending'),
        embedding_count: embeddings.length,
        chunk_count: chunks.length,
        status: 'completed'
      })
      .eq('id', kbFileId);

    // Update extraction log
    if (extractionLogId) {
      await supabase
        .from('kb_extraction_logs')
        .update({
          status: 'completed',
          markdown_content: extractionResult.markdown,
          extraction_metadata: {
            ...extractionResult.metadata,
            chunks: chunks.length,
            embeddings: embeddings.length,
            tokensUsed,
            extractionTime: Date.now() - startTime
          },
          processing_time_ms: Date.now() - startTime
        })
        .eq('id', extractionLogId);
    }

    result = {
      success: true,
      fileId: kbFileId,
      extractedContent: extractionResult.markdown,
      chunks: chunks.length,
      embeddings: embeddings.length,
      metadata: {
        ...extractionResult.metadata,
        extractionTime: Date.now() - startTime
      }
    };

    console.log('✅ KB file extraction completed successfully:', {
      fileId: kbFileId,
      chunks: chunks.length,
      embeddings: embeddings.length,
      tokensUsed
    });

  } catch (error) {
    console.error('❌ KB file extraction error:', error);
    
    result = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    // Update extraction log with error
    if (extractionLogId) {
      await supabase
        .from('kb_extraction_logs')
        .update({
          status: 'failed',
          error_message: result.error,
          processing_time_ms: Date.now() - startTime
        })
        .eq('id', extractionLogId);
    }
  }

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    },
  });
});