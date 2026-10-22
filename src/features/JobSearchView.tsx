import React, { useState } from 'react';
import {
  Briefcase,
  Plus,
  Calendar,
  Building,
  DollarSign,
  MapPin,
  Clock,
  ArrowRight,
  Trash2,
  ExternalLink,
  Award,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useHubStore } from '../hooks/useHubStore';
import { getTodayStr } from '../services/sampleData';
import { JobApplication, JobStatus } from '../types/database';
import { playChime } from '../services/notifications';

export const JobSearchView: React.FC<{ onOpenQuickAdd: (defaultType?: any) => void }> = ({ onOpenQuickAdd }) => {
  const { job_applications, saveRow, softDelete } = useHubStore();

  const [showAddModal, setShowAddModal] = useState(false);

  // New Job state
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<JobStatus>('Applied');
  const [appliedOn, setAppliedOn] = useState(getTodayStr());
  const [followUpOn, setFollowUpOn] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const stages: { id: JobStatus; label: string; color: string }[] = [
    { id: 'Wishlist', label: 'Wishlist', color: 'border-stone-300 dark:border-stone-700' },
    { id: 'Applied', label: 'Applied', color: 'border-sky-400 dark:border-sky-700' },
    { id: 'Interview', label: 'Interviewing', color: 'border-amber-400 dark:border-amber-700' },
    { id: 'Offer', label: 'Offer Received', color: 'border-emerald-400 dark:border-emerald-700' },
    { id: 'Rejected', label: 'Archived / Rejected', color: 'border-rose-300 dark:border-rose-900' },
  ];

  const handleStatusChange = async (job: JobApplication, newStatus: JobStatus) => {
    if (newStatus === 'Offer') {
      playChime();
      try {
        confetti({ particleCount: 80, spread: 80 });
      } catch {}
    }

    await saveRow('job_applications', {
      ...job,
      status: newStatus,
    });
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    await saveRow('job_applications', {
      company: company.trim(),
      role: role.trim(),
      status,
      applied_on: appliedOn,
      follow_up_on: followUpOn || undefined,
      salary_range: salaryRange.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setCompany('');
    setRole('');
    setSalaryRange('');
    setLocation('');
    setNotes('');
    setFollowUpOn('');
    setShowAddModal(false);
  };

  const todayStr = getTodayStr();

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      {/* Header card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-500" />
            <span>Job Search Pipeline</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Track applications, interviews, recruiter follow-ups, and offers.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>

      {/* Kanban Stages Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {stages.map((stage) => {
          const stageJobs = job_applications.filter((j) => j.status === stage.id);

          return (
            <div
              key={stage.id}
              className="bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-2xl p-3 flex flex-col min-h-[460px]"
            >
              {/* Stage header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200 dark:border-stone-800">
                <span className="font-display font-bold text-xs text-stone-900 dark:text-stone-100">
                  {stage.label}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold">
                  {stageJobs.length}
                </span>
              </div>

              {/* Job Cards */}
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] no-scrollbar">
                {stageJobs.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-[11px] text-stone-400 text-center">
                    No applications
                  </div>
                ) : (
                  stageJobs.map((job) => {
                    const isFollowUpDue = job.follow_up_on && job.follow_up_on <= todayStr;

                    return (
                      <div
                        key={job.id}
                        className={`bg-white dark:bg-stone-800/90 border rounded-xl p-3 shadow-2xs space-y-2 hover:border-amber-500/50 transition-all ${
                          job.status === 'Offer' ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20' : 'border-stone-200/90 dark:border-stone-700/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                              {job.company}
                            </h4>
                            <p className="text-[11px] text-stone-600 dark:text-stone-300 font-medium mt-0.5">
                              {job.role}
                            </p>
                          </div>
                          <button
                            onClick={() => softDelete('job_applications', job.id)}
                            className="p-1 text-stone-400 hover:text-rose-500 shrink-0"
                            title="Delete application"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Metadata */}
                        <div className="space-y-1 text-[10px] text-stone-500 dark:text-stone-400">
                          {job.salary_range && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-stone-400" />
                              <span>{job.salary_range}</span>
                            </div>
                          )}
                          {job.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-stone-400" />
                              <span>{job.location}</span>
                            </div>
                          )}
                          {job.follow_up_on && (
                            <div
                              className={`flex items-center gap-1 font-semibold ${
                                isFollowUpDue ? 'text-rose-600 dark:text-rose-400' : 'text-stone-500'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>Follow up: {job.follow_up_on}</span>
                            </div>
                          )}
                        </div>

                        {job.notes && (
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-900/60 p-1.5 rounded-lg line-clamp-2">
                            {job.notes}
                          </p>
                        )}

                        {/* Move stage selector */}
                        <div className="pt-1 border-t border-stone-100 dark:border-stone-700/60">
                          <select
                            value={job.status}
                            onChange={(e) => handleStatusChange(job, e.target.value as JobStatus)}
                            className="w-full text-[10px] py-1 px-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300"
                          >
                            <option value="Wishlist">Move: Wishlist</option>
                            <option value="Applied">Move: Applied</option>
                            <option value="Interview">Move: Interview</option>
                            <option value="Offer">Move: Offer</option>
                            <option value="Rejected">Move: Rejected</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-display font-bold text-base text-stone-900 dark:text-stone-100 mb-4">
              New Job Application
            </h3>
            <form onSubmit={handleCreateJob} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Company *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stripe, Acme Corp"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Role *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cloud Engineer"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Stage
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as JobStatus)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    <option value="Wishlist">Wishlist</option>
                    <option value="Applied">Applied</option>
                    <option value="Interview">Interview</option>
                    <option value="Offer">Offer</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={followUpOn}
                    onChange={(e) => setFollowUpOn(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Salary Range (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. $80k - $95k"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="Remote, NYC, etc."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Interview Notes / Referral Contact
                </label>
                <textarea
                  rows={3}
                  placeholder="Recruiter names, tech stack discussed, next steps..."
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
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
