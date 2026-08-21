export type Scope = "events" | "deals";

// ── 어댑터 계약 (collector/*.mjs) ─────────────────────────────

export interface AdapterMeta {
  id: string;
  label: string;
  /** board = 목록 자체가 이벤트/딜 (EXCLUDE만 적용), aggregator = 재집계, community = 커뮤니티 게시판 */
  kind: "board" | "aggregator" | "community";
  /** true면 실패해도 조용히 넘어간다 */
  optional: boolean;
  /** 필터 '전' 원시 행 수가 이보다 적으면 구조 변경으로 간주해 실패 처리 */
  minRows: number;
  /** 소스 간 중복 병합 시 낮을수록 이긴다 (원 커뮤니티 < 재집계) */
  priority: number;
}

export interface RawEventItem {
  nativeId: string;
  title: string;
  url: string;
  org?: string | null;
  category?: string | null;
  endDate?: string | null; // ISO date
  postedAt?: string | null; // ISO datetime
  comments?: number | null;
}

export interface RawDealItem {
  nativeId: string;
  title: string;
  url: string;
  mall?: string | null;
  /** 재집계 소스(알구몬)일 때 원 커뮤니티 이름 */
  origin?: string | null;
  category?: string | null;
  price?: number | null;
  priceRaw?: string | null;
  shipping?: string | null;
  votes?: number | null;
  comments?: number | null;
  postedAt?: string | null;
  /** 소스가 구조적으로 종료를 알려주는 경우(퀘이사존 label) */
  ended?: boolean;
}

export interface EventAdapter {
  meta: AdapterMeta;
  fetchItems(): Promise<RawEventItem[]>;
}
export interface DealAdapter {
  meta: AdapterMeta;
  fetchItems(): Promise<RawDealItem[]>;
}

/** 쇼핑몰 상품 페이지에서 읽은 가격 (collector/malls/*.mjs 계약) */
export interface MallPrice {
  /** 쇼핑몰이 표시하는 정가(취소선가). 없으면 null */
  listPrice: number | null;
  /** 현재 판매가 */
  salePrice: number | null;
}
export interface MallAdapter {
  meta: { id: string; label: string; hosts: string[] };
  fetchPrice(url: string): Promise<MallPrice>;
}

// ── 저장 항목 ────────────────────────────────────────────────

export type PrizeType =
  | "모빌리티"
  | "가전·디지털"
  | "상품권·기프티콘"
  | "포인트·페이"
  | "여행·숙박"
  | "식품·뷰티"
  | "기타";

export interface EventItem {
  title: string;
  url: string;
  source: string;
  sourceLabel: string;
  org: string | null;
  prizeType: PrizeType;
  endDate: string | null; // ISO date — D-day 근거
  postedAt: string | null;
  comments: number | null;
  firstSeenAt: string; // ISO datetime — NEW 뱃지 근거
  /** 응모 완료한 날짜(ISO date). null = 미응모 */
  entered: string | null;
  hidden: boolean;
}

export interface DealItem {
  title: string;
  url: string;
  source: string;
  sourceLabel: string;
  origin: string | null;
  mall: string | null;
  category: string | null;
  price: number | null;
  /** 직전에 관측된 가격 — 같은 딜의 가격 수정, 또는 같은 상품(fp)의 지난 딜 가격 */
  prevPrice: number | null;
  /** 쇼핑몰 페이지에서 직접 읽은 정가. 필드 없음=미시도, null=시도했으나 실패 (재시도 안 함) */
  listPrice?: number | null;
  /** 게시글 본문에서 풀어낸 쇼핑몰 상품 URL */
  productUrl?: string | null;
  priceRaw: string | null;
  shipping: string | null;
  votes: number | null;
  comments: number | null;
  postedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  /** 종료 확정 시각. 제목 마커·소스 라벨로만 확정한다 — 리스트 소멸은 종료가 아니다 */
  ended: string | null;
  hidden: boolean;
}

/**
 * 상품 지문(fp)별 마지막 관측 가격 — "지난 딜에선 얼마였나"의 근거.
 * 딜 자체는 3일이면 사라지지만 이 기억은 90일 산다.
 */
export interface PriceMemory {
  version: 1;
  items: Record<string, { price: number; date: string }>;
}

/** 핫딜 물품 종류 — 저장하지 않고 원시 category+제목에서 매번 유도 (joinType과 같은 원칙) */
export type DealCategory =
  | "식품·건강"
  | "생활·주방"
  | "가전·디지털"
  | "PC·하드웨어"
  | "게임"
  | "패션·뷰티"
  | "상품권·쿠폰"
  | "취미·레저"
  | "기타";

/** 참여 방식 분류 — 저장하지 않고 제목에서 매번 유도한다 (규칙 수정이 소급 적용되게) */
export type JoinType =
  | "퀴즈·게임"
  | "댓글·사연"
  | "SNS·인증"
  | "설문·투표"
  | "가입·앱설치"
  | "구매·리뷰"
  | "선착순"
  | "단순응모"
  | "기타";

// 키는 `${sourceId}:${nativeId}` — URL은 파라미터에 따라 흔들려서 키로 못 쓴다 (seen.mjs 교훈)
export interface EventsStore {
  version: 1;
  updatedAt: string;
  items: Record<string, EventItem>;
}
export interface DealsStore {
  version: 1;
  updatedAt: string;
  items: Record<string, DealItem>;
}

// ── 수집 결과·상태 ────────────────────────────────────────────

export interface SourceStatus {
  id: string;
  label: string;
  ok: boolean;
  optional: boolean;
  rawCount?: number;
  error?: string;
  checkedAt: string;
}

export interface StatusFile {
  events: SourceStatus[];
  deals: SourceStatus[];
}

export interface CollectResult {
  scope: Scope;
  added: number;
  updated: number;
  pruned: number;
  sourceOk: number;
  sourceFailed: number;
  failedLabels: string[];
  /** 전 소스 실패 시 저장소를 건드리지 않고 여기 표시만 한다 */
  allFailed?: boolean;
}

export type RefreshOutcome =
  | { status: "fresh"; ageMinutes: number }
  | { status: "busy" }
  | { status: "done"; result: CollectResult };
