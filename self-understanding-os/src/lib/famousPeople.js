export const FAMOUS_PEOPLE_BY_TYPE = {
  entrepreneur: [
    'スティーブ・ジョブズ',
    '孫正義',
    'イーロン・マスク',
    'ジェフ・ベゾス',
    'リチャード・ブランソン',
  ],
  craftsman: [
    'イチロー',
    '宮崎駿',
    '千利休',
    '本田宗一郎',
    '小津安二郎',
  ],
  researcher: [
    '山中伸弥',
    'アルベルト・アインシュタイン',
    'リチャード・ファインマン',
    '湯川秀樹',
    '福沢諭吉',
  ],
  creator: [
    '北野武',
    '坂本龍一',
    '岡本太郎',
    '横尾忠則',
    '久石譲',
  ],
};

export function pickFamousPersonForToday(typeKey) {
  const list = FAMOUS_PEOPLE_BY_TYPE[typeKey] || [];
  if (list.length === 0) return null;
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return list[seed % list.length];
}
