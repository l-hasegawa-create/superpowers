import { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  GitBranch,
  Plus,
  StickyNote,
  X,
} from 'lucide-react';

const STORAGE_KEY = 'thoughtLogs';

const TYPES = {
  decision: { label: '決断', en: 'DECISION', icon: GitBranch },
  memo: { label: 'メモ', en: 'MEMO', icon: StickyNote },
  rule: { label: 'ルール', en: 'RULE', icon: Bookmark },
};
const TYPE_ORDER = ['decision', 'memo', 'rule'];

const PLACEHOLDER = {
  decision: '今した決断を一言で',
  memo: '今気づいたこと',
  rule: '自分に課すルール',
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
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default function ThoughtQuickAdd({ open, onClose, onSaved }) {
  const [type, setType] = useState('memo');
  const [content, setContent] = useState('');
  const [reason, setReason] = useState('');
  const [showReason, setShowReason] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 80);
    } else {
      setContent('');
      setReason('');
      setShowReason(false);
      setType('memo');
    }
  }, [open]);

  if (!open) return null;

  const valid = content.trim().length > 0;

  function submit(e) {
    e?.preventDefault();
    if (!valid) return;
    const entry = {
      id: newId(),
      type,
      content: content.trim(),
      reason: reason.trim(),
      date: todayISO(),
    };
    const next = [entry, ...loadLogs()];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    onSaved?.(entry);
    onClose?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4 pt-8 backdrop-blur-sm sm:items-center sm:pb-8"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="app-card animate-rise-in w-full max-w-md p-5 shadow-lift"
      >
        <header className="flex items-center justify-between">
          <div>
            <p className="app-eyebrow">今日のひらめき</p>
            <h2 className="app-title mt-0.5 text-lg">Thoughtに記録</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="-mr-2 -mt-2 rounded-full p-2 text-app-dim transition hover:bg-app-border/40 hover:text-app-text"
          >
            <X size={18} />
          </button>
        </header>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {TYPE_ORDER.map((k) => {
            const t = TYPES[k];
            const Icon = t.icon;
            const active = type === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setType(k)}
                className={[
                  'flex flex-col items-center gap-1 rounded-chip border px-2 py-2.5 transition',
                  active
                    ? 'border-app-amber/60 bg-app-amber/10 text-app-amber'
                    : 'border-app-border bg-app-bg-elev text-app-dim hover:text-app-text-soft',
                ].join(' ')}
              >
                <Icon size={16} strokeWidth={1.75} />
                <span className="text-[12px] font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={PLACEHOLDER[type]}
            rows={3}
            maxLength={400}
            className="app-input resize-y"
          />
        </div>

        {showReason ? (
          <div className="mt-3">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="なぜそう思った？（任意）"
              rows={2}
              maxLength={400}
              className="app-input resize-y"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowReason(true)}
            className="mt-2 text-[12px] text-app-dim transition hover:text-app-amber"
          >
            + 理由を追加
          </button>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="app-btn-ghost"
          >
            キャンセル
          </button>
          <button type="submit" disabled={!valid} className="app-btn-primary">
            <Plus size={14} strokeWidth={2.5} />
            <span>保存</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export function FloatingThoughtButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="思考をメモする"
      className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-app-amber text-[#1a1106] shadow-lift transition active:scale-95 hover:bg-app-amber-soft sm:bottom-28 sm:right-6 sm:h-14 sm:w-14"
    >
      <Plus size={22} strokeWidth={2.5} />
    </button>
  );
}
