import { useEffect, useMemo, useState } from 'react';
import { Check, Flame, Plus, Target, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'habits';
const STATS_KEY = 'habitDailyStats';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftDay(iso, delta) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function loadHabits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isDoneOn(habit, date) {
  return habit.logs?.some((l) => l.date === date && l.done) ?? false;
}

function calcStreak(habit, today) {
  let cursor = isDoneOn(habit, today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (isDoneOn(habit, cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toggleHabitDone(habit, date) {
  const idx = habit.logs.findIndex((l) => l.date === date);
  const time = nowHHMM();
  let logs;
  if (idx >= 0) {
    logs = [...habit.logs];
    logs[idx] = { ...logs[idx], done: !logs[idx].done, time };
  } else {
    logs = [...habit.logs, { date, done: true, time }];
  }
  return { ...habit, logs };
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function writeStats(habits) {
  const today = todayISO();
  const total = habits.length;
  const completed = habits.filter((h) => isDoneOn(h, today)).length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  localStorage.setItem(
    STATS_KEY,
    JSON.stringify({ date: today, total, completed, rate }),
  );
}

function persist(habits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  writeStats(habits);
}

export default function Habit() {
  const [habits, setHabits] = useState([]);
  const today = todayISO();

  useEffect(() => {
    const initial = loadHabits();
    setHabits(initial);
    writeStats(initial);
  }, []);

  const stats = useMemo(() => {
    const total = habits.length;
    const completed = habits.filter((h) => isDoneOn(h, today)).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, rate };
  }, [habits, today]);

  function add({ habit_name, min_action }) {
    const next = [
      ...habits,
      { id: newId(), habit_name, min_action, logs: [] },
    ];
    setHabits(next);
    persist(next);
  }

  function toggle(id) {
    const next = habits.map((h) =>
      h.id === id ? toggleHabitDone(h, today) : h,
    );
    setHabits(next);
    persist(next);
  }

  function remove(id) {
    const next = habits.filter((h) => h.id !== id);
    setHabits(next);
    persist(next);
  }

  return (
    <section className="mx-auto max-w-3xl">
      <header className="animate-fade-in pt-2">
        <p className="app-eyebrow">習慣を育てる</p>
        <h1 className="app-title mt-0.5 text-2xl">今日のチェック</h1>
      </header>

      <DailySummary stats={stats} today={today} />
      <AddForm onAdd={add} />
      <HabitList
        habits={habits}
        today={today}
        onToggle={toggle}
        onRemove={remove}
      />
    </section>
  );
}

function DailySummary({ stats, today }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(stats.rate), 120);
    return () => clearTimeout(t);
  }, [stats.rate]);

  return (
    <div
      className="jarvis-panel animate-glow-in mt-6 overflow-hidden p-5"
      style={{ animationDelay: '80ms' }}
    >
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display text-[11px] tracking-[0.28em] text-jarvis-cyan">
            TODAY
          </p>
          <p className="jarvis-subtitle text-[10px]">// {today}</p>
          <p className="mt-1 font-mono text-[11px] text-jarvis-dim">
            {stats.completed} / {stats.total} 完了
          </p>
        </div>
        <p
          className="font-display text-4xl font-bold tabular-nums text-jarvis-accent"
          style={{ textShadow: '0 0 10px rgba(0, 229, 255, 0.55)' }}
        >
          {stats.rate}
          <span className="ml-1 font-body text-base text-jarvis-dim">%</span>
        </p>
      </div>
      <div className="mt-3 h-1 overflow-hidden bg-jarvis-border/60">
        <div
          className="h-full bg-jarvis-cyan shadow-[0_0_8px_rgba(0,229,255,0.6)] transition-[width] duration-700 ease-out"
          style={{ width: `${shown}%` }}
        />
      </div>
    </div>
  );
}

function AddForm({ onAdd }) {
  const [name, setName] = useState('');
  const [action, setAction] = useState('');
  const valid = name.trim().length > 0 && action.trim().length > 0;

  function submit(e) {
    e.preventDefault();
    if (!valid) return;
    onAdd({ habit_name: name.trim(), min_action: action.trim() });
    setName('');
    setAction('');
  }

  return (
    <form
      onSubmit={submit}
      className="jarvis-panel animate-fade-in mt-4 space-y-3 p-4"
      style={{ animationDelay: '180ms' }}
    >
      <div className="flex items-baseline justify-between">
        <p className="font-display text-[11px] tracking-[0.28em] text-jarvis-cyan">
          NEW_HABIT
        </p>
        <p className="jarvis-subtitle text-[10px]">// REGISTER</p>
      </div>

      <Field label="習慣名" sub="HABIT_NAME">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：英単語を覚える"
          maxLength={60}
          className="w-full border border-jarvis-border bg-jarvis-bg/60 px-3 py-2 font-body text-jarvis-text placeholder:text-jarvis-dim/70 outline-none transition focus:border-jarvis-cyan focus:shadow-glow-soft"
        />
      </Field>

      <Field label="最小アクション" sub="MIN_ACTION">
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="例：1単語だけ"
          maxLength={60}
          className="w-full border border-jarvis-border bg-jarvis-bg/60 px-3 py-2 font-body text-jarvis-text placeholder:text-jarvis-dim/70 outline-none transition focus:border-jarvis-cyan focus:shadow-glow-soft"
        />
      </Field>

      <button
        type="submit"
        disabled={!valid}
        className={[
          'group relative flex w-full items-center justify-center gap-2 overflow-hidden border px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.28em] transition',
          valid
            ? 'border-jarvis-cyan bg-jarvis-cyan/10 text-jarvis-accent shadow-glow hover:bg-jarvis-cyan/20'
            : 'cursor-not-allowed border-jarvis-border bg-jarvis-panel/60 text-jarvis-dim',
        ].join(' ')}
      >
        {valid && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-jarvis-cyan/30 to-transparent animate-sweep"
          />
        )}
        <Plus size={16} strokeWidth={2.25} />
        <span>追加 · ADD</span>
      </button>
    </form>
  );
}

function Field({ label, sub, children }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline gap-2">
        <span className="font-display text-[11px] tracking-[0.22em] text-jarvis-accent">
          {label}
        </span>
        <span className="font-mono text-[10px] tracking-[0.16em] text-jarvis-dim">
          {sub}
        </span>
      </span>
      {children}
    </label>
  );
}

function HabitList({ habits, today, onToggle, onRemove }) {
  if (habits.length === 0) {
    return (
      <div
        className="jarvis-panel animate-fade-in mt-4 p-6 text-center"
        style={{ animationDelay: '260ms' }}
      >
        <p className="font-mono text-sm text-jarvis-dim">
          // NO_HABITS_REGISTERED
        </p>
        <p className="mt-2 font-body text-sm text-jarvis-text/60">
          最初の習慣を追加してみましょう
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {habits.map((h, i) => (
        <li
          key={h.id}
          className="animate-fade-in"
          style={{ animationDelay: `${260 + i * 70}ms` }}
        >
          <HabitRow
            habit={h}
            today={today}
            onToggle={() => onToggle(h.id)}
            onRemove={() => onRemove(h.id)}
          />
        </li>
      ))}
    </ul>
  );
}

function HabitRow({ habit, today, onToggle, onRemove }) {
  const done = isDoneOn(habit, today);
  const streak = calcStreak(habit, today);

  return (
    <div
      className={[
        'jarvis-panel relative flex items-center gap-3 px-4 py-3 transition-all duration-200',
        done ? 'border-jarvis-cyan/70 shadow-glow' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? '完了を取り消す' : '完了にする'}
        className={[
          'flex h-11 w-11 shrink-0 items-center justify-center border transition',
          done
            ? 'border-jarvis-cyan bg-jarvis-cyan/20 text-jarvis-accent shadow-glow'
            : 'border-jarvis-border text-jarvis-dim hover:border-jarvis-cyan/60 hover:text-jarvis-cyan',
        ].join(' ')}
      >
        <Check
          size={20}
          strokeWidth={2.5}
          className={done ? '' : 'opacity-0 transition-opacity hover:opacity-60'}
        />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={[
            'truncate font-display text-sm tracking-[0.16em]',
            done ? 'text-jarvis-accent' : 'text-jarvis-text',
          ].join(' ')}
        >
          {habit.habit_name}
        </p>
        <p className="flex items-center gap-1 truncate font-body text-[12px] text-jarvis-dim">
          <Target size={11} strokeWidth={1.75} />
          <span className="truncate">{habit.min_action}</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={[
            'flex items-center gap-1 border px-2 py-1 font-mono text-[11px] tabular-nums transition',
            streak > 0
              ? 'border-jarvis-cyan/70 text-jarvis-accent shadow-glow-soft'
              : 'border-jarvis-border text-jarvis-dim',
          ].join(' ')}
          title={`継続 ${streak} 日`}
        >
          <Flame
            size={12}
            strokeWidth={2}
            className={streak > 0 ? 'text-jarvis-cyan' : ''}
          />
          <span>{streak}d</span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${habit.habit_name} を削除`}
          className="flex h-8 w-8 items-center justify-center border border-jarvis-border text-jarvis-dim transition hover:border-red-400/60 hover:text-red-300"
        >
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
