import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Hammer,
  Heart,
  Palette,
  RefreshCw,
  Rocket,
  Sparkles,
  TestTubeDiagonal,
} from 'lucide-react';

const STORAGE_KEY = 'idealType';
const INTERESTS_KEY = 'interests';

const TYPES = {
  entrepreneur: {
    key: 'entrepreneur',
    label: '起業家型',
    en: 'ENTREPRENEUR',
    tagline: 'スピードと拡張で価値を生む',
    icon: Rocket,
  },
  craftsman: {
    key: 'craftsman',
    label: '職人型',
    en: 'CRAFTSMAN',
    tagline: '積み上げと技術で信頼を築く',
    icon: Hammer,
  },
  researcher: {
    key: 'researcher',
    label: '研究者型',
    en: 'RESEARCHER',
    tagline: '深く考え、本質を解き明かす',
    icon: TestTubeDiagonal,
  },
  creator: {
    key: 'creator',
    label: 'クリエイター型',
    en: 'CREATOR',
    tagline: '自由と表現で世界を彩る',
    icon: Palette,
  },
};

const TYPE_ORDER = ['entrepreneur', 'craftsman', 'researcher', 'creator'];

const QUESTIONS = [
  {
    id: 'q1',
    tag: 'GROWTH_AXIS',
    title: '成長の軸',
    prompt: 'あなたが追い求めたい成長の軸は？',
    options: [
      { label: '収入', sub: 'INCOME', score: { entrepreneur: 3 } },
      { label: 'スキル', sub: 'SKILL', score: { craftsman: 2, researcher: 1 } },
      { label: '影響力', sub: 'INFLUENCE', score: { creator: 2, entrepreneur: 1 } },
    ],
  },
  {
    id: 'q2',
    tag: 'STYLE',
    title: 'スタイル',
    prompt: '仕事や挑戦への向き合い方は？',
    options: [
      { label: '挑戦型', sub: 'CHALLENGE', score: { entrepreneur: 2, creator: 1 } },
      { label: '安定型', sub: 'STABLE', score: { craftsman: 2, researcher: 1 } },
    ],
  },
  {
    id: 'q3',
    tag: 'BOTTLENECK',
    title: 'ボトルネック',
    prompt: '今いちばん詰まりやすいのは？',
    options: [
      { label: '継続', sub: 'CONTINUITY', score: { entrepreneur: 2, creator: 1 } },
      { label: '決断', sub: 'DECISION', score: { researcher: 2, craftsman: 1 } },
      { label: '人脈', sub: 'NETWORK', score: { craftsman: 2, researcher: 1 } },
    ],
  },
  {
    id: 'q4',
    tag: 'ENERGY',
    title: 'エネルギータイプ',
    prompt: '集中が乗るのはどちらの時間帯？',
    options: [
      { label: '朝型', sub: 'MORNING', score: { craftsman: 2, researcher: 1 } },
      { label: '夜型', sub: 'NIGHT', score: { creator: 2, entrepreneur: 1 } },
    ],
  },
  {
    id: 'q5',
    tag: 'STRESS',
    title: 'ストレス耐性',
    prompt: '負荷がかかったときの自分は？',
    options: [
      { label: '高', sub: 'HIGH', score: { entrepreneur: 2, craftsman: 1 } },
      { label: '中', sub: 'MID', score: { craftsman: 1, creator: 1, researcher: 1 } },
      { label: '低', sub: 'LOW', score: { researcher: 2, creator: 1 } },
    ],
  },
  {
    id: 'q6',
    tag: 'SPEED',
    title: '行動スピード',
    prompt: '判断するときのテンポは？',
    options: [
      { label: '即断即決', sub: 'INSTANT', score: { entrepreneur: 2, creator: 1 } },
      { label: 'じっくり', sub: 'DELIBERATE', score: { researcher: 2, craftsman: 1 } },
    ],
  },
  {
    id: 'q7',
    tag: 'IDEAL_DAY',
    title: '理想の一日',
    prompt: '理想とする一日はどれに近い？',
    options: [
      { label: '高生産', sub: 'PRODUCTIVE', score: { entrepreneur: 2, craftsman: 1 } },
      { label: 'バランス', sub: 'BALANCED', score: { craftsman: 2, researcher: 1 } },
      { label: '自由', sub: 'FREE', score: { creator: 3 } },
    ],
  },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadResult() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function calcResult(answers) {
  const scores = { entrepreneur: 0, craftsman: 0, researcher: 0, creator: 0 };
  const maxPerType = { entrepreneur: 0, craftsman: 0, researcher: 0, creator: 0 };

  QUESTIONS.forEach((q, i) => {
    const opt = q.options[answers[i]];
    if (opt) {
      Object.entries(opt.score).forEach(([k, v]) => {
        scores[k] = (scores[k] || 0) + v;
      });
    }
    TYPE_ORDER.forEach((k) => {
      const best = Math.max(...q.options.map((o) => o.score[k] || 0));
      maxPerType[k] += best;
    });
  });

  const winner = TYPE_ORDER.reduce((a, b) => (scores[b] > scores[a] ? b : a));
  const winnerScore = scores[winner];
  const winnerMax = maxPerType[winner] || 1;
  const matchScore = Math.round((winnerScore / winnerMax) * 100);
  const gapScore = Math.max(0, 100 - matchScore);

  return {
    type: winner,
    typeLabel: TYPES[winner].label,
    scores,
    maxPerType,
    matchScore,
    gapScore,
    answers,
    date: todayISO(),
  };
}

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export default function Settings() {
  const [result, setResult] = useState(null);
  const [phase, setPhase] = useState('intro'); // 'intro' | 'quiz' | 'result'
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));
  const advanceTimer = useRef(null);

  useEffect(() => {
    const existing = loadResult();
    if (existing && existing.type) {
      setResult(existing);
      setPhase('result');
    }
  }, []);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  function startQuiz() {
    setAnswers(Array(QUESTIONS.length).fill(null));
    setStep(0);
    setPhase('quiz');
  }

  function selectOption(idx) {
    const next = [...answers];
    next[step] = idx;
    setAnswers(next);

    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      if (step === QUESTIONS.length - 1) {
        const r = calcResult(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
        setResult(r);
        setPhase('result');
      } else {
        setStep((s) => s + 1);
      }
    }, 280);
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  function restart() {
    setResult(null);
    startQuiz();
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="animate-fade-in">
        <p className="jarvis-subtitle text-xs">// MODULE_06</p>
        <h1 className="jarvis-title mt-1 text-3xl">SETTINGS</h1>
        <div className="jarvis-divider mt-3" />
      </div>

      <InterestsEditor />

      {phase === 'intro' && <Intro onStart={startQuiz} />}
      {phase === 'quiz' && (
        <Quiz
          step={step}
          answers={answers}
          onSelect={selectOption}
          onBack={goBack}
        />
      )}
      {phase === 'result' && result && (
        <Result result={result} onRestart={restart} />
      )}
    </section>
  );
}

function InterestsEditor() {
  const [saved, setSaved] = useState('');
  const [draft, setDraft] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(INTERESTS_KEY) || '';
      setSaved(v);
      setDraft(v);
    } catch {
      /* ignore */
    }
  }, []);

  const dirty = draft.trim() !== saved.trim();

  function handleSave() {
    if (!dirty) return;
    const trimmed = draft.trim();
    localStorage.setItem(INTERESTS_KEY, trimmed);
    setSaved(trimmed);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1600);
  }

  return (
    <div
      className="jarvis-panel animate-fade-in mt-6 space-y-3 p-4"
      style={{ animationDelay: '60ms' }}
    >
      <div className="flex items-baseline justify-between">
        <p className="flex items-center gap-2 font-display text-[11px] tracking-[0.24em] text-jarvis-cyan">
          <Heart size={13} strokeWidth={2} />
          <span>興味 · INTERESTS</span>
        </p>
        <p className="jarvis-subtitle text-[10px]">// FOR_RECOMMENDATIONS</p>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="例：テクノロジー、心理学、起業、サウナ"
        rows={2}
        maxLength={300}
        className="w-full resize-y border border-jarvis-border bg-jarvis-bg/60 px-3 py-2 font-body text-jarvis-text placeholder:text-jarvis-dim/70 outline-none transition focus:border-jarvis-cyan focus:shadow-glow-soft"
      />
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] tracking-[0.16em] text-jarvis-dim">
          Content画面のPodcast推薦などに利用されます
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty}
          className={[
            'flex items-center gap-1 border px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.22em] transition',
            dirty
              ? 'border-jarvis-cyan bg-jarvis-cyan/10 text-jarvis-accent shadow-glow-soft hover:bg-jarvis-cyan/20'
              : justSaved
                ? 'border-jarvis-cyan/60 bg-jarvis-cyan/5 text-jarvis-accent'
                : 'cursor-not-allowed border-jarvis-border bg-jarvis-panel/60 text-jarvis-dim',
          ].join(' ')}
        >
          <Check size={12} strokeWidth={2.25} />
          <span>{justSaved ? '保存済' : '保存'}</span>
        </button>
      </div>
    </div>
  );
}

function Intro({ onStart }) {
  return (
    <div className="mt-6 space-y-4">
      <header
        className="animate-fade-in"
        style={{ animationDelay: '60ms' }}
      >
        <p className="jarvis-subtitle text-[11px]">// IDEAL_TYPE_DIAGNOSTIC</p>
        <h2 className="font-display text-xl tracking-[0.18em] text-jarvis-accent">
          理想像診断
        </h2>
      </header>

      <div
        className="jarvis-panel animate-glow-in relative overflow-hidden p-5"
        style={{ animationDelay: '160ms' }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-jarvis-cyan/15 to-transparent animate-sweep"
        />
        <p className="relative font-body text-sm leading-relaxed text-jarvis-text/80">
          7問の質問から、あなたの理想像を
          <span className="text-jarvis-accent"> 起業家型 / 職人型 / 研究者型 / クリエイター型 </span>
          のいずれかとして診断します。所要時間は約1分。
        </p>
        <ul className="relative mt-4 grid grid-cols-2 gap-2">
          {TYPE_ORDER.map((k) => {
            const t = TYPES[k];
            const Icon = t.icon;
            return (
              <li
                key={k}
                className="flex items-center gap-2 border border-jarvis-border/80 bg-jarvis-panel/60 px-3 py-2"
              >
                <Icon size={16} strokeWidth={1.75} className="text-jarvis-cyan" />
                <span className="font-display text-[11px] tracking-[0.18em] text-jarvis-accent">
                  {t.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="animate-fade-in group relative flex w-full items-center justify-center gap-2 overflow-hidden border border-jarvis-cyan bg-jarvis-cyan/10 px-5 py-3 font-display text-sm font-semibold uppercase tracking-[0.28em] text-jarvis-accent shadow-glow transition hover:bg-jarvis-cyan/20"
        style={{ animationDelay: '300ms' }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-jarvis-cyan/30 to-transparent animate-sweep"
        />
        <Sparkles size={16} strokeWidth={2.25} />
        <span>診断スタート · DIAGNOSE</span>
      </button>
    </div>
  );
}

function Quiz({ step, answers, onSelect, onBack }) {
  const q = QUESTIONS[step];
  const total = QUESTIONS.length;
  const progress = ((step + 1) / total) * 100;
  const selected = answers[step];

  return (
    <div className="mt-6 space-y-5">
      <div
        className="animate-fade-in"
        style={{ animationDelay: '40ms' }}
      >
        <div className="flex items-baseline justify-between">
          <p className="jarvis-subtitle text-[11px]">
            // Q_{String(step + 1).padStart(2, '0')} · {q.tag}
          </p>
          <p className="font-mono text-xs text-jarvis-cyan">
            {step + 1} / {total}
          </p>
        </div>
        <div className="relative mt-2 h-1 w-full overflow-hidden bg-jarvis-border/60">
          <div
            className="absolute inset-y-0 left-0 bg-jarvis-cyan shadow-[0_0_8px_rgba(0,229,255,0.6)] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div
        key={q.id}
        className="jarvis-panel animate-fade-in relative overflow-hidden p-5"
        style={{ animationDelay: '120ms' }}
      >
        <p className="font-display text-[11px] uppercase tracking-[0.28em] text-jarvis-cyan">
          {q.title}
        </p>
        <h2 className="mt-2 font-body text-lg leading-snug text-jarvis-text">
          {q.prompt}
        </h2>

        <ul className="mt-5 space-y-2">
          {q.options.map((opt, i) => {
            const isSelected = selected === i;
            return (
              <li
                key={`${q.id}-${i}`}
                className="animate-fade-in"
                style={{ animationDelay: `${200 + i * 90}ms` }}
              >
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  className={[
                    'group relative flex w-full items-center justify-between gap-3 border px-4 py-3 text-left transition-all duration-200',
                    isSelected
                      ? 'border-jarvis-cyan bg-jarvis-cyan/15 text-jarvis-accent shadow-glow'
                      : 'border-jarvis-border bg-jarvis-panel/60 text-jarvis-text hover:border-jarvis-cyan/60 hover:bg-jarvis-blue/5 hover:text-jarvis-accent hover:shadow-glow-soft',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={[
                        'flex h-6 w-6 items-center justify-center border font-mono text-[11px]',
                        isSelected
                          ? 'border-jarvis-cyan bg-jarvis-cyan/20 text-jarvis-accent'
                          : 'border-jarvis-border text-jarvis-dim',
                      ].join(' ')}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="font-body text-base">{opt.label}</span>
                  </span>
                  <span
                    className={[
                      'font-mono text-[11px] tracking-[0.16em]',
                      isSelected ? 'text-jarvis-cyan' : 'text-jarvis-dim',
                    ].join(' ')}
                  >
                    {opt.sub}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div
        className="animate-fade-in flex items-center justify-between"
        style={{ animationDelay: '420ms' }}
      >
        <button
          type="button"
          onClick={onBack}
          disabled={step === 0}
          className={[
            'flex items-center gap-2 border px-3 py-2 font-display text-[11px] uppercase tracking-[0.24em] transition',
            step === 0
              ? 'cursor-not-allowed border-jarvis-border/50 text-jarvis-dim/50'
              : 'border-jarvis-border bg-jarvis-panel/60 text-jarvis-dim hover:border-jarvis-cyan/60 hover:text-jarvis-accent',
          ].join(' ')}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          <span>戻る</span>
        </button>
        <p className="font-mono text-[11px] text-jarvis-dim">
          選択で自動的に次へ
          <ArrowRight size={12} className="-mb-px ml-1 inline" />
        </p>
      </div>
    </div>
  );
}

function Result({ result, onRestart }) {
  const type = TYPES[result.type];
  const Icon = type.icon;
  const match = useCountUp(result.matchScore);
  const gap = useCountUp(result.gapScore);

  const ranking = useMemo(
    () =>
      TYPE_ORDER.map((k) => ({
        key: k,
        score: result.scores[k] || 0,
        max: result.maxPerType[k] || 1,
      })).sort((a, b) => b.score - a.score),
    [result],
  );

  return (
    <div className="mt-6 space-y-5">
      <header
        className="animate-fade-in"
        style={{ animationDelay: '40ms' }}
      >
        <p className="jarvis-subtitle text-[11px]">
          // DIAGNOSTIC_COMPLETE · {result.date}
        </p>
        <h2 className="font-display text-xl tracking-[0.18em] text-jarvis-accent">
          診断結果
        </h2>
      </header>

      <div
        className="jarvis-panel animate-glow-in relative overflow-hidden p-6 text-center"
        style={{ animationDelay: '120ms' }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-jarvis-cyan/20 to-transparent animate-sweep"
        />
        <div className="relative flex flex-col items-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center border border-jarvis-cyan bg-jarvis-cyan/10 text-jarvis-accent shadow-glow animate-pulse-glow">
            <Icon size={32} strokeWidth={1.5} />
          </span>
          <p className="font-mono text-[11px] tracking-[0.32em] text-jarvis-cyan">
            {type.en}
          </p>
          <h3 className="jarvis-title text-3xl">{type.label}</h3>
          <p className="font-body text-sm text-jarvis-text/80">{type.tagline}</p>
        </div>
      </div>

      <div
        className="animate-fade-in grid grid-cols-2 gap-3"
        style={{ animationDelay: '320ms' }}
      >
        <ScoreTile
          label="MATCH"
          sub="適合度"
          value={match}
          tone="cyan"
        />
        <ScoreTile
          label="GAP"
          sub="ギャップ"
          value={gap}
          tone="dim"
          provisional
        />
      </div>

      <div
        className="jarvis-panel animate-fade-in p-5"
        style={{ animationDelay: '420ms' }}
      >
        <div className="flex items-baseline justify-between">
          <p className="font-display text-[11px] uppercase tracking-[0.24em] text-jarvis-cyan">
            タイプ別スコア
          </p>
          <p className="jarvis-subtitle text-[10px]">// TYPE_DISTRIBUTION</p>
        </div>
        <ul className="mt-4 space-y-3">
          {ranking.map((r, i) => (
            <ScoreBar
              key={r.key}
              type={TYPES[r.key]}
              score={r.score}
              max={r.max}
              isWinner={r.key === result.type}
              delay={500 + i * 80}
            />
          ))}
        </ul>
      </div>

      <div
        className="animate-fade-in"
        style={{ animationDelay: '820ms' }}
      >
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-2 border border-jarvis-border bg-jarvis-panel/60 px-4 py-2 font-display text-xs font-semibold uppercase tracking-[0.28em] text-jarvis-dim transition hover:border-jarvis-cyan/60 hover:text-jarvis-accent hover:shadow-glow-soft"
        >
          <RefreshCw size={14} strokeWidth={2} />
          <span>再診断 · RE-DIAGNOSE</span>
        </button>
      </div>
    </div>
  );
}

function ScoreTile({ label, sub, value, tone, provisional }) {
  const isCyan = tone === 'cyan';
  return (
    <div
      className={[
        'jarvis-panel relative overflow-hidden px-4 py-4',
        isCyan ? 'shadow-glow' : '',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between">
        <p className="font-display text-[11px] tracking-[0.28em] text-jarvis-cyan">
          {label}
        </p>
        {provisional && (
          <span className="font-mono text-[9px] tracking-[0.18em] text-jarvis-dim">
            // PROVISIONAL
          </span>
        )}
      </div>
      <p className="jarvis-subtitle text-[10px]">{sub}</p>
      <p
        className={[
          'mt-2 font-display text-4xl font-bold tabular-nums',
          isCyan ? 'text-jarvis-accent' : 'text-jarvis-text/80',
        ].join(' ')}
        style={isCyan ? { textShadow: '0 0 10px rgba(0, 229, 255, 0.55)' } : undefined}
      >
        {value}
        <span className="ml-1 font-body text-base text-jarvis-dim">%</span>
      </p>
    </div>
  );
}

function ScoreBar({ type, score, max, isWinner, delay }) {
  const Icon = type.icon;
  const [width, setWidth] = useState(0);
  const target = max > 0 ? (score / max) * 100 : 0;

  useEffect(() => {
    const t = setTimeout(() => setWidth(target), delay);
    return () => clearTimeout(t);
  }, [target, delay]);

  return (
    <li className="flex items-center gap-3">
      <span
        className={[
          'flex h-8 w-8 shrink-0 items-center justify-center border',
          isWinner
            ? 'border-jarvis-cyan text-jarvis-accent shadow-glow-soft'
            : 'border-jarvis-border text-jarvis-dim',
        ].join(' ')}
      >
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <div className="flex-1">
        <div className="flex items-baseline justify-between">
          <p
            className={[
              'font-display text-[12px] tracking-[0.22em]',
              isWinner ? 'text-jarvis-accent' : 'text-jarvis-text/80',
            ].join(' ')}
          >
            {type.label}
          </p>
          <p
            className={[
              'font-mono text-[11px] tabular-nums',
              isWinner ? 'text-jarvis-cyan' : 'text-jarvis-dim',
            ].join(' ')}
          >
            {score} / {max}
          </p>
        </div>
        <div className="relative mt-1 h-1.5 overflow-hidden bg-jarvis-border/60">
          <div
            className={[
              'absolute inset-y-0 left-0 transition-[width] duration-700 ease-out',
              isWinner
                ? 'bg-jarvis-cyan shadow-[0_0_8px_rgba(0,229,255,0.6)]'
                : 'bg-jarvis-blue/60',
            ].join(' ')}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
    </li>
  );
}
