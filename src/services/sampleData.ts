import {
  Goal,
  Milestone,
  Task,
  Habit,
  HabitCheckin,
  TimeEntry,
  Course,
  JobApplication,
  Note,
  WeeklyReview,
  Reminder,
  UserSettings,
} from '../types/database';

export const DEFAULT_USER_ID = 'user-0000-0000-0000-0000';

export function getTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOffsetDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const INITIAL_SETTINGS: UserSettings = {
  id: 'settings-1',
  user_id: DEFAULT_USER_ID,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
  week_starts_on: 1, // Monday
  digest_time: '08:30',
  email_reminders: false,
  calendar_token: '8f921ab49e623f7c10b543789d2ec001',
  theme: 'dark',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
};

// Clean empty starter state (no dummy data)
export const INITIAL_GOALS: Goal[] = [];
export const INITIAL_MILESTONES: Milestone[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_HABITS: Habit[] = [];
export const INITIAL_HABIT_CHECKINS: HabitCheckin[] = [];
export const INITIAL_TIME_ENTRIES: TimeEntry[] = [];
export const INITIAL_COURSES: Course[] = [];
export const INITIAL_JOBS: JobApplication[] = [];
export const INITIAL_NOTES: Note[] = [];
export const INITIAL_REVIEWS: WeeklyReview[] = [];
export const INITIAL_REMINDERS: Reminder[] = [];
