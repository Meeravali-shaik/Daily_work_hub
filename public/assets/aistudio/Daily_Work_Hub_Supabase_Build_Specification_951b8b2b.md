# Daily Work Hub: Supabase Build Specification

Version 1.0 · October 22, 2026 · Covers calendar view, reminders and notifications, long-term goals, backup and export, and sync between devices

## 1. Purpose and scope

This document describes how to grow the Daily Work Hub (tasks, daily habits, time tracker, focus timer, learning tracker, job search, notes and weekly review) into a cloud-backed personal productivity app. Supabase provides sign-in, the database, realtime sync, file storage and scheduled jobs.

**In scope**

- Calendar view (month, week, day) combining tasks, reminders, goals and tracked time
- Reminders and notifications (in-app, browser push, optional email)
- Long-term goals with milestones and linked tasks
- Backup, export and import (JSON, CSV, calendar file)
- Sync between devices, including offline use
- Moving the existing data from the browser into Supabase

**Out of scope for version 1:** sharing with other people or teams, native mobile apps, payments, and AI features.

## 2. Important constraint: where the app must be hosted

The version currently published inside Claude is a sandboxed page. It cannot send network requests to other sites, so it cannot reach Supabase, and its storage is limited to one browser. To use Supabase, the app must be hosted as a normal website. GitHub Pages, Netlify, Vercel and Cloudflare Pages all offer free tiers and are suitable. Everything below assumes that setup. The existing page stays useful as a working prototype: its screens and logic are ported, not thrown away.

## 3. Architecture

```
Browser (installable web app / PWA)            Supabase
-----------------------------------            --------
UI + service worker                  <-HTTPS-> Auth (magic link, optional Google)
IndexedDB cache + outbox queue       <--WS---> Realtime (postgres_changes)
supabase-js client                   --REST--> Postgres + Row Level Security
                                               Storage (private backups bucket)
Browser push service (FCM, APNs,     <-------- Edge Functions: send-reminders,
  Mozilla autopush)                            calendar-feed, weekly-backup
                                               pg_cron + pg_net (schedules)
```

| Component | Job |
| --- | --- |
| Front end | Static files hosted on any static host; talks to Supabase with the public anon key |
| Auth | Identifies the user; every request carries a signed token |
| Postgres + RLS | Stores all data; Row Level Security guarantees each user sees only their own rows |
| Realtime | Pushes changes to other open devices within about a second |
| Edge Functions | Run server-side code: send reminders, serve the calendar feed, create backups |
| pg\_cron | Triggers the reminder function every minute and the backup function weekly |
| Storage | Holds weekly backup files in a private bucket |

## 4. Technology choices

| Area | Recommendation | Why |
| --- | --- | --- |
| Build tool | Vite with plain JavaScript modules | Small learning curve, fast, easy to deploy as static files |
| Supabase client | @supabase/supabase-js v2 | Official client for auth, queries, realtime and storage |
| Local cache | IndexedDB (via the small idb library) | Works offline, far larger than localStorage |
| Calendar UI | FullCalendar (core, daygrid, timegrid, interaction) | Month, week and day views plus drag to reschedule |
| Push | Web Push with VAPID keys, sent by an Edge Function | Standard, no third-party account needed |
| Email (optional) | Resend or any SMTP service called from an Edge Function | Fallback when push is unavailable |
| Hosting | Cloudflare Pages, Netlify, Vercel or GitHub Pages | Free HTTPS, required for service workers and push |

Check current versions and limits in the official Supabase and FullCalendar documentation before starting, since both change over time.

## 5. Supabase project setup

1. Create a Supabase project in a region near you (choose Mumbai if it is offered) and save the database password.
2. Under Authentication, enable Email (magic link). Set the Site URL to your hosted address and add your local development address (for example http://localhost:5173) to the redirect URLs. Optionally enable Google sign-in.
3. Open the SQL editor and run the migration in section 6 and the policies in section 7.
4. Turn on Realtime for the tables listed at the end of section 6.
5. Create a private Storage bucket named backups.
6. Install the Supabase CLI, create the three Edge Functions, and set their secrets (see Appendix A).
7. Schedule the functions with pg\_cron (section 10.4 and section 12.4).
8. Put the project URL and anon key in the front end's environment file. The anon key is designed to be public; the service role key must never appear in front-end code.

## 6. Database schema

Every table has the same bookkeeping columns: id (client-generated UUID so offline creation works), user\_id (filled automatically from the signed-in user), created\_at, updated\_at (set by a trigger) and deleted\_at (soft delete, needed so deletions can sync to other devices).

```sql
create extension if not exists pgcrypto;
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null, description text, category text default 'Career',
  horizon text check (horizon in ('quarter','year','multi-year')),
  target_date date,
  status text not null default 'active' check (status in ('active','paused','done','dropped')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  goal_id uuid not null references goals on delete cascade,
  title text not null, due_date date, done boolean not null default false, sort int default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table tasks (
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

create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table habit_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habit_id uuid not null references habits on delete cascade,
  day date not null, unique (habit_id, day),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  label text, category text not null default 'Work',
  started_at timestamptz not null, ended_at timestamptz, minutes numeric not null,
  source text not null default 'timer' check (source in ('timer','manual','pomodoro')),
  task_id uuid references tasks on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

-- one row per user: lets a running timer follow you between devices
create table running_timer (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users on delete cascade,
  label text, category text, started_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null, platform text, kind text default 'Course',
  progress int not null default 0 check (progress between 0 and 100), target_date date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  company text not null, role text not null,
  status text not null default 'Applied' check (status in ('Wishlist','Applied','Interview','Offer','Rejected')),
  applied_on date default current_date, follow_up_on date, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text, body text not null default '', version int not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week_start date not null, reflection text, unique (user_id, week_start),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table reminders (
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

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique, p256dh text not null, auth text not null, device_label text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users on delete cascade,
  timezone text not null default 'Asia/Kolkata', week_starts_on int not null default 1,
  digest_time time default '08:30', email_reminders boolean not null default false,
  calendar_token text unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create index on tasks (user_id, due_date);
create index on time_entries (user_id, started_at);
create index on reminders (status, remind_at);
create index on milestones (goal_id);

-- realtime for every synced table except push_subscriptions and user_settings
alter publication supabase_realtime add table goals, milestones, tasks, habits, habit_checkins,
  time_entries, running_timer, courses, job_applications, notes, weekly_reviews, reminders;
```

## 7. Row Level Security

RLS is what makes it safe for the front end to talk to the database directly. Without it, anyone holding the public anon key could read every row. Enable it on every table and allow a user to touch only rows where user\_id matches their own id.

```sql
do $$ declare t text; begin
  foreach t in array array['goals','milestones','tasks','habits','habit_checkins','time_entries',
    'running_timer','courses','job_applications','notes','weekly_reviews','reminders',
    'push_subscriptions','user_settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy own_rows on %I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create trigger set_updated before update on %I for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- backups bucket: each user may read only their own folder
create policy read_own_backups on storage.objects for select
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

**Acceptance test:** create two accounts, add data to each, and confirm from account B (through the app and through a direct API call) that none of account A's rows are visible or editable.

## 8. Sync between devices

### 8.1 Requirements

- Changes made on one device appear on others within a few seconds while both are online.
- The app works fully offline; changes made offline upload when the connection returns.
- Deleting on one device deletes everywhere, and nothing is lost to a simultaneous edit without a trace.

### 8.2 Design

| Concern | Decision |
| --- | --- |
| Source of truth | Postgres. The local IndexedDB copy is a cache plus an outbox of unsent changes |
| IDs | Created on the device with crypto.randomUUID(), so offline creation never needs the server |
| Writes | Write to IndexedDB first (the screen updates instantly), queue the change, then upsert to Supabase |
| Initial and catch-up pull | Fetch rows with updated\_at greater than the stored last-sync time, table by table, in pages of 500 |
| Live updates | Subscribe to Realtime postgres\_changes and apply each change to IndexedDB and the screen |
| Deletes | Soft delete (set deleted\_at); the UI hides rows with deleted\_at set; a monthly job purges rows older than 90 days |
| Conflicts | Last write wins, using the server-set updated\_at. Notes are the exception: compare the version column, and if both sides changed, keep the server copy and save the local text as a conflict copy note |
| Running timer | Stored in running\_timer, so starting on a laptop shows a live timer on the phone; stopping on either device creates one time entry |

```js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

export async function saveRow(table, row) {
  row.id ??= crypto.randomUUID()
  await idb.put(table, row)            // optimistic local write
  await outbox.add({ table, row })     // queued for upload
  flushOutbox()
}

export async function flushOutbox() {
  for (const job of await outbox.all()) {
    const { error } = await supabase.from(job.table).upsert(job.row)
    if (error) return                  // offline or failing: retry later
    await outbox.remove(job.key)
  }
}

export async function pull(table) {
  const since = await idb.getMeta('sync:' + table) ?? '1970-01-01'
  const { data } = await supabase.from(table).select('*').gt('updated_at', since).order('updated_at').limit(500)
  for (const r of data ?? []) await idb.put(table, r)
  if (data?.length) await idb.setMeta('sync:' + table, data[data.length - 1].updated_at)
}

supabase.channel('sync').on('postgres_changes', { event: '*', schema: 'public' },
  (p) => applyRemoteChange(p.table, p.new ?? p.old)).subscribe()

addEventListener('online', flushOutbox)
document.addEventListener('visibilitychange', () => { if (!document.hidden) pullAll() })
```

### 8.3 Acceptance criteria

- Add a task on a phone; it appears on the laptop in under 5 seconds.
- Turn on airplane mode, add three tasks and tick one; reconnect; all changes appear on the other device.
- Edit the same note on two offline devices; after reconnecting, one version wins and the other is saved as a conflict copy.
- Start the timer on one device and stop it on another; exactly one time entry results.

## 9. Calendar view

### 9.1 Requirements

- Month, week, day and agenda views; a Today button; keyboard navigation.
- Shows tasks with due dates, reminders, milestone dates, goal target dates, job follow-ups and tracked time.
- Colors by category; a legend with toggles to hide or show each type.
- Drag a task to another day or time to reschedule it; click an empty slot to create a task or reminder there.
- Repeating tasks appear on every occurrence in the visible range.
- Week and day views show tracked time as blocks, so you can see how the day actually went.

### 9.2 Data mapping

| Calendar item | Source | Notes |
| --- | --- | --- |
| Task | tasks.due\_date and due\_time | All-day if no time; strikethrough when done |
| Repeating task | tasks.repeat\_rule | Occurrences are generated in the browser for the visible range only |
| Reminder | reminders.remind\_at | Shown with a bell icon |
| Milestone | milestones.due\_date | Diamond marker, linked to its goal |
| Goal target | goals.target\_date | Flag marker |
| Follow-up | job\_applications.follow\_up\_on | Briefcase icon |
| Tracked time | time\_entries.started\_at to ended\_at | Read-only blocks in week and day views |

### 9.3 Behavior details

- Load only the visible range plus one week either side, from the local cache. Dates are stored as plain dates; times are interpreted in the timezone saved in user\_settings, so travelling does not move your tasks.
- Dragging updates due\_date and due\_time through the normal save path, so it syncs like any other edit.
- **Calendar subscription:** the calendar-feed Edge Function returns an .ics file of tasks, reminders and milestones. The address contains the secret calendar\_token from user\_settings, so Google Calendar, Apple Calendar or Outlook can subscribe to it. A Regenerate link button replaces the token and cancels old links.

## 10. Reminders and notifications

### 10.1 Requirements

- Any task, goal, milestone or job follow-up can have one or more reminders (at a time, or a set offset before it is due).
- Reminders can repeat daily, weekly or monthly.
- Delivery channels: in-app banner, browser or phone push notification, and optional email.
- A daily digest (default 8:30 in your timezone) lists today's tasks, overdue items and reminders.
- Snooze (10 minutes, 1 hour, tomorrow) and mark done directly from the notification.

### 10.2 Delivery tiers

| Tier | Works when | Limits |
| --- | --- | --- |
| In-app banner and Notification API | The app is open or in the background tab | Nothing arrives if the app is closed |
| Web Push | The app is closed, on desktop browsers and Android | Requires HTTPS, a service worker and the user's permission |
| Web Push on iPhone or iPad | Only after the site is added to the Home Screen as an installed web app | Needs a recent iOS version; test early on a real device |
| Email | Always | Needs an email provider account and a verified sender |

### 10.3 Client setup

Add a web app manifest (name, icons, display set to standalone) and a service worker. Ask for notification permission only after the user taps a button such as Turn on reminders, never on page load.

```js
async function enablePush() {
  const reg = await navigator.serviceWorker.register('/sw.js')
  if (await Notification.requestPermission() !== 'granted') return
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY })
  const j = sub.toJSON()
  await supabase.from('push_subscriptions').upsert({
    endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, device_label: navigator.userAgent })
}
```

```js
// sw.js
self.addEventListener('push', (e) => {
  const d = e.data.json()
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, data: { url: d.url },
    actions: [{ action: 'done', title: 'Done' }, { action: 'snooze', title: 'Snooze 1h' }] }))
})
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'))
})
```

### 10.4 Server side: scheduling and sending

A pg\_cron job calls the send-reminders Edge Function every minute. The function claims due reminders safely (so two runs never send the same one), sends them, and records the result.

```sql
create or replace function claim_due_reminders(batch int default 100)
returns setof reminders language sql security definer as $$
  update reminders set status = 'sending'
  where id in (select id from reminders
    where status = 'pending' and remind_at <= now() and deleted_at is null
    order by remind_at limit batch for update skip locked)
  returning *;
$$;
revoke execute on function claim_due_reminders from public, anon, authenticated;

select cron.schedule('send-reminders', '* * * * *', $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'),
    body := '{}'::jsonb) $$);
```

```ts
// supabase/functions/send-reminders/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

webpush.setVapidDetails('mailto:you@example.com', Deno.env.get('VAPID_PUBLIC')!, Deno.env.get('VAPID_PRIVATE')!)
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${Deno.env.get('CRON_SECRET')}`)
    return new Response('unauthorized', { status: 401 })
  const { data: due } = await db.rpc('claim_due_reminders', { batch: 100 })
  for (const r of due ?? []) {
    const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', r.user_id).is('deleted_at', null)
    let ok = false
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: r.title, body: 'Reminder', url: '/#calendar' }))
        ok = true
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) await db.from('push_subscriptions').delete().eq('id', s.id)
      }
    }
    // email channel: call your email provider here when r.channels includes 'email'
    await db.from('reminders').update({ status: ok ? 'sent' : 'failed', sent_at: new Date().toISOString() }).eq('id', r.id)
    if (r.repeat_rule) { /* insert the next pending reminder using the repeat interval */ }
  }
  return new Response('ok')
})
```

The daily digest uses the same pattern: a second cron job runs every 15 minutes, and the function sends a digest to each user whose local digest time just passed and who has not received one today.

### 10.5 Acceptance criteria

- A reminder set for two minutes from now arrives on a laptop with the app closed.
- The same reminder arrives on an installed phone app.
- A reminder is never delivered twice, even if the function runs twice at once.
- Expired subscriptions are cleaned up automatically; turning reminders off removes the device's subscription.

## 11. Long-term goals

### 11.1 Requirements

- Goals with a title, description, category, horizon (quarter, year or multi-year), target date and status.
- Each goal has milestones (ordered checklist with optional dates) and linked tasks.
- Progress is calculated automatically: the share of milestones completed, or the share of linked tasks completed if there are no milestones.
- A goals page grouped by horizon, with a progress bar per goal and an at-risk flag when the target date is near and progress is low.
- Link time entries to tasks, so each goal shows total hours invested.
- Quarterly and yearly review prompts, shown in the weekly review tab when a period ends.

### 11.2 Example for an early-career IT user

| Goal | Horizon | Milestones |
| --- | --- | --- |
| Get my first IT job | Year | Resume ready; 3 portfolio projects on GitHub; 50 applications sent; 10 interviews; offer |
| Earn a cloud certification | Quarter | Finish course; complete 3 practice exams; book exam; pass |
| Learn SQL well | Quarter | Basics course; 30 practice queries; one project using a real database |

### 11.3 Behavior details

- Progress is computed in the browser from milestones and tasks, not stored, so it can never go out of date.
- Completing the last milestone offers to mark the goal done and add a note about what was learned.
- Goals appear on the calendar by their target date, and milestones by their own dates.

## 12. Backup, export and import

### 12.1 Requirements

- One-click full export to a single JSON file containing every table.
- CSV export per area (tasks, time entries, goals, job applications, courses).
- Calendar export as an .ics file.
- Import from a previously exported JSON file, with a preview and no duplicates.
- Automatic weekly backup stored in the user's private Storage folder.
- Delete my data: removes all rows and files after a typed confirmation.

### 12.2 Export file format

```json
{
  'app': 'daily-work-hub',
  'schema_version': 1,
  'exported_at': '2026-10-22T09:00:00Z',
  'timezone': 'Asia/Kolkata',
  'tables': { 'tasks': [], 'goals': [], 'time_entries': [] }
}
```

The real file uses standard double quotes; single quotes are shown here only to keep this document readable.

### 12.3 Import rules

- Reject files with an unknown app or a newer schema\_version than the app supports.
- Show counts per table before importing.
- Insert with upsert on id, so importing the same file twice changes nothing.
- Rows always take the signed-in user's id; any user\_id in the file is ignored.

### 12.4 Automatic backups

The weekly-backup Edge Function runs through pg\_cron on Sunday night. For each user it writes backups/USER\_ID/YYYY-MM-DD.json using the service role key, then deletes all but the newest 8 files. Supabase also offers platform-level database backups, but what is included depends on your plan, so treat the exported files as your own safety net.

## 13. Moving existing data into Supabase

1. On first sign-in, the app checks the browser for the old localStorage record (key dailyhub.v1).
2. If found, it shows a summary (for example: 12 tasks, 3 habits, 40 time entries, 5 applications) and asks to import.
3. Convert each item: create new UUIDs; old task done and due fields map to done, done\_at and due\_date; habit day lists become rows in habit\_checkins; old log entries become time\_entries with started\_at set to noon of their day; the single notes text becomes one note; weekly reflections map to weekly\_reviews.
4. Upload through the outbox so it works with flaky connections.
5. Keep the old data under a renamed key for 30 days, then offer to remove it.

## 14. Front-end structure

```
src/
  main.js              start-up, routing by URL hash, auth gate
  supabase.js          client creation
  sync/ (idb.js, outbox.js, pull.js, realtime.js)
  features/ tasks.js habits.js time.js focus.js calendar.js goals.js learning.js jobs.js notes.js review.js reminders.js backup.js settings.js
  ui/ components, styles.css (light and dark themes)
public/ manifest.webmanifest, sw.js, icons/
supabase/ migrations/*.sql, functions/send-reminders, calendar-feed, weekly-backup
```

Keep the existing look: Bricolage Grotesque and IBM Plex Sans, light and dark themes, tabs for navigation. Add Calendar, Goals and Settings tabs, a sync status indicator (synced, syncing, offline) and a sign-out button.

## 15. Security and privacy

- RLS on every table, tested with two accounts before launch.
- Only the anon key in the browser. The service role key, VAPID private key, CRON\_SECRET and email key live only as Edge Function secrets.
- Escape all user text before putting it on the page (the current prototype already does this) and add a Content Security Policy that allows only your own origin and your Supabase project.
- Magic-link sign-in means no passwords to store. Optionally require re-authentication before export or delete-all.
- The calendar feed token is a secret: treat the link like a password and offer regeneration.
- Personal data stays in your own Supabase project; there is no third-party analytics.

## 16. Testing checklist

| Area | Test |
| --- | --- |
| Auth | Sign in, sign out, expired session, magic link on a second device |
| RLS | Two-account isolation test, including direct API calls |
| Sync | Online edit, offline edit, simultaneous edit, delete propagation, large first sync |
| Timer | Start on one device, stop on another; page reload while running |
| Calendar | Timezone change, month boundary, repeating task, drag to reschedule |
| Reminders | Closed-app push, duplicate protection, snooze, expired subscription, iPhone installed app |
| Goals | Progress recalculation, deleting a milestone, linked task completion |
| Backup | Export, import into a fresh account, import the same file twice, weekly backup file appears |
| PWA | Install prompt, offline start-up, update of a new version |
| Accessibility | Keyboard-only use, screen reader labels, contrast in both themes |

## 17. Roadmap

| Phase | Work | Rough effort for one person |
| --- | --- | --- |
| 0 | Create Supabase project, repository, hosting, project skeleton | 0.5 day |
| 1 | Auth, schema, RLS, port existing screens to read and write Supabase | 3 to 4 days |
| 2 | IndexedDB cache, outbox, realtime sync, running timer sync | 4 to 5 days |
| 3 | Migration from localStorage | 1 to 2 days |
| 4 | Goals and milestones | 2 to 3 days |
| 5 | Calendar view and calendar feed | 3 to 4 days |
| 6 | Reminders: in-app, push, email, digest | 4 to 5 days |
| 7 | Export, import, weekly backup, delete-all | 2 to 3 days |
| 8 | PWA polish, testing, accessibility, launch | 3 to 4 days |

Total: roughly 3 to 4 weeks of part-time work. A sensible first release is Phases 0 to 3 (cloud sync with your current features), followed by one new feature per release.

## 18. Risks and open questions

| Risk or question | Mitigation |
| --- | --- |
| Free Supabase projects can be paused after a period of inactivity | Check the current policy; use the app regularly or move to a paid plan if it becomes a problem |
| iPhone push needs an installed Home Screen app | Document the install steps in the app; use email as a fallback |
| Notification permission is denied by the user | Explain the benefit first, show in-app banners, offer email |
| Last-write-wins can overwrite a quick edit | Soft deletes, conflict copies for notes, and the weekly backup limit the damage |
| Time zones and daylight saving | Store instants as UTC, dates as plain dates, and always render using the saved timezone |
| Which email provider to use | Decide in Phase 6; any provider with an API works |
| Single user or multiple accounts | The design supports many users; version 1 targets one |

## Appendix A: Configuration reference

| Name | Where | Secret |
| --- | --- | --- |
| VITE\_SUPABASE\_URL | Front-end environment | No |
| VITE\_SUPABASE\_ANON\_KEY | Front-end environment | No (public by design; protected by RLS) |
| VITE\_VAPID\_PUBLIC\_KEY | Front-end environment | No |
| VAPID\_PUBLIC and VAPID\_PRIVATE | Edge Function secrets | Private key: yes |
| SUPABASE\_SERVICE\_ROLE\_KEY | Edge Function secrets only | Yes, never in the browser |
| CRON\_SECRET | Edge Function secrets and the cron job | Yes |
| EMAIL\_API\_KEY | Edge Function secrets | Yes |

Generate the VAPID key pair once with the web-push command line tool (npx web-push generate-vapid-keys) and keep the private key safe.

## Appendix B: Suggested next steps

1. Create the Supabase project and run the SQL in sections 6 and 7.
2. Create the repository and deploy a blank page to your chosen host to confirm HTTPS works.
3. Build Phases 1 to 3 so your current app runs on Supabase with sync.
4. Add the remaining features in roadmap order, releasing after each one.
