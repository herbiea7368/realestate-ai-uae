#!/bin/bash
set -e
URL=${STAGING_URL:-"https://staging.realestate.ai"}
curl -fsSL "$URL/healthz" | grep ok && echo "Healthcheck ✅"
curl -fsSL "$URL/api/version" && echo "API ✅"
curl -fsSL "$URL/chat" | grep "Chat Assistant" && echo "Chat UI ✅"
echo "Validated: staging environment operational."
