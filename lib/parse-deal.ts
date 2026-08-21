// 커뮤니티 핫딜 제목 파싱 — "[G마켓] 상품명 (12,900원/무료)" 관례를 뜯는다.
// 관례일 뿐 강제가 아니므로 파싱 실패는 전부 null로 둔다 —
// "틀린 값보다 null" (car-event dates.mjs 원칙). 회귀 케이스: scripts/test-parse-deal.ts

export interface ParsedDeal {
  mall: string | null;
  price: number | null;
  priceRaw: string | null;
  shipping: string | null;
  ended: boolean;
  /** 파싱해 뽑아낸 부분([쇼핑몰]·가격 괄호)을 걷어낸 표시용 제목 */
  cleanTitle: string;
}

// '삭제'는 글쓴이가 딜을 접으며 제목을 통째로 지운 흔적 (퀘이사존 실측: "[롯데온] 삭제" —
// label은 '종료'가 안 되고 가격 컬럼만 남는다). '펑'과 같은 부류라 종료로 취급한다.
const ENDED_WORD = /종료|품절|매진|완판|삭제/;
// '펑'(글쓴이가 딜을 접었다는 은어)은 한 글자라 단어 경계를 잡아준다
const ENDED_PUNG = /(?:^|[\s[(/])펑(?:[\s\])/]|$)/;

export function parseDealTitle(title: string): ParsedDeal {
  const mallMatch = title.match(/^\s*[[(]([^\])]{1,20})[\])]\s*/);
  const mall = mallMatch?.[1]?.trim() ?? null;
  let cleanTitle = mallMatch ? title.slice(mallMatch[0].length) : title;

  // 뒤쪽 괄호 그룹부터 가격 형태("가격/배송비" 또는 원 단위)를 찾는다
  let price: number | null = null;
  let priceRaw: string | null = null;
  let shipping: string | null = null;

  const parens = [...title.matchAll(/\(([^()]*)\)/g)];
  for (let i = parens.length - 1; i >= 0; i--) {
    const inner = parens[i][1].trim();
    if (!/[\d무배]/.test(inner)) continue;

    const [p, s] = inner.split("/").map((x) => x.trim());
    if (!p) continue;
    const digits = p.replace(/원|,|\s/g, "");
    const looksKrw = /^\d+$/.test(digits) && /원|^\d[\d,\s]*$/.test(p);
    const looksFree = /무료|무배|공짜|0원/.test(p);
    if (!looksKrw && !looksFree && !/[$€¥]|달러/.test(p)) continue;

    priceRaw = p;
    if (looksKrw && !/[$€¥]|달러/.test(p)) price = Number(digits);
    shipping = s ?? null;
    cleanTitle = cleanTitle.replace(parens[i][0], " ");
    break;
  }

  // 괄호에서 원화 가격을 못 뽑았을 때 — "상품명 / 8,980원(와우무배)" 슬래시 관례 폴백(루리웹 실측).
  // 마지막 괄호가 무배류면 looksFree로 소비돼 priceRaw만 차고 price는 빈다.
  if (price === null) {
    const slash = cleanTitle.match(/\/\s*(\d[\d,]*)\s*원/);
    if (slash) {
      price = Number(slash[1].replace(/,/g, ""));
      // 소비된 괄호가 무배류였다면 그건 배송 정보다 — shipping으로 옮긴다
      if (shipping == null && priceRaw != null && /무료|무배|공짜|0원/.test(priceRaw)) shipping = priceRaw;
      priceRaw = `${slash[1]}원`;
      cleanTitle = cleanTitle.replace(slash[0], " ");
    }
  }

  cleanTitle = cleanTitle.replace(/\s{2,}/g, " ").trim() || title;
  return { mall, price, priceRaw, shipping, cleanTitle, ended: ENDED_WORD.test(title) || ENDED_PUNG.test(title) };
}
