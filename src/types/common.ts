export type PeriodPreset = "7d" | "30d" | "90d" | "month" | "custom";

export interface DateRange {
  from: string;
  to: string;
}

export interface Period {
  preset: PeriodPreset;
  range: DateRange;
}

export interface Delta {
  value: number;
  direction: "up" | "down" | "flat";
}

export interface GoalState {
  target: number;
  achieved: number;
}
