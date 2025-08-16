import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  TestRunner, 
  MockUploadService, 
  StatusMonitor,
  ERROR_SCENARIOS,
  TestHelpers 
} from '../utils/testingUtils';

interface UseTestingOptions {
  enableInProduction?: boolean;
  autoStartMonitoring?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

interface TestingContext {
  // Testing state
  isTestingMode: boolean;
  isRunningTests: boolean;
  testResults: any[];
  
  // Test execution
  enableTestingMode: () => void;
  disableTestingMode: () => void;
  runQuickTest: () => Promise<void>;
  runFullTestSuite: () => Promise<void>;
  
  // Error simulation
  simulateError: (scenario: keyof typeof ERROR_SCENARIOS) => void;
  clearSimulation: () => void;
  
  // Mock services
  mockUploadService: MockUploadService | null;
  statusMonitor: StatusMonitor | null;
  
  // Development helpers
  generateMockFiles: (count: number) => File[];
  validateFileUpload: (file: File) => Promise<boolean>;
  simulateNetworkConditions: (type: 'slow' | 'unreliable' | 'offline') => void;
  
  // Logging and debugging
  logs: string[];
  clearLogs: () => void;
  addLog: (message: string, level?: 'debug' | 'info' | 'warn' | 'error') => void;
}

export function useTesting(options: UseTestingOptions = {}): TestingContext {
  const {
    enableInProduction = false,
    autoStartMonitoring = true,
    logLevel = 'info'
  } = options;
  
  const [isTestingMode, setIsTestingMode] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentSimulation, setCurrentSimulation] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const testRunnerRef = useRef<TestRunner | null>(null);
  const mockServiceRef = useRef<MockUploadService | null>(null);
  const statusMonitorRef = useRef<StatusMonitor | null>(null);
  
  // Check if testing should be enabled
  const shouldEnableTesting = useCallback(() => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const hasTestingFlag = window.location.search.includes('testing=true');
    const isLocalhost = window.location.hostname === 'localhost';
    
    return isDevelopment || hasTestingFlag || isLocalhost || enableInProduction;
  }, [enableInProduction]);
  
  // Initialize testing services
  useEffect(() => {
    if (shouldEnableTesting()) {
      testRunnerRef.current = new TestRunner();
      statusMonitorRef.current = testRunnerRef.current.getStatusMonitor();
      
      if (autoStartMonitoring && statusMonitorRef.current) {
        // Set up real-time monitoring
        addLog('Testing services initialized', 'info');
      }
    }
  }, [shouldEnableTesting, autoStartMonitoring]);
  
  // Logging function
  const addLog = useCallback((message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info') => {
    const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLogLevel = logLevels[logLevel];
    const messageLogLevel = logLevels[level];
    
    if (messageLogLevel >= currentLogLevel) {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      
      setLogs(prev => [...prev.slice(-99), logEntry]); // Keep last 100 logs
      
      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(logEntry);
      }
    }
  }, [logLevel]);
  
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);
  
  // Enable/disable testing mode
  const enableTestingMode = useCallback(() => {
    if (!shouldEnableTesting()) {
      addLog('Testing mode not available in this environment', 'warn');
      return;
    }
    
    setIsTestingMode(true);
    mockServiceRef.current = new MockUploadService();
    addLog('Testing mode enabled', 'info');
  }, [shouldEnableTesting, addLog]);
  
  const disableTestingMode = useCallback(() => {
    setIsTestingMode(false);
    mockServiceRef.current = null;
    setCurrentSimulation(null);
    addLog('Testing mode disabled', 'info');
  }, [addLog]);
  
  // Test execution functions
  const runQuickTest = useCallback(async () => {
    if (!testRunnerRef.current || isRunningTests) return;
    
    setIsRunningTests(true);
    addLog('Starting quick test...', 'info');
    
    try {
      const mockService = testRunnerRef.current.getMockService();
      const testFile = TestHelpers.createTestFile();
      
      addLog(`Testing file upload: ${testFile.name}`, 'debug');
      
      const result = await mockService.uploadFile(testFile, 'test-kb-id');
      
      setTestResults(prev => [...prev, {
        type: 'quick',
        timestamp: new Date().toISOString(),
        success: true,
        result
      }]);
      
      addLog('✅ Quick test completed successfully', 'info');
      
    } catch (error) {
      const errorMessage = (error as Error).message;
      addLog(`❌ Quick test failed: ${errorMessage}`, 'error');
      
      setTestResults(prev => [...prev, {
        type: 'quick',
        timestamp: new Date().toISOString(),
        success: false,
        error: errorMessage
      }]);
    } finally {
      setIsRunningTests(false);
    }
  }, [isRunningTests, addLog]);
  
  const runFullTestSuite = useCallback(async () => {
    if (!testRunnerRef.current || isRunningTests) return;
    
    setIsRunningTests(true);
    addLog('Starting full test suite...', 'info');
    
    try {
      await testRunnerRef.current.runAllTests();
      
      setTestResults(prev => [...prev, {
        type: 'full-suite',
        timestamp: new Date().toISOString(),
        success: true
      }]);
      
      addLog('✅ Full test suite completed', 'info');
      
    } catch (error) {
      const errorMessage = (error as Error).message;
      addLog(`❌ Full test suite failed: ${errorMessage}`, 'error');
      
      setTestResults(prev => [...prev, {
        type: 'full-suite',
        timestamp: new Date().toISOString(),
        success: false,
        error: errorMessage
      }]);
    } finally {
      setIsRunningTests(false);
    }
  }, [isRunningTests, addLog]);
  
  // Error simulation
  const simulateError = useCallback((scenario: keyof typeof ERROR_SCENARIOS) => {
    if (!mockServiceRef.current) {
      addLog('Mock service not available. Enable testing mode first.', 'warn');
      return;
    }
    
    mockServiceRef.current.activateErrorScenario(scenario);
    setCurrentSimulation(scenario);
    
    const scenarioInfo = ERROR_SCENARIOS[scenario];
    addLog(`🎭 Simulating error: ${scenarioInfo.name}`, 'info');
    addLog(`Description: ${scenarioInfo.description}`, 'debug');
  }, [addLog]);
  
  const clearSimulation = useCallback(() => {
    if (mockServiceRef.current) {
      mockServiceRef.current.activateErrorScenario(null);
    }
    setCurrentSimulation(null);
    addLog('Error simulation cleared', 'info');
  }, [addLog]);
  
  // Helper functions
  const generateMockFiles = useCallback((count: number): File[] => {
    addLog(`Generating ${count} mock files`, 'debug');
    
    const files: File[] = [];
    for (let i = 0; i < count; i++) {
      files.push(TestHelpers.createTestFile({
        name: `test-file-${i + 1}.pdf`,
        size: Math.random() * 1024 * 1024 * 5 // Random size up to 5MB
      }));
    }
    
    return files;
  }, [addLog]);
  
  const validateFileUpload = useCallback(async (file: File): Promise<boolean> => {
    addLog(`Validating file: ${file.name}`, 'debug');
    
    // Basic validation rules
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/markdown'
    ];
    
    if (file.size > maxSize) {
      addLog(`❌ File too large: ${file.size} bytes (max: ${maxSize})`, 'warn');
      return false;
    }
    
    if (!allowedTypes.includes(file.type)) {
      addLog(`❌ Invalid file type: ${file.type}`, 'warn');
      return false;
    }
    
    if (file.size === 0) {
      addLog(`❌ Empty file: ${file.name}`, 'warn');
      return false;
    }
    
    addLog(`✅ File validation passed: ${file.name}`, 'debug');
    return true;
  }, [addLog]);
  
  const simulateNetworkConditions = useCallback((type: 'slow' | 'unreliable' | 'offline') => {
    if (!mockServiceRef.current) {
      addLog('Mock service not available', 'warn');
      return;
    }
    
    switch (type) {
      case 'slow':
        mockServiceRef.current = TestHelpers.simulateSlowNetwork();
        addLog('🐌 Simulating slow network conditions', 'info');
        break;
      case 'unreliable':
        mockServiceRef.current = TestHelpers.simulateUnreliableNetwork();
        addLog('📶 Simulating unreliable network conditions', 'info');
        break;
      case 'offline':
        addLog('📴 Simulating offline conditions', 'info');
        // Could implement offline simulation here
        break;
    }
  }, [addLog]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTestingMode) {
        addLog('Cleaning up testing services', 'debug');
      }
    };
  }, [isTestingMode, addLog]);
  
  return {
    // State
    isTestingMode,
    isRunningTests,
    testResults,
    
    // Testing controls
    enableTestingMode,
    disableTestingMode,
    runQuickTest,
    runFullTestSuite,
    
    // Error simulation
    simulateError,
    clearSimulation,
    
    // Services
    mockUploadService: mockServiceRef.current,
    statusMonitor: statusMonitorRef.current,
    
    // Helpers
    generateMockFiles,
    validateFileUpload,
    simulateNetworkConditions,
    
    // Logging
    logs,
    clearLogs,
    addLog
  };
}

// Development-only hook for easier testing
export function useDevTesting() {
  const testing = useTesting({
    enableInProduction: false,
    autoStartMonitoring: true,
    logLevel: 'debug'
  });
  
  // Auto-enable testing mode in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !testing.isTestingMode) {
      testing.enableTestingMode();
    }
  }, [testing.isTestingMode, testing.enableTestingMode]);
  
  return testing;
}

// Hook for production monitoring (limited functionality)
export function useProductionMonitoring() {
  return useTesting({
    enableInProduction: true,
    autoStartMonitoring: false,
    logLevel: 'error'
  });
}