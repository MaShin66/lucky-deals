// 경품 필터 회귀 케이스 — 실측 오탐이 나올 때마다 여기 쌓는다.
//   npx tsx scripts/test-filter.ts

import { classifyJoinType, judgeEvent } from "../lib/filter-events";
import type { AdapterMeta, JoinType, PrizeType } from "../lib/types";

let failed = 0;

function keep(title: string, kind: AdapterMeta["kind"], expected: boolean) {
  const got = judgeEvent(title, kind).keep;
  if (got !== expected) {
    failed++;
    console.error(`✗ keep(${JSON.stringify(title)}, ${kind}) → ${got}, 기대 ${expected}`);
  }
}

function prize(title: string, expected: PrizeType) {
  const got = judgeEvent(title, "board").prizeType;
  if (got !== expected) {
    failed++;
    console.error(`✗ prize(${JSON.stringify(title)}) → ${got}, 기대 ${expected}`);
  }
}

// ── board (뽐뿌 이벤트게시판): 목록 자체가 이벤트 — EXCLUDE만 적용 ──
keep("[메가박스] 영화 인증샷 한 번 찍고 에어팟 받을 수 있는 기회!", "board", true);
keep("참프레 인스타 퀴즈 (동물복지 우리쌀 치킨 3종 증정) ~8/23", "board", true);
keep("신한카드 룰렛 돌리고 포인트 받기", "board", true);
keep("OO브랜드 서포터즈 1기 모집", "board", false);
keep("XX화장품 체험단 모집 (전원 증정)", "board", false); // EXCLUDE가 PASS보다 먼저
keep("여름 이벤트 당첨자 발표", "board", false);
keep("2026 사진 공모전 수상작 안내", "board", false);
keep("서비스 종료 안내", "board", false);

// ── aggregator: PASS(경품 낱말)도 통과해야 한다 ──
keep("신제품 출시 기념 경품 추첨", "aggregator", true);
keep("가을 사진 올리고 상품권 응모하세요", "aggregator", true);
keep("단순 신제품 소개 글입니다", "aggregator", false);
// '교육생'만 배제 — '교육'이 든 경품 이벤트는 통과 (한글 부분문자열 함정 회귀)
keep("안전운전 교육 이수하고 기프티콘 응모", "aggregator", true);
keep("부트캠프 교육생 모집", "aggregator", false);

// ── joinType 분류 (참여 방식, 표시용 best-effort) ──
function join(title: string, expected: JoinType) {
  const got = classifyJoinType(title);
  if (got !== expected) {
    failed++;
    console.error(`✗ join(${JSON.stringify(title)}) → ${got}, 기대 ${expected}`);
  }
}

join("참프레 인스타 퀴즈 (치킨 3종 증정)", "퀴즈·게임"); // 퀴즈가 인스타(SNS)보다 먼저
join("[CN모터스] O, X 댓글 이벤트 아메리카노 증정", "퀴즈·게임");
join("[시립청소년음악센터] 유튜브 댓글 이벤트", "댓글·사연"); // 행동은 댓글, 플랫폼은 유튜브
join("[메가박스] 영화 인증샷 한 번 찍고 에어팟!", "SNS·인증");
join("신제품 만족도 설문 참여 이벤트", "설문·투표");
join("앱 다운로드하고 커피 받자", "가입·앱설치");
join("신규가입 웰컴 기프티콘", "가입·앱설치");
join("구매 인증하고 포인트 받기", "구매·리뷰");
join("선착순 1000명 아메리카노 증정", "선착순");
join("경품 추첨 이벤트", "단순응모"); // '추첨'만 있으면 단순응모
join("신비한 미스터리 이벤트", "기타");

// ── 2026-08-21 '기타 37' 실측 제목 기반 확장 — 각 신규 낱말당 1개 이상 ──
join("QUIZ 맞히고 국립경국대학교 공공대학 알아보자!", "퀴즈·게임"); // 라틴 QUIZ
join("[서울시 이벤트] 동대문의 이곳은 어디일까요? / 맛집 3만원 식사권 증정", "퀴즈·게임"); // 정답 맞히기형 질문
join("충남 여행지 PICK EVENT", "설문·투표");
join("[부동산114] 2026년 가장 살고싶은 아파트 브랜드는?", "설문·투표"); // 의견형 질문 "…는?"
join("K-water PICK! 여름 휴가 자연 vs 워터파크", "설문·투표");
join("중진공숲 4행시 짓기 이벤트 (치킨/피자/커피쿠폰 증정)", "댓글·사연");
join("'모두의 AI 배움터' 챗봇 이름 지어주세요~", "댓글·사연");
join("[하이나무] 앱 사용 인증 이벤트 8/10까지", "SNS·인증"); // '인증샷' 아니어도 인증
join("[부산영상위원회] 캡처 한 번으로 벌집꿀수박설빙을 받을 수 있는 기회!", "SNS·인증");
join("[한아세안센터] 한낮의 북토크 참가자 모집 ~8/23(일)", "가입·앱설치");
join("더 벤티 신메뉴 출시 기념 네이버페이 QR결제 프로모션", "구매·리뷰");
join("[샵백] 노드패스 100% 캐시백 이벤트", "구매·리뷰");
join("[경기관광공사] 여행지 고민 끝! 랜덤으로 go!", "단순응모");
join("Xbox 게임 타이틀 증정 응모", "단순응모"); // OX를 i에 노출하면 'ox'에 걸린다 — 대소문자 분리 회귀
join("구매 영수증 캡처 인증 이벤트", "구매·리뷰"); // 구매·리뷰 강신호가 '인증'(SNS)보다 먼저
join("앱 설치하고 할인 쿠폰 받기", "가입·앱설치"); // 약신호(할인)는 가입·앱설치 뒤
join("여행시 꼭 챙길 필수템은?", "설문·투표"); // '여행시'가 행시로 안 새는지 가드
join("[뚜레쥬르] 지금 당장 더위를 날려줄 뚜쥬 원픽은? 댓글 달고 선물 받아가자!", "댓글·사연"); // 질문형보다 실제 행동(댓글)이 먼저
join("[빕스] 빕스 통전복 버터구이 무제한 이벤트", "기타"); // 행동 단서 없음 — 기타가 정답

// ── prizeType 분류 (표시용 best-effort) ──
prize("스타벅스 아메리카노 기프티콘 증정", "상품권·기프티콘");
prize("갤럭시 S26 울트라 추첨", "가전·디지털");
prize("제주 왕복 항공권 응모 이벤트", "여행·숙박");
prize("신형 전기차 시승 이벤트", "모빌리티");
prize("네이버페이 포인트 지급 이벤트", "포인트·페이");
prize("정체불명의 신비한 이벤트", "기타");

if (failed) {
  console.error(`\n${failed}개 실패`);
  process.exit(1);
}
console.log("test-filter: 전부 통과");
