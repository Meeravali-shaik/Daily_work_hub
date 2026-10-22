import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Square,
  Pause,
  Clock,
  RotateCcw,
  Sparkles,
  Calendar,
  Tag,
  Plus,
  Trash2,
  PieChart,
  CheckCircle2,
  Bell,
  Coffee,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useHubStore } from '../hooks/useHubStore';
import { getTodayStr } from '../services/sampleData';
import { playChime } from '../services/notifications';
import { TimeEntrySource } from '../types/database';

export const TimeTrackerView: React.FC<{ onOpenQuickAdd: (defaultType?: any) => void }> = ({ onOpenQuickAdd }) => {
  const { running_timer, time_entries, tasks, startTimer, stopTimer, saveRow, softDelete } = useHubStore();

  const [activeTab, setActiveTab] = useState<'stopwatch' | 'pomodoro' | 'manual'>('stopwatch');

  // Form states
  const [label, setLabel] = useState(running_timer?.label || '');
  const [category, setCategory] = useState(running_timer?.category || 'Work');
  const [selectedTaskId, setSelectedTaskId] = useState(running_timer?.task_id || '');

  // Pomodoro states
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'break'>('work');
  const [pomodoroWorkMin, setPomodoroWorkMin] = useState(25);
  const [pomodoroBreakMin, setPomodoroBreakMin] = useState(5);
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);

  // Manual log state
  const [manualLabel, setManualLabel] = useState('');
  const [manualCategory, setManualCategory] = useState('Work');
  const [manualMinutes, setManualMinutes] = useState(45);
  const [manualDate, setManualDate] = useState(getTodayStr());

  // Running timer live counter
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!running_timer?.started_at) {
      setElapsedSec(0);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.floor((Date.now() - new Date(running_timer.started_at!).getTime()) / 1000));
      setElapsedSec(diff);
    };
    update();
    const int = setInterval(update, 1000);
    return () => clearInterval(int);
  }, [running_timer?.started_at]);

  // Pomodoro timer tick
  useEffect(() => {
    let int: any = null;
    if (isPomodoroRunning) {
      int = setInterval(() => {
        setPomodoroTimeLeft((prev) => {
          if (prev <= 1) {
            playChime();
            try {
              confetti({ particleCount: 35, spread: 60 });
            } catch {}

            // Auto switch or finish
            if (pomodoroMode === 'work') {
              // Log work session
              saveRow('time_entries', {
                label: label || 'Pomodoro Focus Block',
                category,
                started_at: new Date(Date.now() - pomodoroWorkMin * 60000).toISOString(),
                ended_at: new Date().toISOString(),
                minutes: pomodoroWorkMin,
                source: 'pomodoro',
                task_id: selectedTaskId || null,
              });

              setPomodoroMode('break');
              return pomodoroBreakMin * 60;
            } else {
              setPomodoroMode('work');
              return pomodoroWorkMin * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(int);
  }, [isPomodoroRunning, pomodoroMode, pomodoroWorkMin, pomodoroBreakMin, label, category, selectedTaskId, saveRow]);

  const formatSec = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStartStopwatch = async () => {
    await startTimer(label.trim() || 'Focus Session', category, selectedTaskId || null);
  };

  const handleStopStopwatch = async () => {
    const entry = await stopTimer();
    if (entry) {
      playChime();
      try {
        confetti({ particleCount: 30, spread: 50 });
      } catch {}
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualMinutes <= 0) return;
    const startTime = new Date(`${manualDate}T12:00:00`);
    await saveRow('time_entries', {
      label: manualLabel.trim() || 'Manual Session',
      category: manualCategory,
      started_at: startTime.toISOString(),
      ended_at: new Date(startTime.getTime() + manualMinutes * 60000).toISOString(),
      minutes: manualMinutes,
      source: 'manual',
    });
    setManualLabel('');
  };

  // Aggregates
  const todayStr = getTodayStr();
  const todayMinutes = useMemo(() => {
    return time_entries
      .filter((te) => te.started_at.startsWith(todayStr))
      .reduce((sum, te) => sum + te.minutes, 0);
  }, [time_entries, todayStr]);

  const totalHours = Math.round((todayMinutes / 60) * 10) / 10;

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const te of time_entries) {
      map[te.category] = (map[te.category] || 0) + te.minutes;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [time_entries]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-6">
      {/* Top Main Focus Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Timer / Pomodoro Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('stopwatch')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'stopwatch'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Running Stopwatch
                </button>
                <button
                  onClick={() => setActiveTab('pomodoro')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'pomodoro'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Pomodoro Timer
                </button>
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'manual'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Manual Log
                </button>
              </div>

              {running_timer?.started_at && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Syncing Live</span>
                </span>
              )}
            </div>

            {/* TAB: STOPWATCH */}
            {activeTab === 'stopwatch' && (
              <div className="py-6 text-center space-y-4">
                <div className="font-mono text-5xl sm:text-7xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  {formatSec(elapsedSec)}
                </div>

                <div className="max-w-md mx-auto space-y-3">
                  <input
                    type="text"
                    disabled={!!running_timer?.started_at}
                    placeholder="What are you working on right now?"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full text-center px-4 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                  />

                  <div className="flex gap-2 justify-center">
                    <select
                      disabled={!!running_timer?.started_at}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200"
                    >
                      <option value="Work">Work</option>
                      <option value="Study">Study</option>
                      <option value="Career">Career</option>
                      <option value="Tech">Tech</option>
                      <option value="Personal">Personal</option>
                    </select>

                    {tasks.filter((t) => !t.done).length > 0 && (
                      <select
                        disabled={!!running_timer?.started_at}
                        value={selectedTaskId}
                        onChange={(e) => setSelectedTaskId(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 max-w-[200px] truncate"
                      >
                        <option value="">-- Link to task (optional) --</option>
                        {tasks
                          .filter((t) => !t.done)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  {running_timer?.started_at ? (
                    <button
                      onClick={handleStopStopwatch}
                      className="px-8 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2 hover:scale-102"
                    >
                      <Square className="w-5 h-5 fill-current" />
                      <span>Stop & Save Session</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStartStopwatch}
                      className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-md transition-all inline-flex items-center gap-2 hover:scale-102"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>Start Focus Timer</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB: POMODORO */}
            {activeTab === 'pomodoro' && (
              <div className="py-6 text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                  {pomodoroMode === 'work' ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Focus Session ({pomodoroWorkMin} min)</span>
                    </>
                  ) : (
                    <>
                      <Coffee className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Break Time ({pomodoroBreakMin} min)</span>
                    </>
                  )}
                </div>

                <div className="font-mono text-6xl sm:text-7xl font-bold tracking-tight text-amber-500">
                  {formatSec(pomodoroTimeLeft)}
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
                    className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-sm transition-colors inline-flex items-center gap-2"
                  >
                    {isPomodoroRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{isPomodoroRunning ? 'Pause' : 'Start'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsPomodoroRunning(false);
                      setPomodoroTimeLeft(pomodoroMode === 'work' ? pomodoroWorkMin * 60 : pomodoroBreakMin * 60);
                    }}
                    className="p-3 rounded-2xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
                    title="Reset Interval"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB: MANUAL LOG */}
            {activeTab === 'manual' && (
              <form onSubmit={handleManualSubmit} className="py-4 max-w-md mx-auto space-y-3 text-left">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Activity / Task Label *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Terraform AWS infra refactoring"
                    value={manualLabel}
                    onChange={(e) => setManualLabel(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Category
                    </label>
                    <select
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    >
                      <option value="Work">Work</option>
                      <option value="Study">Study</option>
                      <option value="Career">Career</option>
                      <option value="Tech">Tech</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition-colors mt-2"
                >
                  Log Time Entry
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Summary & Stats Card */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-display font-bold text-base text-stone-900 dark:text-stone-100 mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-500" />
              <span>Time Distribution</span>
            </h3>

            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-4 text-center mb-4">
              <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">Logged Today</div>
              <div className="text-3xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                {totalHours} hrs
              </div>
              <div className="text-[11px] text-stone-500 mt-1">{todayMinutes} minutes total</div>
            </div>

            {/* Category breakdown bars */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-stone-600 dark:text-stone-400">All-time by Category:</div>
              {categoryBreakdown.map(([cat, mins]) => {
                const hrs = Math.round((mins / 60) * 10) / 10;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-stone-800 dark:text-stone-200">{cat}</span>
                      <span className="font-mono text-stone-500">{hrs}h</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, (mins / 600) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-stone-500 border-t border-stone-100 dark:border-stone-800 pt-3">
            Tracked time automatically appears on your weekly review and calendar day views.
          </div>
        </div>
      </div>

      {/* Logged Sessions History Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-stone-900 dark:text-stone-100">
            Recent Logged Sessions
          </h3>
          <span className="text-xs text-stone-500">{time_entries.length} total sessions</span>
        </div>

        {time_entries.length === 0 ? (
          <div className="p-10 text-center text-xs text-stone-400">
            No focus sessions logged yet. Start the focus timer above or use Manual Log to record your time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 text-stone-500 dark:text-stone-400 font-semibold">
                  <th className="py-2.5 px-4">Session</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {time_entries.slice(0, 15).map((te) => {
                const d = new Date(te.started_at);
                return (
                  <tr key={te.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                    <td className="py-3 px-4 font-medium text-stone-900 dark:text-stone-100">
                      {te.label || 'Session'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 font-medium">
                        {te.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-stone-500 font-mono">
                      {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                      {te.minutes} min
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize text-[10px] px-2 py-0.5 rounded-full border border-stone-200 dark:border-stone-700">
                        {te.source}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => softDelete('time_entries', te.id)}
                        className="p-1 rounded text-stone-400 hover:text-rose-600 transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
};
