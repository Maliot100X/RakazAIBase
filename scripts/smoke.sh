#!/usr/bin/env bash
# Run: BASE_URL=http://127.0.0.1:3200 bash scripts/smoke.sh   (read-only, no wallet/spend; exit 0 = all PASS)
B="${BASE_URL:-http://127.0.0.1:3200}"; F=0
chk(){ local n="$1" ok="$2" got="$3"; if [[ " $ok " == *" $got "* ]]; then echo "PASS $n ($got)"; else echo "FAIL $n (got $got, want $ok)"; F=1; fi; }
c(){ curl -s -o /tmp/smoke.body -w '%{http_code}' --max-time 20 "$@"; }
code=$(c "$B/api/health"); grep -q '"ok":true' /tmp/smoke.body || code="$code-noOk"; chk "GET /api/health ok" "200" "$code"
chk "POST /api/telegram/webhook unauth" "401" "$(c -X POST -H 'content-type: application/json' -d '{}' "$B/api/telegram/webhook")"
chk "POST /api/voice/tts (503=deepgram idle)" "200 503" "$(c -X POST -H 'content-type: application/json' -d '{"text":"hi"}' "$B/api/voice/tts")"
for p in / /talk /launch /fees /skill.md; do chk "GET $p" "200" "$(c "$B$p")"; done
code=$(c "$B/.well-known/farcaster.json"); python3 -c 'import json;m=json.load(open("/tmp/smoke.body"))["miniapp"];assert all(m.get(k) for k in("version","name","homeUrl","iconUrl")) and "eip155:8453" in m["requiredChains"]' 2>/dev/null || code="$code-badShape"; chk "GET farcaster.json shape" "200" "$code"
chk "GET /mcp (no bearer; 405/401 = alive)" "200 401 405 406" "$(c "$B/mcp")"
[ $F = 0 ] && echo "SMOKE PASS" || { echo "SMOKE FAIL"; exit 1; }
