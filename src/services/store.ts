import { idb } from './idb';
import {
  Goal,
  Milestone,
  Task,
  Habit,
  HabitCheckin,
  TimeEntry,
  RunningTimer,
  Course,
  JobApplication,
  Note,
  WeeklyReview,
  Reminder,
  UserSettings,
  TableName,
  OutboxJob,
  HubExportData,
} from '../types/database';
import {
  DEFAULT_USER_ID,
  INITIAL_SETTINGS,
  INITIAL_GOALS,
  INITIAL_MILESTONES,
  INITIAL_TASKS,
  INITIAL_HABITS,
  INITIAL_HABIT_CHECKINS,
  INITIAL_TIME_ENTRIES,
  INITIAL_COURSES,
  INITIAL_JOBS,
  INITIAL_NOTES,
  INITIAL_REVIEWS,
  INITIAL_REMINDERS,
} from './sampleData';
import { getSupabaseClient, SYNC_TABLES } from './supabase';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'local_only';

type Listener = () => void;

class Store {
  // In-memory active cache
  goals: Goal[] = [];
  milestones: Milestone[] = [];
  tasks: Task[] = [];
  habits: Habit[] = [];
  habit_checkins: HabitCheckin[] = [];
  time_entries: TimeEntry[] = [];
  running_timer: RunningTimer | null = null;
  courses: Course[] = [];
  job_applications: JobApplication[] = [];
  notes: Note[] = [];
  weekly_reviews: WeeklyReview[] = [];
  reminders: Reminder[] = [];
  settings: UserSettings = INITIAL_SETTINGS;

  outboxCount: number = 0;
  syncStatus: SyncStatus = 'local_only';
  lastSyncTime: string | null = null;
  errorMessage: string | null = null;

  private listeners: Set<Listener> = new Set();
  private initialized = false;
  private realtimeChannel: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateOnlineStatus();
        this.flushOutbox();
      });
      window.addEventListener('offline', () => {
        this.updateOnlineStatus();
      });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && navigator.onLine) {
          this.pullAll();
        }
      });
      // Cross-tab sync for running timer
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('dwh_running_timer_')) {
          this.loadRunningTimer();
        }
      });
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Store listener error:', err);
      }
    }
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure previous dummy data is cleaned up
      const isClean = await idb.getMeta('db_clean_slate_v2');
      if (!isClean) {
        for (const tbl of SYNC_TABLES) {
          if (tbl !== 'user_settings') {
            await idb.clearStore(tbl);
          }
        }
        await idb.clearStore('outbox');
        await this.seedInitialData();
        await idb.setMeta('db_clean_slate_v2', true);
      } else {
        await this.loadAllFromIDB();
      }

      this.updateOnlineStatus();
      await this.refreshOutboxCount();

      // Check if Supabase client can be established
      const client = getSupabaseClient();
      if (client) {
        this.syncStatus = navigator.onLine ? 'synced' : 'offline';
        this.setupRealtime(client);
        if (navigator.onLine) {
          this.pullAll();
          this.flushOutbox();
        }
      } else {
        this.syncStatus = 'local_only';
      }

      this.initialized = true;
      this.notify();
    } catch (err) {
      console.error('Store init error:', err);
      this.syncStatus = 'error';
      this.errorMessage = (err as any)?.message || 'Failed to initialize database';
      this.notify();
    }
  }

  private updateOnlineStatus() {
    if (!navigator.onLine) {
      this.syncStatus = 'offline';
    } else {
      const client = getSupabaseClient();
      this.syncStatus = client ? 'synced' : 'local_only';
    }
    this.notify();
  }

  private async seedInitialData() {
    this.settings = INITIAL_SETTINGS;
    this.goals = [...INITIAL_GOALS];
    this.milestones = [...INITIAL_MILESTONES];
    this.tasks = [...INITIAL_TASKS];
    this.habits = [...INITIAL_HABITS];
    this.habit_checkins = [...INITIAL_HABIT_CHECKINS];
    this.time_entries = [...INITIAL_TIME_ENTRIES];
    this.courses = [...INITIAL_COURSES];
    this.job_applications = [...INITIAL_JOBS];
    this.notes = [...INITIAL_NOTES];
    this.weekly_reviews = [...INITIAL_REVIEWS];
    this.reminders = [...INITIAL_REMINDERS];
    this.running_timer = {
      id: 'timer-singleton',
      user_id: DEFAULT_USER_ID,
      label: '',
      category: 'Work',
      started_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to storage
    await idb.put('user_settings', this.settings);
    for (const g of this.goals) await idb.put('goals', g);
    for (const m of this.milestones) await idb.put('milestones', m);
    for (const t of this.tasks) await idb.put('tasks', t);
    for (const h of this.habits) await idb.put('habits', h);
    for (const hc of this.habit_checkins) await idb.put('habit_checkins', hc);
    for (const te of this.time_entries) await idb.put('time_entries', te);
    for (const c of this.courses) await idb.put('courses', c);
    for (const j of this.job_applications) await idb.put('job_applications', j);
    for (const n of this.notes) await idb.put('notes', n);
    for (const r of this.weekly_reviews) await idb.put('weekly_reviews', r);
    for (const rem of this.reminders) await idb.put('reminders', rem);
    if (this.running_timer) await idb.put('running_timer', this.running_timer);

    await idb.setMeta('db_seeded_v1', true);
  }

  private async loadAllFromIDB() {
    const [
      settingsRows,
      goalsRows,
      milestonesRows,
      tasksRows,
      habitsRows,
      checkinsRows,
      timeRows,
      coursesRows,
      jobsRows,
      notesRows,
      reviewsRows,
      remindersRows,
      timerRows,
    ] = await Promise.all([
      idb.getAll<UserSettings>('user_settings'),
      idb.getAll<Goal>('goals'),
      idb.getAll<Milestone>('milestones'),
      idb.getAll<Task>('tasks'),
      idb.getAll<Habit>('habits'),
      idb.getAll<HabitCheckin>('habit_checkins'),
      idb.getAll<TimeEntry>('time_entries'),
      idb.getAll<Course>('courses'),
      idb.getAll<JobApplication>('job_applications'),
      idb.getAll<Note>('notes'),
      idb.getAll<WeeklyReview>('weekly_reviews'),
      idb.getAll<Reminder>('reminders'),
      idb.getAll<RunningTimer>('running_timer'),
    ]);

    this.settings = settingsRows[0] || INITIAL_SETTINGS;
    this.goals = goalsRows.filter((r) => !r.deleted_at);
    this.milestones = milestonesRows.filter((r) => !r.deleted_at);
    this.tasks = tasksRows.filter((r) => !r.deleted_at);
    this.habits = habitsRows.filter((r) => !r.deleted_at);
    this.habit_checkins = checkinsRows.filter((r) => !r.deleted_at);
    this.time_entries = timeRows.filter((r) => !r.deleted_at);
    this.courses = coursesRows.filter((r) => !r.deleted_at);
    this.job_applications = jobsRows.filter((r) => !r.deleted_at);
    this.notes = notesRows.filter((r) => !r.deleted_at);
    this.weekly_reviews = reviewsRows.filter((r) => !r.deleted_at);
    this.reminders = remindersRows.filter((r) => !r.deleted_at);
    this.running_timer = timerRows[0] || null;
  }

  private async loadRunningTimer() {
    const timers = await idb.getAll<RunningTimer>('running_timer');
    this.running_timer = timers[0] || null;
    this.notify();
  }

  // --- Realtime & Sync ---
  setupRealtime(client: any) {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }

    try {
      this.realtimeChannel = client
        .channel('sync-all')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload: any) => {
            this.handleRemoteChange(payload.table as TableName, payload.new || payload.old);
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            this.syncStatus = 'synced';
            this.notify();
          }
        });
    } catch (err) {
      console.warn('Realtime subscription could not be established:', err);
    }
  }

  private async handleRemoteChange(table: TableName, row: any) {
    if (!row || !row.id) return;

    // Special conflict handling for notes
    if (table === 'notes' && !row.deleted_at) {
      const localNote = this.notes.find((n) => n.id === row.id);
      if (localNote && localNote.version !== row.version && localNote.body !== row.body) {
        // Save local content as conflict copy
        const conflictCopy: Note = {
          id: crypto.randomUUID(),
          user_id: this.settings.user_id || DEFAULT_USER_ID,
          title: `${localNote.title || 'Untitled'} (Conflict Copy)`,
          body: localNote.body,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        };
        await this.saveRow('notes', conflictCopy);
      }
    }

    // Save remote row into local IDB
    await idb.put(table, row);

    // Refresh memory
    await this.loadAllFromIDB();
    this.notify();
  }

  async pullAll(): Promise<void> {
    const client = getSupabaseClient();
    if (!client || !navigator.onLine) return;

    try {
      this.syncStatus = 'syncing';
      this.notify();

      for (const table of SYNC_TABLES) {
        const since = (await idb.getMeta(`sync:${table}`)) ?? '1970-01-01T00:00:00Z';
        const { data, error } = await client
          .from(table)
          .select('*')
          .gt('updated_at', since)
          .order('updated_at', { ascending: true })
          .limit(500);

        if (error) {
          console.warn(`Pull table ${table} warning:`, error.message);
          continue;
        }

        if (data && data.length > 0) {
          for (const row of data) {
            await idb.put(table, row);
          }
          await idb.setMeta(`sync:${table}`, data[data.length - 1].updated_at);
        }
      }

      this.lastSyncTime = new Date().toLocaleTimeString();
      this.syncStatus = 'synced';
      await this.loadAllFromIDB();
    } catch (err: any) {
      console.error('Pull all error:', err);
      this.syncStatus = 'error';
      this.errorMessage = err.message;
    } finally {
      this.notify();
    }
  }

  async flushOutbox(): Promise<void> {
    const client = getSupabaseClient();
    if (!client || !navigator.onLine) return;

    const jobs = await idb.getAll<OutboxJob>('outbox');
    if (jobs.length === 0) {
      this.outboxCount = 0;
      this.notify();
      return;
    }

    this.syncStatus = 'syncing';
    this.notify();

    for (const job of jobs) {
      try {
        const { error } = await client.from(job.table).upsert(job.row);
        if (error) {
          console.warn(`Outbox upload failed for table ${job.table}:`, error.message);
          // If error is network or auth, stop flushing to retry later
          this.syncStatus = 'error';
          this.errorMessage = error.message;
          this.notify();
          return;
        }
        await idb.delete('outbox', job.key);
      } catch (err: any) {
        console.warn('Outbox flush job error:', err);
        return;
      }
    }

    await this.refreshOutboxCount();
    this.lastSyncTime = new Date().toLocaleTimeString();
    this.syncStatus = 'synced';
    this.notify();
  }

  private async refreshOutboxCount() {
    const jobs = await idb.getAll<OutboxJob>('outbox');
    this.outboxCount = jobs.length;
  }

  // --- Universal Optimistic Write Pattern (Section 8.2) ---
  async saveRow(
    table: TableName,
    row: Record<string, any>
  ): Promise<string> {
    const record: any = { ...row };
    if (!record.id) {
      record.id = crypto.randomUUID ? crypto.randomUUID() : `uuid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
    record.updated_at = new Date().toISOString();
    record.user_id = record.user_id || this.settings.user_id || DEFAULT_USER_ID;

    // 1. Optimistic write to local memory
    this.applyInMemory(table, record);
    this.notify();

    // 2. Write to local IndexedDB/localStorage
    await idb.put(table, record);

    // 3. Queue into outbox
    const jobKey = `job-${record.id}-${Date.now()}`;
    await idb.put('outbox', {
      id: jobKey,
      key: jobKey,
      table,
      row: record,
      timestamp: Date.now(),
    });
    await this.refreshOutboxCount();

    // 4. Try upload if online
    this.flushOutbox();

    return record.id;
  }

  async softDelete(table: TableName, id: string): Promise<void> {
    const existing = await idb.get(table, id);
    if (!existing) return;

    existing.deleted_at = new Date().toISOString();
    existing.updated_at = new Date().toISOString();

    await this.saveRow(table, existing);
  }

  private applyInMemory(table: TableName, row: any) {
    if (row.deleted_at) {
      // Remove from active array
      switch (table) {
        case 'goals':
          this.goals = this.goals.filter((g) => g.id !== row.id);
          break;
        case 'milestones':
          this.milestones = this.milestones.filter((m) => m.id !== row.id);
          break;
        case 'tasks':
          this.tasks = this.tasks.filter((t) => t.id !== row.id);
          break;
        case 'habits':
          this.habits = this.habits.filter((h) => h.id !== row.id);
          break;
        case 'habit_checkins':
          this.habit_checkins = this.habit_checkins.filter((c) => c.id !== row.id);
          break;
        case 'time_entries':
          this.time_entries = this.time_entries.filter((te) => te.id !== row.id);
          break;
        case 'courses':
          this.courses = this.courses.filter((c) => c.id !== row.id);
          break;
        case 'job_applications':
          this.job_applications = this.job_applications.filter((j) => j.id !== row.id);
          break;
        case 'notes':
          this.notes = this.notes.filter((n) => n.id !== row.id);
          break;
        case 'weekly_reviews':
          this.weekly_reviews = this.weekly_reviews.filter((r) => r.id !== row.id);
          break;
        case 'reminders':
          this.reminders = this.reminders.filter((rem) => rem.id !== row.id);
          break;
      }
      return;
    }

    // Upsert in memory
    const upsertList = (list: any[]) => {
      const idx = list.findIndex((x) => x.id === row.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...row };
      } else {
        list.unshift(row);
      }
    };

    switch (table) {
      case 'goals':
        upsertList(this.goals);
        break;
      case 'milestones':
        upsertList(this.milestones);
        break;
      case 'tasks':
        upsertList(this.tasks);
        break;
      case 'habits':
        upsertList(this.habits);
        break;
      case 'habit_checkins':
        upsertList(this.habit_checkins);
        break;
      case 'time_entries':
        upsertList(this.time_entries);
        break;
      case 'courses':
        upsertList(this.courses);
        break;
      case 'job_applications':
        upsertList(this.job_applications);
        break;
      case 'notes':
        upsertList(this.notes);
        break;
      case 'weekly_reviews':
        upsertList(this.weekly_reviews);
        break;
      case 'reminders':
        upsertList(this.reminders);
        break;
      case 'running_timer':
        this.running_timer = row;
        break;
      case 'user_settings':
        this.settings = row;
        break;
    }
  }

  // --- Running Timer Support (Section 8.2 & 6) ---
  async startTimer(
    label: string,
    category: string = 'Work',
    taskId?: string | null,
    mode: 'normal' | 'pomodoro' = 'normal',
    pomodoroType: 'work' | 'break' = 'work',
    pomodoroDurationMin: number = 25
  ): Promise<void> {
    const timer: RunningTimer = {
      id: 'timer-singleton',
      user_id: this.settings.user_id || DEFAULT_USER_ID,
      label,
      category,
      started_at: new Date().toISOString(),
      task_id: taskId || null,
      mode,
      pomodoro_type: pomodoroType,
      pomodoro_duration_min: pomodoroDurationMin,
      created_at: this.running_timer?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    await this.saveRow('running_timer', timer);
  }

  async stopTimer(): Promise<TimeEntry | null> {
    if (!this.running_timer || !this.running_timer.started_at) {
      return null;
    }

    const start = new Date(this.running_timer.started_at).getTime();
    const end = Date.now();
    const minutes = Math.max(1, Math.round((end - start) / 60000));

    const entry: TimeEntry = {
      id: crypto.randomUUID(),
      user_id: this.settings.user_id || DEFAULT_USER_ID,
      label: this.running_timer.label || 'Focus Session',
      category: this.running_timer.category || 'Work',
      started_at: this.running_timer.started_at,
      ended_at: new Date(end).toISOString(),
      minutes,
      source: this.running_timer.mode === 'pomodoro' ? 'pomodoro' : 'timer',
      task_id: this.running_timer.task_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    // Save the created time entry
    await this.saveRow('time_entries', entry);

    // Clear running timer
    const resetTimer: RunningTimer = {
      ...this.running_timer,
      started_at: null,
      label: '',
      updated_at: new Date().toISOString(),
    };
    await this.saveRow('running_timer', resetTimer);

    return entry;
  }

  // --- Habit Checkin Toggle ---
  async toggleHabitCheckin(habitId: string, day: string): Promise<boolean> {
    const existing = this.habit_checkins.find(
      (c) => c.habit_id === habitId && c.day === day && !c.deleted_at
    );

    if (existing) {
      await this.softDelete('habit_checkins', existing.id);
      return false;
    } else {
      const checkin: HabitCheckin = {
        id: crypto.randomUUID(),
        user_id: this.settings.user_id || DEFAULT_USER_ID,
        habit_id: habitId,
        day,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      await this.saveRow('habit_checkins', checkin);
      return true;
    }
  }

  // --- Goal Progress Helper (Section 11.1) ---
  getGoalProgress(goalId: string): { percent: number; milestoneCount: number; completedCount: number; isAtRisk: boolean; hoursInvested: number } {
    const goal = this.goals.find((g) => g.id === goalId);
    const milestones = this.milestones.filter((m) => m.goal_id === goalId && !m.deleted_at);
    const linkedTasks = this.tasks.filter((t) => t.goal_id === goalId && !t.deleted_at);

    let percent = 0;
    let milestoneCount = milestones.length;
    let completedCount = 0;

    if (milestoneCount > 0) {
      completedCount = milestones.filter((m) => m.done).length;
      percent = Math.round((completedCount / milestoneCount) * 100);
    } else if (linkedTasks.length > 0) {
      completedCount = linkedTasks.filter((t) => t.done).length;
      milestoneCount = linkedTasks.length;
      percent = Math.round((completedCount / linkedTasks.length) * 100);
    } else {
      percent = goal?.status === 'done' ? 100 : 0;
    }

    // Calculate hours invested from linked tasks' time entries
    const linkedTaskIds = new Set(linkedTasks.map((t) => t.id));
    const totalMinutes = this.time_entries
      .filter((te) => te.task_id && linkedTaskIds.has(te.task_id))
      .reduce((sum, te) => sum + te.minutes, 0);
    const hoursInvested = Math.round((totalMinutes / 60) * 10) / 10;

    // At risk flag: target date within 14 days and progress < 50%
    let isAtRisk = false;
    if (goal?.target_date && goal.status === 'active') {
      const targetTime = new Date(goal.target_date).getTime();
      const daysRemaining = (targetTime - Date.now()) / (1000 * 3600 * 24);
      if (daysRemaining <= 14 && daysRemaining >= -30 && percent < 50) {
        isAtRisk = true;
      }
    }

    return { percent, milestoneCount, completedCount, isAtRisk, hoursInvested };
  }

  // --- Export and Import (Section 12) ---
  exportFullJSON(): string {
    const payload: HubExportData = {
      app: 'daily-work-hub',
      schema_version: 1,
      exported_at: new Date().toISOString(),
      timezone: this.settings.timezone || 'Asia/Kolkata',
      tables: {
        goals: this.goals,
        milestones: this.milestones,
        tasks: this.tasks,
        habits: this.habits,
        habit_checkins: this.habit_checkins,
        time_entries: this.time_entries,
        running_timer: this.running_timer ? [this.running_timer] : [],
        courses: this.courses,
        job_applications: this.job_applications,
        notes: this.notes,
        weekly_reviews: this.weekly_reviews,
        reminders: this.reminders,
        user_settings: [this.settings],
      },
    };
    return JSON.stringify(payload, null, 2);
  }

  exportTableCSV(table: TableName): string {
    let rows: any[] = [];
    switch (table) {
      case 'tasks':
        rows = this.tasks.map((t) => ({
          title: t.title,
          category: t.category,
          priority: t.priority,
          due_date: t.due_date || '',
          due_time: t.due_time || '',
          done: t.done,
          done_at: t.done_at || '',
          repeat_rule: t.repeat_rule || '',
        }));
        break;
      case 'time_entries':
        rows = this.time_entries.map((te) => ({
          label: te.label || '',
          category: te.category,
          started_at: te.started_at,
          ended_at: te.ended_at || '',
          minutes: te.minutes,
          source: te.source,
        }));
        break;
      case 'goals':
        rows = this.goals.map((g) => ({
          title: g.title,
          category: g.category,
          horizon: g.horizon,
          target_date: g.target_date || '',
          status: g.status,
          description: g.description || '',
        }));
        break;
      case 'job_applications':
        rows = this.job_applications.map((j) => ({
          company: j.company,
          role: j.role,
          status: j.status,
          applied_on: j.applied_on,
          follow_up_on: j.follow_up_on || '',
          salary_range: j.salary_range || '',
          location: j.location || '',
          notes: j.notes || '',
        }));
        break;
      case 'courses':
        rows = this.courses.map((c) => ({
          name: c.name,
          platform: c.platform || '',
          kind: c.kind,
          progress: c.progress,
          target_date: c.target_date || '',
          notes: c.notes || '',
        }));
        break;
      default:
        rows = [];
    }

    if (rows.length === 0) return 'No data available';
    const headers = Object.keys(rows[0]);
    const escapeCsv = (val: any) => {
      const s = String(val ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const lines = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(',')),
    ];
    return lines.join('\n');
  }

  exportCalendarICS(): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Daily Work Hub//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Daily Work Hub Schedule',
    ];

    const formatIcsDate = (dateStr: string, timeStr?: string) => {
      const cleanDate = dateStr.replace(/-/g, '');
      if (!timeStr) {
        return `VALUE=DATE:${cleanDate}`;
      }
      const cleanTime = timeStr.replace(/:/g, '') + '00';
      return `${cleanDate}T${cleanTime}`;
    };

    // 1. Tasks
    for (const t of this.tasks) {
      if (!t.due_date) continue;
      lines.push(
        'BEGIN:VEVENT',
        `UID:task-${t.id}@dailyworkhub.app`,
        `SUMMARY:${t.done ? '[DONE] ' : ''}${t.title.replace(/\n/g, ' ')}`,
        `DESCRIPTION:Category: ${t.category} | Priority: ${t.priority}`,
        `DTSTART;${formatIcsDate(t.due_date, t.due_time)}`,
        `STATUS:${t.done ? 'COMPLETED' : 'CONFIRMED'}`,
        'END:VEVENT'
      );
    }

    // 2. Milestones
    for (const m of this.milestones) {
      if (!m.due_date) continue;
      lines.push(
        'BEGIN:VEVENT',
        `UID:ms-${m.id}@dailyworkhub.app`,
        `SUMMARY:Milestone: ${m.title.replace(/\n/g, ' ')}`,
        `DTSTART;${formatIcsDate(m.due_date)}`,
        'CATEGORIES:Milestone',
        'END:VEVENT'
      );
    }

    // 3. Goal target dates
    for (const g of this.goals) {
      if (!g.target_date) continue;
      lines.push(
        'BEGIN:VEVENT',
        `UID:goal-${g.id}@dailyworkhub.app`,
        `SUMMARY:Goal Target: ${g.title.replace(/\n/g, ' ')}`,
        `DESCRIPTION:${(g.description || '').replace(/\n/g, ' ')}`,
        `DTSTART;${formatIcsDate(g.target_date)}`,
        'CATEGORIES:Goal',
        'END:VEVENT'
      );
    }

    // 4. Job follow-ups
    for (const j of this.job_applications) {
      if (!j.follow_up_on) continue;
      lines.push(
        'BEGIN:VEVENT',
        `UID:job-${j.id}@dailyworkhub.app`,
        `SUMMARY:Job Follow-up: ${j.company} (${j.role})`,
        `DESCRIPTION:Status: ${j.status} | Notes: ${(j.notes || '').replace(/\n/g, ' ')}`,
        `DTSTART;${formatIcsDate(j.follow_up_on)}`,
        'CATEGORIES:Career',
        'END:VEVENT'
      );
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  async importFullJSON(jsonString: string): Promise<{ success: boolean; counts: Record<string, number>; message: string }> {
    try {
      const data: HubExportData = JSON.parse(jsonString);

      if (data.app !== 'daily-work-hub') {
        return {
          success: false,
          counts: {},
          message: 'Invalid file format: Not a Daily Work Hub backup file.',
        };
      }

      if (data.schema_version > 1) {
        return {
          success: false,
          counts: {},
          message: `Unsupported backup schema version: ${data.schema_version}. The current app supports version 1.`,
        };
      }

      const counts: Record<string, number> = {};
      const currentUserId = this.settings.user_id || DEFAULT_USER_ID;

      // Upsert tables
      const tableMap = data.tables;
      for (const [tbl, rows] of Object.entries(tableMap)) {
        if (!Array.isArray(rows)) continue;
        counts[tbl] = rows.length;

        for (const item of rows) {
          const row = { ...item, user_id: currentUserId };
          await this.saveRow(tbl as TableName, row);
        }
      }

      await this.loadAllFromIDB();
      this.notify();

      return {
        success: true,
        counts,
        message: 'Import completed successfully with no duplicates.',
      };
    } catch (err: any) {
      return {
        success: false,
        counts: {},
        message: err.message || 'Failed to parse JSON file.',
      };
    }
  }

  // --- Wipe Data (Typed Confirmation: DELETE MY DATA) ---
  async wipeAllData(): Promise<void> {
    for (const table of SYNC_TABLES) {
      await idb.clearStore(table);
    }
    await idb.clearStore('outbox');
    await idb.setMeta('db_seeded_v1', false);

    this.goals = [];
    this.milestones = [];
    this.tasks = [];
    this.habits = [];
    this.habit_checkins = [];
    this.time_entries = [];
    this.courses = [];
    this.job_applications = [];
    this.notes = [];
    this.weekly_reviews = [];
    this.reminders = [];
    this.running_timer = null;
    this.outboxCount = 0;

    this.notify();
  }

  // --- LocalStorage v1 Detection & Migration (Section 13) ---
  checkLegacyLocalStorage(): any | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('dailyhub.v1');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async migrateFromLegacy(legacyData: any): Promise<number> {
    let importedCount = 0;
    const currentUserId = this.settings.user_id || DEFAULT_USER_ID;

    // 1. Tasks
    if (Array.isArray(legacyData.tasks)) {
      for (const t of legacyData.tasks) {
        const newTask: Task = {
          id: crypto.randomUUID(),
          user_id: currentUserId,
          title: t.title || t.text || 'Imported Task',
          category: t.category || 'Work',
          priority: t.priority || 'Medium',
          due_date: t.dueDate || t.due_date || undefined,
          due_time: t.dueTime || undefined,
          repeat_rule: t.repeat || undefined,
          done: !!t.done,
          done_at: t.done ? new Date().toISOString() : undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        };
        await this.saveRow('tasks', newTask);
        importedCount++;
      }
    }

    // 2. Habits & checkins
    if (Array.isArray(legacyData.habits)) {
      for (const h of legacyData.habits) {
        const habitId = crypto.randomUUID();
        const newHabit: Habit = {
          id: habitId,
          user_id: currentUserId,
          name: h.name || h.title || 'Imported Habit',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        };
        await this.saveRow('habits', newHabit);
        importedCount++;

        // Convert days list to habit_checkins
        if (Array.isArray(h.days || h.checkins)) {
          for (const d of h.days || h.checkins) {
            await this.saveRow('habit_checkins', {
              id: crypto.randomUUID(),
              user_id: currentUserId,
              habit_id: habitId,
              day: typeof d === 'string' ? d : d.day,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              deleted_at: null,
            });
            importedCount++;
          }
        }
      }
    }

    // 3. Time logs
    if (Array.isArray(legacyData.timeEntries || legacyData.logs)) {
      for (const te of legacyData.timeEntries || legacyData.logs) {
        await this.saveRow('time_entries', {
          id: crypto.randomUUID(),
          user_id: currentUserId,
          label: te.label || te.description || 'Logged Time',
          category: te.category || 'Work',
          started_at: te.started_at || new Date().toISOString(),
          ended_at: te.ended_at || null,
          minutes: Number(te.minutes || te.duration || 30),
          source: 'manual',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        });
        importedCount++;
      }
    }

    // Rename key to preserve for 30 days
    try {
      localStorage.setItem('dailyhub.v1.migrated', JSON.stringify(legacyData));
      localStorage.removeItem('dailyhub.v1');
    } catch {
      // ignore
    }

    await this.loadAllFromIDB();
    this.notify();
    return importedCount;
  }
}

export const store = new Store();
