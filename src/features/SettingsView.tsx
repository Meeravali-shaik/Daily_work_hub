import React, { useState } from 'react';
import {
  Settings,
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  HardDrive,
  Clock,
  Shield,
  Layers,
  Key,
  ExternalLink,
} from 'lucide-react';
import { useHubStore } from '../hooks/useHubStore';
import {
  getSupabaseCredentials,
  testSupabaseConnection,
  initSupabase,
} from '../services/supabase';

export const SettingsView: React.FC = () => {
  const {
    settings,
    syncStatus,
    outboxCount,
    lastSyncTime,
    errorMessage,
    flushOutbox,
    pullAll,
    saveRow,
  } = useHubStore();

  const creds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(creds.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(creds.key);

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [timezone, setTimezone] = useState(settings.timezone || 'Asia/Kolkata');
  const [weekStartsOn, setWeekStartsOn] = useState(settings.week_starts_on ?? 1);
  const [digestTime, setDigestTime] = useState(settings.digest_time || '08:30');

  const [copiedSql, setCopiedSql] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Exact SQL migration from Section 6 & 7 of the spec
  const sqlMigrationCode = `-- Daily Work Hub: Complete Supabase Migration (Section 6 & 7)
create extension if not exists pgcrypto;

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null, description text, category text default 'Career',
  horizon text check (horizon in ('quarter','year','multi-year')),
  target_date date,
  status text not null default 'active' check (status in ('active','paused','done','dropped')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  goal_id uuid not null references goals on delete cascade,
  title text not null, due_date date, done boolean not null default false, sort int default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null, category text not null default 'Work',
  priority text not null default 'Medium' check (priority in ('High','Medium','Low')),
  due_date date, due_time time,
  repeat_rule text check (repeat_rule in ('daily','weekly','monthly')),
  done boolean not null default false, done_at timestamptz,
  goal_id uuid references goals on delete set null,
  milestone_id uuid references milestones on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table if not exists habit_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habit_id uuid not null references habits on delete cascade,
  day date not null, unique (habit_id, day),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  label text, category text not null default 'Work',
  started_at timestamptz not null, ended_at timestamptz, minutes numeric not null,
  source text not null default 'timer' check (source in ('timer','manual','pomodoro')),
  task_id uuid references tasks on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table if not exists running_timer (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users on delete cascade,
  label text, category text, started_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null, platform text, kind text default 'Course',
  progress int not null default 0 check (progress between 0 and 100), target_date date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  company text not null, role text not null,
  status text not null default 'Applied' check (status in ('Wishlist','Applied','Interview','Offer','Rejected')),
  applied_on date default current_date, follow_up_on date, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text, body text not null default '', version int not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table if not exists weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week_start date not null, reflection text, unique (user_id, week_start),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null, remind_at timestamptz not null,
  task_id uuid references tasks on delete cascade, goal_id uuid references goals on delete cascade,
  channels text[] not null default '{push}',
  repeat_rule text check (repeat_rule in ('daily','weekly','monthly')),
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','cancelled')),
  sent_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users on delete cascade,
  timezone text not null default 'Asia/Kolkata', week_starts_on int not null default 1,
  digest_time time default '08:30', email_reminders boolean not null default false,
  calendar_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

-- RLS & Realtime
do $$ declare t text; begin
  foreach t in array array['goals','milestones','tasks','habits','habit_checkins','time_entries',
    'running_timer','courses','job_applications','notes','weekly_reviews','reminders','user_settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists own_rows on %I', t);
    execute format('create policy own_rows on %I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('drop trigger if exists set_updated on %I', t);
    execute format('create trigger set_updated before update on %I for each row execute function set_updated_at()', t);
  end loop;
end $$;

alter publication supabase_realtime add table goals, milestones, tasks, habits, habit_checkins,
  time_entries, running_timer, courses, job_applications, notes, weekly_reviews, reminders;`;

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('dwh_supabase_url', supabaseUrl.trim());
    localStorage.setItem('dwh_supabase_anon_key', supabaseAnonKey.trim());
    initSupabase();

    await saveRow('user_settings', {
      ...settings,
      timezone,
      week_starts_on: weekStartsOn,
      digest_time: digestTime,
      supabase_url: supabaseUrl.trim(),
      supabase_anon_key: supabaseAnonKey.trim(),
    });

    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);

    if (supabaseUrl && supabaseAnonKey) {
      handleTest();
    }
  };

  const handleTest = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setTestResult({
        success: false,
        message: 'Please provide both the Supabase URL and Anon Key.',
      });
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    const res = await testSupabaseConnection(supabaseUrl.trim(), supabaseAnonKey.trim());
    setTestResult(res);
    setTestingConnection(false);

    if (res.success) {
      pullAll();
      flushOutbox();
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlMigrationCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs">
        <h2 className="font-display font-bold text-xl text-stone-900 dark:text-stone-50 flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-500" />
          <span>Settings & Supabase Sync Engine</span>
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          Configure Supabase PostgreSQL backend, outbox synchronization, timezones, and SQL migrations.
        </p>
      </div>

      {/* Sync Status Banner */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-2xl border ${
              syncStatus === 'synced'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-300 dark:border-emerald-800'
                : syncStatus === 'syncing'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-300 dark:border-amber-800'
                : syncStatus === 'offline'
                ? 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700'
                : 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 border-sky-300 dark:border-sky-800'
            }`}
          >
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-stone-900 dark:text-stone-100 capitalize">
                Status: {syncStatus === 'local_only' ? 'Local IndexedDB (Active)' : syncStatus}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-mono">
                {outboxCount} in outbox
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {lastSyncTime ? `Last synced: ${lastSyncTime}` : 'All writes committed locally with zero latency'}
            </p>
          </div>
        </div>

        {/* Sync trigger buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => pullAll()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Pull Cloud</span>
          </button>
          <button
            onClick={() => flushOutbox()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-xs transition-colors"
          >
            <span>Flush Outbox ({outboxCount})</span>
          </button>
        </div>
      </div>

      {/* Supabase Connection Form */}
      <form onSubmit={handleSaveConnection} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="font-display font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" />
              <span>Supabase Cloud Integration</span>
            </h3>
            <p className="text-xs text-stone-500">
              Provide your Supabase project credentials to enable multi-device sync and real-time updates.
            </p>
          </div>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 hover:underline"
          >
            <span>Supabase Dashboard</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {testResult && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Project URL (<code className="font-mono text-amber-600">VITE_SUPABASE_URL</code>)
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Public Anon Key (<code className="font-mono text-amber-600">VITE_SUPABASE_ANON_KEY</code>)
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* General App Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Timezone
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Week Starts On
            </label>
            <select
              value={weekStartsOn}
              onChange={(e) => setWeekStartsOn(Number(e.target.value))}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              <option value={1}>Monday (Recommended)</option>
              <option value={0}>Sunday</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Daily Digest Morning Time
            </label>
            <input
              type="time"
              value={digestTime}
              onChange={(e) => setDigestTime(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={handleTest}
            disabled={testingConnection}
            className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>

          <div className="flex items-center gap-2">
            {settingsSaved && <span className="text-xs text-emerald-600 font-semibold">✓ Settings Saved</span>}
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </form>

      {/* SQL Migration Scripts (Section 6 & 7) */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" />
              <span>Supabase Database Schema & RLS Policies</span>
            </h3>
            <p className="text-xs text-stone-500">
              Run this SQL script in your Supabase SQL Editor to initialize all tables, triggers, and Row Level Security.
            </p>
          </div>

          <button
            onClick={handleCopySql}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Script'}</span>
          </button>
        </div>

        <div className="bg-stone-950 text-stone-200 p-4 rounded-xl font-mono text-xs max-h-64 overflow-y-auto border border-stone-800 leading-relaxed">
          <pre>{sqlMigrationCode}</pre>
        </div>
      </div>
    </div>
  );
};
