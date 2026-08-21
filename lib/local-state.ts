// 정적 배포(GitHub Pages)에는 서버가 없다 — 응모완료·숨김을 브라우저 localStorage에 둔다.
// 로컬 서버로 돌 때는 기존대로 /api/state를 쓴다 (data/*.json이 진짜 원장).
//
// 정적 사이트의 데이터는 '빌드 시점 스냅샷'이라 항목 key는 안정적이다(`source:nativeId`).
// 3일 롤링으로 사라진 딜의 찌꺼기는 남지만, 표시할 항목이 없으면 그냥 무시된다.

export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";

export interface StatePatch {
  entered?: string | null;
  hidden?: boolean;
}
export type LocalState = Record<string, StatePatch>;

const KEY = "lucky-deals:state";

export function readLocalState(): LocalState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalState) : {};
  } catch {
    return {}; // 사파리 프라이빗 모드 등 — 저장이 막혀도 사이트는 돌아야 한다
  }
}

/** 패치를 저장하고 갱신된 전체 상태를 돌려준다 (호출부가 그대로 setState) */
export function writeLocalPatch(scope: "events" | "deals", key: string, patch: StatePatch): LocalState {
  const all = readLocalState();
  const id = `${scope}:${key}`;
  all[id] = { ...all[id], ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* 저장 실패해도 화면 상태는 유지된다 */
  }
  return all;
}

export const localKey = (scope: "events" | "deals", key: string) => `${scope}:${key}`;
