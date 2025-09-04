import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

// Request interfaces
interface WebsiteScanRequest {
  action: 'scan' | 'status' | 'cancel';
  websiteUrl: string;
  kbId: string;
  options?: {
    maxPages?: number;
    includePatterns?: string[];
    excludePatterns?: string[];
    scanType?: 'full' | 'incremental' | 'single_page';
  };
  runId?: string; // For status/cancel actions
}

interface WebsiteScanResponse {
  success: boolean;
  runId?: string;
  status?: string;
  data?: any;
  error?: string;
  stats?: {
    totalPages: number;
    processedPages: number;
    indexedPages: number;
    failedPages: number;
  };
}

// Apify API interfaces
interface ApifyRunRequest {
  startUrls: Array<{ url: string }>;
  maxCrawlPages: number;
  maxCrawlDepth: number;
  removeTags: string[];
  removeElementsCssSelector: string;
  clickElementsCssSelector: string;
  includeUrlGlobs: string[];
  excludeUrlGlobs: string[];
  maxScrollHeightPixels: number;
  readableTextCharThreshold: number;
}

interface ApifyRunResponse {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  stats: {
    requestsFinished: number;
    requestsFailed: number;
    requestsTotal: number;
  };
}

interface ApifyDatasetItem {
  url: string;
  loadedUrl: string;
  text: string;
  markdown: string;
  title: string;
  description: string;
  author: string;
  date: string;
  breadcrumbs: Array<{ name: string; url: string }>;
  inlinks: Array<{ text: string; url: string }>;
  outlinks: Array<{ text: string; url: string }>;
  screenshot: string;
  html: string;
  metadata: Record<string, any>;
  processingTimeMs: number;
}

// Utility functions
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  }
}

function generateContentHash(content: string): Promise<string> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))
    .then(hash => Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    );
}

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
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    const embeddings = result.data
      .sort((a: any, b: any) => a.index - b.index)
      .map((item: any) => item.embedding);

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
  let result: WebsiteScanResponse;

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🌐 Website scanner request received');
    
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

    const requestData: WebsiteScanRequest = await req.json();
    console.log('🔍 Processing website scan:', {
      action: requestData.action,
      websiteUrl: requestData.websiteUrl,
      kbId: requestData.kbId,
      options: requestData.options
    });

    // Validate required fields
    if (!requestData.websiteUrl || !requestData.kbId) {
      throw new Error('Missing required fields: websiteUrl, kbId');
    }

    // Get KB configuration
    const { data: kbConfig, error: kbError } = await supabase
      .from('kb_configurations')
      .select('*')
      .eq('id', requestData.kbId)
      .eq('organization_id', membership.organization_id)
      .single();

    if (kbError || !kbConfig) {
      throw new Error('Knowledge base not found or access denied');
    }

    const apifyApiToken = Deno.env.get('APIFY_API_TOKEN');
    if (!apifyApiToken) {
      throw new Error('Apify API token not configured');
    }

    switch (requestData.action) {
      case 'scan':
        return await handleScanRequest(supabase, membership.organization_id, user.id, requestData, kbConfig, apifyApiToken);
      case 'status':
        return await handleStatusRequest(supabase, membership.organization_id, requestData.runId!);
      case 'cancel':
        return await handleCancelRequest(supabase, membership.organization_id, requestData.runId!, apifyApiToken);
      default:
        throw new Error(`Invalid action: ${requestData.action}`);
    }

  } catch (error) {
    console.error('❌ Website scanner error:', error);
    
    result = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return new Response(JSON.stringify(result), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
      },
    });
  }
});

async function handleScanRequest(
  supabase: any,
  organizationId: string,
  userId: string,
  requestData: WebsiteScanRequest,
  kbConfig: any,
  apifyApiToken: string
): Promise<Response> {
  const websiteDomain = extractDomain(requestData.websiteUrl);
  
  // Create or update website scan config
  const { data: scanConfig, error: configError } = await supabase
    .from('website_scan_configs')
    .upsert({
      organization_id: organizationId,
      kb_id: requestData.kbId,
      website_url: requestData.websiteUrl,
      website_domain: websiteDomain,
      max_pages: requestData.options?.maxPages || 100,
      include_patterns: requestData.options?.includePatterns || [],
      exclude_patterns: requestData.options?.excludePatterns || ['*/privacy', '*/terms', '*/cookie-policy', '*/legal/*'],
      scan_status: 'scanning',
      last_scan_at: new Date().toISOString(),
      updated_by: userId
    }, { 
      onConflict: 'kb_id',
      ignoreDuplicates: false 
    })
    .select()
    .single();

  if (configError) {
    throw new Error(`Failed to create scan configuration: ${configError.message}`);
  }

  // Create scan log
  const { data: scanLog, error: logError } = await supabase
    .from('website_scan_logs')
    .insert({
      organization_id: organizationId,
      website_config_id: scanConfig.id,
      scan_type: requestData.options?.scanType || 'full',
      status: 'started',
      apify_actor_id: 'apify/website-content-crawler'
    })
    .select()
    .single();

  if (logError) {
    throw new Error(`Failed to create scan log: ${logError.message}`);
  }

  // Prepare Apify run request
  const apifyRequest: ApifyRunRequest = {
    startUrls: [{ url: requestData.websiteUrl }],
    maxCrawlPages: requestData.options?.maxPages || 100,
    maxCrawlDepth: 5,
    removeTags: ['script', 'style', 'nav', 'footer', 'aside', '.sidebar', '#sidebar', '.navigation', '#navigation'],
    removeElementsCssSelector: 'nav, footer, aside, .sidebar, #sidebar, .navigation, #navigation, .cookie-banner, .popup',
    clickElementsCssSelector: '',
    includeUrlGlobs: requestData.options?.includePatterns || [`${requestData.websiteUrl}*`],
    excludeUrlGlobs: [
      ...(requestData.options?.excludePatterns || []),
      '*.pdf', '*.doc', '*.docx', '*.xls', '*.xlsx', '*.ppt', '*.pptx',
      '*.jpg', '*.jpeg', '*.png', '*.gif', '*.svg',
      '*privacy*', '*terms*', '*cookie*', '*legal*'
    ],
    maxScrollHeightPixels: 5000,
    readableTextCharThreshold: 100
  };

  // Start Apify run
  const apifyResponse = await fetch(`https://api.apify.com/v2/acts/apify~website-content-crawler/runs?token=${apifyApiToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(apifyRequest)
  });

  if (!apifyResponse.ok) {
    const errorText = await apifyResponse.text();
    throw new Error(`Apify API error: ${apifyResponse.status} ${apifyResponse.statusText} - ${errorText}`);
  }

  const apifyRun: ApifyRunResponse = await apifyResponse.json();

  // Update scan log with Apify run ID
  await supabase
    .from('website_scan_logs')
    .update({
      apify_run_id: apifyRun.id,
      status: 'crawling'
    })
    .eq('id', scanLog.id);

  // Start background processing (don't await this)
  processApifyRun(supabase, organizationId, scanConfig.id, scanLog.id, apifyRun.id, apifyApiToken, kbConfig);

  const result: WebsiteScanResponse = {
    success: true,
    runId: apifyRun.id,
    status: 'crawling',
    data: {
      scanConfigId: scanConfig.id,
      scanLogId: scanLog.id,
      websiteDomain: websiteDomain,
      maxPages: requestData.options?.maxPages || 100
    }
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    },
  });
}

async function handleStatusRequest(
  supabase: any,
  organizationId: string,
  runId: string
): Promise<Response> {
  // Get scan log by Apify run ID
  const { data: scanLog, error: logError } = await supabase
    .from('website_scan_logs')
    .select('*')
    .eq('apify_run_id', runId)
    .eq('organization_id', organizationId)
    .single();

  if (logError || !scanLog) {
    throw new Error('Scan run not found');
  }

  // Get website pages count
  const { count: pagesCount } = await supabase
    .from('website_pages')
    .select('*', { count: 'exact', head: true })
    .eq('website_config_id', scanLog.website_config_id);

  const { count: indexedCount } = await supabase
    .from('website_pages')
    .select('*', { count: 'exact', head: true })
    .eq('website_config_id', scanLog.website_config_id)
    .eq('status', 'indexed');

  const result: WebsiteScanResponse = {
    success: true,
    runId: runId,
    status: scanLog.status,
    stats: {
      totalPages: scanLog.total_pages_found || 0,
      processedPages: scanLog.pages_processed || 0,
      indexedPages: indexedCount || 0,
      failedPages: scanLog.pages_failed || 0
    },
    data: {
      startedAt: scanLog.started_at,
      completedAt: scanLog.completed_at,
      processingTimeMs: scanLog.processing_time_ms
    }
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    },
  });
}

async function handleCancelRequest(
  supabase: any,
  organizationId: string,
  runId: string,
  apifyApiToken: string
): Promise<Response> {
  // Cancel Apify run
  const apifyResponse = await fetch(`https://api.apify.com/v2/acts/runs/${runId}/abort?token=${apifyApiToken}`, {
    method: 'POST'
  });

  if (!apifyResponse.ok) {
    console.warn(`Failed to cancel Apify run: ${apifyResponse.status}`);
  }

  // Update scan log status
  await supabase
    .from('website_scan_logs')
    .update({
      status: 'failed',
      error_message: 'Cancelled by user',
      completed_at: new Date().toISOString()
    })
    .eq('apify_run_id', runId)
    .eq('organization_id', organizationId);

  const result: WebsiteScanResponse = {
    success: true,
    runId: runId,
    status: 'cancelled'
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    },
  });
}

// Background processing function
async function processApifyRun(
  supabase: any,
  organizationId: string,
  websiteConfigId: string,
  scanLogId: string,
  apifyRunId: string,
  apifyApiToken: string,
  kbConfig: any
): Promise<void> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  let totalPages = 0;
  let processedPages = 0;
  let indexedPages = 0;
  let failedPages = 0;

  try {
    // Poll Apify run status
    let runCompleted = false;
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes with 10s intervals

    while (!runCompleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;

      const statusResponse = await fetch(`https://api.apify.com/v2/acts/runs/${apifyRunId}?token=${apifyApiToken}`);
      if (!statusResponse.ok) {
        throw new Error(`Failed to get run status: ${statusResponse.status}`);
      }

      const runStatus = await statusResponse.json();
      console.log(`📊 Apify run status: ${runStatus.status} (attempt ${attempts})`);

      if (runStatus.status === 'SUCCEEDED' || runStatus.status === 'FAILED' || runStatus.status === 'ABORTED') {
        runCompleted = true;

        // Update scan log
        await supabase
          .from('website_scan_logs')
          .update({
            status: runStatus.status === 'SUCCEEDED' ? 'processing' : 'failed',
            error_message: runStatus.status === 'FAILED' ? 'Apify run failed' : null
          })
          .eq('id', scanLogId);

        if (runStatus.status !== 'SUCCEEDED') {
          return;
        }
      }
    }

    if (!runCompleted) {
      throw new Error('Apify run timeout');
    }

    // Get dataset items
    const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${apifyRunId}/items?token=${apifyApiToken}`);
    if (!datasetResponse.ok) {
      throw new Error(`Failed to get dataset: ${datasetResponse.status}`);
    }

    const datasetItems: ApifyDatasetItem[] = await datasetResponse.json();
    totalPages = datasetItems.length;

    console.log(`📄 Processing ${totalPages} pages from Apify dataset`);

    // Update scan log with total pages
    await supabase
      .from('website_scan_logs')
      .update({
        total_pages_found: totalPages,
        status: 'processing'
      })
      .eq('id', scanLogId);

    // Process each page
    for (const item of datasetItems) {
      try {
        processedPages++;

        // Skip if no meaningful content
        if (!item.markdown || item.markdown.length < 100) {
          console.log(`⏭️ Skipping page with insufficient content: ${item.url}`);
          continue;
        }

        // Generate content hash for change detection
        const contentHash = await generateContentHash(item.markdown);

        // Check if page already exists with same content
        const { data: existingPage } = await supabase
          .from('website_pages')
          .select('id, content_hash, kb_file_id')
          .eq('website_config_id', websiteConfigId)
          .eq('page_url', item.url)
          .single();

        if (existingPage && existingPage.content_hash === contentHash) {
          console.log(`✅ Page unchanged, skipping: ${item.url}`);
          continue;
        }

        // Create/update website page record
        const pageData = {
          organization_id: organizationId,
          website_config_id: websiteConfigId,
          kb_id: kbConfig.id,
          page_url: item.url,
          page_path: new URL(item.url).pathname,
          page_title: item.title || 'Untitled',
          page_description: item.description || '',
          content_hash: contentHash,
          word_count: item.markdown.split(/\s+/).length,
          status: 'processing',
          last_crawled_at: new Date().toISOString(),
          extracted_content: item.markdown,
          extraction_metadata: {
            processingTimeMs: item.processingTimeMs,
            author: item.author,
            date: item.date,
            breadcrumbs: item.breadcrumbs,
            screenshot: item.screenshot ? true : false
          }
        };

        const { data: websitePage, error: pageError } = await supabase
          .from('website_pages')
          .upsert(pageData, { 
            onConflict: 'website_config_id,page_url',
            ignoreDuplicates: false 
          })
          .select()
          .single();

        if (pageError) {
          console.error(`❌ Failed to upsert page ${item.url}:`, pageError);
          failedPages++;
          continue;
        }

        // Create KB file record
        const { data: kbFile, error: kbFileError } = await supabase
          .from('kb_files')
          .upsert({
            kb_id: kbConfig.id,
            organization_id: organizationId,
            file_name: `${item.title || 'Webpage'} - ${item.url}`,
            file_path: item.url,
            source_type: 'url',
            source_url: item.url,
            mime_type: 'text/html',
            file_size: item.markdown.length,
            status: 'processing',
            extraction_status: 'completed',
            embedding_status: 'processing',
            extracted_content: item.markdown,
            extraction_metadata: pageData.extraction_metadata,
            uploaded_by: null // System generated
          }, {
            onConflict: 'source_url,kb_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (kbFileError) {
          console.error(`❌ Failed to create KB file for ${item.url}:`, kbFileError);
          failedPages++;
          continue;
        }

        // Link website page to KB file
        await supabase
          .from('website_pages')
          .update({ kb_file_id: kbFile.id })
          .eq('id', websitePage.id);

        // Generate embeddings if OpenAI key is available
        if (openaiApiKey) {
          const chunks = chunkText(item.markdown, kbConfig.chunk_size || 1000, kbConfig.chunk_overlap || 200);
          const embeddingResult = await generateEmbeddings(chunks, openaiApiKey);
          
          if (embeddingResult.success && embeddingResult.embeddings) {
            // Store vectors in KB vector table
            const vectorTableName = kbConfig.vector_table_name || `org_vectors_${organizationId.replace(/-/g, '_')}`;
            
            for (let i = 0; i < chunks.length; i++) {
              await supabase
                .from(vectorTableName)
                .insert({
                  content: chunks[i],
                  embedding: embeddingResult.embeddings[i],
                  metadata: {
                    source_file_id: kbFile.id,
                    chunk_index: i,
                    chunk_size: chunks[i].length,
                    kb_id: kbConfig.id,
                    file_name: kbFile.file_name,
                    source_type: 'url',
                    page_url: item.url,
                    page_title: item.title,
                    website_config_id: websiteConfigId
                  }
                });
            }

            // Update KB file with embedding info
            await supabase
              .from('kb_files')
              .update({
                embedding_status: 'completed',
                embedding_count: embeddingResult.embeddings.length,
                chunk_count: chunks.length,
                status: 'completed'
              })
              .eq('id', kbFile.id);

            // Update website page status
            await supabase
              .from('website_pages')
              .update({
                status: 'indexed',
                last_indexed_at: new Date().toISOString(),
                embedding_count: embeddingResult.embeddings.length
              })
              .eq('id', websitePage.id);

            indexedPages++;
            console.log(`✅ Indexed page: ${item.url} (${chunks.length} chunks)`);
          } else {
            console.warn(`⚠️ Failed to generate embeddings for ${item.url}:`, embeddingResult.error);
            failedPages++;
          }
        } else {
          // Mark as processed but not indexed
          await supabase
            .from('website_pages')
            .update({
              status: 'indexed', // Still mark as indexed since content is stored
              last_indexed_at: new Date().toISOString()
            })
            .eq('id', websitePage.id);

          await supabase
            .from('kb_files')
            .update({
              status: 'completed',
              embedding_status: 'pending'
            })
            .eq('id', kbFile.id);

          indexedPages++;
          console.log(`✅ Processed page (no embeddings): ${item.url}`);
        }

      } catch (pageError) {
        console.error(`❌ Failed to process page ${item.url}:`, pageError);
        failedPages++;
      }

      // Update progress periodically
      if (processedPages % 10 === 0) {
        await supabase
          .from('website_scan_logs')
          .update({
            pages_processed: processedPages,
            pages_indexed: indexedPages,
            pages_failed: failedPages
          })
          .eq('id', scanLogId);
      }
    }

    // Final status update
    await supabase
      .from('website_scan_logs')
      .update({
        status: 'completed',
        pages_processed: processedPages,
        pages_indexed: indexedPages,
        pages_failed: failedPages,
        completed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - Date.parse(new Date().toISOString())
      })
      .eq('id', scanLogId);

    // Update website config
    await supabase
      .from('website_scan_configs')
      .update({
        scan_status: 'completed',
        scan_metadata: {
          totalPages,
          processedPages,
          indexedPages,
          failedPages
        }
      })
      .eq('id', websiteConfigId);

    console.log(`🎉 Website scan completed: ${indexedPages}/${totalPages} pages indexed`);

  } catch (error) {
    console.error('❌ Website scan processing failed:', error);
    
    await supabase
      .from('website_scan_logs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Processing failed',
        pages_processed: processedPages,
        pages_indexed: indexedPages,
        pages_failed: failedPages,
        completed_at: new Date().toISOString()
      })
      .eq('id', scanLogId);

    await supabase
      .from('website_scan_configs')
      .update({
        scan_status: 'failed'
      })
      .eq('id', websiteConfigId);
  }
}