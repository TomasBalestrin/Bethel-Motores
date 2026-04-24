export interface Lead {
  id: string;
  funnel_id: string;
  name: string;
  phone: string | null;
  instagram_handle: string | null;
  revenue: number | null;
  niche: string | null;
  joined_group: boolean;
  confirmed_presence: boolean;
  attended: boolean;
  scheduled: boolean;
  sold: boolean;
  is_qualified: boolean;
  sale_value: number | null;
  entry_value: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadsPage {
  entries: Lead[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LeadFilters {
  query?: string;
}

export interface LeadStatusCounts {
  joined_group: number;
  confirmed_presence: number;
  attended: number;
  scheduled: number;
  sold: number;
  sale_value_total: number;
  entry_value_total: number;
}
