import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  Flame,
  Target,
  Clock,
  FileText,
  Briefcase,
  BookOpen,
  Bell,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useHubStore } from '../hooks/useHubStore';
import { getTodayStr } from '../services/sampleData';
import { TaskPriority, RepeatRule, GoalHorizon, CourseKind, JobStatus } from '../types/database';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'task' | 'habit' | 'goal' | 'time' | 'note' | 'reminder';
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, defaultType = 'task' }) => {
  const [activeType, setActiveType] = useState<string>(defaultType);
  const { goals, milestones, tasks, saveRow, startTimer } = useHubStore();

  const today = getTodayStr();

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('Work');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('Medium');
  const [taskDueDate, setTaskDueDate] = useState(today);
  const [taskDueTime, setTaskDueTime] = useState('');
  const [taskRepeat, setTaskRepeat] = useState<RepeatRule | ''>('');
  const [taskGoalId, setTaskGoalId] = useState('');

  // Habit form state
  const [habitName, setHabitName] = useState('');

  // Goal form state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalCategory, setGoalCategory] = useState('Career');
  const [goalHorizon, setGoalHorizon] = useState<GoalHorizon>('quarter');
  const [goalTargetDate, setGoalTargetDate] = useState('');

  // Time log state
  const [timeLabel, setTimeLabel] = useState('');
  const [timeCategory, setTimeCategory] = useState('Work');
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [timeMode, setTimeMode] = useState<'log' | 'start'>('start');

  // Note state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');

  // Reminder state
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState(today);
  const [reminderTime, setReminderTime] = useState('09:00');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeType === 'task') {
      if (!taskTitle.trim()) return;
      await saveRow('tasks', {
        title: taskTitle.trim(),
        category: taskCategory,
        priority: taskPriority,
        due_date: taskDueDate || null,
        due_time: taskDueTime || null,
        repeat_rule: (taskRepeat as RepeatRule) || null,
        done: false,
        goal_id: taskGoalId || null,
      });
      setTaskTitle('');
    } else if (activeType === 'habit') {
      if (!habitName.trim()) return;
      await saveRow('habits', {
        name: habitName.trim(),
        active: true,
      });
      setHabitName('');
    } else if (activeType === 'goal') {
      if (!goalTitle.trim()) return;
      await saveRow('goals', {
        title: goalTitle.trim(),
        description: goalDesc.trim() || undefined,
        category: goalCategory,
        horizon: goalHorizon,
        target_date: goalTargetDate || null,
        status: 'active',
      });
      setGoalTitle('');
      setGoalDesc('');
    } else if (activeType === 'time') {
      if (timeMode === 'start') {
        await startTimer(timeLabel.trim() || 'Focus Session', timeCategory);
      } else {
        await saveRow('time_entries', {
          label: timeLabel.trim() || 'Manual Session',
          category: timeCategory,
          started_at: new Date(Date.now() - timeMinutes * 60000).toISOString(),
          ended_at: new Date().toISOString(),
          minutes: timeMinutes,
          source: 'manual',
        });
      }
      setTimeLabel('');
    } else if (activeType === 'note') {
      if (!noteTitle.trim() && !noteBody.trim()) return;
      await saveRow('notes', {
        title: noteTitle.trim() || 'Untitled Note',
        body: noteBody,
        version: 1,
      });
      setNoteTitle('');
      setNoteBody('');
    } else if (activeType === 'reminder') {
      if (!reminderTitle.trim()) return;
      const remindAt = new Date(`${reminderDate}T${reminderTime || '09:00'}`).toISOString();
      await saveRow('reminders', {
        title: reminderTitle.trim(),
        remind_at: remindAt,
        channels: ['push', 'in-app'],
        status: 'pending',
      });
      setReminderTitle('');
    }

    onClose();
  };

  const types = [
    { id: 'task', label: 'Task', icon: CheckSquare },
    { id: 'habit', label: 'Habit', icon: Flame },
    { id: 'goal', label: 'Goal', icon: Target },
    { id: 'time', label: 'Time / Timer', icon: Clock },
    { id: 'note', label: 'Note', icon: FileText },
    { id: 'reminder', label: 'Reminder', icon: Bell },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <h3 className="font-display font-bold text-base text-stone-900 dark:text-stone-100">
            Quick Add
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selector Tabs */}
        <div className="grid grid-cols-6 gap-1 py-3 border-b border-stone-100 dark:border-stone-800">
          {types.map((t) => {
            const Icon = t.icon;
            const isSelected = activeType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveType(t.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs transition-colors ${
                  isSelected
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/30'
                    : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-[10px] truncate max-w-full">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="pt-4 space-y-3">
          {/* TASK FORM */}
          {activeType === 'task' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Prepare 3 practice exams for AWS certification"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Category
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Work">Work</option>
                    <option value="Career">Career</option>
                    <option value="Study">Study</option>
                    <option value="Personal">Personal</option>
                    <option value="Health">Health</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Due Time
                  </label>
                  <input
                    type="time"
                    value={taskDueTime}
                    onChange={(e) => setTaskDueTime(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Repeat
                  </label>
                  <select
                    value={taskRepeat}
                    onChange={(e) => setTaskRepeat(e.target.value as any)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    <option value="">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {goals.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Link to Long-Term Goal (Optional)
                  </label>
                  <select
                    value={taskGoalId}
                    onChange={(e) => setTaskGoalId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    <option value="">-- No linked goal --</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({g.horizon})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* HABIT FORM */}
          {activeType === 'habit' && (
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                Habit Name *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Read 20 mins of technical book, 90m deep work"
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 dark:text-stone-100"
              />
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5">
                Habits appear on your daily grid and streak tracker.
              </p>
            </div>
          )}

          {/* GOAL FORM */}
          {activeType === 'goal' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Get my first IT job, Earn AWS Certification"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Horizon
                  </label>
                  <select
                    value={goalHorizon}
                    onChange={(e) => setGoalHorizon(e.target.value as GoalHorizon)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    <option value="quarter">Quarterly</option>
                    <option value="year">1 Year</option>
                    <option value="multi-year">Multi-Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={goalTargetDate}
                    onChange={(e) => setGoalTargetDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Description / Motivation
                </label>
                <textarea
                  rows={2}
                  placeholder="Why this goal matters and what success looks like..."
                  value={goalDesc}
                  onChange={(e) => setGoalDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-none"
                />
              </div>
            </>
          )}

          {/* TIME FORM */}
          {activeType === 'time' && (
            <>
              <div className="flex gap-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTimeMode('start')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    timeMode === 'start'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Start Live Timer
                </button>
                <button
                  type="button"
                  onClick={() => setTimeMode('log')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    timeMode === 'log'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Log Past Time
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Session Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. AWS VPC Lab, LeetCode Dynamic Programming"
                  value={timeLabel}
                  onChange={(e) => setTimeLabel(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Category
                  </label>
                  <select
                    value={timeCategory}
                    onChange={(e) => setTimeCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    <option value="Work">Work</option>
                    <option value="Study">Study</option>
                    <option value="Career">Career</option>
                    <option value="Tech">Tech</option>
                  </select>
                </div>
                {timeMode === 'log' && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={timeMinutes}
                      onChange={(e) => setTimeMinutes(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* NOTE FORM */}
          {activeType === 'note' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Note Title..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Content (Markdown supported)
                </label>
                <textarea
                  rows={4}
                  placeholder="Quick thoughts, interview notes, commands, or checklist..."
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>
            </>
          )}

          {/* REMINDER FORM */}
          {activeType === 'reminder' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Reminder Text *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow up on interview, submit weekly review"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>
            </>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-xs transition-colors"
            >
              {activeType === 'time' && timeMode === 'start' ? 'Start Timer' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
