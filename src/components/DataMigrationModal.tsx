import React, { useState, useEffect } from 'react';
import { Database, UploadCloud, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';
import { useHubStore } from '../hooks/useHubStore';

export const DataMigrationModal: React.FC = () => {
  const { checkLegacyLocalStorage, migrateFromLegacy } = useHubStore();
  const [legacyData, setLegacyData] = useState<any | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migratedCount, setMigratedCount] = useState<number | null>(null);

  useEffect(() => {
    const data = checkLegacyLocalStorage();
    if (data) {
      setLegacyData(data);
      setIsOpen(true);
    }
  }, [checkLegacyLocalStorage]);

  if (!isOpen || !legacyData) return null;

  const taskCount = Array.isArray(legacyData.tasks) ? legacyData.tasks.length : 0;
  const habitCount = Array.isArray(legacyData.habits) ? legacyData.habits.length : 0;
  const timeLogCount = Array.isArray(legacyData.timeEntries || legacyData.logs)
    ? (legacyData.timeEntries || legacyData.logs).length
    : 0;

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const count = await migrateFromLegacy(legacyData);
      setMigratedCount(count);
      setTimeout(() => {
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      console.error('Migration error:', err);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <UploadCloud className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-stone-900 dark:text-stone-100">
              Legacy Data Found
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Found previous Daily Work Hub data in browser storage (<code className="font-mono text-amber-600 dark:text-amber-400">dailyhub.v1</code>)
            </p>
          </div>
        </div>

        {migratedCount !== null ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center my-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Successfully migrated {migratedCount} items!
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
              Data is saved into offline IndexedDB and queued for cloud sync.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-stone-50 dark:bg-stone-800/60 rounded-xl p-3 border border-stone-200 dark:border-stone-700/60 my-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Detected Items:
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-stone-200/60 dark:border-stone-700/60">
                <span className="text-stone-600 dark:text-stone-300">Tasks</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{taskCount}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-stone-200/60 dark:border-stone-700/60">
                <span className="text-stone-600 dark:text-stone-300">Habits</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{habitCount}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-stone-600 dark:text-stone-300">Time Entries</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{timeLogCount}</span>
              </div>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-5">
              Would you like to import this data into your local database? All records will receive UUIDs and sync automatically. Your original data is safely preserved under a backup key.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
              >
                Skip For Now
              </button>
              <button
                onClick={handleMigrate}
                disabled={isMigrating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                {isMigrating ? (
                  <span>Importing...</span>
                ) : (
                  <>
                    <span>Import Data</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
