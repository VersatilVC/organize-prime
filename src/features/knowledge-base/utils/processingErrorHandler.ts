export interface ProcessingError {
  code: string;
  message: string;
  type: 'webhook' | 'parsing' | 'embedding' | 'storage' | 'network' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  retryable: boolean;
  userMessage: string;
  technicalDetails?: any;
  suggestedActions: string[];
  helpUrl?: string;
  estimatedFixTime?: number; // minutes
}

export interface ProcessingErrorContext {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  kbId: string;
  organizationId: string;
  step: 'upload' | 'text_extraction' | 'chunking' | 'embedding' | 'storage';
  timestamp: Date;
  retryCount: number;
  previousErrors?: ProcessingError[];
}

// Comprehensive error classification and handling
export class ProcessingErrorHandler {
  private errorPatterns: Map<RegExp, (match: RegExpMatchArray, context: ProcessingErrorContext) => ProcessingError>;

  constructor() {
    this.errorPatterns = new Map();
    this.initializeErrorPatterns();
  }

  private initializeErrorPatterns(): void {
    // Webhook timeout errors
    this.errorPatterns.set(
      /webhook.*timeout|timeout.*webhook|ETIMEDOUT|connection.*timeout/i,
      (match, context) => ({
        code: 'WEBHOOK_TIMEOUT',
        message: 'File processing webhook timed out',
        type: 'webhook',
        severity: 'medium',
        recoverable: true,
        retryable: true,
        userMessage: 'The file processing service is taking longer than expected. We\'ll retry automatically.',
        suggestedActions: [
          'Wait for automatic retry',
          'Check system status page',
          'Try uploading smaller files',
          'Contact support if issue persists'
        ],
        helpUrl: '/help/processing-timeouts',
        estimatedFixTime: 5
      })
    );

    // N8N workflow errors
    this.errorPatterns.set(
      /n8n.*workflow.*failed|workflow.*execution.*failed|n8n.*error/i,
      (match, context) => ({
        code: 'N8N_WORKFLOW_ERROR',
        message: 'Workflow execution failed',
        type: 'system',
        severity: 'high',
        recoverable: true,
        retryable: true,
        userMessage: 'There was an issue with our processing workflow. Our team has been notified.',
        suggestedActions: [
          'Try again in a few minutes',
          'Check if the file format is supported',
          'Contact support with error details'
        ],
        helpUrl: '/help/workflow-errors',
        estimatedFixTime: 15
      })
    );

    // File parsing errors
    this.errorPatterns.set(
      /parse.*error|parsing.*failed|cannot.*extract.*text|corrupted.*file|invalid.*format/i,
      (match, context) => ({
        code: 'FILE_PARSING_ERROR',
        message: 'Unable to extract text from file',
        type: 'parsing',
        severity: 'medium',
        recoverable: false,
        retryable: false,
        userMessage: `We couldn't extract text content from "${context.fileName}". The file might be corrupted or in an unsupported format.`,
        suggestedActions: [
          'Check if the file opens correctly on your computer',
          'Try converting to a different format (PDF, TXT)',
          'Upload a different version of the file',
          'Contact support if you believe this is an error'
        ],
        helpUrl: '/help/file-formats',
        estimatedFixTime: 0 // Not fixable automatically
      })
    );

    // Embedding generation errors
    this.errorPatterns.set(
      /embedding.*failed|vector.*generation.*error|openai.*api.*error|embedding.*timeout/i,
      (match, context) => ({
        code: 'EMBEDDING_GENERATION_ERROR',
        message: 'Failed to generate embeddings',
        type: 'embedding',
        severity: 'high',
        recoverable: true,
        retryable: true,
        userMessage: 'We encountered an issue generating AI embeddings for your file. This is usually temporary.',
        suggestedActions: [
          'Wait for automatic retry',
          'Check our status page for service updates',
          'Try uploading again in a few minutes'
        ],
        helpUrl: '/help/embedding-errors',
        estimatedFixTime: 10
      })
    );

    // Vector storage errors
    this.errorPatterns.set(
      /vector.*storage.*failed|database.*error|storage.*quota.*exceeded|vector.*insert.*failed/i,
      (match, context) => ({
        code: 'VECTOR_STORAGE_ERROR',
        message: 'Failed to store vectors',
        type: 'storage',
        severity: 'high',
        recoverable: true,
        retryable: true,
        userMessage: 'We couldn\'t save the processed content to your knowledge base. This might be due to storage limits.',
        suggestedActions: [
          'Check your storage quota',
          'Delete some unused files',
          'Upgrade your storage plan',
          'Contact support for assistance'
        ],
        helpUrl: '/help/storage-limits',
        estimatedFixTime: 5
      })
    );

    // Network connectivity errors
    this.errorPatterns.set(
      /network.*error|connection.*refused|dns.*error|fetch.*failed|ECONNREFUSED|ENOTFOUND/i,
      (match, context) => ({
        code: 'NETWORK_ERROR',
        message: 'Network connectivity issue',
        type: 'network',
        severity: 'medium',
        recoverable: true,
        retryable: true,
        userMessage: 'There was a network connectivity issue during processing. We\'ll retry automatically.',
        suggestedActions: [
          'Check your internet connection',
          'Wait for automatic retry',
          'Try again later if issues persist'
        ],
        helpUrl: '/help/connectivity-issues',
        estimatedFixTime: 2
      })
    );

    // File size related errors
    this.errorPatterns.set(
      /file.*too.*large|size.*limit.*exceeded|payload.*too.*large|413.*error/i,
      (match, context) => ({
        code: 'FILE_SIZE_ERROR',
        message: 'File size exceeds processing limits',
        type: 'parsing',
        severity: 'medium',
        recoverable: false,
        retryable: false,
        userMessage: `The file "${context.fileName}" is too large for processing. Please reduce the file size and try again.`,
        suggestedActions: [
          'Compress the file or reduce its size',
          'Split large documents into smaller sections',
          'Convert to a more efficient format',
          'Contact support about enterprise limits'
        ],
        helpUrl: '/help/file-size-limits',
        estimatedFixTime: 0
      })
    );

    // Memory/resource errors
    this.errorPatterns.set(
      /out.*of.*memory|memory.*error|resource.*exhausted|429.*error|rate.*limit/i,
      (match, context) => ({
        code: 'RESOURCE_EXHAUSTED',
        message: 'Processing resources temporarily unavailable',
        type: 'system',
        severity: 'medium',
        recoverable: true,
        retryable: true,
        userMessage: 'Our processing servers are currently busy. We\'ll automatically retry your request.',
        suggestedActions: [
          'Wait for automatic retry',
          'Try uploading during off-peak hours',
          'Consider upgrading to priority processing'
        ],
        helpUrl: '/help/processing-limits',
        estimatedFixTime: 10
      })
    );

    // Authentication/authorization errors
    this.errorPatterns.set(
      /unauthorized|authentication.*failed|invalid.*token|403.*error|401.*error/i,
      (match, context) => ({
        code: 'AUTH_ERROR',
        message: 'Authentication or authorization failed',
        type: 'system',
        severity: 'high',
        recoverable: true,
        retryable: false,
        userMessage: 'There was an authentication issue during processing. Please try logging out and back in.',
        suggestedActions: [
          'Log out and log back in',
          'Clear your browser cache',
          'Check if your session has expired',
          'Contact support if issue persists'
        ],
        helpUrl: '/help/authentication-issues',
        estimatedFixTime: 2
      })
    );

    // Generic server errors
    this.errorPatterns.set(
      /internal.*server.*error|500.*error|server.*error|unexpected.*error/i,
      (match, context) => ({
        code: 'SERVER_ERROR',
        message: 'Internal server error',
        type: 'system',
        severity: 'high',
        recoverable: true,
        retryable: true,
        userMessage: 'We encountered an unexpected server error. Our team has been automatically notified.',
        suggestedActions: [
          'Wait for automatic retry',
          'Check our status page',
          'Try again in a few minutes',
          'Contact support if error persists'
        ],
        helpUrl: '/help/server-errors',
        estimatedFixTime: 15
      })
    );

    // Unsupported content errors
    this.errorPatterns.set(
      /unsupported.*content|content.*type.*not.*supported|cannot.*process.*content/i,
      (match, context) => ({
        code: 'UNSUPPORTED_CONTENT',
        message: 'File content is not supported',
        type: 'parsing',
        severity: 'low',
        recoverable: false,
        retryable: false,
        userMessage: `The content in "${context.fileName}" is not supported for processing.`,
        suggestedActions: [
          'Check if the file contains readable text',
          'Try converting to a supported format',
          'Remove password protection if applicable',
          'Contact support for format recommendations'
        ],
        helpUrl: '/help/supported-formats',
        estimatedFixTime: 0
      })
    );
  }

  processError(errorMessage: string, context: ProcessingErrorContext): ProcessingError {
    // Try to match against known error patterns
    for (const [pattern, handler] of this.errorPatterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        const error = handler(match, context);
        error.technicalDetails = {
          originalError: errorMessage,
          context,
          matchedPattern: pattern.source
        };
        return error;
      }
    }

    // Default error handling for unrecognized errors
    return this.createGenericError(errorMessage, context);
  }

  private createGenericError(errorMessage: string, context: ProcessingErrorContext): ProcessingError {
    // Determine severity based on context
    let severity: ProcessingError['severity'] = 'medium';
    let retryable = true;
    let type: ProcessingError['type'] = 'system';

    // Context-based error analysis
    if (context.retryCount >= 3) {
      severity = 'high';
      retryable = false;
    }

    if (context.step === 'upload') {
      type = 'network';
    } else if (context.step === 'text_extraction') {
      type = 'parsing';
    } else if (context.step === 'embedding') {
      type = 'embedding';
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      type,
      severity,
      recoverable: retryable,
      retryable,
      userMessage: `We encountered an unexpected error while processing "${context.fileName}". Our team has been notified.`,
      suggestedActions: [
        'Try uploading the file again',
        'Check if the file is corrupted',
        'Contact support with error details',
        'Try a different file format'
      ],
      helpUrl: '/help/troubleshooting',
      technicalDetails: {
        originalError: errorMessage,
        context
      },
      estimatedFixTime: retryable ? 10 : 0
    };
  }

  // Generate user-friendly error notification
  generateErrorNotification(error: ProcessingError, context: ProcessingErrorContext): {
    title: string;
    description: string;
    variant: 'default' | 'destructive' | 'warning';
    actions?: Array<{ label: string; action: () => void }>;
  } {
    let variant: 'default' | 'destructive' | 'warning' = 'destructive';
    
    if (error.severity === 'low') {
      variant = 'warning';
    } else if (error.retryable) {
      variant = 'default';
    }

    const notification = {
      title: this.getErrorTitle(error),
      description: error.userMessage,
      variant,
      actions: []
    };

    // Add contextual actions
    if (error.retryable && context.retryCount < 3) {
      notification.actions.push({
        label: 'Retry Now',
        action: () => {
          // This would trigger retry logic
          console.log('Retry triggered for:', context.fileId);
        }
      });
    }

    if (error.helpUrl) {
      notification.actions.push({
        label: 'Get Help',
        action: () => {
          window.open(error.helpUrl, '_blank');
        }
      });
    }

    return notification;
  }

  private getErrorTitle(error: ProcessingError): string {
    const titleMap: Record<string, string> = {
      'WEBHOOK_TIMEOUT': 'Processing Timeout',
      'N8N_WORKFLOW_ERROR': 'Workflow Error',
      'FILE_PARSING_ERROR': 'File Format Issue',
      'EMBEDDING_GENERATION_ERROR': 'AI Processing Error',
      'VECTOR_STORAGE_ERROR': 'Storage Error',
      'NETWORK_ERROR': 'Connection Issue',
      'FILE_SIZE_ERROR': 'File Too Large',
      'RESOURCE_EXHAUSTED': 'System Busy',
      'AUTH_ERROR': 'Authentication Issue',
      'SERVER_ERROR': 'Server Error',
      'UNSUPPORTED_CONTENT': 'Unsupported Content',
      'UNKNOWN_ERROR': 'Processing Error'
    };

    return titleMap[error.code] || 'Processing Error';
  }

  // Analyze error trends for system health monitoring
  analyzeErrorTrends(errors: ProcessingError[]): {
    criticalIssues: ProcessingError[];
    commonIssues: { code: string; count: number; pattern: string }[];
    systemHealthScore: number;
    recommendations: string[];
  } {
    const criticalIssues = errors.filter(e => e.severity === 'critical');
    
    // Count error types
    const errorCounts = new Map<string, number>();
    errors.forEach(error => {
      errorCounts.set(error.code, (errorCounts.get(error.code) || 0) + 1);
    });

    const commonIssues = Array.from(errorCounts.entries())
      .map(([code, count]) => ({
        code,
        count,
        pattern: errors.find(e => e.code === code)?.message || ''
      }))
      .filter(issue => issue.count >= 3)
      .sort((a, b) => b.count - a.count);

    // Calculate system health score (0-100)
    const totalErrors = errors.length;
    const criticalCount = criticalIssues.length;
    const retryableCount = errors.filter(e => e.retryable).length;
    
    let healthScore = 100;
    healthScore -= (criticalCount / totalErrors) * 50; // Critical errors impact heavily
    healthScore -= ((totalErrors - retryableCount) / totalErrors) * 30; // Non-retryable errors
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (criticalCount > 0) {
      recommendations.push('Investigate critical system issues immediately');
    }
    
    if (commonIssues.length > 0) {
      const topIssue = commonIssues[0];
      recommendations.push(`Address recurring ${topIssue.code} errors (${topIssue.count} occurrences)`);
    }
    
    if (healthScore < 70) {
      recommendations.push('System health is degraded - consider maintenance');
    }

    return {
      criticalIssues,
      commonIssues,
      systemHealthScore: healthScore,
      recommendations
    };
  }
}

// Export singleton instance
export const processingErrorHandler = new ProcessingErrorHandler();