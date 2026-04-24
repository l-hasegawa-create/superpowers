import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  GitBranch,
  Plus,
  StickyNote,
  Trash2,
} from 'lucide-react';

const STORAGE_KEY = 'thoughtLogs';

const TYPES = {
  decision: {
    key: 'decision',
    label: '決断',
    en: 'DECISION',
    icon: GitBranch,
    tag: 'border-jarvis-cyan/70 text-jarvis-accent shadow-glow-soft',
    iconClass: 'text-jarvis-cyan',
  },
  memo: {
    key: 'memo',
    label: 'メモ',
    en: 'MEMO',
    icon: StickyNote,
    tag: 'border-jarvis-blue/70 text-jarvis-blue/90',
    iconClass: 'text-jarvis-blue',
  },
  rule: {
    key: 'rule',
    label: 'ルール',
    en: 'RULE',
    icon: Bookmark,
    tag: 'border-amber-300/70 text-amber-200',
    iconClass: 'text-amber-300',
  },
};

const TYPE_ORDER = ['decision', 'memo', 'rule'];

const REASON_PLACEHOLDER = {
  decision: 'なぜ決めた？決断の根拠',
  memo: '気づき・補足（任意）',
  rule: 'なぜルール化する？背景や狙い',
};

const CONTENT_PLACEHOLDER = {
  decision: '例：転職活動を始める',
  memo: '例：朝の集中力は1.5倍',
  rule: '例：22時以降は仕事を持ち込まない',
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(logs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export default function Thought() {
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    setLogs(loadLogs());
  }, []);

  const ruleCount = useMemo(
    () => logs.filter((l) => l.type === 'rule').length,
    [logs],
  );

  const filtered = useMemo(
    () => (tab === 'rules' ? logs.filter((l) => l.type === 'rule') : logs),
    [logs, tab],
  );

  function add({ type, content, reason }) {
    const entry = {
      id: newId(),
      type,
      content,
      reason,
      date: todayISO(),
    };
    const next = [entry, ...logs];
    setLogs(next);
    persist(next);
  }

  function remove(id) {
    const next = logs.filter((l) => l.id !== id);
    setLogs(next);
    persist(next);
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="animate-fade-in">
        <p className="jarvis-subtitle text-xs">// MODULE_04</p>
        <h1 className="jarvis-title mt-1 text-3xl">THOUGHT</h1>
        <div className="jarvis-divider mt-3" />
      </div>

      <Tabs current={tab} onChange={setTab} ruleCount={ruleCount} />
      <AddForm onAdd={add} initialType={tab === 'rules' ? 'rule' : 'decision'} />
      <LogList logs={filtered} onRemove={remove} tab={tab} />
    </section>
  );
}

function Tabs({ current, onChange, ruleCount }) {
  const tabs = [
    { key: 'all', ja: 'ALL LOGS', en: '全件' },
    { key: 'rules', ja: '自分ルール', en: `RULES · ${ruleCount}` },
  ];
  return (
    <div
      className="animate-fade-in mt-5 flex border-b border-jarvis-border"
      style={{ animationDelay: '80ms' }}
    >
      {tabs.map((t) => {
        const active = current === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={[
              'group relative flex flex-1 items-center justify-center gap-2 px-3 py-2.5 transition',
              active ? 'text-jarvis-accent' : 'text-jarvis-dim hover:text-jarvis-cyan',
            ].join(' ')}
          >
            <span className="font-display text-[12px] font-semibold tracking-[0.22em]">
              {t.ja}
            </span>
            <span className="font-mono text-[10px] tracking-[0.16em] text-jarvis-dim">
              {t.en}
            </span>
            <span
              aria-hidden
              className={[
                'pointer-events-none absolute inset-x-3 bottom-0 h-0.5 transition-all',
                active
                  ? 'bg-jarvis-cyan shadow-[0_0_8px_rgba(0,229,255,0.6)] animate-pulse-glow'
                  : 'bg-transparent',
              ].join(' ')}
            />
          </button>
        );
      })}
    </div>
  );
}

function AddForm({ onAdd, initialType }) {
  const [type, setType] = useState(initialType);
  const [content, setContent] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  const valid = content.trim().length > 0;

  function submit(e) {
    e.preventDefault();
    if (!valid) return;
    onAdd({
      type,
      content: content.trim(),
      reason: reason.trim(),
    });
    setContent('');
    setReason('');
  }

  return (
    <form
      onSubmit={submit}
      className="jarvis-panel animate-fade-in mt-4 space-y-3 p-4"
      style={{ animationDelay: '160ms' }}
    >
      <div className="flex items-baseline justify-between">
        <p className="font-display text-[11px] tracking-[0.28em] text-jarvis-cyan">
          NEW_LOG
        </p>
        <p className="jarvis-subtitle text-[10px]">// REGISTER</p>
      </div>

      <div>
        <Label ja="種別" en="TYPE" />
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {TYPE_ORDER.map((k) => (
            <TypeBtn
              key={k}
              type={TYPES[k]}
              active={type === k}
              onClick={() => setType(k)}
            />
          ))}
        </div>
      </div>

      <div>
        <Label ja="内容" en="CONTENT" required />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={CONTENT_PLACEHOLDER[type]}
          rows={3}
          maxLength={400}
          className="mt-1.5 w-full resize-y border border-jarvis-border bg-jarvis-bg/60 px-3 py-2 font-body text-jarvis-text placeholder:text-jarvis-dim/70 outline-none transition focus:border-jarvis-cyan focus:shadow-glow-soft"
        />
      </div>

      <div>
        <Label ja="理由" en="REASON" />
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={REASON_PLACEHOLDER[type]}
          rows={2}
          maxLength={400}
          className="mt-1.5 w-full resize-y border border-jarvis-border bg-jarvis-bg/60 px-3 py-2 font-body text-jarvis-text placeholder:text-jarvis-dim/70 outline-none transition focus:border-jarvis-cyan focus:shadow-glow-soft"
        />
      </div>

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

function Label({ ja, en, required }) {
  return (
    <span className="flex items-baseline gap-2">
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

function TypeBtn({ type, active, onClick }) {
  const Icon = type.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'flex flex-col items-center gap-1 border px-2 py-2 transition',
        active
          ? 'border-jarvis-cyan bg-jarvis-cyan/15 text-jarvis-accent shadow-glow-soft'
          : 'border-jarvis-border bg-jarvis-panel/40 text-jarvis-dim hover:border-jarvis-cyan/50 hover:text-jarvis-cyan',
      ].join(' ')}
    >
      <Icon size={16} strokeWidth={1.75} />
      <span className="font-display text-[11px] tracking-[0.16em]">
        {type.label}
      </span>
      <span className="font-mono text-[9px] tracking-[0.14em] opacity-70">
        {type.en}
      </span>
    </button>
  );
}

function LogList({ logs, onRemove, tab }) {
  if (logs.length === 0) {
    const message =
      tab === 'rules'
        ? '種別を「ルール」にして登録するとここに表示されます'
        : '思考をログ化して可視化しましょう';
    const code = tab === 'rules' ? 'NO_RULES_REGISTERED' : 'NO_LOGS';
    return (
      <div
        className="jarvis-panel animate-fade-in mt-4 p-6 text-center"
        style={{ animationDelay: '260ms' }}
      >
        <p className="font-mono text-sm text-jarvis-dim">// {code}</p>
        <p className="mt-2 font-body text-sm text-jarvis-text/60">{message}</p>
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {logs.map((log, i) => (
        <li
          key={log.id || `${log.date}-${i}`}
          className="animate-fade-in"
          style={{ animationDelay: `${260 + i * 60}ms` }}
        >
          <LogCard log={log} onRemove={() => onRemove(log.id)} />
        </li>
      ))}
    </ul>
  );
}

function LogCard({ log, onRemove }) {
  const t = TYPES[log.type] || TYPES.memo;
  const Icon = t.icon;
  return (
    <article className="jarvis-panel relative p-4">
      <header className="flex items-center justify-between gap-3">
        <span
          className={[
            'flex items-center gap-1 border px-2 py-0.5 font-display text-[10px] tracking-[0.22em]',
            t.tag,
          ].join(' ')}
        >
          <Icon size={11} strokeWidth={2} className={t.iconClass} />
          <span>{t.en}</span>
          <span className="text-jarvis-dim/80">·</span>
          <span>{t.label}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] tracking-[0.14em] text-jarvis-dim">
            {log.date}
          </span>
          {log.id && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="削除"
              className="flex h-7 w-7 items-center justify-center border border-jarvis-border text-jarvis-dim transition hover:border-red-400/60 hover:text-red-300"
            >
              <Trash2 size={12} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </header>

      <p className="mt-3 whitespace-pre-wrap font-body text-base leading-relaxed text-jarvis-text">
        {log.content}
      </p>

      {log.reason ? (
        <div className="mt-2 flex items-start gap-2 border-l-2 border-jarvis-border pl-3">
          <ArrowRight
            size={12}
            strokeWidth={2}
            className="mt-1 shrink-0 text-jarvis-dim"
          />
          <p className="whitespace-pre-wrap font-body text-[13px] leading-relaxed text-jarvis-dim">
            {log.reason}
          </p>
        </div>
      ) : null}
    </article>
  );
}
