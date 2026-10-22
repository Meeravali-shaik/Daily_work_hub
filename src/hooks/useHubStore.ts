import { useState, useEffect } from 'react';
import { store, SyncStatus } from '../services/store';

export function useHubStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    store.init();
    const unsubscribe = store.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  return {
    goals: store.goals,
    milestones: store.milestones,
    tasks: store.tasks,
    habits: store.habits,
    habit_checkins: store.habit_checkins,
    time_entries: store.time_entries,
    running_timer: store.running_timer,
    courses: store.courses,
    job_applications: store.job_applications,
    notes: store.notes,
    weekly_reviews: store.weekly_reviews,
    reminders: store.reminders,
    settings: store.settings,
    outboxCount: store.outboxCount,
    syncStatus: store.syncStatus,
    lastSyncTime: store.lastSyncTime,
    errorMessage: store.errorMessage,

    // Actions
    saveRow: store.saveRow.bind(store),
    softDelete: store.softDelete.bind(store),
    startTimer: store.startTimer.bind(store),
    stopTimer: store.stopTimer.bind(store),
    toggleHabitCheckin: store.toggleHabitCheckin.bind(store),
    getGoalProgress: store.getGoalProgress.bind(store),
    flushOutbox: store.flushOutbox.bind(store),
    pullAll: store.pullAll.bind(store),
    exportFullJSON: store.exportFullJSON.bind(store),
    exportTableCSV: store.exportTableCSV.bind(store),
    exportCalendarICS: store.exportCalendarICS.bind(store),
    importFullJSON: store.importFullJSON.bind(store),
    wipeAllData: store.wipeAllData.bind(store),
    checkLegacyLocalStorage: store.checkLegacyLocalStorage.bind(store),
    migrateFromLegacy: store.migrateFromLegacy.bind(store),
  };
}
