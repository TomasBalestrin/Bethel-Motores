export interface Post {
  id: string;
  social_profile_id: string;
  code: string;
  link: string | null;
  post_type: string | null;
  budget: number | null;
  is_fit: boolean;
  is_test: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostMetricsSnapshot {
  id: string;
  post_id: string;
  investment: number;
  followers_gained: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  clicks: number;
  spend: number;
  captured_at: string;
  captured_by: string | null;
}

export type PostAnalysisKind = "file" | "link" | "text";

export interface PostAnalysis {
  id: string;
  post_id: string;
  source: PostAnalysisKind;
  file_url: string | null;
  file_name: string | null;
  link: string | null;
  note: string | null;
  content_text: string | null;
  created_by: string | null;
  created_at: string;
}
