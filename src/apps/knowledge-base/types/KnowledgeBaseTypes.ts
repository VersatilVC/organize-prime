export interface KBDashboardStats {
  overview: {
    knowledge_bases: number;
    total_files: number;
    processing_files: number;
    failed_files: number;
    conversations: number;
    messages: number;
    premium_kbs?: number;
  };
}

export interface KBFileItem {
  id: string;
  file_name: string;
  original_name: string;
  file_size: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}
