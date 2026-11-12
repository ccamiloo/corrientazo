#!/usr/bin/env bash
# Publica el build en GitHub Pages: compila y sube SOLO dist/ a la rama gh-pages (con historia propia).
# No toca la rama actual ni pide commitear nada: trabaja en un worktree temporal.
# Uso (Git Bash, desde la raíz del repo):  bash scripts/deploy-pages.sh
# La página queda en https://ccamiloo.github.io/corrientazo/ (vite.config.js usa base './').
# OJO: el build incluye public/assets/music (ignorada en el repo): en la página la música sí se publica.
set -euo pipefail

npm run build

TMP="$(mktemp -d)"
trap 'git worktree remove --force "$TMP" >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

if git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git fetch origin gh-pages
  git worktree add --detach "$TMP" origin/gh-pages
  git -C "$TMP" checkout -B gh-pages
else
  # Primera vez: rama huérfana (sin la historia del juego).
  git worktree add --detach "$TMP"
  git -C "$TMP" checkout --orphan gh-pages
fi

# Reemplaza todo el contenido por el build nuevo.
git -C "$TMP" rm -rf --quiet . >/dev/null 2>&1 || true
find "$TMP" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r dist/. "$TMP"/
touch "$TMP/.nojekyll" # sin Jekyll: sirve los archivos tal cual

git -C "$TMP" add -A
if git -C "$TMP" diff --cached --quiet; then
  echo "Sin cambios que publicar."
  exit 0
fi
git -C "$TMP" commit --quiet -m "Deploy $(git rev-parse --short HEAD) $(date -u +%Y-%m-%dT%H:%MZ)"
git -C "$TMP" push origin gh-pages
echo "Publicado. GitHub Pages tarda uno o dos minutos en actualizar."
