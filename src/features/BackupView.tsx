import React, { useState } from 'react';
import {
  HardDriveDownload,
  Download,
  Upload,
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Shield,
  FileJson,
  FolderArchive,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useHubStore } from '../hooks/useHubStore';
import { getTodayStr } from '../services/sampleData';
import { TableName } from '../types/database';

export const BackupView: React.FC = () => {
  const {
    exportFullJSON,
    exportTableCSV,
    exportCalendarICS,
    importFullJSON,
    wipeAllData,
    tasks,
    goals,
    habits,
    time_entries,
    job_applications,
    courses,
    notes,
  } = useHubStore();

  const [importResult, setImportResult] = useState<{
    success: boolean;
    counts?: Record<string, number>;
    message: string;
  } | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const todayStr = getTodayStr();

  // 1-Click JSON export
  const handleExportJSON = () => {
    const jsonStr = exportFullJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-work-hub-backup-${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV export
  const handleExportCSV = (table: TableName) => {
    const csvContent = exportTableCSV(table);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-work-hub-${table}-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calendar ICS export
  const handleExportICS = () => {
    const icsContent = exportCalendarICS();
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-work-hub-calendar-${todayStr}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // File import handler
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      const res = await importFullJSON(content);
      setImportResult(res);
      if (res.success) {
        try {
          confetti({ particleCount: 50, spread: 60 });
        } catch {}
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handle Wipe Data
  const handleWipeData = async () => {
    if (deleteConfirmationInput !== 'DELETE MY DATA') return;
    await wipeAllData();
    setShowDeleteModal(false);
    setDeleteConfirmationInput('');
    alert('All data has been wiped from local storage and IndexedDB.');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs">
        <h2 className="font-display font-bold text-xl text-stone-900 dark:text-stone-50 flex items-center gap-2">
          <HardDriveDownload className="w-5 h-5 text-amber-500" />
          <span>Backup, Export & Data Freedom</span>
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          Your data is strictly yours. Export complete databases, CSV spreadsheets, and calendar subscriptions at any time.
        </p>
      </div>

      {/* Import Result Notification */}
      {importResult && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 ${
            importResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800'
          }`}
        >
          {importResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-semibold text-sm">{importResult.message}</div>
            {importResult.counts && (
              <div className="text-xs mt-1 space-x-2 opacity-90">
                {Object.entries(importResult.counts).map(([tbl, count]) => (
                  <span key={tbl}>
                    <strong>{tbl}:</strong> {count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid of Export / Import Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Full JSON Export & Import */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <FileJson className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-stone-900 dark:text-stone-100">
                  Full Database Backup (JSON)
                </h3>
                <p className="text-xs text-stone-500">
                  Schema v1 format containing tasks, habits, time entries, goals, courses, jobs, and notes.
                </p>
              </div>
            </div>

            <div className="bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl text-xs space-y-1 text-stone-600 dark:text-stone-300 my-4 font-mono">
              <div className="flex justify-between">
                <span>Tasks: {tasks.length}</span>
                <span>Goals: {goals.length}</span>
                <span>Habits: {habits.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Time logs: {time_entries.length}</span>
                <span>Jobs: {job_applications.length}</span>
                <span>Courses: {courses.length}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportJSON}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Full JSON</span>
            </button>

            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-xs cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>Restore Backup</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Calendar Feed & ICS Export */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20">
                <Calendar className="w-5 h-5 text-sky-500" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-stone-900 dark:text-stone-100">
                  Calendar Subscription (.ics)
                </h3>
                <p className="text-xs text-stone-500">
                  Sync tasks, milestone deadlines, and job follow-ups into Apple Calendar, Google Calendar, or Outlook.
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400 my-4 leading-relaxed">
              Generates an industry-standard RFC 5545 iCalendar snapshot that can be imported directly into any calendar app.
            </p>
          </div>

          <button
            onClick={handleExportICS}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download .ics Calendar File</span>
          </button>
        </div>
      </div>

      {/* CSV Spreadsheets Export Card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-stone-900 dark:text-stone-100">
              CSV Spreadsheets Export
            </h3>
            <p className="text-xs text-stone-500">
              Export clean CSV files ready for Microsoft Excel, Google Sheets, or data analysis.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
          <button
            onClick={() => handleExportCSV('tasks')}
            className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 text-center text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            <div className="font-bold">Tasks</div>
            <div className="text-[10px] text-stone-500 mt-1">{tasks.length} rows</div>
          </button>

          <button
            onClick={() => handleExportCSV('time_entries')}
            className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 text-center text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            <div className="font-bold">Time Logs</div>
            <div className="text-[10px] text-stone-500 mt-1">{time_entries.length} rows</div>
          </button>

          <button
            onClick={() => handleExportCSV('goals')}
            className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 text-center text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            <div className="font-bold">Goals</div>
            <div className="text-[10px] text-stone-500 mt-1">{goals.length} rows</div>
          </button>

          <button
            onClick={() => handleExportCSV('job_applications')}
            className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 text-center text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            <div className="font-bold">Job Search</div>
            <div className="text-[10px] text-stone-500 mt-1">{job_applications.length} rows</div>
          </button>

          <button
            onClick={() => handleExportCSV('courses')}
            className="p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 text-center text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            <div className="font-bold">Learning</div>
            <div className="text-[10px] text-stone-500 mt-1">{courses.length} rows</div>
          </button>
        </div>
      </div>

      {/* Danger Zone: Delete My Data (Section 12.1) */}
      <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-sm text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Danger Zone: Delete All Data</span>
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
            Permanently purges all tasks, goals, habits, time logs, and notes from IndexedDB and local storage.
          </p>
        </div>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
        >
          Delete My Data
        </button>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-stone-900 dark:text-stone-100">
                  Confirm Data Deletion
                </h3>
                <p className="text-xs text-stone-500">This action is irreversible.</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              To proceed with wiping all records, type{' '}
              <strong className="font-mono text-rose-600 dark:text-rose-400">
                DELETE MY DATA
              </strong>{' '}
              in the input below:
            </p>

            <input
              type="text"
              placeholder="Type DELETE MY DATA"
              value={deleteConfirmationInput}
              onChange={(e) => setDeleteConfirmationInput(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono text-center"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationInput('');
                }}
                className="px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeData}
                disabled={deleteConfirmationInput !== 'DELETE MY DATA'}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors disabled:opacity-40"
              >
                Confirm Wipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
