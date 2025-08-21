// Phase 4.2: Webhook Testing Engine
// Comprehensive webhook testing with mock data generation and validation

import { supabase } from '@/integrations/supabase/client';
import type { 
  WebhookTestConfiguration, 
  WebhookTestResult, 
  WebhookExecution,
  WebhookTestTemplate 
} from '@/types/webhook-monitoring';
import { realtimeMonitoringService } from './RealtimeMonitoringService';

interface MockDataGenerator {
  generateUserData(): any;
  generateFormData(elementType: string): any;
  generateEventData(eventType: string): any;
  generateCustomPayload(schema?: any): any;
}

export class WebhookTestingEngine {
  private activeTests = new Map<string, WebhookTestResult>();
  private mockDataGenerator: MockDataGenerator;

  constructor() {
    this.mockDataGenerator = new DefaultMockDataGenerator();
  }

  // ===== TEST EXECUTION =====

  async executeTest(
    webhookId: string, 
    elementId: string, 
    configuration: WebhookTestConfiguration
  ): Promise<WebhookTestResult> {
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const testResult: WebhookTestResult = {
      test_id: testId,
      webhook_id: webhookId,
      element_id: elementId,
      test_configuration: configuration,
      started_at: new Date().toISOString(),
      status: 'running',
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      avg_response_time_ms: 0,
      min_response_time_ms: 0,
      max_response_time_ms: 0,
      requests_per_second: 0,
      validation_passed: false,
      validation_errors: [],
      errors: [],
      executions: []
    };

    this.activeTests.set(testId, testResult);

    try {
      // Get webhook details
      const webhook = await this.getWebhookDetails(webhookId);
      if (!webhook) {
        throw new Error(`Webhook ${webhookId} not found`);
      }

      // Generate test data
      const testData = await this.generateTestData(configuration, webhook);

      // Execute test based on type
      switch (configuration.test_type) {
        case 'quick':
          await this.executeQuickTest(testResult, webhook, testData);
          break;
        case 'comprehensive':
          await this.executeComprehensiveTest(testResult, webhook, testData);
          break;
        case 'performance':
          await this.executePerformanceTest(testResult, webhook, testData, configuration);
          break;
        case 'custom':
          await this.executeCustomTest(testResult, webhook, testData, configuration);
          break;
      }

      // Validate results
      this.validateTestResults(testResult, configuration);

      testResult.status = 'completed';
      testResult.completed_at = new Date().toISOString();
      testResult.duration_ms = new Date(testResult.completed_at).getTime() - 
                               new Date(testResult.started_at).getTime();

    } catch (error) {
      testResult.status = 'failed';
      testResult.completed_at = new Date().toISOString();
      testResult.errors.push({
        error_message: error instanceof Error ? error.message : 'Unknown error',
        occurrences: 1,
        first_occurred_at: new Date().toISOString(),
        last_occurred_at: new Date().toISOString()
      });
    }

    // Save test result
    await this.saveTestResult(testResult);
    
    // Clean up from active tests
    this.activeTests.delete(testId);

    return testResult;
  }

  // ===== TEST TYPES =====

  private async executeQuickTest(
    testResult: WebhookTestResult, 
    webhook: any, 
    testData: any
  ): Promise<void> {
    const execution = await this.executeWebhookCall(
      webhook,
      testData,
      'preview_test'
    );

    testResult.executions.push(execution);
    testResult.total_requests = 1;
    
    if (execution.success) {
      testResult.successful_requests = 1;
      testResult.avg_response_time_ms = execution.response_time_ms || 0;
      testResult.min_response_time_ms = execution.response_time_ms || 0;
      testResult.max_response_time_ms = execution.response_time_ms || 0;
    } else {
      testResult.failed_requests = 1;
      testResult.errors.push({
        error_code: execution.error_code,
        error_message: execution.error_message || 'Request failed',
        occurrences: 1,
        first_occurred_at: execution.execution_started_at,
        last_occurred_at: execution.execution_completed_at || execution.execution_started_at
      });
    }
  }

  private async executeComprehensiveTest(
    testResult: WebhookTestResult, 
    webhook: any, 
    testData: any
  ): Promise<void> {
    const testCases = [
      { name: 'Standard payload', data: testData },
      { name: 'Minimal payload', data: this.createMinimalPayload(testData) },
      { name: 'Maximum payload', data: this.createMaximumPayload(testData) },
      { name: 'Edge case payload', data: this.createEdgeCasePayload(testData) }
    ];

    const executions: WebhookExecution[] = [];
    const responseTimes: number[] = [];

    for (const testCase of testCases) {
      try {
        const execution = await this.executeWebhookCall(
          webhook,
          testCase.data,
          'preview_test'
        );

        executions.push(execution);
        
        if (execution.success && execution.response_time_ms) {
          responseTimes.push(execution.response_time_ms);
          testResult.successful_requests++;
        } else {
          testResult.failed_requests++;
          this.addError(testResult, execution);
        }
      } catch (error) {
        testResult.failed_requests++;
        testResult.errors.push({
          error_message: `Test case "${testCase.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          occurrences: 1,
          first_occurred_at: new Date().toISOString(),
          last_occurred_at: new Date().toISOString()
        });
      }
    }

    testResult.executions = executions;
    testResult.total_requests = testCases.length;
    
    if (responseTimes.length > 0) {
      testResult.avg_response_time_ms = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      testResult.min_response_time_ms = Math.min(...responseTimes);
      testResult.max_response_time_ms = Math.max(...responseTimes);
    }
  }

  private async executePerformanceTest(
    testResult: WebhookTestResult, 
    webhook: any, 
    testData: any,
    configuration: WebhookTestConfiguration
  ): Promise<void> {
    const concurrentRequests = configuration.concurrent_requests || 5;
    const durationSeconds = configuration.duration_seconds || 30;
    const rampUpTime = configuration.ramp_up_time_seconds || 5;

    const startTime = Date.now();
    const endTime = startTime + (durationSeconds * 1000);
    const executions: WebhookExecution[] = [];
    const responseTimes: number[] = [];

    // Ramp-up phase
    const rampUpInterval = (rampUpTime * 1000) / concurrentRequests;
    let activeRequests = 0;

    while (Date.now() < endTime) {
      const promises: Promise<WebhookExecution>[] = [];
      const currentConcurrency = Math.min(
        concurrentRequests,
        activeRequests < concurrentRequests ? activeRequests + 1 : concurrentRequests
      );

      // Launch concurrent requests
      for (let i = 0; i < currentConcurrency; i++) {
        promises.push(this.executeWebhookCall(webhook, testData, 'preview_test'));
      }

      // Wait for batch completion
      const batchResults = await Promise.allSettled(promises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const execution = result.value;
          executions.push(execution);
          
          if (execution.success && execution.response_time_ms) {
            responseTimes.push(execution.response_time_ms);
            testResult.successful_requests++;
          } else {
            testResult.failed_requests++;
            this.addError(testResult, execution);
          }
        } else {
          testResult.failed_requests++;
          testResult.errors.push({
            error_message: result.reason?.message || 'Request failed',
            occurrences: 1,
            first_occurred_at: new Date().toISOString(),
            last_occurred_at: new Date().toISOString()
          });
        }
      }

      // Ramp up during ramp-up period
      if (Date.now() - startTime < rampUpTime * 1000 && activeRequests < concurrentRequests) {
        activeRequests++;
        await new Promise(resolve => setTimeout(resolve, rampUpInterval));
      } else {
        // Small delay between batches to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    testResult.executions = executions;
    testResult.total_requests = executions.length;
    
    if (responseTimes.length > 0) {
      testResult.avg_response_time_ms = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      testResult.min_response_time_ms = Math.min(...responseTimes);
      testResult.max_response_time_ms = Math.max(...responseTimes);
    }

    // Calculate requests per second
    const actualDuration = (Date.now() - startTime) / 1000;
    testResult.requests_per_second = testResult.total_requests / actualDuration;
  }

  private async executeCustomTest(
    testResult: WebhookTestResult, 
    webhook: any, 
    testData: any,
    configuration: WebhookTestConfiguration
  ): Promise<void> {
    // Custom test logic based on configuration
    const execution = await this.executeWebhookCall(
      webhook,
      configuration.custom_payload || testData,
      'preview_test'
    );

    testResult.executions.push(execution);
    testResult.total_requests = 1;
    
    if (execution.success) {
      testResult.successful_requests = 1;
      testResult.avg_response_time_ms = execution.response_time_ms || 0;
      testResult.min_response_time_ms = execution.response_time_ms || 0;
      testResult.max_response_time_ms = execution.response_time_ms || 0;
    } else {
      testResult.failed_requests = 1;
      this.addError(testResult, execution);
    }
  }

  // ===== WEBHOOK EXECUTION =====

  private async executeWebhookCall(
    webhook: any, 
    payload: any, 
    executionType: string
  ): Promise<WebhookExecution> {
    const organizationId = webhook.organization_id;
    
    // Start execution tracking
    const { data: executionId, error: startError } = await supabase.rpc(
      'start_webhook_execution',
      {
        p_organization_id: organizationId,
        p_webhook_id: webhook.id,
        p_element_id: webhook.element_id,
        p_execution_type: executionType,
        p_request_url: webhook.endpoint_url,
        p_request_payload: payload
      }
    );

    if (startError || !executionId) {
      throw new Error(`Failed to start execution tracking: ${startError?.message}`);
    }

    const startTime = Date.now();
    let success = false;
    let responseStatusCode: number;
    let responseBody: any = {};
    let errorMessage: string | undefined;

    try {
      // Make the actual HTTP request
      const response = await fetch(webhook.endpoint_url, {
        method: webhook.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OrganizePrime-WebhookTester/1.0',
          'X-Test-Mode': 'true',
          ...webhook.headers
        },
        body: JSON.stringify(payload)
      });

      responseStatusCode = response.status;
      success = response.ok;

      try {
        responseBody = await response.json();
      } catch {
        responseBody = { raw_response: await response.text() };
      }

      if (!success) {
        errorMessage = `HTTP ${responseStatusCode}: ${response.statusText}`;
      }

    } catch (error) {
      success = false;
      responseStatusCode = 0;
      errorMessage = error instanceof Error ? error.message : 'Network error';
      responseBody = { error: errorMessage };
    }

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Complete execution tracking
    await supabase.rpc('complete_webhook_execution', {
      p_execution_id: executionId,
      p_response_status_code: responseStatusCode,
      p_response_body: responseBody,
      p_success: success,
      p_error_message: errorMessage
    });

    // Get the full execution record
    const { data: execution } = await supabase
      .from('webhook_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    return execution;
  }

  // ===== DATA GENERATION =====

  private async generateTestData(
    configuration: WebhookTestConfiguration, 
    webhook: any
  ): Promise<any> {
    switch (configuration.data_generation_method) {
      case 'template':
        if (configuration.use_template) {
          return await this.loadTestTemplate(configuration.use_template);
        }
        break;
      case 'custom':
        return configuration.custom_payload || {};
      case 'recorded':
        return await this.getRecordedData(webhook.id, webhook.element_id);
      case 'auto':
      default:
        return this.mockDataGenerator.generateCustomPayload();
    }
  }

  private async loadTestTemplate(templateId: string): Promise<any> {
    const { data: template, error } = await supabase
      .from('webhook_test_templates')
      .select('test_data')
      .eq('id', templateId)
      .single();

    if (error || !template) {
      throw new Error(`Test template ${templateId} not found`);
    }

    return template.test_data;
  }

  private async getRecordedData(webhookId: string, elementId: string): Promise<any> {
    const { data: execution } = await supabase
      .from('webhook_executions')
      .select('request_payload')
      .eq('webhook_id', webhookId)
      .eq('element_id', elementId)
      .eq('success', true)
      .order('execution_started_at', { ascending: false })
      .limit(1)
      .single();

    return execution?.request_payload || this.mockDataGenerator.generateCustomPayload();
  }

  // ===== PAYLOAD VARIATIONS =====

  private createMinimalPayload(basePayload: any): any {
    // Create a minimal version with only required fields
    const minimal: any = {};
    
    // Keep only primitive values and first-level properties
    for (const [key, value] of Object.entries(basePayload)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        minimal[key] = value;
      }
    }

    return minimal;
  }

  private createMaximumPayload(basePayload: any): any {
    // Create an expanded version with additional test data
    return {
      ...basePayload,
      ...this.mockDataGenerator.generateCustomPayload(),
      metadata: {
        test_timestamp: new Date().toISOString(),
        test_mode: true,
        additional_data: Array.from({ length: 10 }, (_, i) => ({
          id: i,
          value: `test_value_${i}`,
          nested: { level: 2, data: `nested_${i}` }
        }))
      }
    };
  }

  private createEdgeCasePayload(basePayload: any): any {
    // Create payload with edge case values
    return {
      ...basePayload,
      null_value: null,
      empty_string: '',
      zero_value: 0,
      false_value: false,
      large_number: Number.MAX_SAFE_INTEGER,
      unicode_string: '🚀 Unicode test 测试 ñoño',
      special_chars: '<>&"\'',
      long_string: 'x'.repeat(1000),
      deep_nested: this.createDeepNestedObject(5)
    };
  }

  private createDeepNestedObject(depth: number): any {
    if (depth <= 0) return 'deep_value';
    return { nested: this.createDeepNestedObject(depth - 1) };
  }

  // ===== VALIDATION =====

  private validateTestResults(testResult: WebhookTestResult, configuration: WebhookTestConfiguration): void {
    const errors: any[] = [];

    // Validate expected status codes
    for (const execution of testResult.executions) {
      if (execution.response_status_code && 
          !configuration.expected_status_codes.includes(execution.response_status_code)) {
        errors.push({
          rule: 'expected_status_codes',
          expected: configuration.expected_status_codes,
          actual: execution.response_status_code,
          message: `Expected status code in ${configuration.expected_status_codes}, got ${execution.response_status_code}`
        });
      }
    }

    // Validate response time
    if (configuration.expected_response_time_ms && testResult.avg_response_time_ms > configuration.expected_response_time_ms) {
      errors.push({
        rule: 'expected_response_time_ms',
        expected: configuration.expected_response_time_ms,
        actual: testResult.avg_response_time_ms,
        message: `Expected response time under ${configuration.expected_response_time_ms}ms, got ${testResult.avg_response_time_ms}ms`
      });
    }

    // Validate response data
    for (const rule of configuration.response_validation_rules) {
      // Implement response validation logic here
      // This would check each execution's response against the validation rules
    }

    testResult.validation_errors = errors;
    testResult.validation_passed = errors.length === 0;
  }

  // ===== UTILITY METHODS =====

  private async getWebhookDetails(webhookId: string): Promise<any> {
    const { data: webhook, error } = await supabase
      .from('feature_webhooks')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (error) {
      throw new Error(`Failed to get webhook details: ${error.message}`);
    }

    return webhook;
  }

  private addError(testResult: WebhookTestResult, execution: WebhookExecution): void {
    const existingError = testResult.errors.find(e => 
      e.error_code === execution.error_code && e.error_message === execution.error_message
    );

    if (existingError) {
      existingError.occurrences++;
      existingError.last_occurred_at = execution.execution_completed_at || execution.execution_started_at;
    } else {
      testResult.errors.push({
        error_code: execution.error_code,
        error_message: execution.error_message || 'Unknown error',
        occurrences: 1,
        first_occurred_at: execution.execution_started_at,
        last_occurred_at: execution.execution_completed_at || execution.execution_started_at
      });
    }
  }

  private async saveTestResult(testResult: WebhookTestResult): Promise<void> {
    // Save test result to a test results table (to be created)
    // For now, we'll just log it
    console.log('Test result:', testResult);
  }

  // ===== PUBLIC METHODS =====

  getActiveTests(): Map<string, WebhookTestResult> {
    return new Map(this.activeTests);
  }

  async cancelTest(testId: string): Promise<boolean> {
    const test = this.activeTests.get(testId);
    if (test && test.status === 'running') {
      test.status = 'cancelled';
      test.completed_at = new Date().toISOString();
      this.activeTests.delete(testId);
      return true;
    }
    return false;
  }
}

// ===== MOCK DATA GENERATOR =====

class DefaultMockDataGenerator implements MockDataGenerator {
  generateUserData(): any {
    return {
      id: Math.floor(Math.random() * 1000000),
      email: `test.user.${Date.now()}@example.com`,
      name: `Test User ${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en'
      }
    };
  }

  generateFormData(elementType: string): any {
    const commonFields = {
      timestamp: new Date().toISOString(),
      form_id: `form_${Math.random().toString(36).substr(2, 9)}`,
      page_url: 'https://example.com/test-page'
    };

    switch (elementType) {
      case 'button':
        return {
          ...commonFields,
          button_id: 'test-button',
          button_text: 'Test Button',
          click_count: 1
        };
      case 'form':
        return {
          ...commonFields,
          form_data: {
            field1: 'test value 1',
            field2: 'test value 2',
            email: 'test@example.com',
            checkbox: true,
            select: 'option1'
          }
        };
      default:
        return commonFields;
    }
  }

  generateEventData(eventType: string): any {
    const baseEvent = {
      event_id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      session_id: `session_${Math.random().toString(36).substr(2, 9)}`,
      user_agent: 'Mozilla/5.0 (Test Browser) WebhookTester/1.0'
    };

    switch (eventType) {
      case 'click':
        return {
          ...baseEvent,
          event_type: 'click',
          target_element: 'button#test-btn',
          coordinates: { x: 123, y: 456 }
        };
      case 'form_submit':
        return {
          ...baseEvent,
          event_type: 'form_submit',
          form_data: this.generateFormData('form')
        };
      case 'page_view':
        return {
          ...baseEvent,
          event_type: 'page_view',
          page_title: 'Test Page',
          referrer: 'https://example.com/previous'
        };
      default:
        return baseEvent;
    }
  }

  generateCustomPayload(schema?: any): any {
    return {
      ...this.generateUserData(),
      event: this.generateEventData('click'),
      form: this.generateFormData('form'),
      metadata: {
        test_mode: true,
        generated_at: new Date().toISOString(),
        version: '1.0'
      }
    };
  }
}

// Singleton instance
export const webhookTestingEngine = new WebhookTestingEngine();