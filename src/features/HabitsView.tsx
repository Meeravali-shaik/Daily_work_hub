import React, { useState, useMemo } from 'react';
import {
  Flame,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Award,
  Calendar,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useHubStore } from '../hooks/useHubStore';
import { getTodayStr, getOffsetDateStr } from '../services/sampleData';
import { playChime } from '../services/notifications';

export const HabitsView: React.FC<{ onOpenQuickAdd: (defaultType?: any) => void }> = ({ onOpenQuickAdd }) => {
  const { habits, habit_checkins, toggleHabitCheckin, softDelete, saveRow } = useHubStore();
  const [newHabitName, setNewHabitName] = useState('');

  const today = getTodayStr();

  // Generate last 7 days list (Mon - Sun or rolling)
  const past7Days = useMemo(() => {
    const list: { dayStr: string; label: string; isToday: boolean }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const dtStr = getOffsetDateStr(-i);
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push({
        dayStr: dtStr,
        label: i === 0 ? 'Today' : dayNames[d.getDay()],
        isToday: i === 0,
      });
    }
    return list;
  }, []);

  // Compute streaks for each habit
  const habitStats = useMemo(() => {
    return habits.map((habit) => {
      const checkinDates = new Set(
        habit_checkins
          .filter((c) => c.habit_id === habit.id && !c.deleted_at)
          .map((c) => c.day)
      );

      // Current streak: count consecutive days backwards from today (or yesterday)
      let streak = 0;
      let checkDate = new Date();
      let dayStr = getTodayStr();

      // If checked today, start with 1, else check yesterday
      if (checkinDates.has(dayStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      while (true) {
        const y = checkDate.getFullYear();
        const m = String(checkDate.getMonth() + 1).padStart(2, '0');
        const d = String(checkDate.getDate()).padStart(2, '0');
        const curStr = `${y}-${m}-${d}`;

        if (checkinDates.has(curStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      // Total completed days
      const totalDays = checkinDates.size;

      return {
        ...habit,
        streak,
        totalDays,
        checkedToday: checkinDates.has(today),
      };
    });
  }, [habits, habit_checkins, today]);

  const handleToggle = async (habitId: string, dayStr: string) => {
    const checked = await toggleHabitCheckin(habitId, dayStr);
    if (checked && dayStr === today) {
      playChime();
      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.8 },
        });
      } catch {}
    }
  };

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    await saveRow('habits', {
      name: newHabitName.trim(),
      active: true,
    });
    setNewHabitName('');
  };

  const completedTodayCount = habitStats.filter((h) => h.checkedToday).length;
  const totalHabits = habitStats.length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span>Daily Habits & Streaks</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Consistent execution creates compound career leverage.
          </p>
        </div>

        {/* Progress & Add */}
        <div className="flex items-center gap-3">
          <div className="bg-stone-100 dark:bg-stone-800 rounded-xl px-3.5 py-1.5 flex items-center gap-2">
            <span className="text-xs text-stone-500 dark:text-stone-400">Today:</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {completedTodayCount} / {totalHabits}
            </span>
          </div>

          <form onSubmit={handleAddHabit} className="flex gap-2">
            <input
              type="text"
              placeholder="New habit name..."
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 w-48"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition-colors"
            >
              Add
            </button>
          </form>
        </div>
      </div>

      {/* Habits Grid Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs">
        {habitStats.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Flame className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto" />
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              No habits tracked yet
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Add daily habits like &quot;Deep Work Block&quot;, &quot;Code Review&quot;, or &quot;Read 20 Mins&quot; to build consistency streaks.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 text-xs font-semibold text-stone-500 dark:text-stone-400">
                  <th className="py-3 px-4 w-1/3">Habit</th>
                  <th className="py-3 px-2 text-center">Streak</th>
                  {past7Days.map((d) => (
                  <th
                    key={d.dayStr}
                    className={`py-3 px-2 text-center ${
                      d.isToday ? 'text-amber-600 dark:text-amber-400 font-bold' : ''
                    }`}
                  >
                    <div>{d.label}</div>
                    <div className="text-[10px] font-normal opacity-70">
                      {d.dayStr.slice(5)}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-sm">
              {habitStats.map((habit) => {
                const checkinSet = new Set(
                  habit_checkins
                    .filter((c) => c.habit_id === habit.id && !c.deleted_at)
                    .map((c) => c.day)
                );

                return (
                  <tr
                    key={habit.id}
                    className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-stone-900 dark:text-stone-100">
                      <div className="flex items-center gap-2">
                        <span>{habit.name}</span>
                        {habit.checkedToday && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                            Done
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Streak badge */}
                    <td className="py-3 px-2 text-center">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Flame className="w-3 h-3 fill-current" />
                        <span>{habit.streak}d</span>
                      </span>
                    </td>

                    {/* 7 Days Checkboxes */}
                    {past7Days.map((d) => {
                      const isChecked = checkinSet.has(d.dayStr);
                      return (
                        <td key={d.dayStr} className="py-3 px-2 text-center">
                          <button
                            onClick={() => handleToggle(habit.id, d.dayStr)}
                            className={`w-8 h-8 rounded-xl inline-flex items-center justify-center transition-all ${
                              isChecked
                                ? 'bg-amber-500 text-stone-950 shadow-xs scale-105'
                                : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400'
                            }`}
                            title={`Toggle check-in for ${d.dayStr}`}
                          >
                            {isChecked ? (
                              <CheckCircle2 className="w-5 h-5 fill-current" />
                            ) : (
                              <Circle className="w-4 h-4 opacity-40" />
                            )}
                          </button>
                        </td>
                      );
                    })}

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => softDelete('habits', habit.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete habit"
                      >
                        <Trash2 className="w-4 h-4" />
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
