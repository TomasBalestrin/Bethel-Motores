import type { FieldType, MetricSource } from "@/lib/validators/funnel";

export interface FunnelTemplateField {
  id: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  unit: string | null;
  default_source: MetricSource;
  display_order: number;
  is_required: boolean;
  is_aggregable: boolean;
}

export interface FunnelTemplate {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  fields: FunnelTemplateField[];
}

export interface FunnelFieldValue {
  field_key: string;
  value_numeric: number | null;
  value_text: string | null;
  source: MetricSource;
  captured_at: string | null;
}

export interface Funnel {
  id: string;
  name: string;
  mentoria_id: string;
  template_id: string;
  list_url: string | null;
  is_traffic_funnel: boolean;
  is_active: boolean;
  created_at: string;
}

export interface FunnelWithTemplate extends Funnel {
  template: FunnelTemplate | null;
  values: FunnelFieldValue[];
}
