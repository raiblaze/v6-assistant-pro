#!/bin/bash

# V6 Assistant Pro Launcher

echo "🚀 Starting V6 Assistant Pro..."

# Kill background processes on exit
trap "kill 0" EXIT

# Start Backend
echo "📡 Starting Backend (FastAPI)..."
cd "$(dirname "$0")/backend"
./venv/bin/python3 main.py &

# Start Frontend
echo "🎨 Starting Frontend (Vite)..."
cd "../frontend"
npm run dev &

wait
