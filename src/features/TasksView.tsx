import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Play,
  Trash2,
  Edit3,
  Repeat,
  AlertCircle,
  Tag,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useHubStore } from '../hooks/useHubStore';
import { getTodayStr } from '../services/sampleData';
import { Task, TaskPriority, RepeatRule } from '../types/database';
import { playChime } from '../services/notifications';

interface TasksViewProps {
  onOpenQuickAdd: (defaultType?: any) => void;
  onStartFocus: (taskTitle: string, taskId?: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onOpenQuickAdd, onStartFocus }) => {
  const { tasks, goals, milestones, saveRow, softDelete } = useHubStore();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'today' | 'pending' | 'completed' | 'overdue'>('all');
  const [filterGoalId, setFilterGoalId] = useState<string>('all');

  const today = getTodayStr();

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterCategory !== 'all' && t.category !== filterCategory) return false;
        if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
        if (filterGoalId !== 'all' && t.goal_id !== filterGoalId) return false;

        if (filterStatus === 'pending') return !t.done;
        if (filterStatus === 'completed') return t.done;
        if (filterStatus === 'today') return t.due_date === today;
        if (filterStatus === 'overdue') return t.due_date && t.due_date < today && !t.done;

        return true;
      })
      .sort((a, b) => {
        // Pending first, high priority first, then due date
        if (a.done !== b.done) return a.done ? 1 : -1;
        const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return (a.due_date || '').localeCompare(b.due_date || '');
      });
  }, [tasks, search, filterCategory, filterPriority, filterStatus, filterGoalId, today]);

  const handleToggleDone = async (task: Task) => {
    const isNowDone = !task.done;
    if (isNowDone) {
      playChime();
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {
        // Ignore if blocked
      }
    }

    await saveRow('tasks', {
      ...task,
      done: isNowDone,
      done_at: isNowDone ? new Date().toISOString() : null,
    });
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'High':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'Low':
        return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700';
    }
  };

  const completedCount = tasks.filter((t) => t.done).length;
  const pendingCount = tasks.filter((t) => !t.done).length;
  const overdueCount = tasks.filter((t) => t.due_date && t.due_date < today && !t.done).length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-4">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-stone-900 dark:text-stone-50">
            Tasks & Action Items
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Organized by priority, repetition rules, and linked long-term goals.
          </p>
        </div>

        {/* Stats Pill Counters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs">
            <span className="text-stone-500 dark:text-stone-400">Pending: </span>
            <strong className="text-amber-700 dark:text-amber-300 font-bold">{pendingCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs">
            <span className="text-stone-500 dark:text-stone-400">Completed: </span>
            <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{completedCount}</strong>
          </div>
          {overdueCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs">
              <span className="text-stone-500 dark:text-stone-400">Overdue: </span>
              <strong className="text-rose-700 dark:text-rose-300 font-bold">{overdueCount}</strong>
            </div>
          )}

          <button
            onClick={() => onOpenQuickAdd('task')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-xs transition-colors ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Quick status tabs */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl overflow-x-auto">
            {(['all', 'today', 'pending', 'completed', 'overdue'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 text-xs font-semibold capitalize rounded-lg transition-colors whitespace-nowrap ${
                  filterStatus === st
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <div className="flex items-center gap-1 text-stone-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200"
          >
            <option value="all">All Categories</option>
            <option value="Work">Work</option>
            <option value="Career">Career</option>
            <option value="Study">Study</option>
            <option value="Personal">Personal</option>
          </select>

          <span className="text-stone-300 dark:text-stone-700">•</span>

          <span className="text-stone-500">Priority:</span>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200"
          >
            <option value="all">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {goals.length > 0 && (
            <>
              <span className="text-stone-300 dark:text-stone-700">•</span>
              <span className="text-stone-500">Linked Goal:</span>
              <select
                value={filterGoalId}
                onChange={(e) => setFilterGoalId(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 max-w-[200px] truncate"
              >
                <option value="all">All Goals</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-stone-100 dark:divide-stone-800">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">No tasks match your filters</h3>
            <p className="text-xs text-stone-500 mt-1">Add a new task or adjust your search filters.</p>
            <button
              onClick={() => onOpenQuickAdd('task')}
              className="mt-4 px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-semibold text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = task.due_date && task.due_date < today && !task.done;
            const linkedGoal = goals.find((g) => g.id === task.goal_id);

            return (
              <div
                key={task.id}
                className={`p-3.5 sm:px-5 flex items-start sm:items-center justify-between gap-3 transition-colors hover:bg-stone-50/70 dark:hover:bg-stone-800/40 ${
                  task.done ? 'bg-stone-50/40 dark:bg-stone-950/20' : ''
                }`}
              >
                {/* Left checkmark & title */}
                <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleDone(task)}
                    className="mt-0.5 sm:mt-0 p-1 text-stone-400 hover:text-amber-500 dark:text-stone-500 dark:hover:text-amber-400 transition-colors shrink-0"
                    title={task.done ? 'Mark pending' : 'Mark done'}
                  >
                    {task.done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-medium text-stone-900 dark:text-stone-100 ${
                          task.done ? 'line-through text-stone-400 dark:text-stone-500' : ''
                        }`}
                      >
                        {task.title}
                      </span>

                      {/* Priority pill */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>

                      {/* Repeat badge */}
                      {task.repeat_rule && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                          <Repeat className="w-2.5 h-2.5" />
                          <span className="capitalize">{task.repeat_rule}</span>
                        </span>
                      )}
                    </div>

                    {/* Metadata line */}
                    <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 mt-1 flex-wrap">
                      <span className="font-medium text-stone-600 dark:text-stone-300">
                        {task.category}
                      </span>

                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}`}>
                          <Calendar className="w-3 h-3" />
                          <span>
                            {task.due_date === today ? 'Today' : task.due_date}
                            {task.due_time && ` at ${task.due_time}`}
                          </span>
                        </span>
                      )}

                      {linkedGoal && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 truncate max-w-[200px]">
                          <Sparkles className="w-3 h-3 shrink-0" />
                          <span>Goal: {linkedGoal.title}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {!task.done && (
                    <button
                      onClick={() => onStartFocus(task.title, task.id)}
                      className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                      title="Start Focus Timer for this task"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  )}

                  <button
                    onClick={() => softDelete('tasks', task.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
