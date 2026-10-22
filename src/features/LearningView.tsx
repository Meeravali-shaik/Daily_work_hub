import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Award,
  Video,
  FileCode,
  Calendar,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useHubStore } from '../hooks/useHubStore';
import { Course, CourseKind } from '../types/database';

export const LearningView: React.FC<{ onOpenQuickAdd: (defaultType?: any) => void }> = ({ onOpenQuickAdd }) => {
  const { courses, saveRow, softDelete } = useHubStore();

  const [filterKind, setFilterKind] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New course form
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [kind, setKind] = useState<CourseKind>('Course');
  const [progress, setProgress] = useState(0);
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');

  const filteredCourses = courses.filter((c) => {
    if (filterKind !== 'all' && c.kind !== filterKind) return false;
    return true;
  });

  const handleUpdateProgress = async (course: Course, newProgress: number) => {
    const clamped = Math.max(0, Math.min(100, newProgress));
    await saveRow('courses', {
      ...course,
      progress: clamped,
    });
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await saveRow('courses', {
      name: name.trim(),
      platform: platform.trim() || undefined,
      kind,
      progress,
      target_date: targetDate || undefined,
      notes: notes.trim() || undefined,
    });

    setName('');
    setPlatform('');
    setNotes('');
    setProgress(0);
    setShowAddModal(false);
  };

  const kinds: { id: CourseKind | 'all'; label: string }[] = [
    { id: 'all', label: 'All Learning' },
    { id: 'Certification', label: 'Certifications' },
    { id: 'Course', label: 'Courses' },
    { id: 'Book', label: 'Books' },
    { id: 'Tutorial', label: 'Tutorials' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <span>Learning & Certification Tracker</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Track courses, cloud certifications, technical books, and hands-on tutorials.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
            {kinds.map((k) => (
              <button
                key={k.id}
                onClick={() => setFilterKind(k.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  filterKind === k.id
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Grid of courses */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-12 text-center">
            <BookOpen className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">No learning items in this category</h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-semibold text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Resource</span>
            </button>
          </div>
        ) : (
          filteredCourses.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                    {c.kind}
                  </span>

                  <button
                    onClick={() => softDelete('courses', c.id)}
                    className="p-1 rounded text-stone-400 hover:text-rose-600 transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="font-display font-bold text-sm text-stone-900 dark:text-stone-100 line-clamp-2">
                  {c.name}
                </h3>

                {c.platform && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                    {c.platform}
                  </p>
                )}

                {c.notes && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 bg-stone-50 dark:bg-stone-800/60 p-2 rounded-xl line-clamp-3">
                    {c.notes}
                  </p>
                )}
              </div>

              {/* Progress control */}
              <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500 font-medium">Progress</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                      {c.progress}%
                    </span>
                    {c.progress === 100 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                        Completed
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      c.progress === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${c.progress}%` }}
                  ></div>
                </div>

                {/* Quick increment buttons */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleUpdateProgress(c, c.progress - 10)}
                      className="px-2 py-0.5 text-[10px] rounded border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400"
                    >
                      -10%
                    </button>
                    <button
                      onClick={() => handleUpdateProgress(c, c.progress + 10)}
                      className="px-2 py-0.5 text-[10px] rounded border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400"
                    >
                      +10%
                    </button>
                  </div>

                  {c.target_date && (
                    <span className="text-[10px] text-stone-500 font-mono">
                      Target: {c.target_date}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-display font-bold text-base text-stone-900 dark:text-stone-100 mb-4">
              Add Learning Resource
            </h3>
            <form onSubmit={handleCreateCourse} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Solutions Architect, Clean Code"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Type
                  </label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as CourseKind)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    <option value="Certification">Certification</option>
                    <option value="Course">Course</option>
                    <option value="Book">Book</option>
                    <option value="Tutorial">Tutorial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Platform / Author
                  </label>
                  <input
                    type="text"
                    placeholder="Udemy, Coursera, Book Author"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Initial Progress (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Study Notes / Focus
                </label>
                <textarea
                  rows={3}
                  placeholder="Key topics to focus on..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
