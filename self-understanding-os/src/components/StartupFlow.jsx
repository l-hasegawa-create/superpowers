import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BatteryCharging,
  Check,
  Loader2,
  Quote,
  Smile,
  Sparkles,
  X,
} from 'lucide-react';
import { generateMorningMessage } from '../lib/morningMessage.js';
import { calcStateScore } from '../lib/scoring.js';

const MORNING_KEY = 'morningMessage';
const SEEN_KEY = 'morningMessageSeen';
const IDEAL_KEY = 'idealType';
const STATE_KEY = 'dailyState';
const ARCHIVE_KEY = 'dailyStateArchive';

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

function archiveRecord(state) {
  if (!state || !state.date) return;
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    const archive = raw ? JSON.parse(raw) : {};
    archive[state.date] = state;
    const dates = Object.keys(archive).sort();
    while (dates.length > 14) {
      delete archive[dates.shift()];
    }
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  } catch {
    /* ignore */
  }
}

export default function StartupFlow({ onComplete }) {
  const [phase, setPhase] = useState('init');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const today = todayISO();
      const ideal = loadJSON(IDEAL_KEY);
      const existingMsg = loadJSON(MORNING_KEY);
      const dailyState = loadJSON(STATE_KEY);
      const seen = localStorage.getItem(SEEN_KEY);

      const hasIdeal = !!(ideal && ideal.type);
      const hasMsgToday = existingMsg && existingMsg.date === today;
      const seenToday = seen === today;
      const hasStateToday = !!(
        dailyState &&
        dailyState.date === today &&
        dailyState.mood
      );

      const needMessage = hasIdeal && !seenToday;

      if (needMessage) {
        if (hasMsgToday) {
          if (cancelled) return;
          setMessage(existingMsg);
          setPhase('message');
          return;
        }
        if (cancelled) return;
        setPhase('generating');
        try {
          const generated = await generateMorningMessage(ideal);
          if (cancelled) return;
          setMessage(generated);
          setPhase('message');
        } catch (e) {
          if (cancelled) return;
          setError(e.message || String(e));
          setMessage(null);
          setPhase('message');
        }
        return;
      }

      if (!hasStateToday) {
        setPhase('state');
      } else {
        setPhase('done');
        onComplete?.();
      }
    }

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismissMessage() {
    localStorage.setItem(SEEN_KEY, todayISO());
    const today = todayISO();
    const dailyState = loadJSON(STATE_KEY);
    const hasStateToday = !!(
      dailyState &&
      dailyState.date === today &&
      dailyState.mood
    );
    if (!hasStateToday) {
      setPhase('state');
    } else {
      setPhase('done');
      onComplete?.();
    }
  }

  function saveState(values) {
    const today = todayISO();
    const existing = loadJSON(STATE_KEY) || {};
    const merged = {
      ...(existing.date === today ? existing : {}),
      date: today,
      mood: values.mood,
      energy: values.energy,
      motivation: values.motivation,
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(merged));
    archiveRecord(merged);
    setPhase('done');
    onComplete?.();
  }

  function skipState() {
    setPhase('done');
    onComplete?.();
  }

  if (phase === 'init' || phase === 'done') return null;

  if (phase === 'generating') {
    return <GeneratingModal />;
  }

  if (phase === 'message') {
    return (
      <MessageModal
        message={message}
        error={error}
        onNext={dismissMessage}
      />
    );
  }

  if (phase === 'state') {
    return <StateModal onSave={saveState} onSkip={skipState} />;
  }

  return null;
}

function ModalShell({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 px-4 pb-4 pt-8 backdrop-blur-sm sm:items-center sm:pb-8">
      <div className="app-card animate-rise-in w-full max-w-md p-6 shadow-lift">
        {children}
      </div>
    </div>
  );
}

function GeneratingModal() {
  return (
    <ModalShell>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-amber/10 text-app-amber">
          <Loader2 size={18} className="animate-spin" />
        </span>
        <div>
          <p className="app-eyebrow">朝のメッセージ</p>
          <h2 className="app-title mt-0.5 text-lg">生成しています…</h2>
          <p className="mt-2 text-sm text-app-text-soft">
            あなたの理想像に合う言葉を選んでいます。
          </p>
        </div>
      </div>
    </ModalShell>
  );
}

function MessageModal({ message, error, onNext }) {
  return (
    <ModalShell>
      <header>
        <p className="app-eyebrow">おはようございます</p>
        <h2 className="app-title mt-1 text-xl">今日のメッセージ</h2>
      </header>

      <div className="mt-5">
        {error ? (
          <div className="rounded-card border border-app-rose/40 bg-app-rose/5 p-4">
            <p className="text-sm text-app-rose">メッセージの生成に失敗しました</p>
            <p className="mt-1 break-words text-[12px] text-app-dim">{error}</p>
            <p className="mt-3 text-sm text-app-text-soft">
              そのまま今日を始めましょう。後でHomeから再生成できます。
            </p>
          </div>
        ) : message ? (
          <div>
            {message.quote && (
              <blockquote className="border-l-2 border-app-amber/60 pl-4">
                <Quote size={14} className="text-app-amber/70" />
                <p className="mt-1 text-base leading-relaxed text-app-text">
                  {message.quote}
                </p>
                <p className="mt-2 text-[12px] text-app-dim">
                  — {message.attribution || message.person}
                </p>
              </blockquote>
            )}
            {message.action && (
              <div className="mt-5 rounded-card bg-app-amber/10 p-4">
                <p className="app-eyebrow flex items-center gap-1.5 text-app-amber">
                  <Sparkles size={12} />
                  今日のアクション
                </p>
                <p className="mt-1.5 text-base leading-relaxed text-app-text">
                  {message.action}
                </p>
              </div>
            )}
            {!message.quote && !message.action && message.raw && (
              <p className="text-sm text-app-text-soft">{message.raw}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-app-text-soft">メッセージを読み込み中…</p>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button type="button" onClick={onNext} className="app-btn-primary">
          <span>次へ</span>
          <ArrowRight size={14} strokeWidth={2.5} />
        </button>
      </div>
    </ModalShell>
  );
}

function StateModal({ onSave, onSkip }) {
  const [mood, setMood] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [motivation, setMotivation] = useState(0);

  const ready = mood > 0 && energy > 0 && motivation > 0;
  const score = calcStateScore({ mood, energy, motivation });

  return (
    <ModalShell>
      <header className="flex items-start justify-between">
        <div>
          <p className="app-eyebrow">今日の状態</p>
          <h2 className="app-title mt-1 text-xl">今のあなたを記録</h2>
        </div>
        <button
          type="button"
          onClick={onSkip}
          aria-label="閉じる"
          className="-mr-2 -mt-1 rounded-full p-2 text-app-dim transition hover:bg-app-border/40 hover:text-app-text"
        >
          <X size={18} />
        </button>
      </header>

      <div className="mt-5 space-y-4">
        <LevelRow
          icon={Smile}
          label="気分"
          value={mood}
          onChange={setMood}
        />
        <LevelRow
          icon={BatteryCharging}
          label="体調"
          value={energy}
          onChange={setEnergy}
        />
        <LevelRow
          icon={Sparkles}
          label="やる気"
          value={motivation}
          onChange={setMotivation}
        />
      </div>

      <div className="mt-5 flex items-center justify-between rounded-card bg-app-bg-elev px-4 py-3">
        <p className="text-sm text-app-text-soft">今日のスコア</p>
        <p className="font-display text-2xl font-bold text-app-amber">
          {score ?? '--'}
          <span className="ml-0.5 text-sm font-normal text-app-dim">/100</span>
        </p>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button type="button" onClick={onSkip} className="app-btn-ghost">
          後で
        </button>
        <button
          type="button"
          onClick={() => onSave({ mood, energy, motivation })}
          disabled={!ready}
          className="app-btn-primary"
        >
          <Check size={14} strokeWidth={2.5} />
          <span>記録する</span>
        </button>
      </div>
    </ModalShell>
  );
}

function LevelRow({ icon: Icon, label, value, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-app-text-soft">
          <Icon size={14} className="text-app-dim" />
          {label}
        </span>
        <span className="font-mono text-[11px] text-app-dim">
          {value > 0 ? `${value} / 5` : '— / 5'}
        </span>
      </div>
      <div className="mt-2 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-label={`${label} ${n}`}
              className={[
                'h-9 flex-1 rounded-chip border text-[12px] transition-all',
                filled
                  ? 'border-app-amber/60 bg-app-amber/15 text-app-amber'
                  : 'border-app-border bg-app-bg-elev text-app-dim hover:border-app-border-soft',
              ].join(' ')}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
