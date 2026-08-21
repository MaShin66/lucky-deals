import type { NextConfig } from "next";

// 정적 배포(GitHub Pages)용 빌드는 STATIC_EXPORT=1 일 때만 켠다 — 평소 로컬 개발은 그대로다.
// 서버가 없으므로 API 라우트를 통째로 뺀다: route.ts만 .ts라서 pageExtensions를 tsx로 좁히면
// app/api/**/route.ts가 자동으로 빠지고 page/layout(.tsx)만 남는다 (파일을 옮기는 꼼수 불필요).
// 응모완료·숨김은 서버 대신 localStorage로 간다 (lib/local-state.ts).
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = isStatic
  ? {
      output: "export",
      pageExtensions: ["tsx"],
      images: { unoptimized: true },
      trailingSlash: true, // /deals/index.html — Pages가 디렉터리 인덱스로 서빙한다
      ...(basePath ? { basePath } : {}),
    }
  : {};

export default nextConfig;
