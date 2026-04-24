export type PostType = "impulsionar" | "organico";

export interface Post {
  id: string;
  social_profile_id: string;
  code: string;
  link: string | null;
  post_type: PostType;
  headline: string | null;
  gancho: string | null;
  assunto: string | null;
  posted_at: string | null;
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

export type MeetingType = "terca" | "sexta";

export interface PostMeetingMetrics {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  spend: number;
  investment: number;
  followers_gained: number;
  hook_rate_3s: number | null;
  hold_50: number | null;
  hold_75: number | null;
  duration_seconds: number | null;
}

export interface PostMeeting {
  id: string;
  post_id: string;
  meeting_type: MeetingType;
  meeting_date: string;
  metrics_id: string | null;
  created_by: string | null;
  created_at: string;
  metrics: PostMeetingMetrics | null;
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
