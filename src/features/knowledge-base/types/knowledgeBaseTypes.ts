export interface KBDocument {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  file_path?: string | null;
  file_type: string;
  category: string | null;
  tags: string[];
  processing_status: string; // Accept any string to match DB response
  embedding_status: string; // Accept any string to match DB response
  file_size?: number | null;
  word_count?: number | null;
  created_by: string | null;
  updated_by?: string | null;
  created_at: string | null;
  updated_at: string | null;
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