import React, { useState } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  Flag,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useHubStore } from '../hooks/useHubStore';
import { Goal, Milestone, GoalHorizon, GoalStatus } from '../types/database';
import { playChime } from '../services/notifications';

export const GoalsView: React.FC<{ onOpenQuickAdd: (defaultType?: any) => void }> = ({ onOpenQuickAdd }) => {
  const { goals, milestones, tasks, getGoalProgress, saveRow, softDelete } = useHubStore();

  const [activeHorizon, setActiveHorizon] = useState<GoalHorizon | 'all'>('all');
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [newMilestoneTitles, setNewMilestoneTitles] = useState<Record<string, string>>({});

  const horizons: { id: GoalHorizon | 'all'; label: string }[] = [
    { id: 'all', label: 'All Horizons' },
    { id: 'quarter', label: 'Quarterly' },
    { id: 'year', label: '1-Year' },
    { id: 'multi-year', label: 'Multi-Year' },
  ];

  const filteredGoals = goals.filter((g) => {
    if (activeHorizon !== 'all' && g.horizon !== activeHorizon) return false;
    return true;
  });

  const handleToggleMilestone = async (goal: Goal, ms: Milestone) => {
    const isNowDone = !ms.done;
    if (isNowDone) {
      playChime();
    }

    await saveRow('milestones', {
      ...ms,
      done: isNowDone,
    });

    // Check if this was the last milestone
    const goalMilestones = milestones.filter((m) => m.goal_id === goal.id && !m.deleted_at);
    const completedAfter = goalMilestones.filter((m) => (m.id === ms.id ? isNowDone : m.done)).length;

    if (completedAfter === goalMilestones.length && isNowDone) {
      try {
        confetti({ particleCount: 70, spread: 70 });
      } catch {}
      // Offer to complete goal
      if (confirm(`Outstanding! You finished all milestones for "${goal.title}". Mark goal as Completed?`)) {
        await saveRow('goals', {
          ...goal,
          status: 'done',
        });
      }
    }
  };

  const handleAddMilestone = async (goalId: string) => {
    const title = (newMilestoneTitles[goalId] || '').trim();
    if (!title) return;

    await saveRow('milestones', {
      goal_id: goalId,
      title,
      done: false,
      sort: milestones.filter((m) => m.goal_id === goalId).length + 1,
    });

    setNewMilestoneTitles((prev) => ({ ...prev, [goalId]: '' }));
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      {/* Header card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            <span>Long-Term Goals & Milestones</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Quarterly, yearly, and multi-year horizons with automatic progress and invested time tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Horizon filters */}
          <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
            {horizons.map((h) => (
              <button
                key={h.id}
                onClick={() => setActiveHorizon(h.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  activeHorizon === h.id
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => onOpenQuickAdd('goal')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Goal</span>
          </button>
        </div>
      </div>

      {/* Goals Cards List */}
      <div className="space-y-4">
        {filteredGoals.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-12 text-center">
            <Target className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">No goals found for this horizon</h3>
            <button
              onClick={() => onOpenQuickAdd('goal')}
              className="mt-3 px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-semibold text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Goal</span>
            </button>
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const { percent, milestoneCount, completedCount, isAtRisk, hoursInvested } = getGoalProgress(goal.id);
            const goalMilestones = milestones
              .filter((m) => m.goal_id === goal.id && !m.deleted_at)
              .sort((a, b) => a.sort - b.sort);
            const isExpanded = expandedGoalId === goal.id;

            return (
              <div
                key={goal.id}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden transition-all"
              >
                {/* Main Goal Card Summary */}
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-base text-stone-900 dark:text-stone-100">
                        {goal.title}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                        {goal.horizon}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        {goal.category}
                      </span>

                      {/* At risk flag (Section 11.1) */}
                      {isAtRisk && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>At Risk (Target Soon)</span>
                        </span>
                      )}

                      {goal.status === 'done' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                          <Award className="w-3 h-3" />
                          <span>Goal Completed</span>
                        </span>
                      )}
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
                      >
                        <span>{goalMilestones.length} Milestones</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => softDelete('goals', goal.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {goal.description && (
                    <p className="text-xs text-stone-600 dark:text-stone-400 mb-4 line-clamp-2">
                      {goal.description}
                    </p>
                  )}

                  {/* Progress Bar & Invested Hours */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-stone-500 dark:text-stone-400">
                        Progress ({completedCount}/{milestoneCount} milestones)
                      </span>
                      <div className="flex items-center gap-3">
                        {hoursInvested > 0 && (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{hoursInvested}h invested</span>
                          </span>
                        )}
                        {goal.target_date && (
                          <span className="flex items-center gap-1 text-stone-500 font-mono">
                            <Calendar className="w-3 h-3" />
                            <span>Target: {goal.target_date}</span>
                          </span>
                        )}
                        <span className="font-bold font-mono text-stone-900 dark:text-stone-100">
                          {percent}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percent === 100
                            ? 'bg-emerald-500'
                            : isAtRisk
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Expanded Milestones Checklist */}
                {isExpanded && (
                  <div className="bg-stone-50/70 dark:bg-stone-950/40 border-t border-stone-100 dark:border-stone-800 p-5 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      Milestones Checklist
                    </div>

                    <div className="space-y-2">
                      {goalMilestones.map((ms) => (
                        <div
                          key={ms.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <button
                              onClick={() => handleToggleMilestone(goal, ms)}
                              className="text-stone-400 hover:text-amber-500 shrink-0"
                            >
                              {ms.done ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>
                            <span
                              className={`truncate font-medium text-stone-800 dark:text-stone-200 ${
                                ms.done ? 'line-through text-stone-400 dark:text-stone-500' : ''
                              }`}
                            >
                              {ms.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {ms.due_date && (
                              <span className="font-mono text-[10px] text-stone-400">
                                {ms.due_date}
                              </span>
                            )}
                            <button
                              onClick={() => softDelete('milestones', ms.id)}
                              className="p-1 text-stone-400 hover:text-rose-500"
                              title="Delete milestone"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Milestone Inline */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Add new milestone..."
                        value={newMilestoneTitles[goal.id] || ''}
                        onChange={(e) =>
                          setNewMilestoneTitles({
                            ...newMilestoneTitles,
                            [goal.id]: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMilestone(goal.id);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                      />
                      <button
                        onClick={() => handleAddMilestone(goal.id)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
