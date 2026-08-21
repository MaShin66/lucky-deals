# 🍀 럭키딜 (lucky-deals)

경품 응모 이벤트와 커뮤니티 핫딜을 한 화면에서 보는 개인용 사이트.

- **🎁 이벤트 추첨** — 뽐뿌 이벤트게시판의 전 분야 경품 응모 이벤트. D-day·NEW 뱃지, 경품 종류별 필터(상품권·가전·모빌리티…), 응모완료 체크(✓)와 숨기기(✕).
- **🔥 핫딜** — 뽐뿌 핫딜 + 알구몬(어미새·다모앙 등 재집계) + 퀘이사존. 가격·배송비 파싱, 추천/댓글 수, 종료 딜 자동 표시.

## 실행

```bash
npm run dev
```

→ http://localhost:4200

처음이면 `npm install` 후 `npm run collect`로 데이터를 채우고 띄우면 된다.

## 데이터가 갱신되는 방식

| | 이벤트 | 핫딜 |
|---|---|---|
| 자동 | 매일 08:00 (서버 켜져 있을 때) + 서버 시작 시 20시간 넘게 낡았으면 즉시 | 페이지를 열 때마다 15분 넘게 낡았으면 자동 재수집 |
| 수동 | 화면의 새로고침 버튼 (TTL 무시) | 동일 |

- 서버가 꺼져 있던 아침엔 다음 서버 시작 때 부팅 체크가 메운다.
- 핫딜은 몇 시간이면 죽는 물건이라 cron 대신 "볼 때 갱신" 방식이다.

## 상태 파일 (data/, git 제외)

- `events.json` — 이벤트 원장 (write-once, 응모완료·숨김도 여기 저장)
- `deals.json` — 핫딜 3일 롤링
- `source-status.json` — 소스별 성공/실패 (화면 상단 한 줄)

## 수동 수집 / 테스트

```bash
npm run collect                   # 둘 다 (TTL 존중)
npm run collect -- --scope=deals --force
npm test                          # 필터·파싱 회귀 테스트
```

⚠️ dev 서버를 켠 채로 CLI 수집을 돌리지 말 것 (프로세스가 달라 잠금 밖).

## 소스 추가하는 법

`collector/events/` 또는 `collector/deals/`에 파일 하나 만들고 (`meta` + `fetchItems()` 계약),
`collector/registry.mjs`에 import 한 줄 추가. 자세한 함정 목록은 AGENTS.md 참고.
