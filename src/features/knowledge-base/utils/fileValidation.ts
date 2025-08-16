export interface FileValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  field?: string;
  details?: any;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: FileValidationError[];
  warnings: FileValidationError[];
  metadata?: {
    estimatedProcessingTime?: number;
    estimatedCost?: number;
    suggestedActions?: string[];
  };
}

export interface ValidationOptions {
  maxFileSize?: number;
  allowedTypes?: string[];
  checkDuplicates?: boolean;
  existingFiles?: string[];
  organizationQuota?: {
    used: number;
    limit: number;
  };
  checkNetworkConnection?: boolean;
}

// File type configurations with processing complexity
const FILE_TYPE_CONFIG = {
  'application/pdf': {
    name: 'PDF Document',
    extensions: ['.pdf'],
    complexity: 'medium',
    estimatedTimePerMB: 15000, // 15 seconds per MB
    maxOptimalSize: 25 * 1024 * 1024, // 25MB
    icon: '📄'
  },
  'text/plain': {
    name: 'Text File',
    extensions: ['.txt'],
    complexity: 'low',
    estimatedTimePerMB: 5000, // 5 seconds per MB
    maxOptimalSize: 10 * 1024 * 1024, // 10MB
    icon: '📝'
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    name: 'Word Document (DOCX)',
    extensions: ['.docx'],
    complexity: 'medium',
    estimatedTimePerMB: 12000, // 12 seconds per MB
    maxOptimalSize: 20 * 1024 * 1024, // 20MB
    icon: '📄'
  },
  'application/msword': {
    name: 'Word Document (DOC)',
    extensions: ['.doc'],
    complexity: 'medium',
    estimatedTimePerMB: 12000,
    maxOptimalSize: 20 * 1024 * 1024,
    icon: '📄'
  },
  'text/markdown': {
    name: 'Markdown File',
    extensions: ['.md', '.markdown'],
    complexity: 'low',
    estimatedTimePerMB: 3000, // 3 seconds per MB
    maxOptimalSize: 5 * 1024 * 1024, // 5MB
    icon: '📝'
  }
};

const DEFAULT_OPTIONS: ValidationOptions = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: Object.keys(FILE_TYPE_CONFIG),
  checkDuplicates: true,
  checkNetworkConnection: true
};

export class FileValidator {
  private options: ValidationOptions;

  constructor(options: Partial<ValidationOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async validateFile(file: File): Promise<FileValidationResult> {
    const errors: FileValidationError[] = [];
    const warnings: FileValidationError[] = [];

    // Basic file validation
    this.validateFileExists(file, errors);
    this.validateFileSize(file, errors, warnings);
    this.validateFileType(file, errors, warnings);
    this.validateFileName(file, errors, warnings);

    // Advanced validation
    if (this.options.checkDuplicates) {
      this.validateDuplicates(file, errors, warnings);
    }

    if (this.options.organizationQuota) {
      this.validateStorageQuota(file, errors, warnings);
    }

    if (this.options.checkNetworkConnection) {
      await this.validateNetworkConnection(errors);
    }

    // Generate metadata
    const metadata = this.generateMetadata(file);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata
    };
  }

  async validateMultipleFiles(files: File[]): Promise<{
    results: (FileValidationResult & { file: File })[];
    overallValid: boolean;
    totalErrors: number;
    totalWarnings: number;
    estimatedTotalProcessingTime: number;
  }> {
    const results = await Promise.all(
      files.map(async (file) => ({
        file,
        ...(await this.validateFile(file))
      }))
    );

    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const estimatedTotalProcessingTime = results.reduce(
      (sum, r) => sum + (r.metadata?.estimatedProcessingTime || 0), 0
    );

    return {
      results,
      overallValid: totalErrors === 0,
      totalErrors,
      totalWarnings,
      estimatedTotalProcessingTime
    };
  }

  private validateFileExists(file: File, errors: FileValidationError[]): void {
    if (!file) {
      errors.push({
        code: 'FILE_NOT_PROVIDED',
        message: 'No file provided for validation',
        severity: 'error',
        field: 'file'
      });
    }
  }

  private validateFileSize(file: File, errors: FileValidationError[], warnings: FileValidationError[]): void {
    if (!file) return;

    // Check maximum size
    if (file.size > this.options.maxFileSize!) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(this.options.maxFileSize!)})`,
        severity: 'error',
        field: 'fileSize',
        details: { 
          actualSize: file.size, 
          maxSize: this.options.maxFileSize,
          suggestion: 'Consider splitting the document or compressing it'
        }
      });
      return;
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push({
        code: 'FILE_EMPTY',
        message: 'File appears to be empty',
        severity: 'error',
        field: 'fileSize'
      });
      return;
    }

    // Check optimal size for file type
    const typeConfig = FILE_TYPE_CONFIG[file.type as keyof typeof FILE_TYPE_CONFIG];
    if (typeConfig && file.size > typeConfig.maxOptimalSize) {
      warnings.push({
        code: 'FILE_SIZE_NOT_OPTIMAL',
        message: `File size (${this.formatFileSize(file.size)}) is larger than optimal for ${typeConfig.name} (${this.formatFileSize(typeConfig.maxOptimalSize)}). Processing may take longer.`,
        severity: 'warning',
        field: 'fileSize',
        details: {
          optimalSize: typeConfig.maxOptimalSize,
          estimatedExtraTime: Math.floor((file.size - typeConfig.maxOptimalSize) / (1024 * 1024) * typeConfig.estimatedTimePerMB / 1000)
        }
      });
    }

    // Very large files warning
    if (file.size > 25 * 1024 * 1024) { // 25MB
      warnings.push({
        code: 'LARGE_FILE_WARNING',
        message: `Large file detected (${this.formatFileSize(file.size)}). Upload and processing will take longer.`,
        severity: 'warning',
        field: 'fileSize',
        details: { size: file.size }
      });
    }
  }

  private validateFileType(file: File, errors: FileValidationError[], warnings: FileValidationError[]): void {
    if (!file) return;

    const allowedTypes = this.options.allowedTypes!;
    
    if (!allowedTypes.includes(file.type)) {
      // Check if it's a common unsupported type
      const commonUnsupportedTypes = {
        'image/jpeg': 'Images are not supported. Please extract text content first.',
        'image/png': 'Images are not supported. Please extract text content first.',
        'application/zip': 'Compressed files are not supported. Please extract and upload individual files.',
        'video/mp4': 'Video files are not supported.',
        'audio/mp3': 'Audio files are not supported.',
        'application/vnd.ms-excel': 'Excel files are not supported. Please convert to PDF or text format.',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel files are not supported. Please convert to PDF or text format.'
      };

      const suggestion = commonUnsupportedTypes[file.type as keyof typeof commonUnsupportedTypes] || 
        'This file type is not supported.';

      errors.push({
        code: 'UNSUPPORTED_FILE_TYPE',
        message: `File type '${file.type}' is not supported. ${suggestion}`,
        severity: 'error',
        field: 'fileType',
        details: {
          detectedType: file.type,
          allowedTypes: allowedTypes.map(type => FILE_TYPE_CONFIG[type as keyof typeof FILE_TYPE_CONFIG]?.name || type),
          suggestion
        }
      });
      return;
    }

    // Validate file extension matches MIME type
    const typeConfig = FILE_TYPE_CONFIG[file.type as keyof typeof FILE_TYPE_CONFIG];
    if (typeConfig) {
      const fileExtension = this.getFileExtension(file.name);
      if (!typeConfig.extensions.includes(fileExtension)) {
        warnings.push({
          code: 'FILE_EXTENSION_MISMATCH',
          message: `File extension '${fileExtension}' doesn't match detected type '${typeConfig.name}'. This may cause processing issues.`,
          severity: 'warning',
          field: 'fileName',
          details: {
            detectedType: file.type,
            expectedExtensions: typeConfig.extensions
          }
        });
      }
    }
  }

  private validateFileName(file: File, errors: FileValidationError[], warnings: FileValidationError[]): void {
    if (!file) return;

    // Check for empty filename
    if (!file.name || file.name.trim() === '') {
      errors.push({
        code: 'INVALID_FILENAME',
        message: 'File name cannot be empty',
        severity: 'error',
        field: 'fileName'
      });
      return;
    }

    // Check filename length
    if (file.name.length > 255) {
      errors.push({
        code: 'FILENAME_TOO_LONG',
        message: 'File name is too long (maximum 255 characters)',
        severity: 'error',
        field: 'fileName',
        details: { length: file.name.length, maxLength: 255 }
      });
    }

    // Check for problematic characters
    const problematicChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (problematicChars.test(file.name)) {
      warnings.push({
        code: 'PROBLEMATIC_FILENAME_CHARS',
        message: 'File name contains characters that may cause issues during processing',
        severity: 'warning',
        field: 'fileName',
        details: { 
          suggestion: 'Consider renaming the file to use only letters, numbers, hyphens, and underscores'
        }
      });
    }

    // Check for very long filenames that might be truncated
    if (file.name.length > 100) {
      warnings.push({
        code: 'LONG_FILENAME',
        message: 'Very long file name may be truncated in some displays',
        severity: 'warning',
        field: 'fileName'
      });
    }
  }

  private validateDuplicates(file: File, errors: FileValidationError[], warnings: FileValidationError[]): void {
    if (!this.options.existingFiles) return;

    // Check for exact name match
    if (this.options.existingFiles.includes(file.name)) {
      warnings.push({
        code: 'DUPLICATE_FILENAME',
        message: `A file with the name '${file.name}' already exists`,
        severity: 'warning',
        field: 'fileName',
        details: {
          suggestion: 'The file will be renamed automatically if uploaded'
        }
      });
    }

    // Check for similar names
    const similarFiles = this.options.existingFiles.filter(existingName => 
      this.calculateSimilarity(file.name, existingName) > 0.8
    );

    if (similarFiles.length > 0) {
      warnings.push({
        code: 'SIMILAR_FILENAME',
        message: `Similar file names already exist: ${similarFiles.join(', ')}`,
        severity: 'warning',
        field: 'fileName',
        details: { similarFiles }
      });
    }
  }

  private validateStorageQuota(file: File, errors: FileValidationError[], warnings: FileValidationError[]): void {
    if (!this.options.organizationQuota) return;

    const { used, limit } = this.options.organizationQuota;
    const remaining = limit - used;

    if (file.size > remaining) {
      errors.push({
        code: 'STORAGE_QUOTA_EXCEEDED',
        message: `File size (${this.formatFileSize(file.size)}) exceeds remaining storage quota (${this.formatFileSize(remaining)})`,
        severity: 'error',
        field: 'fileSize',
        details: {
          used,
          limit,
          remaining,
          needed: file.size,
          suggestion: 'Delete some files or upgrade your storage plan'
        }
      });
      return;
    }

    // Warning when approaching quota
    const percentageUsed = ((used + file.size) / limit) * 100;
    if (percentageUsed > 90) {
      warnings.push({
        code: 'STORAGE_QUOTA_WARNING',
        message: `This upload will use ${percentageUsed.toFixed(1)}% of your storage quota`,
        severity: 'warning',
        field: 'fileSize',
        details: { percentageUsed }
      });
    }
  }

  private async validateNetworkConnection(errors: FileValidationError[]): Promise<void> {
    try {
      // Simple connectivity check
      if (!navigator.onLine) {
        errors.push({
          code: 'NETWORK_OFFLINE',
          message: 'No internet connection detected. Please check your network connection.',
          severity: 'error',
          details: {
            suggestion: 'Check your internet connection and try again'
          }
        });
        return;
      }

      // Test connection to our service (with timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        await fetch('/api/health', { 
          method: 'HEAD',
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          errors.push({
            code: 'NETWORK_TIMEOUT',
            message: 'Network connection is slow or unstable. Upload may fail.',
            severity: 'error',
            details: {
              suggestion: 'Check your internet connection or try again later'
            }
          });
        } else {
          // Service might be down, but don't block upload
          // This will be handled during actual upload
        }
      }
    } catch (error) {
      // Don't block upload for network check failures
      console.warn('Network validation failed:', error);
    }
  }

  private generateMetadata(file: File): any {
    if (!file) return {};

    const typeConfig = FILE_TYPE_CONFIG[file.type as keyof typeof FILE_TYPE_CONFIG];
    if (!typeConfig) return {};

    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedProcessingTime = Math.ceil(fileSizeMB * typeConfig.estimatedTimePerMB);

    const suggestedActions: string[] = [];
    
    if (file.size > typeConfig.maxOptimalSize) {
      suggestedActions.push('Consider compressing the file for faster processing');
    }

    if (typeConfig.complexity === 'medium' && fileSizeMB > 10) {
      suggestedActions.push('Large document detected - processing may take several minutes');
    }

    return {
      estimatedProcessingTime,
      estimatedCost: Math.ceil(fileSizeMB * 0.01), // $0.01 per MB (example)
      suggestedActions,
      fileTypeInfo: {
        name: typeConfig.name,
        icon: typeConfig.icon,
        complexity: typeConfig.complexity
      }
    };
  }

  // Utility methods
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private getFileExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.')).toLowerCase();
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

// Export singleton instance
export const fileValidator = new FileValidator();