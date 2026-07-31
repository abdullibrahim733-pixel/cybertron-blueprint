#!/bin/bash
# Start Cybertron dev servers
cd "$(dirname "$0")"

echo "Starting API server..."
setsid npm run dev:api > /tmp/api.log 2>&1 &
disown

echo "Starting Web server..."
setsid npm run dev:web > /tmp/web.log 2>&1 &
disown

sleep 4

if curl -s http://localhost:4000/health > /dev/null; then
  echo "✓ API running at http://localhost:4000"
else
  echo "✗ API failed - check /tmp/api.log"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q 200; then
  echo "✓ Web running at http://localhost:3000"
else
  echo "✗ Web failed - check /tmp/web.log"
fi
