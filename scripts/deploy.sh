#!/usr/bin/env bash
# GitHub Pages 배포: HashRouter 빌드(dist)를 gh-pages 브랜치로 올림
# Supabase 주소·공개 키는 .env.local에서 읽음
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build:preview
touch dist/.nojekyll
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C .. config user.name)" -c user.email="$(git -C .. config user.email)" commit -q -m "deploy $(date +%Y-%m-%dT%H:%M)"
git push -f "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git
echo "배포 완료: https://hanji0709.github.io/gachi/"
