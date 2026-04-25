import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  Check,
  Flame,
  Loader2,
  MessageSquare,
  Moon,
  Pencil,
  Quote,
  RefreshCw,
  Smile,
  Sparkles,
  Sunrise,
} from 'lucide-react';

const STORAGE_KEY = 'dailyState';
const ARCHIVE_KEY = 'dailyStateArchive';
const IDEAL_TYPE_KEY = 'idealType';
const MORNING_KEY = 'morningMessage';
const LEVELS = [1, 2, 3, 4, 5];
const ARCHIVE_LIMIT = 14;
const NIGHT_HOUR = 18;

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

const PROMPT_TEMPLATE = `ユーザーの状態と理想像に基づき、短く具体的な朝のメッセージを生成してください。
条件：100文字以内・行動に繋がる・抽象的すぎない・世界の著名人の名言を使うこと
気分: {{mood}} 体調: {{energy}} やる気: {{motivation}} 理想像: {{ideal_type}}`;

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

function shiftDay(iso, delta) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function loadArchive() {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function archiveRecord(state) {
  if (!state || !state.date) return;
  const archive = loadArchive();
  archive[state.date] = state;
  const dates = Object.keys(archive).sort();
  while (dates.length > ARCHIVE_LIMIT) {
    delete archive[dates.shift()];
  }
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  } catch {
    /* ignore quota */
  }
}

function loadDailyState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.date && parsed.date !== todayISO()) {
      archiveRecord(parsed);
    }
    return parsed;
  } catch {
    return null;
  }
}

function loadYesterdayState() {
  const y = shiftDay(todayISO(), -1);
  const archive = loadArchive();
  if (archive[y]) return archive[y];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.date === y) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function loadIdealType() {
  try {
    const raw = localStorage.getItem(IDEAL_TYPE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadMorningMessage() {
  try {
    const raw = localStorage.getItem(MORNING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildPrompt(state, idealType) {
  return PROMPT_TEMPLATE.replace('{{mood}}', String(state.mood))
    .replace('{{energy}}', String(state.energy))
    .replace('{{motivation}}', String(state.motivation))
    .replace('{{ideal_type}}', idealType);
}

function parseMessage(text) {
  if (!text) return { quote: '', action: '' };
  const trimmed = text.trim();
  const patterns = [/「([^」]+)」/, /『([^』]+)』/, /"([^"]+)"/, /"([^"]+)"/];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) {
      const quote = m[1].trim();
      const action = trimmed
        .replace(m[0], '')
        .trim()
        .replace(/^[、。\s—\-–:：]+/, '')
        .replace(/[\s—\-–:：]+$/, '');
      return { quote, action };
    }
  }
  return { quote: '', action: trimmed };
}

function useIsEvening() {
  const [evening, setEvening] = useState(
    () => new Date().getHours() >= NIGHT_HOUR,
  );
  useEffect(() => {
    const t = setInterval(
      () => setEvening(new Date().getHours() >= NIGHT_HOUR),
      60_000,
    );
    return () => clearInterval(t);
  }, []);
  return evening;
}

async function callClaudeAPI(prompt) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'APIキーが未設定です。.env に VITE_ANTHROPIC_API_KEY を設定してください。',
    );
  }
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error?.message || '';
    } catch {
      /* ignore */
    }
    throw new Error(detail || `API error ${res.status}`);
  }
  const data = await res.json();
  const block = data.content?.find((b) => b.type === 'text');
  return block?.text ?? '';
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

  function handleSaveNightReview({ review, nextAction }) {
    if (!saved) return;
    const merged = {
      ...saved,
      review: review.trim(),
      nextAction: nextAction.trim(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    archiveRecord(merged);
    setSaved(merged);
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="animate-fade-in">
        <p className="jarvis-subtitle text-xs">// MODULE_01</p>
        <h1 className="jarvis-title mt-1 text-3xl">HOME</h1>
        <div className="jarvis-divider mt-3" />
      </div>

      <YesterdayMessage />

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

      <MorningMessage saved={saved} />

      <NightReview saved={saved} onSave={handleSaveNightReview} />
    </section>
  );
}

function MorningMessage({ saved }) {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [idealType, setIdealType] = useState(null);

  useEffect(() => {
    setIdealType(loadIdealType());
    const cached = loadMorningMessage();
    if (cached && cached.date === todayISO()) {
      setResult(cached);
      setStatus('success');
    }
  }, []);

  const stateReady = !!saved;
  const idealReady = !!(idealType && idealType.typeLabel);
  const canGenerate = stateReady && idealReady && status !== 'loading';

  async function generate() {
    if (!canGenerate) return;
    setStatus('loading');
    setError(null);
    try {
      const prompt = buildPrompt(saved, idealType.typeLabel);
      const raw = await callClaudeAPI(prompt);
      const parsed = parseMessage(raw);
      const payload = {
        date: todayISO(),
        quote: parsed.quote,
        action: parsed.action,
        raw,
      };
      localStorage.setItem(MORNING_KEY, JSON.stringify(payload));
      setResult(payload);
      setStatus('success');
    } catch (e) {
      setError(e.message || String(e));
      setStatus('error');
    }
  }

  return (
    <div
      className="animate-fade-in mt-8"
      style={{ animationDelay: '300ms' }}
    >
      <header className="flex items-baseline justify-between">
        <div>
          <p className="jarvis-subtitle text-[11px]">
            // MORNING_BRIEFING · {todayISO()}
          </p>
          <h2 className="font-display text-xl tracking-[0.18em] text-jarvis-accent">
            今日のメッセージ
          </h2>
        </div>
        {status === 'success' && (
          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate}
            className="flex items-center gap-1 border border-jarvis-border bg-jarvis-panel/60 px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.22em] text-jarvis-dim transition hover:border-jarvis-cyan/60 hover:text-jarvis-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={11} strokeWidth={2} />
            <span>再生成</span>
          </button>
        )}
      </header>

      {!stateReady || !idealReady ? (
        <Prerequisite stateReady={stateReady} idealReady={idealReady} />
      ) : status === 'idle' ? (
        <GenerateButton onClick={generate} />
      ) : status === 'loading' ? (
        <LoadingPanel />
      ) : status === 'error' ? (
        <ErrorPanel error={error} onRetry={generate} />
      ) : (
        <ResultCard result={result} />
      )}
    </div>
  );
}

function Prerequisite({ stateReady, idealReady }) {
  return (
    <div className="jarvis-panel mt-3 flex items-start gap-3 p-4">
      <AlertTriangle
        size={18}
        strokeWidth={1.75}
        className="mt-0.5 shrink-0 text-amber-300/80"
      />
      <div className="space-y-1 text-sm">
        <p className="font-display text-[11px] tracking-[0.22em] text-amber-200/80">
          DATA_INSUFFICIENT
        </p>
        <ul className="space-y-0.5 font-body text-jarvis-text/80">
          {!stateReady && <li>・先に今日の状態を記録してください</li>}
          {!idealReady && <li>・Settingsで理想像診断を完了してください</li>}
        </ul>
      </div>
    </div>
  );
}

function GenerateButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative mt-3 flex w-full items-center justify-center gap-2 overflow-hidden border border-jarvis-cyan bg-jarvis-cyan/10 px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.28em] text-jarvis-accent shadow-glow transition hover:bg-jarvis-cyan/20"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-jarvis-cyan/30 to-transparent animate-sweep"
      />
      <Sparkles size={16} strokeWidth={2.25} className="animate-pulse-glow" />
      <span>今日のメッセージを生成</span>
    </button>
  );
}

function LoadingPanel() {
  const [phase, setPhase] = useState(0);
  const phases = [
    'ANALYZING DAILY STATE',
    'CROSS-REFERENCING IDEAL TYPE',
    'GENERATING MORNING BRIEFING',
  ];
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % phases.length), 900);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="jarvis-panel relative mt-3 overflow-hidden p-5">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-jarvis-cyan/25 to-transparent animate-sweep"
      />
      <div className="relative flex items-center gap-3">
        <Loader2
          size={22}
          strokeWidth={2}
          className="animate-spin text-jarvis-cyan drop-shadow-[0_0_6px_rgba(0,229,255,0.7)]"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[11px] tracking-[0.22em] text-jarvis-cyan">
            JARVIS // PROCESSING
          </p>
          <p
            key={phase}
            className="animate-fade-in mt-0.5 font-mono text-[12px] text-jarvis-accent"
          >
            {phases[phase]}
            <span className="ml-1 inline-block w-2 animate-pulse-glow">_</span>
          </p>
        </div>
      </div>
      <div className="relative mt-4 space-y-2">
        <div className="h-2 w-3/4 animate-pulse-glow bg-jarvis-cyan/15" />
        <div className="h-2 w-1/2 animate-pulse-glow bg-jarvis-cyan/10" />
        <div className="h-2 w-2/3 animate-pulse-glow bg-jarvis-cyan/15" />
      </div>
    </div>
  );
}

function ErrorPanel({ error, onRetry }) {
  return (
    <div className="jarvis-panel mt-3 flex flex-col gap-3 border-red-400/40 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle
          size={16}
          strokeWidth={1.75}
          className="mt-0.5 shrink-0 text-red-300"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[11px] tracking-[0.22em] text-red-300">
            GENERATION_FAILED
          </p>
          <p className="mt-1 break-words font-mono text-[12px] text-jarvis-text/80">
            {error}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="self-start border border-jarvis-border bg-jarvis-panel/60 px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.22em] text-jarvis-dim transition hover:border-jarvis-cyan/60 hover:text-jarvis-accent"
      >
        再試行 · RETRY
      </button>
    </div>
  );
}

function ResultCard({ result }) {
  return (
    <div
      className="jarvis-panel animate-glow-in relative mt-3 overflow-hidden p-5"
      style={{ animationDelay: '60ms' }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-jarvis-cyan/15 to-transparent animate-sweep"
      />

      {result.quote ? (
        <div
          className="animate-fade-in relative"
          style={{ animationDelay: '120ms' }}
        >
          <p className="flex items-center gap-2 font-display text-[10px] tracking-[0.28em] text-jarvis-cyan">
            <Quote size={12} strokeWidth={2} />
            <span>QUOTE · 名言</span>
          </p>
          <p
            className="mt-2 font-display text-[18px] leading-relaxed text-jarvis-accent"
            style={{ textShadow: '0 0 8px rgba(0, 229, 255, 0.45)' }}
          >
            「{result.quote}」
          </p>
        </div>
      ) : null}

      {result.quote && result.action ? (
        <div className="jarvis-divider my-4" />
      ) : null}

      {result.action ? (
        <div
          className="animate-fade-in relative"
          style={{ animationDelay: '220ms' }}
        >
          <p className="flex items-center gap-2 font-display text-[10px] tracking-[0.28em] text-jarvis-cyan">
            <ArrowRight size={12} strokeWidth={2.25} />
            <span>ACTION · 今日の一手</span>
          </p>
          <p className="mt-2 font-body text-base leading-relaxed text-jarvis-text">
            {result.action}
          </p>
        </div>
      ) : null}

      {!result.quote && !result.action ? (
        <p className="font-body text-sm text-jarvis-text">{result.raw}</p>
      ) : null}
    </div>
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

function YesterdayMessage() {
  const [yState, setYState] = useState(null);

  useEffect(() => {
    const y = loadYesterdayState();
    if (y && y.nextAction && y.nextAction.trim()) {
      setYState(y);
    }
  }, []);

  if (!yState) return null;

  return (
    <div
      className="jarvis-panel animate-glow-in relative mt-6 overflow-hidden p-4"
      style={{ animationDelay: '40ms' }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-jarvis-cyan/15 to-transparent animate-sweep"
      />
      <div className="relative flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-jarvis-cyan/70 text-jarvis-accent shadow-glow-soft">
          <Sunrise size={16} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-display text-[10px] tracking-[0.24em] text-jarvis-cyan">
            <span>FROM_YESTERDAY</span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-jarvis-dim">
              · {yState.date}
            </span>
          </p>
          <p className="jarvis-subtitle text-[10px]">// 昨日の自分より</p>
          <p
            className="mt-1 font-body text-base leading-relaxed text-jarvis-accent"
            style={{ textShadow: '0 0 6px rgba(0, 229, 255, 0.35)' }}
          >
            「{yState.nextAction}」
          </p>
        </div>
      </div>
    </div>
  );
}

function NightReview({ saved, onSave }) {
  const evening = useIsEvening();
  const [editing, setEditing] = useState(false);

  if (!evening) return null;

  if (!saved) {
    return (
      <div
        className="jarvis-panel animate-fade-in mt-8 flex items-start gap-3 p-4"
        style={{ animationDelay: '380ms' }}
      >
        <Moon
          size={18}
          strokeWidth={1.75}
          className="mt-0.5 shrink-0 text-jarvis-cyan"
        />
        <div className="min-w-0">
          <p className="font-display text-[11px] tracking-[0.24em] text-jarvis-cyan">
            NIGHT_REVIEW · 夜の振り返り
          </p>
          <p className="mt-1 font-body text-sm text-jarvis-text/80">
            まずは今日の状態（気分・体調・やる気）を記録すると、振り返りも保存できます。
          </p>
        </div>
      </div>
    );
  }

  const hasReview =
    (saved.review && saved.review.trim()) ||
    (saved.nextAction && saved.nextAction.trim());

  if (editing || !hasReview) {
    return (
      <NightReviewForm
        initial={{
          review: saved.review || '',
          nextAction: saved.nextAction || '',
        }}
        onCancel={hasReview ? () => setEditing(false) : null}
        onSave={(v) => {
          onSave(v);
          setEditing(false);
        }}
      />
    );
  }

  return <NightReviewSummary saved={saved} onEdit={() => setEditing(true)} />;
}

function NightReviewForm({ initial, onSave, onCancel }) {
  const [review, setReview] = useState(initial.review);
  const [nextAction, setNextAction] = useState(initial.nextAction);

  const ready = review.trim().length > 0 && nextAction.trim().length > 0;

  function submit(e) {
    e.preventDefault();
    if (!ready) return;
    onSave({ review, nextAction });
  }

  return (
    <form
      onSubmit={submit}
      className="jarvis-panel animate-fade-in mt-8 space-y-3 p-5"
      style={{ animationDelay: '380ms' }}
    >
      <header className="flex items-baseline justify-between">
        <p className="flex items-center gap-2 font-display text-[11px] tracking-[0.24em] text-jarvis-cyan">
          <Moon size={13} strokeWidth={2} />
          <span>夜の振り返り</span>
        </p>
        <p className="jarvis-subtitle text-[10px]">// NIGHT_REVIEW</p>
      </header>

      <div>
        <NightLabel ja="今日の一言" en="REVIEW" required icon={MessageSquare} />
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="例：会議で発言できた / 朝の集中が続いた"
          rows={3}
          maxLength={300}
          className="mt-1.5 w-full resize-y border border-jarvis-border bg-jarvis-bg/60 px-3 py-2 font-body text-jarvis-text placeholder:text-jarvis-dim/70 outline-none transition focus:border-jarvis-cyan focus:shadow-glow-soft"
        />
      </div>

      <div>
        <NightLabel
          ja="明日の最小アクション"
          en="NEXT_ACTION"
          required
          icon={Sunrise}
        />
        <input
          type="text"
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
          placeholder="例：朝7時に起きる / 1ページだけ読む"
          maxLength={120}
          className="mt-1.5 w-full border border-jarvis-border bg-jarvis-bg/60 px-3 py-2 font-body text-jarvis-text placeholder:text-jarvis-dim/70 outline-none transition focus:border-jarvis-cyan focus:shadow-glow-soft"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={!ready}
          className={[
            'group relative flex flex-1 items-center justify-center gap-2 overflow-hidden border px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.28em] transition',
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
          <span>振り返りを保存</span>
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="border border-jarvis-border bg-jarvis-panel/60 px-3 py-2 font-display text-[11px] uppercase tracking-[0.22em] text-jarvis-dim transition hover:border-jarvis-cyan/60 hover:text-jarvis-accent"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}

function NightLabel({ ja, en, required, icon: Icon }) {
  return (
    <span className="flex items-baseline gap-2">
      {Icon && (
        <Icon size={11} strokeWidth={2} className="text-jarvis-cyan" />
      )}
      <span className="font-display text-[11px] tracking-[0.22em] text-jarvis-accent">
        {ja}
        {required && <span className="ml-0.5 text-jarvis-cyan">*</span>}
      </span>
      <span className="font-mono text-[10px] tracking-[0.16em] text-jarvis-dim">
        {en}
      </span>
    </span>
  );
}

function NightReviewSummary({ saved, onEdit }) {
  return (
    <div
      className="jarvis-panel animate-glow-in relative mt-8 overflow-hidden p-5"
      style={{ animationDelay: '60ms' }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-jarvis-cyan/20 to-transparent animate-sweep"
      />
      <div className="relative">
        <header className="flex items-center gap-2">
          <Sparkles
            size={16}
            strokeWidth={1.75}
            className="animate-pulse-glow text-jarvis-cyan"
          />
          <p className="font-display text-[11px] tracking-[0.24em] text-jarvis-cyan">
            EVENING_LOG_SAVED
          </p>
        </header>
        <p
          className="animate-fade-in mt-2 font-display text-2xl tracking-[0.16em] text-jarvis-accent"
          style={{
            textShadow: '0 0 10px rgba(0, 229, 255, 0.55)',
            animationDelay: '120ms',
          }}
        >
          今日もお疲れ様でした
        </p>
        <p
          className="animate-fade-in jarvis-subtitle mt-1 text-[10px]"
          style={{ animationDelay: '180ms' }}
        >
          // GOOD_NIGHT · {saved.date}
        </p>

        <div className="jarvis-divider my-4" />

        <div
          className="animate-fade-in"
          style={{ animationDelay: '260ms' }}
        >
          <p className="flex items-center gap-2 font-display text-[10px] tracking-[0.22em] text-jarvis-cyan">
            <MessageSquare size={11} strokeWidth={2} />
            <span>今日の一言 · REVIEW</span>
          </p>
          <p className="mt-1.5 whitespace-pre-wrap font-body text-base leading-relaxed text-jarvis-text">
            {saved.review}
          </p>
        </div>

        <div
          className="animate-fade-in mt-4 border-l-2 border-jarvis-cyan/60 pl-3"
          style={{ animationDelay: '340ms' }}
        >
          <p className="flex items-center gap-2 font-display text-[10px] tracking-[0.22em] text-jarvis-cyan">
            <Sunrise size={11} strokeWidth={2} />
            <span>明日の最小アクション · NEXT</span>
          </p>
          <p
            className="mt-1.5 font-body text-base leading-relaxed text-jarvis-accent"
            style={{ textShadow: '0 0 6px rgba(0, 229, 255, 0.4)' }}
          >
            {saved.nextAction}
          </p>
        </div>

        <div
          className="animate-fade-in mt-5 flex items-center gap-2"
          style={{ animationDelay: '420ms' }}
        >
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 border border-jarvis-border bg-jarvis-panel/60 px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.24em] text-jarvis-dim transition hover:border-jarvis-cyan/60 hover:text-jarvis-accent"
          >
            <Pencil size={11} strokeWidth={2} />
            <span>修正</span>
          </button>
        </div>
      </div>
    </div>
  );
}
