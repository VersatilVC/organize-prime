import React, { useState, useCallback, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Zap,
  FileText,
  Users,
  Activity,
  Settings,
  Bug,
  TestTube
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  TestRunner,
  MockUploadService,
  PerformanceTester,
  MOCK_FILES,
  ERROR_SCENARIOS,
  PERFORMANCE_TESTS,
  createMockFile,
  createMockFileSet,
  TestHelpers
} from '../utils/testingUtils';
import { cn } from '@/lib/utils';

interface TestingPanelProps {
  isVisible?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function TestingPanel({ isVisible = false, onToggle, className }: TestingPanelProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [selectedErrorScenario, setSelectedErrorScenario] = useState<string>('');
  const [selectedPerformanceTest, setSelectedPerformanceTest] = useState<string>('');
  const [testProgress, setTestProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [enableRealTimeUpdates, setEnableRealTimeUpdates] = useState(true);
  const [errorRate, setErrorRate] = useState(0);
  const [networkDelay, setNetworkDelay] = useState(1000);
  
  const testRunnerRef = useRef<TestRunner>(new TestRunner());
  const mockServiceRef = useRef<MockUploadService | null>(null);
  
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);
  
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);
  
  // Initialize mock service with current settings
  const initializeMockService = useCallback(() => {
    mockServiceRef.current = new MockUploadService({
      errorRate: errorRate / 100,
      delay: networkDelay,
      simulateProgress: enableRealTimeUpdates
    });
    return mockServiceRef.current;
  }, [errorRate, networkDelay, enableRealTimeUpdates]);
  
  // Test individual file upload
  const testSingleUpload = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestProgress(0);
    setCurrentTest('Single File Upload');
    addLog('Starting single file upload test');
    
    try {
      const mockService = initializeMockService();
      const testFile = createMockFile(MOCK_FILES.smallPdf);
      
      const result = await mockService.uploadFile(testFile, 'test-kb', (progress) => {
        setTestProgress(progress);
        if (progress % 25 === 0) {
          addLog(`Upload progress: ${progress}%`);
        }
      });
      
      addLog(`✅ Upload completed: ${result.file_name}`);
      setTestResults(prev => [...prev, { type: 'upload', success: true, result }]);
      
    } catch (error) {
      addLog(`❌ Upload failed: ${(error as Error).message}`);
      setTestResults(prev => [...prev, { type: 'upload', success: false, error: (error as Error).message }]);
    } finally {
      setIsRunning(false);
      setTestProgress(0);
      setCurrentTest('');
    }
  }, [isRunning, initializeMockService, addLog]);
  
  // Test batch upload
  const testBatchUpload = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestProgress(0);
    setCurrentTest('Batch Upload');
    addLog('Starting batch upload test with 5 files');
    
    try {
      const mockService = initializeMockService();
      const testFiles = createMockFileSet([
        MOCK_FILES.smallPdf,
        MOCK_FILES.textFile,
        MOCK_FILES.wordDoc,
        MOCK_FILES.markdown,
        { ...MOCK_FILES.largePdf, size: 1024 * 1024 * 2 } // Smaller for testing
      ]);
      
      let completedFiles = 0;
      const results = await mockService.uploadBatch(
        testFiles,
        'test-kb',
        (fileId, progress) => {
          if (enableRealTimeUpdates && progress % 20 === 0) {
            addLog(`${fileId}: ${progress}%`);
          }
        },
        (fileId, result) => {
          completedFiles++;
          setTestProgress((completedFiles / testFiles.length) * 100);
          
          if (result instanceof Error) {
            addLog(`❌ ${fileId} failed: ${result.message}`);
          } else {
            addLog(`✅ ${fileId} completed`);
          }
        }
      );
      
      const successCount = results.filter(r => !(r instanceof Error)).length;
      addLog(`Batch upload completed: ${successCount}/${testFiles.length} successful`);
      setTestResults(prev => [...prev, { 
        type: 'batch', 
        success: successCount === testFiles.length, 
        results,
        successRate: (successCount / testFiles.length) * 100
      }]);
      
    } catch (error) {
      addLog(`❌ Batch upload failed: ${(error as Error).message}`);
      setTestResults(prev => [...prev, { type: 'batch', success: false, error: (error as Error).message }]);
    } finally {
      setIsRunning(false);
      setTestProgress(0);
      setCurrentTest('');
    }
  }, [isRunning, initializeMockService, addLog, enableRealTimeUpdates]);
  
  // Test error scenario
  const testErrorScenario = useCallback(async () => {
    if (isRunning || !selectedErrorScenario) return;
    
    setIsRunning(true);
    setCurrentTest(`Error Test: ${selectedErrorScenario}`);
    addLog(`Testing error scenario: ${selectedErrorScenario}`);
    
    try {
      const mockService = initializeMockService();
      mockService.activateErrorScenario(selectedErrorScenario as keyof typeof ERROR_SCENARIOS);
      
      const testFile = createMockFile(MOCK_FILES.smallPdf);
      await mockService.uploadFile(testFile, 'test-kb');
      
      addLog('❌ Expected error but upload succeeded');
      setTestResults(prev => [...prev, { type: 'error', success: false, scenario: selectedErrorScenario }]);
      
    } catch (error) {
      const scenario = ERROR_SCENARIOS[selectedErrorScenario as keyof typeof ERROR_SCENARIOS];
      addLog(`✅ Error scenario handled correctly: ${(error as Error).message}`);
      addLog(`Retryable: ${scenario.retryable ? 'Yes' : 'No'}`);
      setTestResults(prev => [...prev, { 
        type: 'error', 
        success: true, 
        scenario: selectedErrorScenario,
        error: (error as Error).message,
        retryable: scenario.retryable
      }]);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  }, [isRunning, selectedErrorScenario, initializeMockService, addLog]);
  
  // Test performance scenario
  const testPerformanceScenario = useCallback(async () => {
    if (isRunning || !selectedPerformanceTest) return;
    
    setIsRunning(true);
    setTestProgress(0);
    setCurrentTest(`Performance Test: ${selectedPerformanceTest}`);
    
    const testConfig = PERFORMANCE_TESTS[selectedPerformanceTest as keyof typeof PERFORMANCE_TESTS];
    addLog(`Starting performance test: ${testConfig.name}`);
    addLog(`Files: ${testConfig.fileCount}, Size: ${(testConfig.fileSize / 1024 / 1024).toFixed(1)}MB each`);
    
    try {
      const performanceTester = new PerformanceTester();
      const mockService = initializeMockService();
      
      await performanceTester.runPerformanceTest(testConfig, mockService);
      
      const results = performanceTester.getResults();
      const latestResult = results[results.length - 1];
      
      addLog(`✅ Performance test completed in ${latestResult.duration}ms`);
      addLog(`Expected: ${testConfig.expectedTime}ms`);
      addLog(`Throughput: ${((latestResult.totalSize / 1024 / 1024) / (latestResult.duration / 1000)).toFixed(2)} MB/s`);
      
      setTestResults(prev => [...prev, { 
        type: 'performance', 
        success: latestResult.success, 
        result: latestResult,
        config: testConfig
      }]);
      
    } catch (error) {
      addLog(`❌ Performance test failed: ${(error as Error).message}`);
      setTestResults(prev => [...prev, { 
        type: 'performance', 
        success: false, 
        error: (error as Error).message 
      }]);
    } finally {
      setIsRunning(false);
      setTestProgress(0);
      setCurrentTest('');
    }
  }, [isRunning, selectedPerformanceTest, initializeMockService, addLog]);
  
  // Run all tests
  const runAllTests = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setCurrentTest('Running Full Test Suite');
    addLog('🧪 Starting comprehensive test suite...');
    
    try {
      const testRunner = testRunnerRef.current;
      await testRunner.runAllTests();
      
      addLog('✅ All tests completed successfully');
      
    } catch (error) {
      addLog(`❌ Test suite failed: ${(error as Error).message}`);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  }, [isRunning, addLog]);
  
  // Export test results
  const exportResults = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      settings: { errorRate, networkDelay, enableRealTimeUpdates },
      results: testResults,
      logs: logs
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kb-test-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    addLog('📄 Test results exported');
  }, [testResults, logs, errorRate, networkDelay, enableRealTimeUpdates, addLog]);
  
  if (!isVisible) return null;
  
  return (
    <div className={cn('border rounded-lg bg-background', className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          <h3 className="font-semibold">Testing & Simulation Panel</h3>
          {isRunning && (
            <Badge variant="default" className="animate-pulse">
              Running
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onToggle}>
          ×
        </Button>
      </div>
      
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload Tests</TabsTrigger>
            <TabsTrigger value="errors">Error Simulation</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          {/* Upload Tests Tab */}
          <TabsContent value="upload" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Single File Upload
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={testSingleUpload} disabled={isRunning} className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Test Single Upload
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Batch Upload
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={testBatchUpload} disabled={isRunning} className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Test Batch Upload
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button onClick={runAllTests} disabled={isRunning} variant="default">
                  <Zap className="h-4 w-4 mr-2" />
                  Run All Tests
                </Button>
                <Button onClick={exportResults} variant="outline" disabled={testResults.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
                <Button onClick={() => setTestResults([])} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear Results
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Error Simulation Tab */}
          <TabsContent value="errors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  Error Scenarios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select Error Scenario</label>
                  <Select value={selectedErrorScenario} onValueChange={setSelectedErrorScenario}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose an error scenario to test" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ERROR_SCENARIOS).map(([key, scenario]) => (
                        <SelectItem key={key} value={key}>
                          {scenario.name} - {scenario.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={testErrorScenario} 
                  disabled={isRunning || !selectedErrorScenario}
                  className="w-full"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Test Error Scenario
                </Button>
                
                {selectedErrorScenario && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Testing: {ERROR_SCENARIOS[selectedErrorScenario as keyof typeof ERROR_SCENARIOS]?.description}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Performance Testing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select Performance Test</label>
                  <Select value={selectedPerformanceTest} onValueChange={setSelectedPerformanceTest}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose a performance test" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PERFORMANCE_TESTS).map(([key, test]) => (
                        <SelectItem key={key} value={key}>
                          {test.name} - {test.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={testPerformanceScenario} 
                  disabled={isRunning || !selectedPerformanceTest}
                  className="w-full"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Run Performance Test
                </Button>
                
                {selectedPerformanceTest && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      {PERFORMANCE_TESTS[selectedPerformanceTest as keyof typeof PERFORMANCE_TESTS]?.description}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Test Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Error Rate (%)</label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={errorRate}
                    onChange={(e) => setErrorRate(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground">Current: {errorRate}%</div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Network Delay (ms)</label>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    value={networkDelay}
                    onChange={(e) => setNetworkDelay(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground">Current: {networkDelay}ms</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Real-time Updates</label>
                  <Switch 
                    checked={enableRealTimeUpdates} 
                    onCheckedChange={setEnableRealTimeUpdates}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Progress Display */}
        {isRunning && (
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{currentTest}</span>
                  <span>{Math.round(testProgress)}%</span>
                </div>
                <Progress value={testProgress} />
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Test Results */}
        {testResults.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Test Results ({testResults.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {testResults.slice(-5).map((result, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 border rounded">
                    <span>{result.type}</span>
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Console Logs */}
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Console Logs</CardTitle>
              <Button variant="ghost" size="sm" onClick={clearLogs}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={logs.join('\n')}
              readOnly
              className="h-32 text-xs font-mono"
              placeholder="Test logs will appear here..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}