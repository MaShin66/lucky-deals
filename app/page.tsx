import { redirect } from "next/navigation";
import StaticHome from "@/components/StaticHome";
import { IS_STATIC } from "@/lib/local-state";

export default function Home() {
  // 정적 배포에선 서버 redirect를 쓸 수 없다 — 클라이언트 이동으로 대체
  if (IS_STATIC) return <StaticHome />;
  redirect("/events");
}
