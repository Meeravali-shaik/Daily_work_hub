import React, { useState, useEffect } from 'react';
import { Header, TabId } from './components/Header';
import { DailyDigestBanner } from './components/DailyDigestBanner';
import { DataMigrationModal } from './components/DataMigrationModal';
import { QuickAddModal } from './components/QuickAddModal';
import { CalendarView } from './features/CalendarView';
import { TasksView } from './features/TasksView';
import { HabitsView } from './features/HabitsView';
import { TimeTrackerView } from './features/TimeTrackerView';
import { GoalsView } from './features/GoalsView';
import { LearningView } from './features/LearningView';
import { JobSearchView } from './features/JobSearchView';
import { NotesView } from './features/NotesView';
import { ReviewView } from './features/ReviewView';
import { RemindersView } from './features/RemindersView';
import { BackupView } from './features/BackupView';
import { SettingsView } from './features/SettingsView';
import { useHubStore } from './hooks/useHubStore';

export default function App() {
  const { startTimer } = useHubStore();

  // URL Hash routing (Section 14)
  const getInitialTab = (): TabId => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '') as TabId;
      const validTabs: TabId[] = [
        'calendar',
        'tasks',
        'habits',
        'time',
        'goals',
        'learning',
        'jobs',
        'notes',
        'review',
        'reminders',
        'backup',
        'settings',
      ];
      if (validTabs.includes(hash)) return hash;
    }
    return 'calendar';
  };

  const [activeTab, setActiveTabState] = useState<TabId>(getInitialTab);

  const setActiveTab = (tab: TabId) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
    }
  };

  // Listen to hash changes (browser back/forward button)
  useEffect(() => {
    const handleHashChange = () => {
      setActiveTabState(getInitialTab());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dwh_theme');
      if (saved) return saved === 'dark';
      return true; // Default dark theme as preferred in modern productivity apps
    }
    return true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('dwh_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('dwh_theme', 'light');
    }
  }, [darkMode]);

  // Quick Add Modal state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<any>('task');

  const handleOpenQuickAdd = (type: any = 'task') => {
    setQuickAddType(type);
    setIsQuickAddOpen(true);
  };

  const handleStartFocus = async (taskTitle: string, taskId?: string) => {
    await startTimer(taskTitle, 'Work', taskId || null);
    setActiveTab('time');
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors">
      {/* Header with Navigation and Quick Actions */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQuickAdd={() => handleOpenQuickAdd('task')}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Daily Digest Morning Briefing */}
      <DailyDigestBanner
        onOpenTasks={() => setActiveTab('tasks')}
        onStartFocus={(title) => handleStartFocus(title)}
      />

      {/* Legacy LocalStorage Migration Banner / Modal */}
      <DataMigrationModal />

      {/* Main Tab Content */}
      <main className="flex-1 pb-16">
        {activeTab === 'calendar' && <CalendarView onOpenQuickAdd={handleOpenQuickAdd} />}
        {activeTab === 'tasks' && (
          <TasksView
            onOpenQuickAdd={handleOpenQuickAdd}
            onStartFocus={handleStartFocus}
          />
        )}
        {activeTab === 'habits' && <HabitsView onOpenQuickAdd={handleOpenQuickAdd} />}
        {activeTab === 'time' && <TimeTrackerView onOpenQuickAdd={handleOpenQuickAdd} />}
        {activeTab === 'goals' && <GoalsView onOpenQuickAdd={handleOpenQuickAdd} />}
        {activeTab === 'learning' && <LearningView onOpenQuickAdd={handleOpenQuickAdd} />}
        {activeTab === 'jobs' && <JobSearchView onOpenQuickAdd={handleOpenQuickAdd} />}
        {activeTab === 'notes' && <NotesView onOpenQuickAdd={handleOpenQuickAdd} />}
        {activeTab === 'review' && <ReviewView />}
        {activeTab === 'reminders' && <RemindersView onOpenQuickAdd={handleOpenQuickAdd} />}
        {activeTab === 'backup' && <BackupView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        defaultType={quickAddType}
      />
    </div>
  );
}
