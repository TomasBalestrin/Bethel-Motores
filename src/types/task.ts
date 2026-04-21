export const TASK_STATUSES = [
  "backlog",
  "em_andamento",
  "em_revisao",
  "concluido",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = [
  "baixa",
  "media",
  "alta",
  "urgente",
] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface TaskAssignee {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
}

export interface Task {
  id: string;
  social_profile_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  assignee_id: string | null;
  assignee: TaskAssignee | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string | null;
  user_name: string | null;
  content: string;
  created_at: string;
}

export interface TaskWithComments extends Task {
  comments: TaskComment[];
}
