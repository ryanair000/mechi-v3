#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.npm-global/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin${PATH:+:$PATH}"

MECHI_REPO="${MECHI_REPO:-/home/ubuntu/mechi-v3}"
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
WORKSPACE="${WORKSPACE:-$OPENCLAW_HOME/workspace-growth}"
SKILL_DIR="$WORKSPACE/skills/mechi-social-exec"

REQUEST_TOKEN="${1:-}"
REQUEST_TOKEN_SECRET="${2:-}"
VERIFIER="${3:-}"

X_APP_NAME="${XURL_APP_NAME:-playmechi}"
X_USERNAME="${PLAYMECHI_X_USERNAME:-playmechi}"
CHEZAHUB_X_USERNAME="${CHEZAHUB_X_USERNAME:-chezahub}"
X_API_KEY="${X_API_KEY:-}"
X_API_SECRET="${X_API_SECRET:-}"

if [ -z "$REQUEST_TOKEN" ] || [ -z "$REQUEST_TOKEN_SECRET" ] || [ -z "$VERIFIER" ]; then
  echo "usage: openclaw-bind-playmechi-x.sh <request_token> <request_token_secret> <verifier>" >&2
  exit 1
fi

if [ -z "$X_API_KEY" ] || [ -z "$X_API_SECRET" ]; then
  echo "X_API_KEY and X_API_SECRET are required in the environment." >&2
  exit 1
fi

cd "$SKILL_DIR"

node scripts/x-oauth1-flow.mjs exchange \
  --oauth-token "$REQUEST_TOKEN" \
  --token-secret "$REQUEST_TOKEN_SECRET" \
  --verifier "$VERIFIER" > /tmp/playmechi-x-exchange.json

X_ACCESS_TOKEN="$(
  node -e "const fs=require('node:fs');const body=JSON.parse(fs.readFileSync('/tmp/playmechi-x-exchange.json','utf8'));process.stdout.write(body.accessToken||'')"
)"
X_ACCESS_TOKEN_SECRET="$(
  node -e "const fs=require('node:fs');const body=JSON.parse(fs.readFileSync('/tmp/playmechi-x-exchange.json','utf8'));process.stdout.write(body.tokenSecret||'')"
)"
SCREEN_NAME="$(
  node -e "const fs=require('node:fs');const body=JSON.parse(fs.readFileSync('/tmp/playmechi-x-exchange.json','utf8'));process.stdout.write(body.screenName||'')"
)"

if [ -z "$X_ACCESS_TOKEN" ] || [ -z "$X_ACCESS_TOKEN_SECRET" ]; then
  echo "X OAuth exchange did not return an access token pair." >&2
  cat /tmp/playmechi-x-exchange.json >&2
  exit 1
fi

/home/ubuntu/.npm-global/bin/xurl auth apps add "$X_APP_NAME" \
  --client-id "$X_API_KEY" \
  --client-secret "$X_API_SECRET" >/dev/null 2>&1 || true

/home/ubuntu/.npm-global/bin/xurl --app "$X_APP_NAME" auth oauth1 \
  --consumer-key "$X_API_KEY" \
  --consumer-secret "$X_API_SECRET" \
  --access-token "$X_ACCESS_TOKEN" \
  --token-secret "$X_ACCESS_TOKEN_SECRET" >/dev/null

export X_ACCESS_TOKEN
export X_ACCESS_TOKEN_SECRET
export X_AUTH_TYPE="oauth1"
export XURL_APP_NAME="$X_APP_NAME"
export PLAYMECHI_X_USERNAME="${SCREEN_NAME:-$X_USERNAME}"
export CHEZAHUB_X_USERNAME="$CHEZAHUB_X_USERNAME"

cd "$MECHI_REPO"
bash scripts/openclaw-configure-socio-telegram.sh --no-restart
systemctl --user restart openclaw-gateway.service

cd "$SKILL_DIR"
echo "=== x-exchange ==="
cat /tmp/playmechi-x-exchange.json
echo
echo "=== xurl-status ==="
/home/ubuntu/.npm-global/bin/xurl --app "$X_APP_NAME" auth status
echo
echo "=== readiness ==="
node scripts/check-social-readiness.mjs --json
