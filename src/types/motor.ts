export interface Motor {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
}

export interface MotorStats {
  activeCount: number;
  label: string;
}

export interface MotorWithStats extends Motor {
  stats: MotorStats;
}
