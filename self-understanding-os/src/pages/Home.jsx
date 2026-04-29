import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BatteryCharging,
  Check,
  ChevronDown,
  ChevronRight,
  Headphones,
  Loader2,
  MessageSquare,
  Moon,
  Pencil,
  Quote,
  RefreshCw,
  Smile,
  Sparkles,
  Sunrise,
  Target,
} from 'lucide-react';
import { calcStateScore, scoreLabel } from '../lib/scoring.js';
import {
  generateMorningMessage,
  loadCachedMorningMessage,
} from '../lib/morningMessage.js';

const STORAGE_KEY = 'dailyState';
const ARCHIVE_KEY = 'dailyStateArchive';
const IDEAL_TYPE_KEY = 'idealType';
const HABITS_KEY = 'habits';
const PODCAST_KEY = 'podcastRecommendations';
const NIGHT_HOUR = 18;
const ARCHIVE_LIMIT = 14;
const LEVELS = [1, 2, 3, 4, 5];

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

function loadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadArchive() {
  const v = loadJSON(ARCHIVE_KEY);
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

function archiveRecord(state) {
  if (!state || !state.date) return;
  const archive = loadArchive();
  archive[state.date] = state;
  const dates = Object.keys(archive).sort();
  while (dates.length > ARCHIVE_LIMIT) delete archive[dates.shift()];
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  } catch {
    /* ignore */
  }
}

function loadDailyState() {
  const parsed = loadJSON(STORAGE_KEY);
  if (parsed && parsed.date && parsed.date !== todayISO()) {
    archiveRecord(parsed);
  }
  return parsed;
}

function loadYesterdayState() {
  const y = shiftDay(todayISO(), -1);
  const archive = loadArchive();
  if (archive[y]) return archive[y];
  const parsed = loadJSON(STORAGE_KEY);
  if (parsed && parsed.date === y) return parsed;
  return null;
}

function loadHabitsToday() {
  const habits = loadJSON(HABITS_KEY);
  if (!Array.isArray(habits)) return null;
  const today = todayISO();
  const total = habits.length;
  const completed = habits.filter((h) =>
    h.logs?.some((l) => l.date === today && l.done),
  ).length;
  return {
    total,
    completed,
    rate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
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

export default function Home() {
  const [state, setState] = useState(null);
  const [ideal, setIdeal] = useState(null);
  const [message, setMessage] = useState(null);
  const [habit, setHabit] = useState(null);
  const [yesterday, setYesterday] = useState(null);
  const [podcast, setPodcast] = useState(null);
  const [tick, setTick] = useState(0);

  function refresh() {
    const today = todayISO();
    const stored = loadDailyState();
    setState(stored && stored.date === today ? stored : null);
    setIdeal(loadJSON(IDEAL_TYPE_KEY));
    const msg = loadCachedMorningMessage();
    setMessage(msg && msg.date === today ? msg : null);
    setHabit(loadHabitsToday());
    setYesterday(loadYesterdayState());
    const pc = loadJSON(PODCAST_KEY);
    setPodcast(pc && pc.date === today ? pc : pc);
  }

  useEffect(() => {
    refresh();
    const onFocus = () => setTick((t) => t + 1);
    const onStorage = () => setTick((t) => t + 1);
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  function saveState(values) {
    const today = todayISO();
    const next = {
      ...(state || {}),
      date: today,
      mood: values.mood,
      energy: values.energy,
      motivation: values.motivation,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    archiveRecord(next);
    setState(next);
  }

  function saveNightReview({ review, nextAction }) {
    if (!state) return;
    const merged = {
      ...state,
      review: review.trim(),
      nextAction: nextAction.trim(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    archiveRecord(merged);
    setState(merged);
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <Header state={state} />
      <YesterdayCard yesterday={yesterday} />
      <MessageCard message={message} ideal={ideal} onUpdated={setMessage} />
      <PodcastCard podcast={podcast} />
      <div className="grid grid-cols-2 gap-3">
        <IdealTile ideal={ideal} />
        <HabitTile habit={habit} />
      </div>
      <StateTile state={state} onSave={saveState} />
      <NightReview saved={state} onSave={saveNightReview} />
    </section>
  );
}

function Header({ state }) {
  const score = calcStateScore(state || {});
  const greet = (() => {
    const h = new Date().getHours();
    if (h < 5) return 'おやすみなさい';
    if (h < 11) return 'おはようございます';
    if (h < 17) return 'こんにちは';
    if (h < 22) return 'お疲れさまです';
    return 'こんばんは';
  })();
  return (
    <header className="animate-fade-in pt-2">
      <p className="app-eyebrow">{greet}</p>
      <h1 className="app-title mt-0.5 text-2xl">
        {score != null ? (
          <>
            今日のあなたは <span className="text-app-amber">{score}</span>
            <span className="text-app-dim">/100</span>
          </>
        ) : (
          '今日も一歩ずつ'
        )}
      </h1>
    </header>
  );
}

function YesterdayCard({ yesterday }) {
  if (!yesterday || !yesterday.nextAction) return null;
  return (
    <div
      className="app-card animate-fade-in flex items-start gap-3 p-4"
      style={{ animationDelay: '40ms' }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-fog/10 text-app-fog">
        <Sunrise size={16} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="app-eyebrow">昨日の自分から</p>
        <p className="mt-0.5 text-base leading-relaxed text-app-text">
          「{yesterday.nextAction}」
        </p>
      </div>
    </div>
  );
}

function MessageCard({ message, ideal, onUpdated }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    if (!ideal) return;
    setGenerating(true);
    setError(null);
    try {
      const generated = await generateMorningMessage(ideal);
      onUpdated?.(generated);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setGenerating(false);
    }
  }

  if (!ideal) {
    return (
      <div
        className="app-card animate-fade-in p-5"
        style={{ animationDelay: '80ms' }}
      >
        <div className="flex items-center gap-2">
          <Quote size={14} className="text-app-amber/70" />
          <p className="app-eyebrow">今日のメッセージ</p>
        </div>
        <p className="mt-3 text-sm text-app-text-soft">
          理想像を診断するとあなた向けの言葉が届きます。
        </p>
        <a
          href="/settings"
          className="mt-3 inline-flex items-center gap-1 text-sm text-app-amber hover:text-app-amber-soft"
        >
          Settingsで診断する
          <ChevronRight size={14} />
        </a>
      </div>
    );
  }

  if (!message) {
    return (
      <div
        className="app-card animate-fade-in p-5"
        style={{ animationDelay: '80ms' }}
      >
        <div className="flex items-center gap-2">
          <Quote size={14} className="text-app-amber/70" />
          <p className="app-eyebrow">今日のメッセージ</p>
        </div>
        <p className="mt-2 text-sm text-app-text-soft">
          {error
            ? '生成に失敗しました'
            : 'まだ今日のメッセージが届いていません。'}
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="app-btn-primary mt-4"
        >
          {generating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          <span>{generating ? '生成中...' : 'メッセージを生成'}</span>
        </button>
        {error && (
          <p className="mt-2 break-words text-[11px] text-app-rose">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="app-card animate-fade-in p-5"
      style={{ animationDelay: '80ms' }}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Quote size={14} className="text-app-amber/70" />
          <p className="app-eyebrow">今日のメッセージ</p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          aria-label="再生成"
          className="rounded-full p-1.5 text-app-dim transition hover:bg-app-border/40 hover:text-app-amber"
        >
          {generating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
        </button>
      </header>

      {message.quote && (
        <blockquote className="mt-3 border-l-2 border-app-amber/60 pl-4">
          <p className="text-base leading-relaxed text-app-text">
            {message.quote}
          </p>
          <p className="mt-1.5 text-[12px] text-app-dim">
            — {message.attribution || message.person}
          </p>
        </blockquote>
      )}
      {message.action && (
        <div className="mt-4 rounded-card bg-app-amber/10 p-3">
          <p className="app-eyebrow flex items-center gap-1.5 text-app-amber">
            <Sparkles size={12} />
            今日のアクション
          </p>
          <p className="mt-1 text-[15px] leading-relaxed text-app-text">
            {message.action}
          </p>
        </div>
      )}
      {!message.quote && !message.action && message.raw && (
        <p className="mt-3 text-sm text-app-text-soft">{message.raw}</p>
      )}
    </div>
  );
}

function PodcastCard({ podcast }) {
  const top = podcast?.podcasts?.[0];
  if (!top) {
    return (
      <a
        href="/content"
        className="app-card animate-fade-in flex items-center gap-3 p-4 transition hover:border-app-border-soft"
        style={{ animationDelay: '120ms' }}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-fog/10 text-app-fog">
          <Headphones size={16} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="app-eyebrow">今日のおすすめPodcast</p>
          <p className="mt-0.5 text-sm text-app-text-soft">
            タップして探しに行く
          </p>
        </div>
        <ChevronRight size={16} className="text-app-dim" />
      </a>
    );
  }

  return (
    <a
      href="/content"
      className="app-card animate-fade-in block p-5 transition hover:border-app-border-soft"
      style={{ animationDelay: '120ms' }}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headphones size={14} className="text-app-fog" />
          <p className="app-eyebrow">今日のおすすめPodcast</p>
        </div>
        <ChevronRight size={14} className="text-app-dim" />
      </header>
      <p className="mt-3 line-clamp-2 text-base font-medium leading-snug text-app-text">
        {top.title}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {top.duration && (
          <span className="app-chip app-chip-fog">{top.duration}</span>
        )}
        {podcast?.podcasts?.length > 1 && (
          <span className="text-[11px] text-app-dim">
            +{podcast.podcasts.length - 1} 件
          </span>
        )}
      </div>
      {top.reason && (
        <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-app-text-soft">
          {top.reason}
        </p>
      )}
    </a>
  );
}

function IdealTile({ ideal }) {
  return (
    <a
      href="/settings"
      className="app-card animate-fade-in block p-4 transition hover:border-app-border-soft"
      style={{ animationDelay: '160ms' }}
    >
      <div className="flex items-center gap-1.5">
        <Target size={12} className={ideal ? 'text-app-amber' : 'text-app-dim'} />
        <p className="app-eyebrow">理想像</p>
      </div>
      {ideal ? (
        <>
          <p className="mt-1.5 text-base font-semibold text-app-text">
            {ideal.typeLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-app-dim">
            適合 {ideal.matchScore ?? 0}%
          </p>
        </>
      ) : (
        <p className="mt-2 text-[13px] text-app-text-soft">未診断</p>
      )}
    </a>
  );
}

function HabitTile({ habit }) {
  const [shown, setShown] = useState(0);
  const target = habit?.rate ?? 0;
  useEffect(() => {
    const t = setTimeout(() => setShown(target), 120);
    return () => clearTimeout(t);
  }, [target]);

  return (
    <a
      href="/habit"
      className="app-card animate-fade-in block p-4 transition hover:border-app-border-soft"
      style={{ animationDelay: '160ms' }}
    >
      <div className="flex items-center gap-1.5">
        <Activity
          size={12}
          className={
            habit && habit.total > 0 ? 'text-app-amber' : 'text-app-dim'
          }
        />
        <p className="app-eyebrow">今日の達成率</p>
      </div>
      {habit && habit.total > 0 ? (
        <>
          <p className="mt-1.5 text-base font-semibold text-app-text">
            {habit.rate}
            <span className="ml-0.5 text-xs font-normal text-app-dim">%</span>
            <span className="ml-2 text-[11px] font-normal text-app-dim">
              {habit.completed} / {habit.total}
            </span>
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-app-border/60">
            <div
              className="h-full bg-app-amber transition-[width] duration-700 ease-out"
              style={{ width: `${shown}%` }}
            />
          </div>
        </>
      ) : (
        <p className="mt-2 text-[13px] text-app-text-soft">習慣を追加</p>
      )}
    </a>
  );
}

function StateTile({ state, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const score = calcStateScore(state || {});
  const recorded = score != null;

  if (!recorded || editing) {
    return (
      <StateEditor
        initial={state}
        onCancel={editing ? () => setEditing(false) : null}
        onSave={(v) => {
          onSave(v);
          setEditing(false);
          setExpanded(true);
        }}
      />
    );
  }

  return (
    <div
      className="app-card animate-fade-in p-5"
      style={{ animationDelay: '200ms' }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="app-eyebrow">今日の状態</p>
          <p className="mt-1">
            <span className="font-display text-3xl font-bold text-app-amber">
              {score}
            </span>
            <span className="ml-1 text-sm text-app-dim">/100</span>
            <span className="ml-3 text-[12px] text-app-text-soft">
              {scoreLabel(score)}
            </span>
          </p>
        </div>
        <ChevronDown
          size={18}
          className={[
            'text-app-dim transition-transform',
            expanded ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      {expanded && (
        <div className="mt-4 space-y-2.5 border-t border-app-border pt-4">
          <Breakdown label="気分" value={state.mood} icon={Smile} />
          <Breakdown label="体調" value={state.energy} icon={BatteryCharging} />
          <Breakdown label="やる気" value={state.motivation} icon={Sparkles} />
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="app-btn-ghost mt-2"
          >
            <Pencil size={12} />
            <span>修正</span>
          </button>
        </div>
      )}
    </div>
  );
}

function Breakdown({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={14} className="shrink-0 text-app-dim" />
      <span className="w-14 text-[13px] text-app-text-soft">{label}</span>
      <div className="flex flex-1 gap-1">
        {LEVELS.map((n) => (
          <span
            key={n}
            className={[
              'h-1.5 flex-1 rounded-full transition-all',
              n <= value ? 'bg-app-amber' : 'bg-app-border/60',
            ].join(' ')}
          />
        ))}
      </div>
      <span className="w-8 text-right font-mono text-[11px] text-app-dim">
        {value}/5
      </span>
    </div>
  );
}

function StateEditor({ initial, onSave, onCancel }) {
  const [mood, setMood] = useState(initial?.mood || 0);
  const [energy, setEnergy] = useState(initial?.energy || 0);
  const [motivation, setMotivation] = useState(initial?.motivation || 0);

  const ready = mood > 0 && energy > 0 && motivation > 0;
  const score = calcStateScore({ mood, energy, motivation });

  return (
    <div
      className="app-card animate-fade-in space-y-4 p-5"
      style={{ animationDelay: '200ms' }}
    >
      <header>
        <p className="app-eyebrow">今日の状態を記録</p>
        <h2 className="app-title mt-0.5 text-lg">気分・体調・やる気</h2>
      </header>

      <LevelRow label="気分" icon={Smile} value={mood} onChange={setMood} />
      <LevelRow
        label="体調"
        icon={BatteryCharging}
        value={energy}
        onChange={setEnergy}
      />
      <LevelRow
        label="やる気"
        icon={Sparkles}
        value={motivation}
        onChange={setMotivation}
      />

      <div className="flex items-center justify-between rounded-card bg-app-bg-elev px-3 py-2.5">
        <p className="text-[12px] text-app-text-soft">スコア</p>
        <p className="font-display text-xl font-bold text-app-amber">
          {score ?? '--'}
          <span className="ml-0.5 text-[11px] font-normal text-app-dim">
            /100
          </span>
        </p>
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="app-btn-ghost">
            キャンセル
          </button>
        )}
        <button
          type="button"
          onClick={() => onSave({ mood, energy, motivation })}
          disabled={!ready}
          className="app-btn-primary"
        >
          <Check size={14} strokeWidth={2.5} />
          <span>記録</span>
        </button>
      </div>
    </div>
  );
}

function LevelRow({ icon: Icon, label, value, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13px] text-app-text-soft">
          <Icon size={14} className="text-app-dim" />
          {label}
        </span>
        <span className="font-mono text-[11px] text-app-dim">
          {value > 0 ? `${value} / 5` : '— / 5'}
        </span>
      </div>
      <div className="mt-2 flex gap-1.5">
        {LEVELS.map((n) => {
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

function NightReview({ saved, onSave }) {
  const evening = useIsEvening();
  const [editing, setEditing] = useState(false);

  if (!evening) return null;

  if (!saved) {
    return (
      <div
        className="app-card animate-fade-in flex items-start gap-3 p-4"
        style={{ animationDelay: '300ms' }}
      >
        <Moon size={16} className="mt-0.5 shrink-0 text-app-fog" />
        <div>
          <p className="app-eyebrow">夜の振り返り</p>
          <p className="mt-1 text-[13px] text-app-text-soft">
            まずは今日の状態を記録すると振り返りも保存できます。
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
      className="app-card animate-fade-in space-y-3 p-5"
      style={{ animationDelay: '300ms' }}
    >
      <header className="flex items-center gap-2">
        <Moon size={14} className="text-app-fog" />
        <p className="app-eyebrow">夜の振り返り</p>
      </header>
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-[12px] text-app-text-soft">
          <MessageSquare size={11} />
          今日の一言
        </label>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="例：会議で発言できた / 朝の集中が続いた"
          rows={3}
          maxLength={300}
          className="app-input resize-y"
        />
      </div>
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-[12px] text-app-text-soft">
          <Sunrise size={11} />
          明日の最小アクション
        </label>
        <input
          type="text"
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
          placeholder="例：朝7時に起きる / 1ページだけ読む"
          maxLength={120}
          className="app-input"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="app-btn-ghost">
            キャンセル
          </button>
        )}
        <button type="submit" disabled={!ready} className="app-btn-primary">
          <Check size={14} strokeWidth={2.5} />
          <span>保存</span>
        </button>
      </div>
    </form>
  );
}

function NightReviewSummary({ saved, onEdit }) {
  return (
    <div
      className="app-card animate-fade-in p-5"
      style={{ animationDelay: '300ms' }}
    >
      <header className="flex items-center gap-2">
        <Sparkles size={14} className="text-app-amber" />
        <p className="app-eyebrow">今日もお疲れさま</p>
      </header>

      <div className="mt-3 space-y-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[12px] text-app-dim">
            <MessageSquare size={11} />
            今日の一言
          </p>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-app-text">
            {saved.review}
          </p>
        </div>
        <div className="border-l-2 border-app-amber/50 pl-3">
          <p className="mb-1 flex items-center gap-1.5 text-[12px] text-app-dim">
            <Sunrise size={11} />
            明日の最小アクション
          </p>
          <p className="text-[15px] leading-relaxed text-app-amber">
            {saved.nextAction}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="app-btn-ghost mt-4"
      >
        <Pencil size={12} />
        <span>修正</span>
      </button>
    </div>
  );
}
