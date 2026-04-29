import { useCallback, useEffect, useState } from 'react';

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
  return PROMPT_TEMPLATE.replace('{{mood}}', String(mood ?? '未記録'))
    .replace('{{interests}}', interests || '未設定')
    .replace('{{habit_done_rate}}', `${habitRate ?? 0}%`);
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
      'APIキーが未設定です。.envにVITE_ANTHROPIC_API_KEYを設定してください。',
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

export function readPodcastInputs() {
  const dailyState = loadJSON(DAILY_STATE_KEY);
  const stats = loadJSON(HABIT_STATS_KEY);
  const interests = loadInterests();
  const today = todayISO();
  return {
    mood: dailyState && dailyState.date === today ? dailyState.mood : null,
    habitRate: stats && stats.date === today ? stats.rate : null,
    interests,
  };
}

export function loadCachedPodcasts() {
  return loadJSON(CACHE_KEY);
}

export function usePodcast() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const cached = loadCachedPodcasts();
    if (cached && Array.isArray(cached.podcasts) && cached.podcasts.length > 0) {
      setResult(cached);
      setStatus('success');
    }
  }, []);

  const generate = useCallback(async () => {
    const inputs = readPodcastInputs();
    if (!inputs.interests) {
      setError('Settingsで興味を入力してください');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const prompt = buildPrompt(inputs);
      const raw = await callClaudeAPI(prompt);
      const podcasts = parsePodcasts(raw);
      const payload = {
        date: todayISO(),
        podcasts,
        raw,
        inputs,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      setResult(payload);
      setStatus('success');
    } catch (e) {
      setError(e.message || String(e));
      setStatus('error');
    }
  }, []);

  return { status, error, result, generate };
}
