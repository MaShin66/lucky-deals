# lucky-deals (럭키딜)

경품 응모 이벤트(탭1)와 커뮤니티 핫딜(탭2)을 한 화면에서 보는 **개인용 로컬 사이트**.
Next.js 16 App Router + React 19 + Tailwind 4 + TS. **포트 4200 고정.** 배포 없음.

## 실행

- `npm run dev` — http://localhost:4200 (`.claude/launch.json` 있음)
- `npm run collect [-- --scope=events|deals] [--force]` — 서버 없이 수동 수집.
  **dev 서버를 켠 채 CLI 수집 금지** — 프로세스가 달라 잠금 밖이다 (파일 파손은 없고 늦게 쓴 쪽이 이김).
- `npm test` — 필터·파싱 회귀 테스트

## 아키텍처 (funny-world 골격 + car-event-scripts 수집 계층)

- **갱신 전략이 탭마다 다르다.**
  - 이벤트: node-cron 매일 08:00 + 서버 부팅 시 20h 초과면 즉시 수집 (`lib/scheduler.ts`, `instrumentation.ts`)
  - 핫딜: cron 없음. 페이지 접근 시 클라이언트(`AutoRevalidate`)가 `POST /api/refresh` → 서버가 TTL(15분) 판단 후 수집. TTL 판단이 전부 서버라 탭 여러 개 열어도 중복 수집 없음.
- **원장 의미론이 탭마다 다르다** (`lib/merge-*.ts`).
  - 이벤트 = write-once: 있으면 안 건드림 → entered/hidden 보존이 공짜. prune은 마감+30일 && 발견+90일.
  - 핫딜 = 3일 롤링: 가변 필드(votes·가격·ended)만 갱신, firstSeenAt·hidden 보존. **리스트 소멸 ≠ 종료** (1~2페이지만 보므로 밀려난 딜을 종료로 오판) — 종료는 제목 마커·퀘이사존 label로만, 소멸은 3일 prune으로만.
- 저장: `data/*.json` (gitignore, 임시파일+rename 원자적 쓰기). 쓰기 경합은 `lib/lock.ts`의 `withStoreLock` 직렬화 큐로 해결 (수집 병합 vs PATCH).
- `/api/state` PATCH는 **updatedAt을 건드리면 안 된다** — updatedAt은 수집 신선도라 TTL 판단이 오염됨.
- **가격 이력(prevPrice)**: 커뮤니티 글엔 정가가 없다. `data/price-memory.json`이 상품 지문(fp)별 마지막 관측가를 90일 기억하고, 같은 상품이 다른 가격으로 다시 뜨면(또는 같은 딜의 제목 가격이 수정되면) prevPrice로 붙는다 — "~~17,230원~~ 13,250원 23%↓". 데이터가 쌓일수록 좋아지는 구조. fp 기억 갱신은 collectDeals에서만(runExclusive 아래) 일어난다.
- **참여 방식(joinType)은 저장하지 않는다** — events/page.tsx가 읽을 때마다 제목에서 유도(`classifyJoinType`). 분류 규칙을 고치면 기존 항목에도 소급된다. prizeType은 반대로 수집 시점에 저장됨(비대칭 의도적).

## 수집기 (collector/, 검증된 .mjs — car-event 어댑터 계약)

- 어댑터 = `meta {id,label,kind,optional,minRows,priority}` + `fetchItems()`. 추가 = 파일 1개 + `registry.mjs` 1줄 (정적 import — Turbopack이라 동적 import 금지).
- `minRows`는 반드시 **필터 전 원시 행 수** 기준 (필터 후에 걸면 매일 거짓 실패).
- `priority` 낮은 쪽(원 커뮤니티)이 fingerprint 병합에서 이긴다: 뽐뿌 10 < 퀘이사존 15 < 루리웹 20 < 알구몬 30.
- kind 'board'(뽐뿌 이벤트게시판)는 EXCLUDE 필터만, aggregator/community는 PASS도 필요 (`lib/filter-events.ts`).

## 소스별 함정 (2026-08-21 실측)

- **뽐뿌 이벤트게시판은 `id=event2`.** `id=event`는 2024-10 이후 죽은 게시판인데 옛 행 30개를 멀쩡히 돌려줘 minRows로 안 잡힌다. (이 함정에 실제로 당해 있던 `car-event-scripts/sources/ppomppu.mjs`도 2026-08-21 event2로 교체 완료 — 양쪽 다 현행.)
- **뽐뿌 zboard 공용 파서** (`collector/lib/ppomppu-board.mjs`): euc-kr(TextDecoder, 'cp949' 금지), 쇼핑몰명은 제목이 아니라 `<em class="subject_preface">`, 전체 시각은 td의 `title` 속성, 추천은 "5 - 0" 형식, 공지 행은 href의 `id=` 로 거른다.
- **알구몬**: 짧은 간격 연타 시 SSR 대신 2.8KB 빈 셸(스로틀, 차단 아님) — 정상 주기에선 회복. optional이라 실패해도 조용함. Svelte 하이드레이션 주석이 태그 사이에 끼므로 파싱 전에 주석 제거. 링크는 만료되는 `/n/d/{id}?enc=` 말고 `/n/deal/{id}`.
- **퀘이사존**: `<span class="label">진행중|인기|종료</span>`가 구조적 종료 신호 (제목 마커보다 확실). '공지' 라벨 행은 버림.
- **루리웹** (`market/board/1020`, UTF-8·SSR): 목록 제목이 ~40자에서 잘리고 리터럴 `...`이 붙는다(전체 제목 백업 없음) — 어댑터의 `fixTruncatedTitle`이 collect 전에 괄호를 닫아야 가격 파싱과 fingerprint 병합이 같이 산다(숫자 중간 절단은 괄호째 버림). 실제 글 행은 정확히 `<tr class="table_body blocktarget">` — 공지/베스트는 ` inside`가 붙어 exact split로 배제. href는 페이지마다 쿼리가 달라 `/read/{id}`로 재조립. 시각은 오늘 "HH:MM"/이전 "YYYY.MM.DD" 두 형식뿐. 구조적 종료 라벨 없음(제목 마커 전용). robots.txt가 `cate=`·`orderby=` 크롤 금지(`?page=`는 허용).
- 이벤트 탭 대안 소스 탐색 결과: 위비티 이벤트섹션 사멸(전체 15건·접수중 0), 콘테스트코리아 이벤트 카테고리 없음, 클리앙/인벤 404. 루리웹 핫딜은 "알구몬이 재집계해서 미채택"이었다가 2026-08-21 딜 소스로 직접 채택 — 원글 직수집이 안정 링크·정확한 시각·추천수를 주고, 알구몬과의 중복은 priority 병합이 해소한다.

## 코딩 규칙

- 한글 필터에 `\b` 쓰지 말 것 — 한글엔 단어 경계가 없다. 경계 가드 `(?<![가-힣])…(?![가-힣])`는 실측 오탐에만 (`scripts/test-filter.ts`에 케이스 축적).
- .ts 정규식에 named capture group `(?<이름>…)` 금지 — target ES2017이라 tsc 에러. lookbehind 자체는 통과(실증 확인).
- 날짜 파싱은 "틀린 값보다 null" — 억지 파싱 금지 (`collector/lib/dates.mjs`).
- 봇차단 우회 금지 — 정상 UA, 막히면 그 소스만 실패. 차단처럼 보이면 프로토콜·API 층 먼저 의심.
- 클라이언트에서 `Date.now()` 직접 호출 금지 — 페이지가 내려준 `now` prop 사용 (hydration 어긋남).
