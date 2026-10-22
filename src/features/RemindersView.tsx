import React, { useState } from 'react';
import {
  Bell,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Trash2,
  Send,
  Sparkles,
  Calendar,
  Volume2,
} from 'lucide-react';
import { useHubStore } from '../hooks/useHubStore';
import { getTodayStr } from '../services/sampleData';
import { Reminder, ReminderStatus } from '../types/database';
import {
  requestNotificationPermission,
  sendBrowserNotification,
  getNotificationPermissionStatus,
  playChime,
} from '../services/notifications';

export const RemindersView: React.FC<{ onOpenQuickAdd: (defaultType?: any) => void }> = ({ onOpenQuickAdd }) => {
  const { reminders, tasks, goals, saveRow, softDelete } = useHubStore();

  const [permStatus, setPermStatus] = useState<string>(getNotificationPermissionStatus());
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>('pending');

  const today = getTodayStr();

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermStatus(getNotificationPermissionStatus());
    if (granted) {
      playChime();
      sendBrowserNotification('Notifications Active', {
        body: 'Daily Work Hub will remind you of scheduled tasks and focus milestones.',
      });
    }
  };

  const handleTestNotification = () => {
    playChime();
    sendBrowserNotification('Daily Work Hub Test', {
      body: 'Practice 2 AWS VPC architecture scenarios is due in 15 minutes!',
    });
  };

  const handleSnooze = async (rem: Reminder, minutes: number) => {
    const newTime = new Date(Date.now() + minutes * 60000).toISOString();
    await saveRow('reminders', {
      ...rem,
      remind_at: newTime,
      status: 'pending',
    });
  };

  const handleMarkSent = async (rem: Reminder) => {
    await saveRow('reminders', {
      ...rem,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
  };

  const filteredReminders = reminders
    .filter((r) => {
      if (filterStatus === 'pending') return r.status === 'pending';
      return true;
    })
    .sort((a, b) => a.remind_at.localeCompare(b.remind_at));

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <span>Reminders & Notifications Center</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            In-app toasts, browser push notifications, and daily briefing alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {permStatus !== 'granted' ? (
            <button
              onClick={handleRequestPermission}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>Enable Browser Push</span>
            </button>
          ) : (
            <button
              onClick={handleTestNotification}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Test Push Chime</span>
            </button>
          )}

          <button
            onClick={() => onOpenQuickAdd('reminder')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Reminder</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
            filterStatus === 'pending'
              ? 'bg-amber-500 text-stone-950 shadow-xs'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          Pending ({reminders.filter((r) => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
            filterStatus === 'all'
              ? 'bg-amber-500 text-stone-950 shadow-xs'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          All ({reminders.length})
        </button>
      </div>

      {/* Reminders List */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-stone-100 dark:divide-stone-800">
        {filteredReminders.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">No reminders found</h3>
            <p className="text-xs text-stone-500 mt-1">Schedule a reminder for important tasks or goals.</p>
          </div>
        ) : (
          filteredReminders.map((rem) => {
            const dt = new Date(rem.remind_at);
            const isDue = dt.getTime() <= Date.now() && rem.status === 'pending';

            return (
              <div
                key={rem.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDue ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      rem.status === 'sent'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800'
                        : isDue
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 border-amber-300 animate-pulse'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                        {rem.title}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          rem.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {rem.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 font-mono">
                      <span>{dt.toLocaleDateString()} at {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {rem.repeat_rule && <span>• Repeats {rem.repeat_rule}</span>}
                    </div>
                  </div>
                </div>

                {/* Snooze and actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  {rem.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleSnooze(rem, 10)}
                        className="px-2.5 py-1 text-xs rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
                        title="Snooze 10 minutes"
                      >
                        +10m
                      </button>
                      <button
                        onClick={() => handleSnooze(rem, 60)}
                        className="px-2.5 py-1 text-xs rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
                        title="Snooze 1 hour"
                      >
                        +1h
                      </button>
                      <button
                        onClick={() => handleMarkSent(rem)}
                        className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500 text-stone-950 font-bold hover:bg-emerald-400"
                        title="Mark Sent / Done"
                      >
                        Done
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => softDelete('reminders', rem.id)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 transition-colors"
                    title="Delete reminder"
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
