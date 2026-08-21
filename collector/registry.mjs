// 소스 레지스트리 — 정적 import 맵.
//
// car-event-scripts의 _registry.mjs는 동적 import(`./${id}.mjs`)였지만
// 여기서는 Next(Turbopack) 번들에 들어가야 해서 정적 import로 바꿨다.
// 어댑터 파일이 깨지면 빌드 에러로 앞당겨 터지고(오히려 좋다),
// fetchItems 단위의 부분 실패 허용은 collect 오케스트레이터의 allSettled가 그대로 맡는다.
//
// 어댑터 추가 = 파일 1개 + 여기 1줄.
// 어댑터 계약: export const meta = { id, label, kind, optional, minRows, priority }
//             export async function fetchItems(): Promise<RawItem[]>

import * as ppomppuEvent from './events/ppomppu-event.mjs';
import * as ppomppuDeal from './deals/ppomppu-deal.mjs';
import * as algumon from './deals/algumon.mjs';
import * as quasarzone from './deals/quasarzone.mjs';
import * as ruliweb from './deals/ruliweb.mjs';
import * as eleven from './malls/eleven.mjs';
import * as lotteon from './malls/lotteon.mjs';
import * as jsonld from './malls/jsonld.mjs';

export const EVENT_SOURCES = [ppomppuEvent];
export const DEAL_SOURCES = [ppomppuDeal, algumon, quasarzone, ruliweb];

// 쇼핑몰 가격 어댑터 (collector/malls/*.mjs) — 계약: meta {id,label,hosts} + fetchPrice(url)
// hosts '*'(JSON-LD 공통 폴백)는 반드시 맨 끝 — 전용 어댑터가 먼저 매칭돼야 한다.
// 지마켓(403)·네이버(429)는 봇 차단이라 미지원 (우회 금지 원칙).
export const MALL_SOURCES = [eleven, lotteon, jsonld];
