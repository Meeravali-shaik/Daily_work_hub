import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Bell,
  Diamond,
  Flag,
  Briefcase,
  CheckCircle2,
  Circle,
  Plus,
  Download,
  Share2,
  Filter,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { useHubStore } from '../hooks/useHubStore';
import { getTodayStr } from '../services/sampleData';
import { Task, Reminder, Milestone, Goal, JobApplication, TimeEntry } from '../types/database';

type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

interface CalendarEventItem {
  id: string;
  type: 'task' | 'reminder' | 'milestone' | 'goal' | 'job' | 'time';
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  durationMin?: number;
  category?: string;
  isDone?: boolean;
  priority?: string;
  raw: any;
}

export const CalendarView: React.FC<{ onOpenQuickAdd: (defaultType?: any) => void }> = ({ onOpenQuickAdd }) => {
  const {
    tasks,
    reminders,
    milestones,
    goals,
    job_applications,
    time_entries,
    settings,
    saveRow,
    exportCalendarICS,
  } = useHubStore();

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Filter toggles
  const [showTasks, setShowTasks] = useState(true);
  const [showReminders, setShowReminders] = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);
  const [showGoals, setShowGoals] = useState(true);
  const [showJobs, setShowJobs] = useState(true);
  const [showTimeBlocks, setShowTimeBlocks] = useState(true);

  // Drag and drop state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // ICS Link copied feedback
  const [copiedLink, setCopiedLink] = useState(false);

  const todayStr = getTodayStr();

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Build aggregated events with repeating task occurrences (Section 9.1 & 9.2)
  const allEvents = useMemo(() => {
    const list: CalendarEventItem[] = [];

    // Helper to format date
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Calculate visible date range window (+/- 35 days)
    const windowStart = new Date(currentDate);
    windowStart.setDate(windowStart.getDate() - 40);
    const windowEnd = new Date(currentDate);
    windowEnd.setDate(windowEnd.getDate() + 45);

    // 1. Tasks & Repeating occurrences
    if (showTasks) {
      for (const t of tasks) {
        if (!t.due_date) continue;

        // Base occurrence
        list.push({
          id: `task-${t.id}`,
          type: 'task',
          title: t.title,
          date: t.due_date,
          time: t.due_time,
          category: t.category,
          isDone: t.done,
          priority: t.priority,
          raw: t,
        });

        // Repeating occurrences for visible window
        if (t.repeat_rule && !t.done) {
          const baseDate = new Date(t.due_date);
          const cursor = new Date(baseDate);

          // Add occurrences up to 30 repeats
          for (let i = 1; i <= 30; i++) {
            if (t.repeat_rule === 'daily') {
              cursor.setDate(cursor.getDate() + 1);
            } else if (t.repeat_rule === 'weekly') {
              cursor.setDate(cursor.getDate() + 7);
            } else if (t.repeat_rule === 'monthly') {
              cursor.setMonth(cursor.getMonth() + 1);
            }

            if (cursor > windowEnd) break;

            if (cursor >= windowStart) {
              list.push({
                id: `task-${t.id}-repeat-${i}`,
                type: 'task',
                title: `${t.title} ↻`,
                date: formatDate(cursor),
                time: t.due_time,
                category: t.category,
                isDone: false,
                priority: t.priority,
                raw: t,
              });
            }
          }
        }
      }
    }

    // 2. Reminders
    if (showReminders) {
      for (const r of reminders) {
        if (!r.remind_at) continue;
        const d = new Date(r.remind_at);
        list.push({
          id: `rem-${r.id}`,
          type: 'reminder',
          title: r.title,
          date: formatDate(d),
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          category: 'Reminder',
          isDone: r.status === 'sent',
          raw: r,
        });
      }
    }

    // 3. Milestones
    if (showMilestones) {
      for (const m of milestones) {
        if (!m.due_date) continue;
        list.push({
          id: `ms-${m.id}`,
          type: 'milestone',
          title: m.title,
          date: m.due_date,
          category: 'Milestone',
          isDone: m.done,
          raw: m,
        });
      }
    }

    // 4. Goals target dates
    if (showGoals) {
      for (const g of goals) {
        if (!g.target_date) continue;
        list.push({
          id: `goal-${g.id}`,
          type: 'goal',
          title: g.title,
          date: g.target_date,
          category: g.category || 'Career',
          isDone: g.status === 'done',
          raw: g,
        });
      }
    }

    // 5. Job applications follow-up
    if (showJobs) {
      for (const j of job_applications) {
        if (!j.follow_up_on) continue;
        list.push({
          id: `job-${j.id}`,
          type: 'job',
          title: `${j.company} (${j.role})`,
          date: j.follow_up_on,
          category: 'Career',
          raw: j,
        });
      }
    }

    // 6. Tracked Time blocks
    if (showTimeBlocks) {
      for (const te of time_entries) {
        if (!te.started_at) continue;
        const start = new Date(te.started_at);
        list.push({
          id: `time-${te.id}`,
          type: 'time',
          title: te.label || 'Tracked Session',
          date: formatDate(start),
          time: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          durationMin: te.minutes,
          category: te.category,
          raw: te,
        });
      }
    }

    return list;
  }, [
    tasks,
    reminders,
    milestones,
    goals,
    job_applications,
    time_entries,
    currentDate,
    showTasks,
    showReminders,
    showMilestones,
    showGoals,
    showJobs,
    showTimeBlocks,
  ]);

  // Handle Drag & Drop to reschedule tasks (Section 9.1 & 9.3)
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('text/plain', task.id);
    setDraggingTaskId(task.id);
  };

  const handleDropOnDate = async (targetDate: string) => {
    if (!draggingTaskId) return;
    const task = tasks.find((t) => t.id === draggingTaskId);
    if (task) {
      await saveRow('tasks', {
        ...task,
        due_date: targetDate,
      });
    }
    setDraggingTaskId(null);
  };

  // Color generator based on category & type
  const getBadgeStyle = (item: CalendarEventItem) => {
    if (item.type === 'time') {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    }
    if (item.type === 'reminder') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
    if (item.type === 'milestone') {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-medium';
    }
    if (item.type === 'goal') {
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-semibold';
    }
    if (item.type === 'job') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }

    // Tasks category colors
    switch (item.category) {
      case 'Work':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'Study':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Career':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'Personal':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      default:
        return 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700';
    }
  };

  // Calendar generation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days in month grid
  const monthDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    // Adjust for Monday start if week_starts_on === 1
    const offset = (firstDayIndex + 6) % 7; // Monday = 0
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    for (let i = offset - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      const mStr = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      cells.push({
        dateStr: `${prevDate.getFullYear()}-${mStr}-${dStr}`,
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      cells.push({
        dateStr: `${year}-${mStr}-${dStr}`,
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding to complete 35 or 42 cells
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      cells.push({
        dateStr: `${nextDate.getFullYear()}-${mStr}-${dStr}`,
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [year, month]);

  // Week days
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const day = (d.getDay() + 6) % 7; // Mon = 0
    d.setDate(d.getDate() - day);

    const days: { dateStr: string; dayName: string; dateNum: number; isToday: boolean }[] = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(d);
      cur.setDate(d.getDate() + i);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const num = cur.getDate();
      const dt = `${y}-${m}-${String(num).padStart(2, '0')}`;
      days.push({
        dateStr: dt,
        dayName: dayNames[i],
        dateNum: num,
        isToday: dt === todayStr,
      });
    }
    return days;
  }, [currentDate, todayStr]);

  // Download ICS
  const handleDownloadICS = () => {
    const content = exportCalendarICS();
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-work-hub-${todayStr}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy Calendar subscription feed link (Section 9.3)
  const handleCopyFeed = () => {
    const feedUrl = `${window.location.origin}/api/calendar-feed?token=${settings.calendar_token || 'demo-token'}`;
    navigator.clipboard.writeText(feedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-4">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs">
        {/* Navigation & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="font-display font-bold text-lg sm:text-xl text-stone-900 dark:text-stone-50">
            {currentDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </h2>
        </div>

        {/* View Mode Switcher + ICS Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
            {(['month', 'week', 'day', 'agenda'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs font-semibold capitalize rounded-lg transition-colors ${
                  viewMode === mode
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={handleDownloadICS}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
            title="Download standard .ics file for Google, Apple or Outlook Calendar"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">Export .ics</span>
          </button>

          <button
            onClick={handleCopyFeed}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
            title="Subscribe via WebCal token"
          >
            <Share2 className="w-3.5 h-3.5 text-stone-500" />
            <span>{copiedLink ? 'Link Copied!' : 'Subscribe Feed'}</span>
          </button>
        </div>
      </div>

      {/* Filter / Legend Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowTasks(!showTasks)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showTasks
                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                : 'text-stone-400 border-stone-200 dark:border-stone-800 opacity-60'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-sky-500" />
            <span>Tasks</span>
          </button>

          <button
            onClick={() => setShowReminders(!showReminders)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showReminders
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                : 'text-stone-400 border-stone-200 dark:border-stone-800 opacity-60'
            }`}
          >
            <Bell className="w-3 h-3 text-amber-500" />
            <span>Reminders</span>
          </button>

          <button
            onClick={() => setShowMilestones(!showMilestones)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showMilestones
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'text-stone-400 border-stone-200 dark:border-stone-800 opacity-60'
            }`}
          >
            <Diamond className="w-3 h-3 text-emerald-500" />
            <span>Milestones</span>
          </button>

          <button
            onClick={() => setShowGoals(!showGoals)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showGoals
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                : 'text-stone-400 border-stone-200 dark:border-stone-800 opacity-60'
            }`}
          >
            <Flag className="w-3 h-3 text-rose-500" />
            <span>Goals</span>
          </button>

          <button
            onClick={() => setShowJobs(!showJobs)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showJobs
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                : 'text-stone-400 border-stone-200 dark:border-stone-800 opacity-60'
            }`}
          >
            <Briefcase className="w-3 h-3 text-blue-500" />
            <span>Job Follow-ups</span>
          </button>

          <button
            onClick={() => setShowTimeBlocks(!showTimeBlocks)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showTimeBlocks
                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                : 'text-stone-400 border-stone-200 dark:border-stone-800 opacity-60'
            }`}
          >
            <Clock className="w-3 h-3 text-purple-500" />
            <span>Tracked Time</span>
          </button>
        </div>
      </div>

      {/* VIEW MODES */}

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
          {/* Day Headers (Mon - Sun) */}
          <div className="grid grid-cols-7 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 text-center py-2 text-xs font-semibold text-stone-500 dark:text-stone-400">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-stone-100 dark:divide-stone-800/60">
            {monthDays.map((cell) => {
              const dayEvents = allEvents.filter((ev) => ev.date === cell.dateStr);
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={cell.dateStr}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropOnDate(cell.dateStr)}
                  className={`min-h-[115px] p-1.5 transition-colors relative flex flex-col justify-between ${
                    cell.isCurrentMonth
                      ? 'bg-white dark:bg-stone-900'
                      : 'bg-stone-50/50 dark:bg-stone-950/40 text-stone-400'
                  } ${isToday ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}
                >
                  {/* Date badge & add button */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-amber-500 text-stone-950 font-bold'
                          : cell.isCurrentMonth
                          ? 'text-stone-800 dark:text-stone-200'
                          : 'text-stone-400 dark:text-stone-600'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    <button
                      onClick={() => onOpenQuickAdd('task')}
                      className="opacity-0 hover:opacity-100 group-hover:opacity-100 p-0.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                      title="Add task on this day"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Day Events list */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px] no-scrollbar">
                    {dayEvents.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        draggable={item.type === 'task'}
                        onDragStart={(e) => item.type === 'task' && handleDragStart(e, item.raw)}
                        className={`text-[11px] px-1.5 py-0.5 rounded border truncate cursor-pointer transition-all flex items-center gap-1 ${getBadgeStyle(
                          item
                        )} ${item.isDone ? 'line-through opacity-60' : ''}`}
                        title={`${item.title} (${item.type})`}
                      >
                        {item.type === 'task' && <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />}
                        {item.type === 'reminder' && <Bell className="w-2.5 h-2.5 shrink-0" />}
                        {item.type === 'milestone' && <Diamond className="w-2.5 h-2.5 shrink-0" />}
                        {item.type === 'goal' && <Flag className="w-2.5 h-2.5 shrink-0" />}
                        {item.type === 'job' && <Briefcase className="w-2.5 h-2.5 shrink-0" />}
                        {item.type === 'time' && <Clock className="w-2.5 h-2.5 shrink-0" />}

                        {item.time && <span className="font-mono text-[10px] opacity-80">{item.time}</span>}
                        <span className="truncate">{item.title}</span>
                      </div>
                    ))}

                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-stone-500 font-semibold text-center">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW (Shows tracked time as blocks & events) */}
      {viewMode === 'week' && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="grid grid-cols-7 border-b border-stone-200 dark:border-stone-800 divide-x divide-stone-100 dark:divide-stone-800 text-center">
            {weekDays.map((d) => (
              <div
                key={d.dateStr}
                className={`py-3 px-2 ${d.isToday ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}
              >
                <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">{d.dayName}</div>
                <div
                  className={`text-lg font-bold mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-full ${
                    d.isToday ? 'bg-amber-500 text-stone-950' : 'text-stone-900 dark:text-stone-100'
                  }`}
                >
                  {d.dateNum}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-stone-100 dark:divide-stone-800 min-h-[420px]">
            {weekDays.map((d) => {
              const dayEvents = allEvents.filter((ev) => ev.date === d.dateStr);

              return (
                <div
                  key={d.dateStr}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropOnDate(d.dateStr)}
                  className={`p-2 space-y-2 ${d.isToday ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}
                >
                  {dayEvents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-stone-400 text-xs py-8">
                      No events
                    </div>
                  ) : (
                    dayEvents.map((item) => (
                      <div
                        key={item.id}
                        draggable={item.type === 'task'}
                        onDragStart={(e) => item.type === 'task' && handleDragStart(e, item.raw)}
                        className={`p-2 rounded-xl border text-xs shadow-2xs transition-all ${getBadgeStyle(
                          item
                        )} ${item.isDone ? 'line-through opacity-60' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1 font-semibold">
                          <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider">
                            {item.type}
                          </span>
                          {item.time && <span className="font-mono text-[10px]">{item.time}</span>}
                        </div>
                        <p className="font-medium line-clamp-2">{item.title}</p>
                        {item.durationMin && (
                          <div className="mt-1 text-[10px] font-mono opacity-80 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{item.durationMin} mins logged</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DAY & AGENDA VIEW */}
      {(viewMode === 'day' || viewMode === 'agenda') && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
            <div>
              <h3 className="font-display font-bold text-lg text-stone-900 dark:text-stone-50">
                {currentDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h3>
              <p className="text-xs text-stone-500">
                {allEvents.filter((ev) => ev.date === todayStr).length} scheduled items
              </p>
            </div>
            <button
              onClick={() => onOpenQuickAdd('task')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-semibold hover:bg-amber-400"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {allEvents
              .filter((ev) => (viewMode === 'day' ? ev.date === todayStr : true))
              .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
              .map((item) => (
                <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${getBadgeStyle(
                        item
                      )}`}
                    >
                      {item.type === 'task' && <CheckCircle2 className="w-4 h-4" />}
                      {item.type === 'reminder' && <Bell className="w-4 h-4" />}
                      {item.type === 'milestone' && <Diamond className="w-4 h-4" />}
                      {item.type === 'goal' && <Flag className="w-4 h-4" />}
                      {item.type === 'job' && <Briefcase className="w-4 h-4" />}
                      {item.type === 'time' && <Clock className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                          {item.title}
                        </span>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                          {item.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        <span>Date: {item.date}</span>
                        {item.time && <span>• Time: {item.time}</span>}
                        {item.category && <span>• {item.category}</span>}
                        {item.durationMin && <span>• {item.durationMin} minutes</span>}
                      </div>
                    </div>
                  </div>

                  {item.type === 'task' && (
                    <button
                      onClick={async () => {
                        await saveRow('tasks', {
                          ...item.raw,
                          done: !item.raw.done,
                          done_at: !item.raw.done ? new Date().toISOString() : null,
                        });
                      }}
                      className="px-3 py-1 text-xs rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
                    >
                      {item.raw.done ? 'Mark Pending' : 'Mark Done'}
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
