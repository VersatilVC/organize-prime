export interface KBDocument {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  file_path?: string;
  file_type: string;
  category: string;
  tags: string[];
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  embedding_status: 'pending' | 'processing' | 'completed' | 'error';
  file_size?: number;
  word_count?: number;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface KBSearch {
  id: string;
  organization_id: string;
  user_id: string;
  query: string;
  results_count: number;
  created_at: string;
}

export interface DocumentSearchResult {
  document: KBDocument;
  relevance_score: number;
  highlights: string[];
}

export interface KBStats {
  total_documents: number;
  processing_documents: number;
  completed_documents: number;
  error_documents: number;
  total_searches: number;
  avg_search_results: number;
}

export interface DocumentUploadData {
  title: string;
  content?: string;
  file?: File;
  category: string;
  tags: string[];
}