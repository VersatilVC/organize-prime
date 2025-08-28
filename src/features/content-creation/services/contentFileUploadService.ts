import { supabase } from '@/integrations/supabase/client';

export interface ContentExampleFile {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

/**
 * Upload example files for content types
 * Uses the existing organization-files bucket with organization-scoped paths
 */
export async function uploadContentExampleFiles(
  organizationId: string,
  files: File[],
  onProgress?: (progress: number) => void
): Promise<ContentExampleFile[]> {
  try {
    const uploadedFiles: ContentExampleFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/markdown'
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Unsupported file type for ${file.name}. Please upload PDF, TXT, DOCX, DOC, or MD files.`);
      }

      // Validate file size (10MB max for content examples)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        throw new Error(`File ${file.name} exceeds 10MB limit.`);
      }

      // Generate unique filename to prevent conflicts
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
      
      // Storage path: {orgId}/content-examples/{filename}
      const storagePath = `${organizationId}/content-examples/${uniqueFileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('organization-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      // Get signed URL for the uploaded file (24-hour expiry)
      const { data: urlData } = await supabase.storage
        .from('organization-files')
        .createSignedUrl(storagePath, 24 * 60 * 60); // 24 hours

      uploadedFiles.push({
        id: uniqueFileName,
        name: file.name,
        url: urlData?.signedUrl || '',
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString()
      });

      // Update progress
      if (onProgress) {
        onProgress(((i + 1) / files.length) * 100);
      }
    }

    return uploadedFiles;

  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
}

/**
 * Generate signed URLs for existing content example files
 * Used when loading existing content types with file examples
 */
export async function getContentExampleFileUrls(
  organizationId: string,
  filePaths: string[],
  expirySeconds: number = 3600 // 1 hour default
): Promise<{ [key: string]: string }> {
  try {
    const urlMap: { [key: string]: string } = {};

    for (const filePath of filePaths) {
      // Ensure the file path is properly formatted
      const fullPath = filePath.startsWith(`${organizationId}/content-examples/`) 
        ? filePath 
        : `${organizationId}/content-examples/${filePath}`;

      const { data: urlData } = await supabase.storage
        .from('organization-files')
        .createSignedUrl(fullPath, expirySeconds);

      if (urlData?.signedUrl) {
        urlMap[filePath] = urlData.signedUrl;
      }
    }

    return urlMap;

  } catch (error) {
    console.error('Failed to generate download URLs:', error);
    return {};
  }
}

/**
 * Delete content example files from storage
 */
export async function deleteContentExampleFiles(
  organizationId: string,
  filePaths: string[]
): Promise<void> {
  try {
    const fullPaths = filePaths.map(filePath => 
      filePath.startsWith(`${organizationId}/content-examples/`) 
        ? filePath 
        : `${organizationId}/content-examples/${filePath}`
    );

    const { error } = await supabase.storage
      .from('organization-files')
      .remove(fullPaths);

    if (error) {
      console.error('Failed to delete files:', error);
      throw new Error(`Failed to delete files: ${error.message}`);
    }

  } catch (error) {
    console.error('Error deleting files:', error);
    throw error;
  }
}

/**
 * Check if a file exists in storage
 */
export async function checkContentExampleFileExists(
  organizationId: string,
  filePath: string
): Promise<boolean> {
  try {
    const fullPath = filePath.startsWith(`${organizationId}/content-examples/`) 
      ? filePath 
      : `${organizationId}/content-examples/${filePath}`;

    const { data, error } = await supabase.storage
      .from('organization-files')
      .list(fullPath.substring(0, fullPath.lastIndexOf('/')), {
        search: fullPath.substring(fullPath.lastIndexOf('/') + 1)
      });

    return !error && data && data.length > 0;

  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
}