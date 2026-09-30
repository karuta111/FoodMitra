#!/bin/bash
set -e
mkdir -p /home/z/my-project/logs

pkill -9 -f "bun.*next" 2>/dev/null || true
pkill -9 -f "bun.*src/server" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "while true" 2>/dev/null || true
sleep 2

# Frontend with watchdog
nohup setsid bash -c '
  while true; do
    cd /home/z/my-project/web
    bun next dev -p 3000 >> /home/z/my-project/logs/web.log 2>&1
    echo "[watchdog] Frontend exited, restarting in 2s..." >> /home/z/my-project/logs/web.log
    sleep 2
  done
' </dev/null >/dev/null 2>&1 &
echo "Frontend watchdog PID: $!"

# Backend with watchdog — DATABASE_URL set explicitly (Bun doesn't load .env reliably)
nohup setsid bash -c '
  export DATABASE_URL="postgresql://postgres.icxqmfedpezwssfxxtpe:omkarghodekar@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
  export MSG91_AUTH_KEY="575533Tzsl0DbrFc6ab802dfP1"
  export MSG91_WIDGET_ID="36697a71494b353338303634"
  export OTP_USE_MSG91_WIDGET="false"
  while true; do
    cd /home/z/my-project/backend
    bun src/server.ts >> /home/z/my-project/logs/backend.log 2>&1
    echo "[watchdog] Backend exited, restarting in 2s..." >> /home/z/my-project/logs/backend.log
    sleep 2
  done
' </dev/null >/dev/null 2>&1 &
echo "Backend watchdog PID: $!"

for i in {1..30}; do
  if curl -s -m 2 http://localhost:4000/health >/dev/null 2>&1 && \
     curl -s -m 2 -o /dev/null http://localhost:3000 >/dev/null 2>&1; then
    echo "Both servers up after ${i}s"
    break
  fi
  sleep 1
done

ss -tlnp 2>/dev/null | grep -E ':(3000|4000)' || echo "WARN: ports not listening"
