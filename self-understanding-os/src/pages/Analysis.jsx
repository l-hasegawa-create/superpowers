import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Lightbulb,
  Sunrise,
} from 'lucide-react';

const STORAGE_KEY = 'habits';

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

function bucketOfTime(time) {
  if (!time || typeof time !== 'string') return null;
  const h = parseInt(time.slice(0, 2), 10);
  if (Number.isNaN(h)) return null;
  if (h >= 4 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'night';
}

const BUCKET_LABELS = {
  morning: { ja: '午前', en: 'MORNING' },
  afternoon: { ja: '午後', en: 'AFTERNOON' },
  night: { ja: '夜', en: 'NIGHT' },
};

function truncate(s, n) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function analyze(habits) {
  if (!habits || habits.length === 0) {
    return { hasHabits: false, hasLogs: false };
  }

  const today = todayISO();
  let totalLogs = 0;
  let totalDone = 0;
  const buckets = {
    morning: { count: 0, done: 0, notDone: 0 },
    afternoon: { count: 0, done: 0, notDone: 0 },
    night: { count: 0, done: 0, notDone: 0 },
  };

  const perHabit = habits.map((h) => {
    let doneCount = 0;
    let totalCount = 0;
    h.logs?.forEach((l) => {
      totalLogs += 1;
      totalCount += 1;
      if (l.done) {
        totalDone += 1;
        doneCount += 1;
      }
      const b = bucketOfTime(l.time);
      if (b) {
        buckets[b].count += 1;
        if (l.done) buckets[b].done += 1;
        else buckets[b].notDone += 1;
      }
    });
    return {
      id: h.id,
      name: truncate(h.habit_name, 14),
      fullName: h.habit_name,
      streak: calcStreak(h, today),
      done: doneCount,
      total: totalCount,
      rate: totalCount > 0 ? doneCount / totalCount : 0,
    };
  });

  const overallRate = totalLogs > 0 ? totalDone / totalLogs : 0;
  const morningSuccessRate =
    buckets.morning.count > 0 ? buckets.morning.done / buckets.morning.count : 0;
  const nightFailRate =
    buckets.night.count > 0 ? buckets.night.notDone / buckets.night.count : 0;

  let dominantBucket = null;
  let maxDone = -1;
  ['morning', 'afternoon', 'night'].forEach((b) => {
    if (buckets[b].done > maxDone) {
      maxDone = buckets[b].done;
      dominantBucket = b;
    }
  });
  if (maxDone === 0) dominantBucket = null;

  const insights = [];
  if (overallRate > 0.7) {
    insights.push({ tone: 'positive', text: '継続できています' });
  }
  if (morningSuccessRate > 0.7) {
    insights.push({ tone: 'positive', text: '朝の実行が強みです' });
  }
  if (nightFailRate > 0.6) {
    insights.push({
      tone: 'caution',
      text: '夜は疲労による低下の可能性あり',
    });
  }

  let suggestion;
  const hasTimedLogs =
    buckets.morning.count + buckets.afternoon.count + buckets.night.count > 0;

  if (
    overallRate > 0.7 &&
    morningSuccessRate > 0.7 &&
    nightFailRate > 0.6
  ) {
    suggestion =
      '夜に組まれている習慣は朝の時間帯に寄せると、現在の好調をさらに伸ばせそうです。';
  } else if (nightFailRate > 0.6) {
    suggestion =
      '夜の習慣を朝か午後に移すか、最小アクションをさらに小さく設計してみましょう。';
  } else if (morningSuccessRate > 0.7) {
    suggestion =
      '朝の勢いを活かして、新しく増やす習慣も午前中に組み込んでみましょう。';
  } else if (overallRate > 0.7) {
    suggestion =
      '継続を支えるルーティンが機能しています。負荷を少しだけ上げてみる時期です。';
  } else if (totalLogs === 0) {
    suggestion =
      'まずは習慣を実行してログを蓄積しましょう。データが集まると分析の精度が上がります。';
  } else if (overallRate < 0.3) {
    suggestion =
      '最小アクションを2分以下に再設定し、ハードルを下げてみましょう。';
  } else if (!hasTimedLogs) {
    suggestion =
      'Habit画面でチェックを付けると実行時間も自動記録され、時間帯別の分析が始まります。';
  } else {
    suggestion =
      '同じ時間・同じ場所でルーティン化すると、定着率が上がる傾向があります。';
  }

  return {
    hasHabits: true,
    hasLogs: totalLogs > 0,
    totalLogs,
    totalDone,
    overallRate,
    morningSuccessRate,
    nightFailRate,
    buckets,
    dominantBucket,
    perHabit,
    insights,
    suggestion,
  };
}

export default function Analysis() {
  const [habits, setHabits] = useState([]);

  useEffect(() => {
    setHabits(loadHabits());
  }, []);

  const stats = useMemo(() => analyze(habits), [habits]);

  return (
    <section className="mx-auto max-w-3xl">
      <div className="animate-fade-in">
        <p className="jarvis-subtitle text-xs">// MODULE_03</p>
        <h1 className="jarvis-title mt-1 text-3xl">ANALYSIS</h1>
        <div className="jarvis-divider mt-3" />
      </div>

      {!stats.hasHabits ? (
        <EmptyState
          title="HABITS_NOT_FOUND"
          message="Habit画面で習慣を追加すると、ここに分析結果が表示されます。"
        />
      ) : !stats.hasLogs ? (
        <EmptyState
          title="LOGS_EMPTY"
          message="まずはHabit画面で実行をチェックしましょう。ログが蓄積され次第、分析が稼働します。"
        />
      ) : (
        <>
          <OverallRate stats={stats} />
          <StreakChart perHabit={stats.perHabit} />
          <TimeDistribution stats={stats} />
          <Insights insights={stats.insights} />
          <Suggestion suggestion={stats.suggestion} />
        </>
      )}
    </section>
  );
}

function EmptyState({ title, message }) {
  return (
    <div
      className="jarvis-panel animate-fade-in mt-6 p-6 text-center"
      style={{ animationDelay: '120ms' }}
    >
      <p className="font-mono text-sm text-jarvis-dim">// {title}</p>
      <p className="mt-2 font-body text-sm text-jarvis-text/70">{message}</p>
    </div>
  );
}

function OverallRate({ stats }) {
  const [shown, setShown] = useState(0);
  const target = Math.round(stats.overallRate * 100);
  useEffect(() => {
    const t = setTimeout(() => setShown(target), 120);
    return () => clearTimeout(t);
  }, [target]);

  return (
    <div
      className="jarvis-panel animate-glow-in mt-6 overflow-hidden p-5"
      style={{ animationDelay: '80ms' }}
    >
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display text-[11px] tracking-[0.28em] text-jarvis-cyan">
            OVERALL
          </p>
          <p className="jarvis-subtitle text-[10px]">// EXECUTION_RATE</p>
          <p className="mt-1 font-mono text-[11px] text-jarvis-dim">
            {stats.totalDone} / {stats.totalLogs} 完了
          </p>
        </div>
        <p
          className="font-display text-4xl font-bold tabular-nums text-jarvis-accent"
          style={{ textShadow: '0 0 10px rgba(0, 229, 255, 0.55)' }}
        >
          {target}
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

function StreakChart({ perHabit }) {
  const data = perHabit.map((h) => ({ ...h }));
  const height = Math.max(140, 44 + data.length * 36);
  const maxStreak = Math.max(1, ...data.map((d) => d.streak));

  return (
    <div
      className="jarvis-panel animate-fade-in mt-4 p-5"
      style={{ animationDelay: '180ms' }}
    >
      <div className="flex items-baseline justify-between">
        <p className="flex items-center gap-2 font-display text-[11px] tracking-[0.24em] text-jarvis-cyan">
          <Flame size={13} strokeWidth={2} />
          <span>習慣別 継続日数</span>
        </p>
        <p className="jarvis-subtitle text-[10px]">// STREAK_PER_HABIT</p>
      </div>
      <div className="jarvis-chart mt-4 -ml-2">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 24, bottom: 4, left: 0 }}
          >
            <XAxis
              type="number"
              stroke="#6b8cae"
              tick={{ fill: '#6b8cae', fontSize: 11 }}
              axisLine={{ stroke: '#13304d' }}
              tickLine={{ stroke: '#13304d' }}
              allowDecimals={false}
              domain={[0, Math.max(maxStreak, 3)]}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#6b8cae"
              tick={{ fill: '#d9f4ff', fontSize: 11 }}
              axisLine={{ stroke: '#13304d' }}
              tickLine={false}
              width={110}
            />
            <Tooltip
              cursor={{ fill: 'rgba(0, 229, 255, 0.06)' }}
              contentStyle={{
                background: 'rgba(2, 6, 13, 0.95)',
                border: '1px solid #13304d',
                boxShadow: '0 0 12px rgba(0, 229, 255, 0.25)',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 12,
              }}
              labelStyle={{
                color: '#7df9ff',
                fontSize: 11,
                letterSpacing: '0.1em',
              }}
              itemStyle={{ color: '#d9f4ff' }}
              labelFormatter={(_label, payload) =>
                payload?.[0]?.payload?.fullName || ''
              }
              formatter={(value) => [`${value} 日`, '継続']}
            />
            <Bar dataKey="streak">
              {data.map((entry) => (
                <Cell
                  key={entry.id}
                  fill={entry.streak > 0 ? '#00e5ff' : '#3aa0ff'}
                  fillOpacity={entry.streak > 0 ? 0.95 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TimeDistribution({ stats }) {
  const data = ['morning', 'afternoon', 'night'].map((b) => ({
    bucket: b,
    name: BUCKET_LABELS[b].ja,
    label: BUCKET_LABELS[b].en,
    completed: stats.buckets[b].done,
    notDone: stats.buckets[b].notDone,
    total: stats.buckets[b].count,
  }));

  const dominant = stats.dominantBucket
    ? BUCKET_LABELS[stats.dominantBucket]
    : null;

  return (
    <div
      className="jarvis-panel animate-fade-in mt-4 p-5"
      style={{ animationDelay: '260ms' }}
    >
      <div className="flex items-baseline justify-between">
        <p className="flex items-center gap-2 font-display text-[11px] tracking-[0.24em] text-jarvis-cyan">
          <Clock size={13} strokeWidth={2} />
          <span>時間帯別 完了分布</span>
        </p>
        <p className="jarvis-subtitle text-[10px]">// COMPLETION_BY_HOUR</p>
      </div>

      {dominant ? (
        <div className="mt-3 inline-flex items-center gap-2 border border-jarvis-cyan/60 bg-jarvis-cyan/10 px-3 py-1 shadow-glow-soft">
          <Sunrise size={12} strokeWidth={2} className="text-jarvis-cyan" />
          <span className="font-display text-[11px] tracking-[0.22em] text-jarvis-accent">
            TOP TIME · {dominant.en}
          </span>
          <span className="font-mono text-[11px] text-jarvis-dim">
            {dominant.ja}帯が中心
          </span>
        </div>
      ) : (
        <p className="jarvis-subtitle mt-3 text-[10px]">
          // NO_TIMED_LOGS — 完了ログが蓄積されると表示されます
        </p>
      )}

      <div className="jarvis-chart mt-4 -ml-2">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
          >
            <XAxis
              dataKey="name"
              stroke="#6b8cae"
              tick={{ fill: '#d9f4ff', fontSize: 11 }}
              axisLine={{ stroke: '#13304d' }}
              tickLine={false}
            />
            <YAxis
              stroke="#6b8cae"
              tick={{ fill: '#6b8cae', fontSize: 10 }}
              axisLine={{ stroke: '#13304d' }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(0, 229, 255, 0.06)' }}
              contentStyle={{
                background: 'rgba(2, 6, 13, 0.95)',
                border: '1px solid #13304d',
                boxShadow: '0 0 12px rgba(0, 229, 255, 0.25)',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 12,
              }}
              labelStyle={{
                color: '#7df9ff',
                fontSize: 11,
                letterSpacing: '0.1em',
              }}
              itemStyle={{ color: '#d9f4ff' }}
              formatter={(value, key) => [
                value,
                key === 'completed' ? '完了' : '未完',
              ]}
            />
            <Bar dataKey="completed" stackId="a" fill="#00e5ff" />
            <Bar
              dataKey="notDone"
              stackId="a"
              fill="#3aa0ff"
              fillOpacity={0.35}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Insights({ insights }) {
  if (!insights || insights.length === 0) {
    return (
      <div
        className="jarvis-panel animate-fade-in mt-4 p-4"
        style={{ animationDelay: '340ms' }}
      >
        <p className="font-display text-[11px] tracking-[0.24em] text-jarvis-cyan">
          AUTO_INSIGHTS
        </p>
        <p className="jarvis-subtitle mt-1 text-[10px]">
          // パターン未検出 — データが集まると検出され始めます
        </p>
      </div>
    );
  }
  return (
    <div
      className="jarvis-panel animate-fade-in mt-4 p-5"
      style={{ animationDelay: '340ms' }}
    >
      <div className="flex items-baseline justify-between">
        <p className="flex items-center gap-2 font-display text-[11px] tracking-[0.24em] text-jarvis-cyan">
          <Activity size={13} strokeWidth={2} />
          <span>自動検出</span>
        </p>
        <p className="jarvis-subtitle text-[10px]">// AUTO_INSIGHTS</p>
      </div>
      <ul className="mt-3 space-y-2">
        {insights.map((ins, i) => {
          const tonePositive = ins.tone === 'positive';
          const Icon = tonePositive ? CheckCircle2 : AlertTriangle;
          return (
            <li
              key={i}
              className={[
                'flex items-start gap-3 border px-3 py-2 transition',
                tonePositive
                  ? 'border-jarvis-cyan/60 bg-jarvis-cyan/5 shadow-glow-soft'
                  : 'border-amber-300/50 bg-amber-300/5',
              ].join(' ')}
            >
              <Icon
                size={16}
                strokeWidth={1.75}
                className={
                  tonePositive ? 'mt-0.5 text-jarvis-cyan' : 'mt-0.5 text-amber-300'
                }
              />
              <span
                className={[
                  'font-body text-sm',
                  tonePositive ? 'text-jarvis-accent' : 'text-amber-100',
                ].join(' ')}
              >
                {ins.text}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Suggestion({ suggestion }) {
  return (
    <div
      className="jarvis-panel animate-glow-in relative mt-4 overflow-hidden p-5"
      style={{ animationDelay: '440ms' }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-jarvis-cyan/20 to-transparent animate-sweep"
      />
      <div className="relative">
        <div className="flex items-baseline justify-between">
          <p className="flex items-center gap-2 font-display text-[11px] tracking-[0.24em] text-jarvis-cyan">
            <Lightbulb size={13} strokeWidth={2} />
            <span>改善提案</span>
          </p>
          <p className="jarvis-subtitle text-[10px]">// SUGGESTION</p>
        </div>
        <p
          className="mt-3 font-body text-base leading-relaxed text-jarvis-accent"
          style={{ textShadow: '0 0 6px rgba(0, 229, 255, 0.35)' }}
        >
          {suggestion}
        </p>
      </div>
    </div>
  );
}
