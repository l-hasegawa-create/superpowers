import { useEffect, useMemo, useState } from 'react';
import { BatteryCharging, Check, Flame, Pencil, Smile } from 'lucide-react';

const STORAGE_KEY = 'dailyState';
const LEVELS = [1, 2, 3, 4, 5];

const METRICS = [
  { key: 'mood', label: 'MOOD', sub: '気分', icon: Smile },
  { key: 'energy', label: 'ENERGY', sub: '体調', icon: BatteryCharging },
  { key: 'motivation', label: 'MOTIVATION', sub: 'やる気', icon: Flame },
];

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function loadDailyState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [values, setValues] = useState({ mood: 0, energy: 0, motivation: 0 });
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    const existing = loadDailyState();
    if (existing && existing.date === todayISO()) {
      setSaved(existing);
      setValues({
        mood: existing.mood,
        energy: existing.energy,
        motivation: existing.motivation,
      });
    }
  }, []);

  const ready = useMemo(
    () => METRICS.every(({ key }) => values[key] >= 1),
    [values],
  );

  function setLevel(key, n) {
    setValues((v) => ({ ...v, [key]: n }));
  }

  function handleSave() {
    if (!ready) return;
    const payload = { date: todayISO(), ...values };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSaved(payload);
  }

  function handleEdit() {
    setSaved(null);
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="animate-fade-in">
        <p className="jarvis-subtitle text-xs">// MODULE_01</p>
        <h1 className="jarvis-title mt-1 text-3xl">HOME</h1>
        <div className="jarvis-divider mt-3" />
      </div>

      {saved ? (
        <SummaryView state={saved} onEdit={handleEdit} />
      ) : (
        <InputView
          values={values}
          ready={ready}
          onChange={setLevel}
          onSave={handleSave}
        />
      )}
    </section>
  );
}

function InputView({ values, ready, onChange, onSave }) {
  return (
    <div className="mt-6 space-y-5">
      <header
        className="animate-fade-in"
        style={{ animationDelay: '80ms' }}
      >
        <p className="jarvis-subtitle text-[11px]">
          // STATE_INPUT · {todayISO()}
        </p>
        <h2 className="font-display text-xl tracking-[0.18em] text-jarvis-accent">
          今日のあなたの状態を記録
        </h2>
      </header>

      <ul className="space-y-3">
        {METRICS.map((metric, i) => (
          <li
            key={metric.key}
            className="animate-fade-in"
            style={{ animationDelay: `${160 + i * 90}ms` }}
          >
            <MetricRow
              metric={metric}
              value={values[metric.key]}
              onChange={(n) => onChange(metric.key, n)}
            />
          </li>
        ))}
      </ul>

      <div
        className="animate-fade-in pt-2"
        style={{ animationDelay: '480ms' }}
      >
        <button
          type="button"
          onClick={onSave}
          disabled={!ready}
          aria-disabled={!ready}
          className={[
            'group relative flex w-full items-center justify-center gap-2 overflow-hidden border px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.28em] transition',
            ready
              ? 'border-jarvis-cyan bg-jarvis-cyan/10 text-jarvis-accent shadow-glow hover:bg-jarvis-cyan/20'
              : 'cursor-not-allowed border-jarvis-border bg-jarvis-panel/60 text-jarvis-dim',
          ].join(' ')}
        >
          {ready && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-jarvis-cyan/30 to-transparent animate-sweep"
            />
          )}
          <Check size={16} strokeWidth={2.25} />
          <span>{ready ? 'SYNC · 状態を確定' : 'AWAITING INPUT'}</span>
        </button>
      </div>
    </div>
  );
}

function MetricRow({ metric, value, onChange }) {
  const Icon = metric.icon;
  return (
    <div className="jarvis-panel relative px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={[
              'flex h-9 w-9 items-center justify-center border transition',
              value > 0
                ? 'border-jarvis-cyan/70 text-jarvis-accent shadow-glow-soft'
                : 'border-jarvis-border text-jarvis-dim',
            ].join(' ')}
            aria-hidden
          >
            <Icon size={18} strokeWidth={1.75} />
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold tracking-[0.22em] text-jarvis-accent">
              {metric.label}
            </p>
            <p className="jarvis-subtitle text-[11px]">{metric.sub}</p>
          </div>
        </div>
        <span
          className={[
            'font-mono text-xs tracking-widest',
            value > 0 ? 'text-jarvis-cyan' : 'text-jarvis-dim',
          ].join(' ')}
        >
          {value > 0 ? `${value} / 5` : '— / 5'}
        </span>
      </div>

      <div className="mt-3" role="radiogroup" aria-label={metric.label}>
        <div className="flex gap-1.5">
          {LEVELS.map((n) => {
            const filled = n <= value;
            const isPeak = n === value;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={isPeak}
                aria-label={`${metric.label} レベル ${n}`}
                onClick={() => onChange(n)}
                className={[
                  'group relative h-9 flex-1 border transition-all duration-200',
                  filled
                    ? 'border-jarvis-cyan bg-jarvis-cyan/15'
                    : 'border-jarvis-border bg-jarvis-panel/40 hover:border-jarvis-blue/60 hover:bg-jarvis-blue/5',
                  isPeak ? 'shadow-glow' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'block font-mono text-[11px]',
                    filled ? 'text-jarvis-accent' : 'text-jarvis-dim',
                  ].join(' ')}
                >
                  {n}
                </span>
                {isPeak && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 bg-jarvis-cyan animate-pulse-glow"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryView({ state, onEdit }) {
  return (
    <div className="mt-6 space-y-5">
      <header
        className="animate-fade-in"
        style={{ animationDelay: '60ms' }}
      >
        <p className="jarvis-subtitle text-[11px]">
          // SYSTEM_SYNCED · {state.date}
        </p>
        <h2 className="font-display text-xl tracking-[0.18em] text-jarvis-accent">
          今日のあなたの状態
        </h2>
      </header>

      <div
        className="jarvis-panel animate-glow-in relative overflow-hidden p-5"
        style={{ animationDelay: '140ms' }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-jarvis-cyan/15 to-transparent animate-sweep"
        />
        <ul className="relative space-y-4">
          {METRICS.map((metric, i) => (
            <li
              key={metric.key}
              className="animate-fade-in"
              style={{ animationDelay: `${220 + i * 90}ms` }}
            >
              <SummaryRow metric={metric} value={state[metric.key]} />
            </li>
          ))}
        </ul>
      </div>

      <div
        className="animate-fade-in"
        style={{ animationDelay: '520ms' }}
      >
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-2 border border-jarvis-border bg-jarvis-panel/60 px-4 py-2 font-display text-xs font-semibold uppercase tracking-[0.28em] text-jarvis-dim transition hover:border-jarvis-cyan/60 hover:text-jarvis-accent hover:shadow-glow-soft"
        >
          <Pencil size={14} strokeWidth={2} />
          <span>修正 · EDIT</span>
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ metric, value }) {
  const Icon = metric.icon;
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-10 w-10 items-center justify-center border border-jarvis-cyan/70 text-jarvis-accent shadow-glow-soft">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div className="flex-1">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-sm font-semibold tracking-[0.22em] text-jarvis-accent">
            {metric.label}
            <span className="ml-2 text-[11px] font-normal tracking-[0.12em] text-jarvis-dim">
              {metric.sub}
            </span>
          </p>
          <p className="font-mono text-sm text-jarvis-cyan">{value} / 5</p>
        </div>
        <div className="mt-1.5 flex gap-1">
          {LEVELS.map((n) => {
            const filled = n <= value;
            return (
              <span
                key={n}
                aria-hidden
                className={[
                  'h-1.5 flex-1 transition-all',
                  filled
                    ? 'bg-jarvis-cyan shadow-[0_0_8px_rgba(0,229,255,0.6)]'
                    : 'bg-jarvis-border/60',
                ].join(' ')}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
