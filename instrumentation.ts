export async function register() {
  // edge 런타임에서도 한 번 호출된다 — node 전용 코드가 그쪽 번들에 딸려가면 안 된다
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // 정적 배포 빌드 중엔 크론을 띄우지 않는다 (빌드가 수집을 시작해버린다)
  if (process.env.STATIC_EXPORT === "1") return;

  const { startScheduler } = await import("./lib/scheduler");
  startScheduler();
}
