#!/usr/bin/env sh
# Smoke-test Bizora after docker compose up
# Usage: ./scripts/smoke-docker.sh [api_base] [web_base]
set -eu
API="${1:-http://127.0.0.1:3001}"
WEB="${2:-http://127.0.0.1:8080}"

echo "== API health =="
code=$(curl -s -o /tmp/bizora_health.json -w "%{http_code}" "$API/api/health" || true)
echo "HTTP $code"
cat /tmp/bizora_health.json 2>/dev/null || true
echo
if [ "$code" != "200" ]; then
  echo "FAIL: API health"
  exit 1
fi

echo "== API ready =="
code=$(curl -s -o /tmp/bizora_ready.json -w "%{http_code}" "$API/api/health/ready" || true)
echo "HTTP $code"
cat /tmp/bizora_ready.json 2>/dev/null || true
echo

echo "== Web =="
code=$(curl -s -o /dev/null -w "%{http_code}" "$WEB/" || true)
echo "HTTP $code"
if [ "$code" != "200" ] && [ "$code" != "304" ]; then
  echo "WARN: web not 200 (got $code) — still starting?"
fi

echo "OK smoke finished"
