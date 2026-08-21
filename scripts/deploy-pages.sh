#!/usr/bin/env bash
# 정적 빌드 결과(out/)를 gh-pages 브랜치로 밀어넣는다. 새 의존성 없이 git worktree만 쓴다.
#   npm run deploy         # build:static 까지 한 번에
#
# out/ 은 gitignore 대상이라 main 브랜치는 깨끗하게 유지되고,
# gh-pages 브랜치는 매번 단일 커밋으로 덮어쓴다(빌드 산출물 이력은 의미가 없다).
set -euo pipefail

cd "$(dirname "$0")/.."
BRANCH="${PAGES_BRANCH:-gh-pages}"
WORKTREE=".deploy-pages"

[ -d out ] || { echo "out/ 이 없다 — 먼저 npm run build:static"; exit 1; }
git rev-parse --git-dir >/dev/null 2>&1 || { echo "git 저장소가 아니다"; exit 1; }

# Jekyll이 _next 디렉터리를 삼키지 않게 (Pages의 기본 동작)
touch out/.nojekyll

cleanup() { git worktree remove --force "$WORKTREE" 2>/dev/null || true; }
trap cleanup EXIT
cleanup
rm -rf "$WORKTREE"

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git worktree add "$WORKTREE" "$BRANCH" >/dev/null
else
  git worktree add --detach "$WORKTREE" >/dev/null
  git -C "$WORKTREE" checkout --orphan "$BRANCH" >/dev/null 2>&1
fi

# 이전 배포 내용을 비우고(.git 제외) 새 산출물로 교체
git -C "$WORKTREE" rm -rq --ignore-unmatch . 2>/dev/null || true
find "$WORKTREE" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R out/. "$WORKTREE"/

git -C "$WORKTREE" add -A
if git -C "$WORKTREE" diff --cached --quiet; then
  echo "변경 없음 — 배포 생략"
  exit 0
fi
git -C "$WORKTREE" commit -qm "배포: $(date '+%Y-%m-%d %H:%M') 스냅샷"

if git remote get-url origin >/dev/null 2>&1; then
  git -C "$WORKTREE" push -q origin "$BRANCH"
  echo "gh-pages 푸시 완료"
else
  echo "origin 원격이 없다 — gh-pages 브랜치에 커밋만 했다(푸시 생략)"
fi
