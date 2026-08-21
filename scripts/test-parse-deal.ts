// 핫딜 제목 파싱 회귀 케이스 — 실측 포맷이 늘 때마다 여기 쌓는다.
//   npx tsx scripts/test-parse-deal.ts

import { parseDealTitle, type ParsedDeal } from "../lib/parse-deal";
import { fixTruncatedTitle } from "../collector/deals/ruliweb.mjs";

let failed = 0;

function check(title: string, expected: Partial<ParsedDeal>) {
  const got = parseDealTitle(title);
  for (const [k, v] of Object.entries(expected) as Array<[keyof ParsedDeal, unknown]>) {
    if (got[k] !== v) {
      failed++;
      console.error(`✗ ${JSON.stringify(title)} .${k} → ${JSON.stringify(got[k])}, 기대 ${JSON.stringify(v)}`);
    }
  }
}

// 뽐뿌 관례 "(가격/배송비)"
check("오르베 블랙골드 대형 지구본 26cm(29,880원/무료)", {
  price: 29_880, shipping: "무료", ended: false, cleanTitle: "오르베 블랙골드 대형 지구본 26cm",
});
check("미국산 돼지고기 목전지 2kg (15,420원 / 네멤무배)", { price: 15_420, shipping: "네멤무배" });
check("[지마켓] 1+1 텀블러 640ML (13,250원/무료)", { mall: "지마켓", price: 13_250 });

// 쇼핑몰 접두만 있고 가격 괄호는 없는 형태 (퀘이사존)
check("[쿠팡] 비비드키친 저칼로리 스윗칠리소스, 320g, 2개", {
  mall: "쿠팡", price: null, cleanTitle: "비비드키친 저칼로리 스윗칠리소스, 320g, 2개",
});

// 달러 가격은 숫자 변환하지 않고 raw만 남긴다
check("[알리] 게이밍 마우스 ($9.99/무료)", { mall: "알리", price: null, priceRaw: "$9.99" });

// "(1+1)" 같은 비가격 괄호에 속지 않기
check("샴푸 대용량 (1+1) 특가", { price: null, priceRaw: null });

// 종료 마커
check("[G마켓] 무선 청소기 (99,000원/무료) [품절]", { ended: true });
check("중복 펑", { ended: true });
check("갑자기 종료된 딜입니다", { ended: true });
check("완전 펑퍼짐 와이드 바지 (9,900원/무료)", { ended: false }); // '펑'이 낱말일 때만

// 슬래시형 가격 폴백 — 마지막 괄호가 무배류라 looksFree로 소비돼 가격이 비던 실측 케이스 (루리웹)
check("[쿠팡]농심 삼계탕 사발면 85g 6개 / 8,980원(와우무배)", {
  mall: "쿠팡", price: 8_980, shipping: "와우무배", cleanTitle: "농심 삼계탕 사발면 85g 6개",
});
check("무선 이어폰 / 12,900원", { price: 12_900, cleanTitle: "무선 이어폰" });
check("A타입 / B타입 비교", { price: null }); // 슬래시 뒤가 원화 가격이 아니면 그대로 null

// 루리웹 절단 제목 보정 (fixTruncatedTitle) — 목록 제목이 ~40자에서 '...'로 잘리는 실측 케이스
function fixed(input: string, expected: string) {
  const got = fixTruncatedTitle(input);
  if (got !== expected) {
    failed++;
    console.error(`✗ fixed(${JSON.stringify(input)}) → ${JSON.stringify(got)}, 기대 ${JSON.stringify(expected)}`);
  }
}
fixed("[롯데온] 갈아만든 배 저칼로리 340 x 24개 (11,620원/ 무료...", "[롯데온] 갈아만든 배 저칼로리 340 x 24개 (11,620원/ 무료)");
fixed("[네이버] LG 게이밍모니터 32G620B (333,900원/...", "[네이버] LG 게이밍모니터 32G620B (333,900원)"); // 끝 '/'는 지워 빈 shipping 방지
fixed("[에셋스토어] (무료) Game VFX - Buff Collection(...", "[에셋스토어] (무료) Game VFX - Buff Collection"); // 빈 괄호 꼬리는 버림, 앞의 온전한 괄호는 유지
fixed("제목이 그냥 잘림...", "제목이 그냥 잘림..."); // 괄호가 안 얽혔으면 잘림 표시 유지
fixed("멀쩡한 제목 (10,000원/무료)", "멀쩡한 제목 (10,000원/무료)"); // 말줄임 없으면 무변
// 보정 결과가 기존 파서로 잘 뚫리는지 — 그리고 숫자 중간 절단은 괄호째 버려 오값을 안 만드는지
check(fixTruncatedTitle("[롯데온]다우니 섬유유연제 1리터 6개+200ml 3개 (29,660원/..."), { mall: "롯데온", price: 29_660 });
check(fixTruncatedTitle("[다이렉트게임즈] 스토커2 얼티밋 에디션 (63,80..."), { price: null }); // "(63,80" → 6380원 오판 금지

if (failed) {
  console.error(`\n${failed}개 실패`);
  process.exit(1);
}
console.log("test-parse-deal: 전부 통과");
