import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  CheckSquare,
  Flame,
  Clock,
  Target,
  BookOpen,
  Briefcase,
  FileText,
  BarChart3,
  Bell,
  HardDriveDownload,
  Settings,
  Cloud,
  CloudOff,
  RefreshCw,
  Sun,
  Moon,
  Plus,
  Play,
  Square,
  Sparkles,
  ChevronDown,
  Layers,
  Menu,
  X,
} from 'lucide-react';
import { useHubStore } from '../hooks/useHubStore';

export type TabId =
  | 'calendar'
  | 'tasks'
  | 'habits'
  | 'time'
  | 'goals'
  | 'learning'
  | 'jobs'
  | 'notes'
  | 'review'
  | 'reminders'
  | 'backup'
  | 'settings';

interface HeaderProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  onOpenQuickAdd: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenQuickAdd,
  darkMode,
  setDarkMode,
}) => {
  const { running_timer, stopTimer, syncStatus, outboxCount, tasks } = useHubStore();
  const [elapsedSec, setElapsedSec] = useState(0);

  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsToolsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Timer counter
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
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [running_timer?.started_at]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Primary core tabs (used daily)
  const primaryTabs: { id: TabId; label: string; icon: any; count?: number }[] = [
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      count: tasks.filter((t) => !t.done).length,
    },
    { id: 'habits', label: 'Habits', icon: Flame },
    { id: 'time', label: 'Time & Focus', icon: Clock },
    { id: 'goals', label: 'Goals', icon: Target },
  ];

  // Secondary tools (career, review, notes, reminders, backup)
  const secondaryTools: { id: TabId; label: string; description: string; icon: any }[] = [
    { id: 'jobs', label: 'Job Search', description: 'Pipeline, applications & follow-ups', icon: Briefcase },
    { id: 'learning', label: 'Learning Tracker', description: 'Certifications, courses & books', icon: BookOpen },
    { id: 'notes', label: 'Notes & Docs', description: 'Scratchpad with auto-save & versioning', icon: FileText },
    { id: 'review', label: 'Weekly Review', description: 'Weekly wins, metrics & reflections', icon: BarChart3 },
    { id: 'reminders', label: 'Reminders', description: 'Scheduled alerts & push notifications', icon: Bell },
    { id: 'backup', label: 'Backup & Export', description: 'JSON, CSV & Calendar exports', icon: HardDriveDownload },
  ];

  const isSecondaryActive = secondaryTools.some((tool) => tool.id === activeTab);
  const activeSecondaryTool = secondaryTools.find((tool) => tool.id === activeTab);

  const handleSelectTab = (tab: TabId) => {
    setActiveTab(tab);
    setIsToolsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur sticky top-0 z-40 transition-colors shadow-2xs">
      {/* Top Navbar Row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <button
            onClick={() => handleSelectTab('calendar')}
            className="flex flex-col text-left focus:outline-none"
          >
            <span className="font-display font-bold text-base text-stone-900 dark:text-stone-50 tracking-tight leading-none">
              Daily Work Hub
            </span>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium leading-tight mt-0.5 hidden sm:inline">
              Personal Cockpit
            </span>
          </button>
        </div>

        {/* Center: Streamlined Nav Items (Desktop & Tablet) */}
        <nav className="hidden md:flex items-center gap-1 bg-stone-100/70 dark:bg-stone-800/60 p-1 rounded-xl border border-stone-200/60 dark:border-stone-700/50">
          {primaryTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-white dark:bg-stone-900 text-stone-950 dark:text-amber-400 shadow-xs border border-stone-200/80 dark:border-stone-700'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-700/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-500' : 'text-stone-400 dark:text-stone-500'}`} />
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          {/* More Tools Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isSecondaryActive
                  ? 'bg-white dark:bg-stone-900 text-amber-600 dark:text-amber-400 shadow-xs border border-amber-300/80 dark:border-amber-700'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-700/40'
              }`}
            >
              {activeSecondaryTool ? (
                <>
                  <activeSecondaryTool.icon className="w-3.5 h-3.5 text-amber-500" />
                  <span>{activeSecondaryTool.label}</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5 text-stone-400" />
                  <span>More Tools</span>
                </>
              )}
              <ChevronDown
                className={`w-3 h-3 text-stone-400 transition-transform ${
                  isToolsDropdownOpen ? 'rotate-180 text-amber-500' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Popup */}
            {isToolsDropdownOpen && (
              <div className="absolute right-0 sm:left-0 top-full mt-2 w-64 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-1.5 shadow-xl z-50 animate-in fade-in duration-100 space-y-0.5">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 border-b border-stone-100 dark:border-stone-800 mb-1">
                  Tools & Career Trackers
                </div>
                {secondaryTools.map((tool) => {
                  const ToolIcon = tool.icon;
                  const isCurrent = activeTab === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => handleSelectTab(tool.id)}
                      className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                        isCurrent
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-semibold'
                          : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                      }`}
                    >
                      <ToolIcon
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isCurrent ? 'text-amber-500' : 'text-stone-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-xs leading-tight">{tool.label}</div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                          {tool.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Right Utilities Group */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Running Timer Pill */}
          {running_timer?.started_at ? (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 px-2 py-1 rounded-lg text-xs shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <button
                onClick={() => handleSelectTab('time')}
                className="font-mono font-semibold text-amber-900 dark:text-amber-200 hover:underline"
                title="Open Focus Timer"
              >
                {formatTimer(elapsedSec)}
              </button>
              <button
                onClick={async () => {
                  await stopTimer();
                }}
                className="p-1 rounded text-amber-700 hover:bg-amber-200/50 dark:text-amber-300 dark:hover:bg-amber-900/50 transition-colors"
                title="Stop Timer & Log Time"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            </div>
          ) : null}

          {/* Quick Add Button */}
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>

          {/* Sync status indicator */}
          <button
            onClick={() => handleSelectTab('settings')}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-colors ${
              syncStatus === 'synced'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : syncStatus === 'syncing'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                : 'bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
            }`}
            title="Database status (click to configure Supabase in Settings)"
          >
            {syncStatus === 'synced' ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-500" />
            ) : syncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-stone-400" />
            )}
            <span className="hidden lg:inline capitalize">
              {syncStatus === 'local_only' ? 'Local DB' : syncStatus}
            </span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => handleSelectTab('settings')}
            className={`p-2 rounded-xl transition-colors ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-stone-950 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="App & Supabase Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 md:hidden"
            title="Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3 space-y-3 animate-in fade-in duration-100">
          <div className="grid grid-cols-2 gap-1.5">
            {primaryTabs.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold ${
                    isActive
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-stone-100 dark:border-stone-800 pt-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
              Tools & Resources
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {secondaryTools.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTab === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleSelectTab(tool.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold ${
                      isActive
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
