// 핫딜 물품 종류 분류 회귀 — 2026-08-21 실측 제목/카테고리 기반.
//   npx tsx scripts/test-deal-category.ts

import { classifyDealCategory } from "../lib/deal-category";
import type { DealCategory } from "../lib/types";

let failed = 0;

function cat(
  category: string | null,
  title: string,
  expected: DealCategory,
  mall: string | null = null,
) {
  const got = classifyDealCategory(category, title, mall);
  if (got !== expected) {
    failed++;
    console.error(`✗ cat(${JSON.stringify(category)}, ${JSON.stringify(title)}) → ${got}, 기대 ${expected}`);
  }
}

// ── 원시 category가 분명하면 그대로 믿는다 (소스별 어휘 → 통합 버킷) ──
cat("식품/건강", "아무 제목", "식품·건강"); // 뽐뿌
cat("음식", "아무 제목", "식품·건강"); // 루리웹
cat("게임S/W", "아무 제목", "게임"); // 루리웹
cat("게임/SW", "아무 제목", "게임"); // 퀘이사존 (슬래시 위치가 다르다)
cat("PC/하드웨어", "아무 제목", "PC·하드웨어");
cat("의류/잡화", "아무 제목", "패션·뷰티");
cat("상품권/쿠폰", "아무 제목", "상품권·쿠폰");
cat("취미용품", "아무 제목", "취미·레저");

// ── 애매한 값(기타·생활/식품·PC/가전·null)은 제목 규칙으로 ──
cat("기타", "수려한 본 탄력 크림 75ml", "패션·뷰티");
cat("기타", "액체세제 액츠클린젤 겸용세제 3.1L x2개+1개", "생활·주방");
cat("기타", "탑백 2W 신발탈취 스프레이 150ml", "생활·주방"); // '탈취'(생활)가 '신발'(뷰티)보다 먼저
cat("기타", "앤커 사운드코어 P31i 노이즈캔슬링 무선 블루투스 이어폰", "가전·디지털");
cat("기타", "서울 코엑스 아쿠아리움 모바일 1인 입장권 (8.31일까지)", "상품권·쿠폰");
cat("기타", "강아지간식 져키 큐브 1kg", "기타"); // 반려 가드 — '간식'이 식품으로 새면 안 된다
cat("기타", "ZIC 탑 FS 0W-30 4L", "기타"); // 단서 없음 — 억지 분류 금지
cat(null, "롯데제과 명가찰떡파이 350g", "식품·건강"); // 알구몬은 category가 없다
cat(null, "Antec P12 PWM (5팩)", "PC·하드웨어");
cat("생활/식품", "(GS SHOP) 시크릿 특가 미용티슈 180매 6팩", "생활·주방");
cat("생활/식품", "거세한우 냉장 투쁠 불고기 250g 1팩", "식품·건강"); // 제목이 폴백보다 먼저
cat("PC/가전", "LG 게이밍모니터 G6 32G620B 카할333,900원", "PC·하드웨어"); // 제목(모니터)이 폴백보다 먼저
cat("PC/가전", "정체불명의 물건", "가전·디지털"); // 제목이 못 풀면 관찰상 다수 쪽 폴백

// ── 게임 전문몰은 제목에 게임 낱말이 없어도 게임 ──
cat(null, "Euro Truck Simulator 2 할인", "게임", "스팀");
cat("기타", "알비온 온라인 에픽 메이지 번들 (무료)", "게임", "에픽게임즈");

if (failed) {
  console.error(`\n${failed}개 실패`);
  process.exit(1);
}
console.log("test-deal-category: 전부 통과");
