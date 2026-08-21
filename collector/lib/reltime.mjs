// "방금 전", "27분 전", "3시간 전" 같은 상대시각 → ISO datetime.
// 알구몬·퀘이사존이 최근 글에 상대시각만 준다. 오차 ±1단위는 감수한다 —
// 정렬·"몇 시간 전" 표시 용도라 분 단위 정밀도면 충분하다.

const UNIT_MS = {
  초: 1e3,
  분: 6e4,
  시간: 36e5,
  일: 864e5,
  주: 6048e5,
  개월: 26298e5,
  달: 26298e5,
  년: 315576e5,
};

export function fromRelative(raw, now = new Date()) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/방금|잠시\s*전/.test(s)) return now.toISOString();
  if (/어제/.test(s)) return new Date(now.getTime() - UNIT_MS['일']).toISOString();
  const m = s.match(/(\d+)\s*(초|분|시간|일|주|개월|달|년)\s*전/);
  if (!m) return null;
  return new Date(now.getTime() - Number(m[1]) * UNIT_MS[m[2]]).toISOString();
}
