import type { AdapterMeta, JoinType, PrizeType } from "./types";

// 경품 이벤트 판정 — car-event lib/filter.mjs의 구조를 계승하되 방향을 뒤집었다
// (자동차 매칭 → 경품 유형 매칭).
//
// 규칙:
//   1. EXCLUDE가 PASS보다 먼저다 — "서포터즈 모집 (경품 증정)"은 대외활동이다.
//   2. kind가 'board'(목록 자체가 이벤트인 게시판)면 EXCLUDE만 적용한다.
//      aggregator/community는 PASS도 통과해야 한다 — 안 걸면 공모전·잡글이 다 샌다.
//   3. 한글엔 \b가 없어 짧은 단어는 부분문자열로 샌다('포터'→'서포터즈' 사고).
//      경계 가드 (?<![가-힣])…(?![가-힣]) 는 실측 오탐이 나온 단어에만 씌운다.
//      회귀 케이스: scripts/test-filter.ts

const EXCLUDE =
  /공모전|서포터즈|기자단|앰배서더|체험단|모니터\s*요원|봉사활동|채용|인턴|교육생|강연|세미나|당첨자\s*(발표|안내)|참여\s*후기|종료\s*안내|모집\s*마감/;

const PASS =
  /경품|추첨|응모|당첨|증정|사은품|기프티콘|상품권|룰렛|뽑기|무료\s*나눔|페이백|포인트\s*지급|퀴즈/;

export interface EventJudgement {
  keep: boolean;
  prizeType: PrizeType;
}

export function judgeEvent(title: string, kind: AdapterMeta["kind"]): EventJudgement {
  if (EXCLUDE.test(title)) return { keep: false, prizeType: "기타" };
  if (kind !== "board" && !PASS.test(title)) return { keep: false, prizeType: "기타" };
  return { keep: true, prizeType: classifyPrize(title) };
}

// 경품 종류 추정 — 필터가 아니라 표시용이라 오분류 비용이 낮다. 불확실하면 '기타'.
// 순서가 의미 있다: "아메리카노 기프티콘"은 상품권·기프티콘으로 잡혀야 한다.
const PRIZE_RULES: Array<[PrizeType, RegExp]> = [
  [
    "상품권·기프티콘",
    /상품권|기프티콘|기프트\s*카드|쿠폰|아메리카노|커피|치킨|피자|햄버거|영화\s*예매|CGV|메가박스|롯데시네마/i,
  ],
  [
    "가전·디지털",
    /가전|TV|냉장고|세탁기|청소기|노트북|맥북|아이폰|iphone|갤럭시|갤탭|태블릿|아이패드|에어팟|버즈|이어폰|헤드폰|플스|PS5|닌텐도|스위치|엑스박스|모니터|키보드|마우스|에어프라이어|공기청정기|스마트워치|애플워치/i,
  ],
  ["모빌리티", /자동차|차량|시승|전기차|자전거|킥보드|오토바이|바이크/],
  ["포인트·페이", /포인트|페이백|캐시백|캐쉬백|네이버\s*페이|카카오\s*페이|토스|머니|적립금/],
  ["여행·숙박", /여행|항공권|숙박권|호텔|리조트|펜션|캠핑|크루즈/],
  ["식품·뷰티", /한우|쌀|과일|음료|맥주|와인|화장품|향수|샴푸|뷰티|밀키트/],
];

function classifyPrize(title: string): PrizeType {
  for (const [type, re] of PRIZE_RULES) if (re.test(title)) return type;
  return "기타";
}

// 참여 방식 추정 — 저장하지 않고 읽을 때마다 유도한다 (규칙 수정이 기존 항목에도 소급).
// 순서가 의미 있다: "유튜브 댓글 이벤트"는 SNS보다 댓글이 실제 행동이고,
// "인스타 퀴즈"는 퀴즈가 실제 행동이다. '추첨/응모'는 거의 모든 제목에 붙는 낱말이라
// 맨 끝에서 단순응모로 받는다. 같은 타입을 두 번 넣어 낱말별 순서를 제어한다(첫 매치 반환):
// 구매·리뷰 강신호(구매/결제)는 '인증'보다 앞("구매 인증"은 구매다), 약신호(할인/적립)는 가입 뒤.
const JOIN_RULES: Array<[JoinType, RegExp]> = [
  ["퀴즈·게임", /퀴즈|정답|빙고|밸런스\s*게임|초성|O\s*[,.]?\s*X|OX/], // i 금지 — "Xbox"의 'ox' 오탐
  ["퀴즈·게임", /quiz|맞히|맞추|찾아라|찾습니다|일까요|(?:포인트|미니)\s*게임/i],
  ["설문·투표", /설문|투표|서베이|(?<![A-Za-z])(?:pick|vs)(?![A-Za-z])/i],
  ["댓글·사연", /댓글|리플|답글|사연|응원|\d\s*행시|삼행시|사행시|지어주/], // 맨몸 '행시'는 "여행시" 오탐
  ["설문·투표", /[은는]\s*\?/], // 질문형 "…는?"은 댓글 뒤 — "원픽은? 댓글 달고"의 실제 행동은 댓글
  ["구매·리뷰", /구매|리뷰|영수증|결제/],
  ["SNS·인증", /인스타|스토리|팔로우|리그램|공유|틱톡|페이스북|유튜브|구독|인증|캡처|캡쳐|해시태그|SNS/i],
  ["가입·앱설치", /가입|앱\s*(다운|설치)|다운로드|사전\s*예약|모집/],
  ["구매·리뷰", /캐시백|캐쉬백|적립|마일리지|특가|할인/],
  ["선착순", /선착/],
  ["단순응모", /응모|클릭|룰렛|뽑기|추첨|랜덤/],
];

export function classifyJoinType(title: string): JoinType {
  for (const [type, re] of JOIN_RULES) if (re.test(title)) return type;
  return "기타";
}
