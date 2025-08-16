/**
 * Testing utilities for Knowledge Base file management system
 * Provides mock data, error simulation, and performance testing tools
 */

import { KBFile } from '../services/fileUploadApi';

// Mock file types for testing
export interface MockFileConfig {
  name: string;
  size: number;
  type: string;
  content?: string;
  shouldFail?: boolean;
  failureReason?: string;
  processingTime?: number;
}

// Default mock file configurations
export const MOCK_FILES: Record<string, MockFileConfig> = {
  // Valid files
  smallPdf: {
    name: 'test-document.pdf',
    size: 1024 * 500, // 500KB
    type: 'application/pdf',
    content: 'Mock PDF content for testing'
  },
  largePdf: {
    name: 'large-document.pdf',
    size: 1024 * 1024 * 25, // 25MB
    type: 'application/pdf',
    content: 'Large PDF content for performance testing',
    processingTime: 5000
  },
  textFile: {
    name: 'notes.txt',
    size: 1024 * 10, // 10KB
    type: 'text/plain',
    content: 'This is a test text file with some content for knowledge base testing.'
  },
  wordDoc: {
    name: 'report.docx',
    size: 1024 * 1024 * 2, // 2MB
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    content: 'Mock Word document content'
  },
  markdown: {
    name: 'readme.md',
    size: 1024 * 5, // 5KB
    type: 'text/markdown',
    content: '# Test Markdown\n\nThis is a test markdown file for the knowledge base.'
  },
  
  // Invalid files (for error testing)
  oversizedFile: {
    name: 'huge-file.pdf',
    size: 1024 * 1024 * 60, // 60MB (over limit)
    type: 'application/pdf',
    shouldFail: true,
    failureReason: 'File size exceeds maximum allowed size of 50MB'
  },
  invalidType: {
    name: 'image.jpg',
    size: 1024 * 100, // 100KB
    type: 'image/jpeg',
    shouldFail: true,
    failureReason: 'File type not supported. Only PDF, TXT, DOCX, and Markdown files are allowed.'
  },
  emptyFile: {
    name: 'empty.txt',
    size: 0,
    type: 'text/plain',
    shouldFail: true,
    failureReason: 'File is empty and cannot be processed'
  },
  corruptedFile: {
    name: 'corrupted.pdf',
    size: 1024 * 200, // 200KB
    type: 'application/pdf',
    content: 'corrupted-content',
    shouldFail: true,
    failureReason: 'File appears to be corrupted and cannot be processed'
  }
};

// Error simulation scenarios
export const ERROR_SCENARIOS = {
  NETWORK_ERROR: {
    name: 'Network Connection Lost',
    description: 'Simulates network connectivity issues during upload',
    errorType: 'NetworkError',
    retryable: true,
    delay: 2000
  },
  SERVER_ERROR: {
    name: 'Internal Server Error',
    description: 'Simulates server-side processing errors',
    errorType: 'ServerError',
    retryable: true,
    delay: 1000
  },
  QUOTA_EXCEEDED: {
    name: 'Storage Quota Exceeded',
    description: 'Simulates organization storage limit reached',
    errorType: 'QuotaError',
    retryable: false,
    delay: 500
  },
  RATE_LIMITED: {
    name: 'Rate Limit Exceeded',
    description: 'Simulates API rate limiting',
    errorType: 'RateLimitError',
    retryable: true,
    delay: 3000
  },
  PROCESSING_TIMEOUT: {
    name: 'Processing Timeout',
    description: 'Simulates file processing timeout',
    errorType: 'TimeoutError',
    retryable: true,
    delay: 10000
  },
  INVALID_KB: {
    name: 'Knowledge Base Not Found',
    description: 'Simulates invalid knowledge base selection',
    errorType: 'ValidationError',
    retryable: false,
    delay: 500
  }
};

// Performance test configurations
export const PERFORMANCE_TESTS = {
  SMALL_BATCH: {
    name: 'Small Batch Upload',
    description: 'Test with 5 small files',
    fileCount: 5,
    fileSize: 1024 * 100, // 100KB each
    expectedTime: 5000 // 5 seconds
  },
  MEDIUM_BATCH: {
    name: 'Medium Batch Upload',
    description: 'Test with 20 medium files',
    fileCount: 20,
    fileSize: 1024 * 1024, // 1MB each
    expectedTime: 30000 // 30 seconds
  },
  LARGE_BATCH: {
    name: 'Large Batch Upload',
    description: 'Test with 50 large files',
    fileCount: 50,
    fileSize: 1024 * 1024 * 5, // 5MB each
    expectedTime: 120000 // 2 minutes
  },
  CONCURRENT_USERS: {
    name: 'Concurrent Users Test',
    description: 'Simulate multiple users uploading simultaneously',
    userCount: 10,
    filesPerUser: 5,
    fileSize: 1024 * 500, // 500KB each
    expectedTime: 15000 // 15 seconds
  }
};

/**
 * Creates a mock File object for testing
 */
export function createMockFile(config: MockFileConfig): File {
  const { name, size, type, content = 'mock file content' } = config;
  
  // Create a Blob with the specified content
  const blob = new Blob([content], { type });
  
  // Create File object with proper properties
  const file = new File([blob], name, {
    type,
    lastModified: Date.now()
  });
  
  // Override size property if needed (for testing oversized files)
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  });
  
  return file;
}

/**
 * Creates multiple mock files for batch testing
 */
export function createMockFileSet(configs: MockFileConfig[]): File[] {
  return configs.map(createMockFile);
}

/**
 * Generates a set of files for performance testing
 */
export function generatePerformanceTestFiles(
  count: number,
  baseConfig: Partial<MockFileConfig> = {}
): File[] {
  const files: File[] = [];
  
  for (let i = 0; i < count; i++) {
    const config: MockFileConfig = {
      name: `test-file-${i + 1}.pdf`,
      size: 1024 * 1024, // 1MB default
      type: 'application/pdf',
      content: `Mock content for test file ${i + 1}`,
      ...baseConfig
    };
    
    files.push(createMockFile(config));
  }
  
  return files;
}

/**
 * Mock upload function with configurable behavior
 */
export class MockUploadService {
  private errorRate: number = 0;
  private delay: number = 1000;
  private shouldSimulateProgress: boolean = true;
  private activeScenario: keyof typeof ERROR_SCENARIOS | null = null;
  
  constructor(options: {
    errorRate?: number;
    delay?: number;
    simulateProgress?: boolean;
  } = {}) {
    this.errorRate = options.errorRate || 0;
    this.delay = options.delay || 1000;
    this.shouldSimulateProgress = options.simulateProgress ?? true;
  }
  
  /**
   * Activate a specific error scenario
   */
  activateErrorScenario(scenario: keyof typeof ERROR_SCENARIOS | null) {
    this.activeScenario = scenario;
  }
  
  /**
   * Mock file upload with progress simulation
   */
  async uploadFile(
    file: File,
    kbId: string,
    onProgress?: (progress: number) => void
  ): Promise<KBFile> {
    // Check for active error scenario
    if (this.activeScenario) {
      const scenario = ERROR_SCENARIOS[this.activeScenario];
      await this.delay_ms(scenario.delay);
      throw new Error(`${scenario.name}: ${scenario.description}`);
    }
    
    // Random error simulation
    if (Math.random() < this.errorRate) {
      throw new Error('Random upload error for testing');
    }
    
    // Simulate progress updates
    if (this.shouldSimulateProgress && onProgress) {
      for (let progress = 0; progress <= 100; progress += 10) {
        await this.delay_ms(this.delay / 10);
        onProgress(progress);
      }
    } else {
      await this.delay_ms(this.delay);
    }
    
    // Return mock file data
    return {
      id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      organization_id: 'mock-org',
      kb_config_id: kbId,
      file_name: file.name,
      original_name: file.name,
      file_path: `/mock/path/${file.name}`,
      file_size: file.size,
      mime_type: file.type,
      processing_status: 'completed',
      processing_progress: 100,
      extracted_text_length: 1000,
      chunk_count: 10,
      vector_count: 50,
      uploaded_by: 'mock-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  /**
   * Simulate batch upload with concurrent processing
   */
  async uploadBatch(
    files: File[],
    kbId: string,
    onProgress?: (fileId: string, progress: number) => void,
    onComplete?: (fileId: string, result: KBFile | Error) => void
  ): Promise<(KBFile | Error)[]> {
    const results: (KBFile | Error)[] = [];
    
    // Process files with simulated concurrency
    const promises = files.map(async (file, index) => {
      try {
        const result = await this.uploadFile(file, kbId, (progress) => {
          onProgress?.(file.name, progress);
        });
        results[index] = result;
        onComplete?.(file.name, result);
        return result;
      } catch (error) {
        const err = error as Error;
        results[index] = err;
        onComplete?.(file.name, err);
        return err;
      }
    });
    
    await Promise.all(promises);
    return results;
  }
  
  private delay_ms(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTester {
  private results: Array<{
    testName: string;
    startTime: number;
    endTime: number;
    duration: number;
    fileCount: number;
    totalSize: number;
    success: boolean;
    errors: string[];
  }> = [];
  
  /**
   * Run a performance test with specified configuration
   */
  async runPerformanceTest(
    testConfig: typeof PERFORMANCE_TESTS[keyof typeof PERFORMANCE_TESTS],
    uploadService: MockUploadService
  ): Promise<void> {
    const startTime = Date.now();
    const files = generatePerformanceTestFiles(testConfig.fileCount, {
      size: testConfig.fileSize
    });
    const errors: string[] = [];
    
    console.log(`Starting performance test: ${testConfig.name}`);
    console.log(`Files: ${testConfig.fileCount}, Size per file: ${this.formatFileSize(testConfig.fileSize)}`);
    
    try {
      const results = await uploadService.uploadBatch(
        files,
        'test-kb-id',
        (fileId, progress) => {
          if (progress === 100) {
            console.log(`✓ Completed: ${fileId}`);
          }
        },
        (fileId, result) => {
          if (result instanceof Error) {
            errors.push(`${fileId}: ${result.message}`);
          }
        }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      
      this.results.push({
        testName: testConfig.name,
        startTime,
        endTime,
        duration,
        fileCount: files.length,
        totalSize,
        success: errors.length === 0,
        errors
      });
      
      console.log(`\n✅ Test completed: ${testConfig.name}`);
      console.log(`Duration: ${duration}ms (expected: ${testConfig.expectedTime}ms)`);
      console.log(`Success rate: ${((results.length - errors.length) / results.length * 100).toFixed(1)}%`);
      console.log(`Throughput: ${this.formatFileSize(totalSize / (duration / 1000))}/s`);
      
      if (errors.length > 0) {
        console.log(`Errors: ${errors.length}`);
        errors.forEach(error => console.log(`  - ${error}`));
      }
      
    } catch (error) {
      console.error(`❌ Test failed: ${testConfig.name}`, error);
      throw error;
    }
  }
  
  /**
   * Get performance test results
   */
  getResults() {
    return this.results;
  }
  
  /**
   * Generate performance report
   */
  generateReport(): string {
    if (this.results.length === 0) {
      return 'No performance tests have been run yet.';
    }
    
    let report = '\n=== PERFORMANCE TEST REPORT ===\n\n';
    
    this.results.forEach(result => {
      report += `Test: ${result.testName}\n`;
      report += `Duration: ${result.duration}ms\n`;
      report += `Files: ${result.fileCount}\n`;
      report += `Total Size: ${this.formatFileSize(result.totalSize)}\n`;
      report += `Throughput: ${this.formatFileSize(result.totalSize / (result.duration / 1000))}/s\n`;
      report += `Success: ${result.success ? '✅' : '❌'}\n`;
      if (result.errors.length > 0) {
        report += `Errors: ${result.errors.length}\n`;
      }
      report += '\n';
    });
    
    // Summary statistics
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    const totalFiles = this.results.reduce((sum, r) => sum + r.fileCount, 0);
    const successRate = (this.results.filter(r => r.success).length / this.results.length * 100).toFixed(1);
    
    report += '=== SUMMARY ===\n';
    report += `Total Tests: ${this.results.length}\n`;
    report += `Average Duration: ${Math.round(avgDuration)}ms\n`;
    report += `Total Files Processed: ${totalFiles}\n`;
    report += `Overall Success Rate: ${successRate}%\n`;
    
    return report;
  }
  
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Status monitoring utilities for testing
 */
export class StatusMonitor {
  private subscriptions: Map<string, (status: any) => void> = new Map();
  private fileStatuses: Map<string, string> = new Map();
  
  /**
   * Subscribe to file status updates
   */
  subscribe(fileId: string, callback: (status: any) => void) {
    this.subscriptions.set(fileId, callback);
  }
  
  /**
   * Unsubscribe from file status updates
   */
  unsubscribe(fileId: string) {
    this.subscriptions.delete(fileId);
  }
  
  /**
   * Simulate status change
   */
  simulateStatusChange(fileId: string, status: string, delay: number = 1000) {
    setTimeout(() => {
      this.fileStatuses.set(fileId, status);
      const callback = this.subscriptions.get(fileId);
      if (callback) {
        callback({ fileId, status, timestamp: new Date().toISOString() });
      }
    }, delay);
  }
  
  /**
   * Simulate processing pipeline
   */
  simulateProcessingPipeline(fileId: string) {
    const statuses = ['pending', 'uploading', 'processing', 'completed'];
    const delays = [0, 1000, 3000, 8000];
    
    statuses.forEach((status, index) => {
      this.simulateStatusChange(fileId, status, delays[index]);
    });
  }
  
  /**
   * Get current status
   */
  getStatus(fileId: string): string | undefined {
    return this.fileStatuses.get(fileId);
  }
  
  /**
   * Get all tracked files
   */
  getAllStatuses(): Map<string, string> {
    return new Map(this.fileStatuses);
  }
}

/**
 * Test scenario runner
 */
export class TestRunner {
  private mockService: MockUploadService;
  private performanceTester: PerformanceTester;
  private statusMonitor: StatusMonitor;
  
  constructor() {
    this.mockService = new MockUploadService();
    this.performanceTester = new PerformanceTester();
    this.statusMonitor = new StatusMonitor();
  }
  
  /**
   * Run all test scenarios
   */
  async runAllTests() {
    console.log('🧪 Starting Knowledge Base testing suite...\n');
    
    // Basic upload tests
    await this.runBasicUploadTests();
    
    // Error scenario tests
    await this.runErrorScenarioTests();
    
    // Performance tests
    await this.runPerformanceTests();
    
    // Generate final report
    console.log(this.performanceTester.generateReport());
  }
  
  private async runBasicUploadTests() {
    console.log('📤 Running basic upload tests...');
    
    const testFiles = [
      createMockFile(MOCK_FILES.smallPdf),
      createMockFile(MOCK_FILES.textFile),
      createMockFile(MOCK_FILES.wordDoc)
    ];
    
    try {
      await this.mockService.uploadBatch(testFiles, 'test-kb');
      console.log('✅ Basic upload tests passed\n');
    } catch (error) {
      console.log('❌ Basic upload tests failed:', error);
    }
  }
  
  private async runErrorScenarioTests() {
    console.log('⚠️ Running error scenario tests...');
    
    for (const [scenarioKey, scenario] of Object.entries(ERROR_SCENARIOS)) {
      console.log(`Testing: ${scenario.name}`);
      
      this.mockService.activateErrorScenario(scenarioKey as keyof typeof ERROR_SCENARIOS);
      
      try {
        await this.mockService.uploadFile(
          createMockFile(MOCK_FILES.smallPdf),
          'test-kb'
        );
        console.log('❌ Expected error but upload succeeded');
      } catch (error) {
        console.log(`✅ Error scenario handled: ${scenario.name}`);
      }
      
      this.mockService.activateErrorScenario(null);
    }
    
    console.log('');
  }
  
  private async runPerformanceTests() {
    console.log('⚡ Running performance tests...');
    
    for (const [testKey, testConfig] of Object.entries(PERFORMANCE_TESTS)) {
      await this.performanceTester.runPerformanceTest(testConfig, this.mockService);
    }
  }
  
  /**
   * Get mock service for custom testing
   */
  getMockService(): MockUploadService {
    return this.mockService;
  }
  
  /**
   * Get status monitor for real-time testing
   */
  getStatusMonitor(): StatusMonitor {
    return this.statusMonitor;
  }
}

// Export singleton instance for easy use
export const testRunner = new TestRunner();

// Helper functions for common testing patterns
export const TestHelpers = {
  /**
   * Create a test file with specific characteristics
   */
  createTestFile: (overrides: Partial<MockFileConfig> = {}) => {
    return createMockFile({
      ...MOCK_FILES.smallPdf,
      ...overrides
    });
  },
  
  /**
   * Create files that will trigger validation errors
   */
  createInvalidFiles: () => [
    createMockFile(MOCK_FILES.oversizedFile),
    createMockFile(MOCK_FILES.invalidType),
    createMockFile(MOCK_FILES.emptyFile)
  ],
  
  /**
   * Simulate slow network conditions
   */
  simulateSlowNetwork: () => {
    return new MockUploadService({
      delay: 5000,
      errorRate: 0.1
    });
  },
  
  /**
   * Simulate unreliable network
   */
  simulateUnreliableNetwork: () => {
    return new MockUploadService({
      delay: 2000,
      errorRate: 0.3
    });
  }
};