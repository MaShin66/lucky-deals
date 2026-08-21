export async function register() {
  // edge 런타임에서도 한 번 호출된다 — node 전용 코드가 그쪽 번들에 딸려가면 안 된다
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startScheduler } = await import("./lib/scheduler");
  startScheduler();
}
