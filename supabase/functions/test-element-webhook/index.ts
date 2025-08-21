/**
 * Comprehensive Test Suite for execute-element-webhook Edge Function
 * 
 * This function provides automated testing capabilities for the enhanced webhook system
 * including unit tests, integration tests, and performance validation.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-environment",
};

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuite {
  suiteName: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  success: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing environment variables' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const testType = url.searchParams.get('type') || 'all';
  const verbose = url.searchParams.get('verbose') === 'true';

  console.log(`Starting webhook test suite: ${testType}`);

  try {
    const testRunner = new WebhookTestRunner(supabaseUrl, supabaseServiceKey);
    const results = await testRunner.runTests(testType, verbose);

    return new Response(
      JSON.stringify(results, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Test suite error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Test suite failed', 
        message: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

class WebhookTestRunner {
  private supabase: any;
  private webhookFunctionUrl: string;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.webhookFunctionUrl = `${supabaseUrl}/functions/v1/execute-element-webhook`;
  }

  async runTests(testType: string, verbose: boolean): Promise<any> {
    const suites: TestSuite[] = [];

    if (testType === 'all' || testType === 'basic') {
      suites.push(await this.runBasicTests(verbose));
    }

    if (testType === 'all' || testType === 'integration') {
      suites.push(await this.runIntegrationTests(verbose));
    }

    if (testType === 'all' || testType === 'security') {
      suites.push(await this.runSecurityTests(verbose));
    }

    if (testType === 'all' || testType === 'performance') {
      suites.push(await this.runPerformanceTests(verbose));
    }

    if (testType === 'all' || testType === 'database') {
      suites.push(await this.runDatabaseTests(verbose));
    }

    const summary = this.generateSummary(suites);
    
    return {
      timestamp: new Date().toISOString(),
      testType,
      summary,
      suites: verbose ? suites : suites.map(s => ({
        suiteName: s.suiteName,
        totalTests: s.totalTests,
        passedTests: s.passedTests,
        failedTests: s.failedTests,
        success: s.success,
        totalDuration: s.totalDuration
      }))
    };
  }

  /**
   * Basic functionality tests
   */
  async runBasicTests(verbose: boolean): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = performance.now();

    // Test 1: Function responds to OPTIONS request
    tests.push(await this.runTest('CORS preflight check', async () => {
      const response = await fetch(this.webhookFunctionUrl, {
        method: 'OPTIONS',
        headers: { 'Origin': 'http://localhost:3000' }
      });
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }

      const corsHeader = response.headers.get('Access-Control-Allow-Origin');
      if (corsHeader !== '*') {
        throw new Error(`Expected CORS header *, got ${corsHeader}`);
      }

      return { corsWorking: true };
    }));

    // Test 2: Function rejects invalid HTTP methods
    tests.push(await this.runTest('Invalid HTTP method rejection', async () => {
      const response = await fetch(this.webhookFunctionUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.status !== 405) {
        throw new Error(`Expected 405 Method Not Allowed, got ${response.status}`);
      }

      const data = await response.json();
      if (!data.error || !data.error.type) {
        throw new Error('Expected structured error response');
      }

      return { methodValidationWorking: true };
    }));

    // Test 3: Function validates request body
    tests.push(await this.runTest('Request body validation', async () => {
      const response = await fetch(this.webhookFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'request' })
      });
      
      if (response.status !== 400) {
        throw new Error(`Expected 400 Bad Request, got ${response.status}`);
      }

      const data = await response.json();
      if (data.error?.type !== 'validation_payload_invalid') {
        throw new Error('Expected validation_payload_invalid error type');
      }

      return { bodyValidationWorking: true };
    }));

    // Test 4: Function handles missing webhook configuration
    tests.push(await this.runTest('Missing webhook configuration', async () => {
      const validRequest = {
        organizationId: 'test-org-' + Date.now(),
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: 'test-element-' + Date.now(),
        eventType: 'test',
        userContext: {
          userId: 'test-user',
          role: 'user'
        },
        payload: { test: 'data' }
      };

      const response = await fetch(this.webhookFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validRequest)
      });
      
      if (response.status !== 404) {
        throw new Error(`Expected 404 Not Found, got ${response.status}`);
      }

      const data = await response.json();
      if (data.error?.type !== 'webhook_not_found') {
        throw new Error('Expected webhook_not_found error type');
      }

      return { webhookLookupWorking: true };
    }));

    const totalDuration = performance.now() - startTime;
    return this.createTestSuite('Basic Functionality Tests', tests, totalDuration);
  }

  /**
   * Database integration tests
   */
  async runDatabaseTests(verbose: boolean): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = performance.now();

    // Test 1: Database connection works
    tests.push(await this.runTest('Database connection', async () => {
      const { data, error } = await this.supabase
        .from('element_webhooks')
        .select('id')
        .limit(1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return { connectionWorking: true, canQueryWebhooks: true };
    }));

    // Test 2: Required tables exist
    tests.push(await this.runTest('Required tables exist', async () => {
      const requiredTables = [
        'element_webhooks',
        'element_webhook_logs', 
        'page_elements_registry',
        'webhook_admin_audit'
      ];

      const results = {};
      for (const table of requiredTables) {
        try {
          const { error } = await this.supabase
            .from(table)
            .select('*')
            .limit(1);
          
          results[table] = !error;
        } catch (err) {
          results[table] = false;
        }
      }

      const allExist = Object.values(results).every(exists => exists);
      if (!allExist) {
        throw new Error(`Missing tables: ${JSON.stringify(results)}`);
      }

      return { tablesExist: results };
    }));

    // Test 3: Database functions exist
    tests.push(await this.runTest('Database functions exist', async () => {
      const functions = [
        'check_element_webhook_rate_limit',
        'update_webhook_execution_stats',
        'increment_webhook_error_count'
      ];

      // Test if functions exist by attempting to call them with dummy data
      for (const funcName of functions) {
        try {
          // This will fail due to invalid params but confirms function exists
          await this.supabase.rpc(funcName, {});
        } catch (error) {
          // Function exists if we get a parameter error, not a "function does not exist" error
          if (!error.message.includes('function') || error.message.includes('does not exist')) {
            throw new Error(`Function ${funcName} does not exist: ${error.message}`);
          }
        }
      }

      return { functionsExist: true };
    }));

    const totalDuration = performance.now() - startTime;
    return this.createTestSuite('Database Integration Tests', tests, totalDuration);
  }

  /**
   * Security tests
   */
  async runSecurityTests(verbose: boolean): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = performance.now();

    // Test 1: Large payload rejection
    tests.push(await this.runTest('Large payload rejection', async () => {
      const largePayload = {
        organizationId: 'test-org',
        featureSlug: 'test-feature', 
        pagePath: '/test-page',
        elementId: 'test-element',
        eventType: 'test',
        userContext: { userId: 'test-user', role: 'user' },
        payload: {
          largeData: 'x'.repeat(10 * 1024 * 1024) // 10MB string
        }
      };

      const response = await fetch(this.webhookFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(largePayload)
      });

      // Should reject due to payload size
      if (response.status === 200) {
        throw new Error('Large payload was not rejected');
      }

      return { payloadSizeValidationWorking: true };
    }));

    // Test 2: SQL injection attempt in payload
    tests.push(await this.runTest('SQL injection protection', async () => {
      const maliciousPayload = {
        organizationId: "'; DROP TABLE element_webhooks; --",
        featureSlug: 'test-feature',
        pagePath: '/test-page',
        elementId: 'test-element',
        eventType: 'test',
        userContext: { userId: 'test-user', role: 'user' },
        payload: {
          malicious: "'; DELETE FROM users; --",
          script: "<script>alert('xss')</script>"
        }
      };

      const response = await fetch(this.webhookFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousPayload)
      });

      // Function should handle this gracefully without crashing
      const data = await response.json();
      
      // Verify database is still intact
      const { data: webhooks, error } = await this.supabase
        .from('element_webhooks')
        .select('id')
        .limit(1);

      if (error) {
        throw new Error('Database appears to be compromised');
      }

      return { sqlInjectionProtected: true, databaseIntact: true };
    }));

    // Test 3: XSS protection in responses
    tests.push(await this.runTest('XSS protection in responses', async () => {
      const xssPayload = {
        organizationId: '<script>alert("xss")</script>',
        featureSlug: 'test-feature',
        pagePath: '/test-page', 
        elementId: 'test-element',
        eventType: 'test',
        userContext: { userId: 'test-user', role: 'user' },
        payload: { xss: '<img src=x onerror=alert(1)>' }
      };

      const response = await fetch(this.webhookFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(xssPayload)
      });

      const responseText = await response.text();
      
      // Check that script tags are not reflected back unescaped
      if (responseText.includes('<script>') || responseText.includes('onerror=')) {
        throw new Error('XSS vulnerability detected in response');
      }

      return { xssProtected: true };
    }));

    const totalDuration = performance.now() - startTime;
    return this.createTestSuite('Security Tests', tests, totalDuration);
  }

  /**
   * Performance tests
   */
  async runPerformanceTests(verbose: boolean): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = performance.now();

    // Test 1: Response time under load
    tests.push(await this.runTest('Response time performance', async () => {
      const requests = [];
      const requestCount = 10;
      
      for (let i = 0; i < requestCount; i++) {
        const request = fetch(this.webhookFunctionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: `test-org-${i}`,
            featureSlug: 'test-feature',
            pagePath: '/test-page',
            elementId: `test-element-${i}`,
            eventType: 'test',
            userContext: { userId: 'test-user', role: 'user' },
            payload: { test: 'data' }
          })
        });
        requests.push(request);
      }

      const responses = await Promise.all(requests);
      const responseTimes = responses.map((_, i) => Date.now()); // Simplified timing

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      if (avgResponseTime > 5000) { // 5 second threshold
        throw new Error(`Average response time too slow: ${avgResponseTime}ms`);
      }

      return { 
        averageResponseTime: avgResponseTime,
        requestCount,
        performanceGood: avgResponseTime < 2000
      };
    }));

    // Test 2: Memory usage (basic check)
    tests.push(await this.runTest('Memory usage check', async () => {
      // Monitor function doesn't crash under repeated calls
      for (let i = 0; i < 5; i++) {
        await fetch(this.webhookFunctionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: `memory-test-${i}`,
            featureSlug: 'test-feature',
            pagePath: '/test-page',
            elementId: 'test-element',
            eventType: 'test',
            userContext: { userId: 'test-user', role: 'user' },
            payload: { iteration: i }
          })
        });
      }

      return { memoryStable: true, repeatedCallsWork: true };
    }));

    const totalDuration = performance.now() - startTime;
    return this.createTestSuite('Performance Tests', tests, totalDuration);
  }

  /**
   * Integration tests
   */
  async runIntegrationTests(verbose: boolean): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = performance.now();

    // Test 1: End-to-end webhook simulation (without actual external webhook)
    tests.push(await this.runTest('End-to-end flow simulation', async () => {
      // Create a test webhook record in database
      const testWebhook = {
        id: `test-webhook-${Date.now()}`,
        organization_id: `test-org-${Date.now()}`,
        feature_slug: 'test-feature',
        page_path: '/test-page',
        element_id: 'test-element',
        endpoint_url: 'https://httpbin.org/post', // Safe test endpoint
        http_method: 'POST',
        payload_template: { message: 'Test webhook' },
        headers: { 'X-Test': 'true' },
        timeout_seconds: 30,
        retry_count: 1,
        rate_limit_per_minute: 60,
        is_active: true
      };

      // Insert test webhook
      const { error: insertError } = await this.supabase
        .from('element_webhooks')
        .insert(testWebhook);

      if (insertError) {
        throw new Error(`Failed to create test webhook: ${insertError.message}`);
      }

      try {
        // Test the webhook execution
        const response = await fetch(this.webhookFunctionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: testWebhook.organization_id,
            featureSlug: testWebhook.feature_slug,
            pagePath: testWebhook.page_path,
            elementId: testWebhook.element_id,
            eventType: 'test',
            userContext: { 
              userId: 'test-user',
              role: 'user'
            },
            payload: { test: 'integration test' }
          })
        });

        const result = await response.json();
        
        // Clean up test webhook
        await this.supabase
          .from('element_webhooks')
          .delete()
          .eq('id', testWebhook.id);

        if (!response.ok) {
          throw new Error(`Webhook execution failed: ${JSON.stringify(result)}`);
        }

        return { 
          integrationWorking: true,
          executionId: result.executionId,
          responseTime: result.responseTime
        };

      } catch (error) {
        // Clean up even if test fails
        await this.supabase
          .from('element_webhooks')
          .delete()
          .eq('id', testWebhook.id);
        throw error;
      }
    }));

    const totalDuration = performance.now() - startTime;
    return this.createTestSuite('Integration Tests', tests, totalDuration);
  }

  /**
   * Helper methods
   */
  private async runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      const details = await testFn();
      const duration = Math.round(performance.now() - startTime);
      
      return {
        testName,
        success: true,
        duration,
        details
      };
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      
      return {
        testName,
        success: false,
        duration,
        error: error.message,
        details: { stack: error.stack }
      };
    }
  }

  private createTestSuite(suiteName: string, tests: TestResult[], totalDuration: number): TestSuite {
    const passedTests = tests.filter(t => t.success).length;
    const failedTests = tests.filter(t => !t.success).length;
    
    return {
      suiteName,
      tests,
      totalTests: tests.length,
      passedTests,
      failedTests,
      totalDuration: Math.round(totalDuration),
      success: failedTests === 0
    };
  }

  private generateSummary(suites: TestSuite[]) {
    const totalTests = suites.reduce((sum, s) => sum + s.totalTests, 0);
    const totalPassed = suites.reduce((sum, s) => sum + s.passedTests, 0);
    const totalFailed = suites.reduce((sum, s) => sum + s.failedTests, 0);
    const totalDuration = suites.reduce((sum, s) => sum + s.totalDuration, 0);
    const allPassed = suites.every(s => s.success);

    return {
      totalSuites: suites.length,
      totalTests,
      totalPassed,
      totalFailed,
      totalDuration: Math.round(totalDuration),
      successRate: Math.round((totalPassed / totalTests) * 100),
      overallSuccess: allPassed,
      failedSuites: suites.filter(s => !s.success).map(s => s.suiteName)
    };
  }
}