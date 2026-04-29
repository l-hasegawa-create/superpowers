import { pickFamousPersonForToday } from './famousPeople.js';
import { callGemini } from './geminiClient.js';

const MORNING_KEY = 'morningMessage';

const SYSTEM_PROMPT = `あなたは応援メッセンジャーです。応答はJSONオブジェクトのみで返してください。

スキーマ:
{"quote":"著名人の言葉（実在のもの）","attribution":"著名人名","action":"今日できる具体的アクション（30字以内）"}

actionは抽象でなく具体的な行動を一つ。日本語で。`;

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseJSON(text) {
  if (!text) return null;
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = codeBlock ? codeBlock[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function generateMorningMessage(ideal) {
  if (!ideal || !ideal.type) {
    throw new Error('理想像が設定されていません');
  }
  const person = pickFamousPersonForToday(ideal.type) || ideal.typeLabel;
  const prompt = `理想像「${ideal.typeLabel}」を目指すユーザーへ朝のメッセージ。
${person}（${ideal.typeLabel}の代表格）の言葉を一つ実在の名言から引用し、そこから今日の具体的な行動を一つ提案してください。
全体100文字以内・抽象的すぎない・JSON形式で返答。`;

  const raw = await callGemini({
    system: SYSTEM_PROMPT,
    user: prompt,
    maxOutputTokens: 600,
  });
  const parsed = parseJSON(raw) || {};
  const payload = {
    quote: String(parsed.quote || '').trim(),
    attribution: String(parsed.attribution || person).trim(),
    action: String(parsed.action || '').trim(),
    person,
    typeLabel: ideal.typeLabel,
    typeKey: ideal.type,
    date: todayISO(),
    raw,
  };
  localStorage.setItem(MORNING_KEY, JSON.stringify(payload));
  return payload;
}

export function loadCachedMorningMessage() {
  try {
    const raw = localStorage.getItem(MORNING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
