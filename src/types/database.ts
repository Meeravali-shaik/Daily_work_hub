export type GoalHorizon = 'quarter' | 'year' | 'multi-year';
export type GoalStatus = 'active' | 'paused' | 'done' | 'dropped';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: string;
  horizon: GoalHorizon;
  target_date?: string; // YYYY-MM-DD
  status: GoalStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Milestone {
  id: string;
  user_id: string;
  goal_id: string;
  title: string;
  due_date?: string; // YYYY-MM-DD
  done: boolean;
  sort: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type TaskPriority = 'High' | 'Medium' | 'Low';
export type RepeatRule = 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  category: string;
  priority: TaskPriority;
  due_date?: string; // YYYY-MM-DD
  due_time?: string; // HH:mm
  repeat_rule?: RepeatRule | null;
  done: boolean;
  done_at?: string | null;
  goal_id?: string | null;
  milestone_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface HabitCheckin {
  id: string;
  user_id: string;
  habit_id: string;
  day: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type TimeEntrySource = 'timer' | 'manual' | 'pomodoro';

export interface TimeEntry {
  id: string;
  user_id: string;
  label?: string;
  category: string;
  started_at: string; // ISO
  ended_at?: string | null; // ISO
  minutes: number;
  source: TimeEntrySource;
  task_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface RunningTimer {
  id: string;
  user_id: string;
  label?: string;
  category?: string;
  started_at?: string | null; // ISO
  task_id?: string | null;
  mode?: 'normal' | 'pomodoro';
  pomodoro_type?: 'work' | 'break';
  pomodoro_duration_min?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type CourseKind = 'Course' | 'Certification' | 'Book' | 'Tutorial';

export interface Course {
  id: string;
  user_id: string;
  name: string;
  platform?: string;
  kind: CourseKind;
  progress: number; // 0 - 100
  target_date?: string; // YYYY-MM-DD
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type JobStatus = 'Wishlist' | 'Applied' | 'Interview' | 'Offer' | 'Rejected';

export interface JobApplication {
  id: string;
  user_id: string;
  company: string;
  role: string;
  status: JobStatus;
  applied_on: string; // YYYY-MM-DD
  follow_up_on?: string; // YYYY-MM-DD
  notes?: string;
  salary_range?: string;
  location?: string;
  url?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Note {
  id: string;
  user_id: string;
  title?: string;
  body: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_start: string; // YYYY-MM-DD
  reflection?: string;
  wins?: string;
  challenges?: string;
  next_week_focus?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type ReminderStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  remind_at: string; // ISO
  task_id?: string | null;
  goal_id?: string | null;
  channels: string[]; // default ['push']
  repeat_rule?: RepeatRule | null;
  status: ReminderStatus;
  sent_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface UserSettings {
  id: string;
  user_id: string;
  timezone: string;
  week_starts_on: number; // 0=Sun, 1=Mon
  digest_time: string; // '08:30'
  email_reminders: boolean;
  calendar_token: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  theme?: 'dark' | 'light' | 'system';
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type TableName =
  | 'goals'
  | 'milestones'
  | 'tasks'
  | 'habits'
  | 'habit_checkins'
  | 'time_entries'
  | 'running_timer'
  | 'courses'
  | 'job_applications'
  | 'notes'
  | 'weekly_reviews'
  | 'reminders'
  | 'push_subscriptions'
  | 'user_settings';

export interface OutboxJob {
  key: string;
  table: TableName;
  row: Record<string, any>;
  timestamp: number;
}

export interface HubExportData {
  app: 'daily-work-hub';
  schema_version: number;
  exported_at: string;
  timezone: string;
  tables: {
    goals: Goal[];
    milestones: Milestone[];
    tasks: Task[];
    habits: Habit[];
    habit_checkins: HabitCheckin[];
    time_entries: TimeEntry[];
    running_timer: RunningTimer[];
    courses: Course[];
    job_applications: JobApplication[];
    notes: Note[];
    weekly_reviews: WeeklyReview[];
    reminders: Reminder[];
    user_settings?: UserSettings[];
  };
}
