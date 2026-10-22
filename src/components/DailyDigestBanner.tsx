import React, { useState } from 'react';
import { Sun, CheckCircle2, Clock, AlertTriangle, ArrowRight, X, Sparkles } from 'lucide-react';
import { useHubStore } from '../hooks/useHubStore';
import { getTodayStr } from '../services/sampleData';

export const DailyDigestBanner: React.FC<{ onOpenTasks: () => void; onStartFocus: (taskTitle: string) => void }> = ({
  onOpenTasks,
  onStartFocus,
}) => {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('dwh_digest_dismissed') === 'true';
  });

  const { tasks, reminders, saveRow } = useHubStore();
  const today = getTodayStr();

  if (dismissed) return null;

  const todayTasks = tasks.filter((t) => t.due_date === today && !t.done);
  const overdueTasks = tasks.filter((t) => t.due_date && t.due_date < today && !t.done);
  const todayReminders = reminders.filter((r) => r.status === 'pending');

  const topPriorityTask = todayTasks.find((t) => t.priority === 'High') || todayTasks[0];

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('dwh_digest_dismissed', 'true');
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 via-stone-50 to-orange-50 dark:from-stone-900 dark:via-stone-900/90 dark:to-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/40 px-4 py-3 relative">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
            <Sun className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-semibold text-sm text-stone-900 dark:text-stone-100">
                Daily Focus Briefing
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
              {todayTasks.length === 0 && overdueTasks.length === 0 && todayReminders.length === 0 ? (
                <span>Clean slate! You have no pending tasks scheduled for today. Ready to plan your high-leverage work.</span>
              ) : (
                <>
                  You have <strong className="text-stone-900 dark:text-white">{todayTasks.length} tasks</strong> scheduled for today
                  {overdueTasks.length > 0 && (
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      {' '}• {overdueTasks.length} overdue item{overdueTasks.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {todayReminders.length > 0 && (
                    <span> • {todayReminders.length} pending reminder{todayReminders.length > 1 ? 's' : ''}</span>
                  )}.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action pills */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {topPriorityTask && (
            <button
              onClick={() => onStartFocus(topPriorityTask.title)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Focus on: {topPriorityTask.title.slice(0, 24)}...</span>
            </button>
          )}

          <button
            onClick={onOpenTasks}
            className="flex items-center gap-1 text-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <span>Review Tasks</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors ml-1"
            title="Dismiss briefing"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
