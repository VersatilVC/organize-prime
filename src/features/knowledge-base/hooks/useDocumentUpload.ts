import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveOrganization } from '@/hooks/useEffectiveOrganization';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { DocumentUploadData } from '../types/knowledgeBaseTypes';

export function useDocumentUpload() {
  const { effectiveOrganizationId } = useEffectiveOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadDocument = useMutation({
    mutationFn: async (uploadData: DocumentUploadData) => {
      if (!effectiveOrganizationId || !user?.id) {
        throw new Error('Missing organization or user context');
      }

      let filePath = null;
      let content = uploadData.content || '';
      let fileSize = null;
      let fileType = 'text';

      // Handle file upload to Supabase Storage
      if (uploadData.file) {
        const fileName = `${Date.now()}-${uploadData.file.name}`;
        filePath = `${effectiveOrganizationId}/documents/${fileName}`;
        fileSize = uploadData.file.size;
        fileType = uploadData.file.type;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, uploadData.file);

        if (uploadError) throw uploadError;

        // For text files, extract content
        if (uploadData.file.type.startsWith('text/')) {
          content = await uploadData.file.text();
        } else {
          // For other file types, we'll process them later
          content = `Uploaded file: ${uploadData.file.name}`;
        }
      }

      // Calculate word count for text content
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

      // Insert document record
      const { data, error } = await supabase
        .from('kb_documents')
        .insert({
          organization_id: effectiveOrganizationId,
          title: uploadData.title,
          content,
          file_path: filePath,
          file_type: fileType,
          category: uploadData.category,
          tags: uploadData.tags,
          file_size: fileSize,
          word_count: wordCount,
          created_by: user.id,
          processing_status: 'pending',
          embedding_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Document uploaded successfully',
        description: `"${data.title}" has been added to your knowledge base.`,
      });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-data'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-documents'] });
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive',
      });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      // First get the document to check for file path
      const { data: document, error: fetchError } = await supabase
        .from('kb_documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Delete file from storage if it exists
      if (document.file_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([document.file_path]);

        if (storageError) {
          console.warn('Failed to delete file from storage:', storageError);
        }
      }

      // Delete document record
      const { error } = await supabase
        .from('kb_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Document deleted',
        description: 'The document has been removed from your knowledge base.',
      });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-data'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-documents'] });
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete document',
        variant: 'destructive',
      });
    },
  });

  return {
    uploadDocument: uploadDocument.mutate,
    isUploading: uploadDocument.isPending,
    uploadError: uploadDocument.error,
    deleteDocument: deleteDocument.mutate,
    isDeleting: deleteDocument.isPending,
  };
}