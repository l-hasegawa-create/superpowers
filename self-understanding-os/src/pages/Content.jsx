import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Headphones,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';

const CACHE_KEY = 'podcastRecommendations';
const DAILY_STATE_KEY = 'dailyState';
const HABIT_STATS_KEY = 'habitDailyStats';
const INTERESTS_KEY = 'interests';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

const PROMPT_TEMPLATE = `ユーザーの状態に合わせて最適なPodcastを1〜3件提案してください。
条件：理由を必ずつける・再生時間も記載・今の状態に合うもの
気分: {{mood}} 興味: {{interests}} 行動状況: {{habit_done_rate}}`;

const SYSTEM_PROMPT = `あなたはPodcastの推薦エンジンです。応答はJSONオブジェクトのみで返してください。コードブロックや前置きは含めないでください。

スキーマ:
{"podcasts":[{"title":"Podcastのタイトル","duration":"再生時間（例：30分、1時間15分）","reason":"なぜ今のユーザーに合うかの理由（80字以内）"}]}

podcasts配列は1〜3件。日本語で回答してください。`;

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadInterests() {
  try {
    return (localStorage.getItem(INTERESTS_KEY) || '').trim();
  } catch {
    return '';
  }
}

function buildPrompt({ mood, interests, habitRate }) {
  return PROMPT_TEMPLATE.replace('{{mood}}', String(mood))
    .replace('{{interests}}', interests)
    .replace('{{habit_done_rate}}', `${habitRate}%`);
}

function parsePodcasts(text) {
  if (!text) return [];
  const sources = [];
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) sources.push(codeBlock[1]);
  sources.push(text);
  for (const src of sources) {
    const start = src.indexOf('{');
    const end = src.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) continue;
    try {
      const parsed = JSON.parse(src.slice(start, end + 1));
      if (Array.isArray(parsed.podcasts)) {
        return parsed.podcasts
          .filter((p) => p && typeof p.title === 'string' && p.title.trim())
          .slice(0, 3)
          .map((p) => ({
            title: String(p.title).trim(),
            duration: String(p.duration || '').trim(),
            reason: String(p.reason || '').trim(),
          }));
      }
    } catch {
      /* try next */
    }
  }
  return [];
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
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
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

export default function Content() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [tick, setTick] = useState(0);

  const inputs = useMemo(() => {
    const dailyState = loadJSON(DAILY_STATE_KEY);
    const stats = loadJSON(HABIT_STATS_KEY);
    const interests = loadInterests();
    const today = todayISO();
    return {
      mood: dailyState && dailyState.date === today ? dailyState.mood : null,
      habitRate: stats && stats.date === today ? stats.rate : null,
      interests,
    };
  }, [tick]);

  useEffect(() => {
    const cached = loadJSON(CACHE_KEY);
    if (cached && Array.isArray(cached.podcasts) && cached.podcasts.length > 0) {
      setResult(cached);
      setStatus('success');
    }
    const onFocus = () => setTick((t) => t + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const moodReady = inputs.mood !== null && inputs.mood >= 1;
  const interestsReady = inputs.interests.length > 0;
  const ready = moodReady && interestsReady && status !== 'loading';

  async function generate() {
    if (!ready) return;
    setStatus('loading');
    setError(null);
    try {
      const prompt = buildPrompt({
        mood: inputs.mood,
        interests: inputs.interests,
        habitRate: inputs.habitRate ?? 0,
      });
      const raw = await callClaudeAPI(prompt);
      const podcasts = parsePodcasts(raw);
      const payload = {
        date: todayISO(),
        podcasts,
        raw,
        inputs: {
          mood: inputs.mood,
          interests: inputs.interests,
          habitRate: inputs.habitRate ?? 0,
        },
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      setResult(payload);
      setStatus('success');
    } catch (e) {
      setError(e.message || String(e));
      setStatus('error');
    }
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="animate-fade-in">
        <p className="jarvis-subtitle text-xs">// MODULE_05</p>
        <h1 className="jarvis-title mt-1 text-3xl">CONTENT</h1>
        <div className="jarvis-divider mt-3" />
      </div>

      <div
        className="animate-fade-in mt-6"
        style={{ animationDelay: '60ms' }}
      >
        <header className="flex items-baseline justify-between">
          <div>
            <p className="jarvis-subtitle text-[11px]">
              // PODCAST_RECOMMENDER · {todayISO()}
            </p>
            <h2 className="font-display text-xl tracking-[0.18em] text-jarvis-accent">
              今の私に合うPodcast
            </h2>
          </div>
          {status === 'success' && (
            <button
              type="button"
              onClick={generate}
              disabled={!ready}
              className="flex items-center gap-1 border border-jarvis-border bg-jarvis-panel/60 px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.22em] text-jarvis-dim transition hover:border-jarvis-cyan/60 hover:text-jarvis-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={11} strokeWidth={2} />
              <span>再取得</span>
            </button>
          )}
        </header>

        <InputsBar inputs={inputs} />

        {!moodReady || !interestsReady ? (
          <Prerequisite
            moodReady={moodReady}
            interestsReady={interestsReady}
          />
        ) : status === 'idle' ? (
          <GenerateButton onClick={generate} />
        ) : status === 'loading' ? (
          <LoadingPanel />
        ) : status === 'error' ? (
          <ErrorPanel error={error} onRetry={generate} />
        ) : (
          <Results result={result} />
        )}
      </div>
    </section>
  );
}

function InputsBar({ inputs }) {
  const items = [
    {
      label: '気分',
      en: 'MOOD',
      value: inputs.mood !== null ? `${inputs.mood} / 5` : '—',
      ok: inputs.mood !== null,
    },
    {
      label: '興味',
      en: 'INTERESTS',
      value: inputs.interests || '—',
      ok: inputs.interests.length > 0,
    },
    {
      label: '習慣',
      en: 'HABIT_RATE',
      value: inputs.habitRate !== null ? `${inputs.habitRate}%` : '—',
      ok: true,
    },
  ];

  return (
    <ul className="mt-3 grid grid-cols-3 gap-2">
      {items.map((it) => (
        <li
          key={it.en}
          className={[
            'border bg-jarvis-panel/40 px-3 py-2 transition',
            it.ok
              ? 'border-jarvis-border'
              : 'border-amber-300/40 bg-amber-300/5',
          ].join(' ')}
        >
          <p className="font-display text-[10px] tracking-[0.22em] text-jarvis-cyan">
            {it.en}
          </p>
          <p className="jarvis-subtitle text-[9px]">{it.label}</p>
          <p
            className={[
              'mt-0.5 truncate font-mono text-[12px]',
              it.ok ? 'text-jarvis-accent' : 'text-amber-200',
            ].join(' ')}
            title={it.value}
          >
            {it.value}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Prerequisite({ moodReady, interestsReady }) {
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
          {!moodReady && <li>・Homeで今日の状態を記録してください</li>}
          {!interestsReady && <li>・Settingsで興味を入力してください</li>}
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
      <Search size={16} strokeWidth={2.25} className="animate-pulse-glow" />
      <span>今の私に合うPodcastを探す</span>
    </button>
  );
}

function LoadingPanel() {
  const phases = [
    'ANALYZING USER STATE',
    'MATCHING INTERESTS',
    'CURATING PODCASTS',
  ];
  const [phase, setPhase] = useState(0);
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
            JARVIS // SCANNING
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
            FETCH_FAILED
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

function Results({ result }) {
  const podcasts = result?.podcasts || [];

  if (podcasts.length === 0) {
    return (
      <div
        className="jarvis-panel animate-glow-in relative mt-3 overflow-hidden p-5"
        style={{ animationDelay: '60ms' }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-jarvis-cyan/15 to-transparent animate-sweep"
        />
        <p className="relative font-display text-[11px] tracking-[0.24em] text-amber-300">
          PARSE_FAILED
        </p>
        <p className="relative jarvis-subtitle mt-1 text-[10px]">
          // 構造化レスポンスの抽出に失敗。生レスポンスを表示します。
        </p>
        <p className="relative mt-3 whitespace-pre-wrap font-body text-sm text-jarvis-text">
          {result?.raw || ''}
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-3 space-y-3">
      {podcasts.map((p, i) => (
        <li
          key={`${p.title}-${i}`}
          className="animate-fade-in"
          style={{ animationDelay: `${120 + i * 100}ms` }}
        >
          <PodcastCard rank={i + 1} podcast={p} />
        </li>
      ))}
    </ul>
  );
}

function PodcastCard({ rank, podcast }) {
  return (
    <article className="jarvis-panel relative overflow-hidden p-5">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-jarvis-cyan/10 to-transparent animate-sweep"
      />
      <header className="relative flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center border border-jarvis-cyan bg-jarvis-cyan/10 font-mono text-[13px] font-bold tabular-nums text-jarvis-accent shadow-glow-soft"
          aria-label={`#${rank}`}
        >
          {String(rank).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-display text-[10px] tracking-[0.24em] text-jarvis-cyan">
            <Headphones size={11} strokeWidth={2} />
            <span>PODCAST</span>
          </p>
          <h3
            className="mt-1 font-display text-[18px] leading-snug text-jarvis-accent"
            style={{ textShadow: '0 0 6px rgba(0, 229, 255, 0.4)' }}
          >
            {podcast.title}
          </h3>
          {podcast.duration ? (
            <p className="mt-2 inline-flex items-center gap-1 border border-jarvis-border bg-jarvis-panel/60 px-2 py-0.5 font-mono text-[11px] tabular-nums text-jarvis-dim">
              <Clock size={11} strokeWidth={2} className="text-jarvis-cyan" />
              <span>{podcast.duration}</span>
            </p>
          ) : null}
        </div>
      </header>

      {podcast.reason ? (
        <div className="relative mt-4 border-l-2 border-jarvis-cyan/60 pl-3">
          <p className="flex items-center gap-1 font-display text-[10px] tracking-[0.22em] text-jarvis-cyan">
            <Sparkles size={11} strokeWidth={2} />
            <span>WHY · 推薦理由</span>
          </p>
          <p className="mt-1 font-body text-sm leading-relaxed text-jarvis-text">
            {podcast.reason}
          </p>
        </div>
      ) : null}
    </article>
  );
}
