import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Sparkles,
  Award,
  AlertCircle,
  ArrowRight,
  Clock,
  CheckCircle2,
  Save,
  ChevronLeft,
  ChevronRight,
  Compass,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useHubStore } from '../hooks/useHubStore';
import { getTodayStr, getOffsetDateStr } from '../services/sampleData';
import { WeeklyReview } from '../types/database';

export const ReviewView: React.FC = () => {
  const { weekly_reviews, tasks, time_entries, habit_checkins, habits, goals, saveRow } = useHubStore();

  // Selected week start (Monday of current or selected week)
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);

  const weekStartStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedWeekOffset * 7);
    const day = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - day);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  }, [selectedWeekOffset]);

  const weekEndStr = useMemo(() => {
    const d = new Date(weekStartStr);
    d.setDate(d.getDate() + 6);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  }, [weekStartStr]);

  // Existing review for this week
  const currentReview = weekly_reviews.find((r) => r.week_start === weekStartStr);

  const [reflection, setReflection] = useState('');
  const [wins, setWins] = useState('');
  const [challenges, setChallenges] = useState('');
  const [nextWeekFocus, setNextWeekFocus] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Sync state when week changes
  React.useEffect(() => {
    if (currentReview) {
      setReflection(currentReview.reflection || '');
      setWins(currentReview.wins || '');
      setChallenges(currentReview.challenges || '');
      setNextWeekFocus(currentReview.next_week_focus || '');
    } else {
      setReflection('');
      setWins('');
      setChallenges('');
      setNextWeekFocus('');
    }
    setIsSaved(false);
  }, [weekStartStr, currentReview]);

  // Week statistics
  const completedThisWeek = useMemo(() => {
    return tasks.filter((t) => t.done && t.done_at && t.done_at.slice(0, 10) >= weekStartStr && t.done_at.slice(0, 10) <= weekEndStr).length;
  }, [tasks, weekStartStr, weekEndStr]);

  const hoursThisWeek = useMemo(() => {
    const mins = time_entries
      .filter((te) => te.started_at.slice(0, 10) >= weekStartStr && te.started_at.slice(0, 10) <= weekEndStr)
      .reduce((sum, te) => sum + te.minutes, 0);
    return Math.round((mins / 60) * 10) / 10;
  }, [time_entries, weekStartStr, weekEndStr]);

  const habitCheckinsCount = useMemo(() => {
    return habit_checkins.filter((c) => c.day >= weekStartStr && c.day <= weekEndStr).length;
  }, [habit_checkins, weekStartStr, weekEndStr]);

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveRow('weekly_reviews', {
      id: currentReview?.id || undefined,
      week_start: weekStartStr,
      reflection,
      wins,
      challenges,
      next_week_focus: nextWeekFocus,
    });
    setIsSaved(true);
    try {
      confetti({ particleCount: 35, spread: 50 });
    } catch {}
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      {/* Header and Week Navigator */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            <span>Weekly & Periodic Review</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Reflect on performance, celebrate wins, diagnose blockers, and calibrate long-term goals.
          </p>
        </div>

        {/* Week switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedWeekOffset((o) => o - 1)}
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-mono">
            Week of {weekStartStr} to {weekEndStr}
          </div>
          <button
            onClick={() => setSelectedWeekOffset((o) => o + 1)}
            disabled={selectedWeekOffset >= 0}
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <div className="text-xs text-stone-500">Tasks Completed</div>
            <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
              {completedThisWeek}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="text-xs text-stone-500">Focus Hours Tracked</div>
            <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
              {hoursThisWeek} hrs
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Sparkles className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <div className="text-xs text-stone-500">Habit Check-ins</div>
            <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
              {habitCheckinsCount}
            </div>
          </div>
        </div>
      </div>

      {/* Review Prompts Form */}
      <form onSubmit={handleSaveReview} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-500" />
            <span>Big Wins & High-Impact Breakthroughs</span>
          </label>
          <textarea
            rows={3}
            placeholder="What went exceptionally well this week? What did you ship or learn?"
            value={wins}
            onChange={(e) => setWins(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span>Challenges, Friction & Blockers</span>
          </label>
          <textarea
            rows={3}
            placeholder="Where did you get stuck or distracted? What system friction occurred?"
            value={challenges}
            onChange={(e) => setChallenges(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-amber-500" />
            <span>Highest Leverage Focus for Next Week</span>
          </label>
          <textarea
            rows={3}
            placeholder="The top 3 outcomes that will make next week a massive success..."
            value={nextWeekFocus}
            onChange={(e) => setNextWeekFocus(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
          <span className="text-xs text-stone-400">
            {isSaved ? '✓ Review saved successfully' : 'Save your weekly reflections to maintain momentum.'}
          </span>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Review</span>
          </button>
        </div>
      </form>
    </div>
  );
};
