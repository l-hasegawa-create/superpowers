import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Headphones,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { readPodcastInputs, usePodcast } from '../lib/usePodcast.js';

export default function Content() {
  const { status, error, result, generate } = usePodcast();
  const [inputs, setInputs] = useState(() => readPodcastInputs());

  useEffect(() => {
    const refresh = () => setInputs(readPodcastInputs());
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [result]);

  const interestsReady = inputs.interests.length > 0;
  const showResults = status === 'success' && result?.podcasts?.length > 0;

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <header className="animate-fade-in pt-2">
        <p className="app-eyebrow">今日のおすすめ</p>
        <h1 className="app-title mt-0.5 text-2xl">Podcastを探す</h1>
      </header>

      <InputSummary inputs={inputs} />

      {!interestsReady && (
        <Prerequisite />
      )}

      {interestsReady && status === 'idle' && (
        <GenerateBlock onGenerate={generate} />
      )}

      {status === 'loading' && <LoadingPanel />}

      {status === 'error' && (
        <ErrorPanel error={error} onRetry={generate} />
      )}

      {showResults && (
        <Results
          result={result}
          onRefresh={generate}
          regenerating={status === 'loading'}
        />
      )}
    </section>
  );
}

function InputSummary({ inputs }) {
  const items = [
    {
      label: '気分',
      value: inputs.mood ? `${inputs.mood}/5` : '—',
      ok: inputs.mood != null,
    },
    {
      label: '興味',
      value: inputs.interests || '未設定',
      ok: inputs.interests.length > 0,
    },
    {
      label: '達成率',
      value: inputs.habitRate != null ? `${inputs.habitRate}%` : '—',
      ok: true,
    },
  ];

  return (
    <ul className="grid grid-cols-3 gap-2">
      {items.map((it) => (
        <li
          key={it.label}
          className={[
            'rounded-card border p-3 transition',
            it.ok
              ? 'border-app-border bg-app-panel/60'
              : 'border-app-rose/30 bg-app-rose/5',
          ].join(' ')}
        >
          <p className="text-[11px] text-app-dim">{it.label}</p>
          <p
            className={[
              'mt-1 truncate text-[13px]',
              it.ok ? 'text-app-text' : 'text-app-rose/90',
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

function Prerequisite() {
  return (
    <div className="app-card flex items-start gap-3 p-4">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-app-amber" />
      <div>
        <p className="app-eyebrow">情報が足りません</p>
        <p className="mt-1 text-[13px] text-app-text-soft">
          Settingsで「興味」を入力するとあなた向けのPodcastを提案できます。
        </p>
      </div>
    </div>
  );
}

function GenerateBlock({ onGenerate }) {
  return (
    <div className="app-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-amber/10 text-app-amber">
          <Headphones size={18} strokeWidth={1.75} />
        </span>
        <div>
          <p className="app-eyebrow">AIが選びます</p>
          <p className="mt-1 text-[14px] text-app-text-soft">
            あなたの今日の状態と興味から、最適な番組を1〜3件選びます。
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onGenerate}
        className="app-btn-primary mt-4 w-full"
      >
        <Search size={14} />
        <span>Podcastを探す</span>
      </button>
    </div>
  );
}

function LoadingPanel() {
  const phases = ['気分を確認中', '興味を解析中', '番組を選定中'];
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % phases.length), 900);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="app-card p-5">
      <div className="flex items-center gap-3">
        <Loader2 size={20} className="animate-spin text-app-amber" />
        <p className="text-[14px] text-app-text-soft">{phases[phase]}…</p>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-2 w-3/4 rounded-full bg-app-amber/10" />
        <div className="h-2 w-1/2 rounded-full bg-app-amber/10" />
        <div className="h-2 w-2/3 rounded-full bg-app-amber/10" />
      </div>
    </div>
  );
}

function ErrorPanel({ error, onRetry }) {
  return (
    <div className="app-card border-app-rose/40 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-app-rose" />
        <div className="min-w-0 flex-1">
          <p className="app-eyebrow text-app-rose">取得失敗</p>
          <p className="mt-1 break-words text-[13px] text-app-text-soft">
            {error}
          </p>
        </div>
      </div>
      <button type="button" onClick={onRetry} className="app-btn-ghost mt-3">
        再試行
      </button>
    </div>
  );
}

function Results({ result, onRefresh, regenerating }) {
  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between">
        <p className="text-[12px] text-app-dim">
          {result.date} に取得 · {result.podcasts.length} 件
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={regenerating}
          className="app-btn-ghost text-[12px]"
        >
          <RefreshCw size={12} />
          <span>再取得</span>
        </button>
      </header>

      {result.podcasts.map((p, i) => (
        <PodcastCard key={`${p.title}-${i}`} rank={i + 1} podcast={p} />
      ))}
    </div>
  );
}

function PodcastCard({ rank, podcast }) {
  return (
    <article className="app-card animate-fade-in p-5">
      <header className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-amber/10 font-mono text-[12px] font-semibold text-app-amber">
          {String(rank).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <p className="app-eyebrow flex items-center gap-1.5">
            <Headphones size={11} className="text-app-fog" />
            Podcast
          </p>
          <h3 className="mt-1 text-[17px] font-semibold leading-snug text-app-text">
            {podcast.title}
          </h3>
          {podcast.duration && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-chip bg-app-bg-elev px-2.5 py-0.5 text-[11px] text-app-dim">
              <Clock size={11} className="text-app-fog" />
              {podcast.duration}
            </p>
          )}
        </div>
      </header>

      {podcast.reason && (
        <div className="mt-4 border-l-2 border-app-amber/50 pl-3">
          <p className="app-eyebrow flex items-center gap-1.5 text-app-amber">
            <Sparkles size={11} />
            選んだ理由
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-app-text-soft">
            {podcast.reason}
          </p>
        </div>
      )}
    </article>
  );
}
