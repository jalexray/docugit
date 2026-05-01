#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}DocuGit — WYSIWYG Markdown Editor for Git Repos${NC}"
echo ""

# Check prerequisites
missing=""
command -v node >/dev/null 2>&1 || missing="node"
command -v python3 >/dev/null 2>&1 || missing="${missing} python3"
if [ -n "$missing" ]; then
  echo "Missing required tools:${missing}"
  echo "Install Node.js and Python 3.12+ to continue."
  exit 1
fi

# Install frontend deps if needed
if [ ! -d "node_modules" ]; then
  echo -e "${GREEN}Installing frontend dependencies...${NC}"
  npm install
fi

# Create venv and install backend deps if needed
if [ ! -d "api/venv" ]; then
  echo -e "${GREEN}Setting up Python environment...${NC}"
  python3 -m venv api/venv
  api/venv/bin/pip install -q -r api/requirements.txt
fi

# Find available ports
find_port() {
  local port=$1
  while lsof -ti:$port >/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo $port
}

API_PORT=$(find_port 5015)
DEV_PORT=$(find_port 5173)

# Start API server in background
echo -e "${GREEN}Starting API server on port ${API_PORT}...${NC}"
api/venv/bin/flask --app api:create_app run --no-debugger --port "$API_PORT" &
API_PID=$!

# Start Vite dev server in background
echo -e "${GREEN}Starting dev server on port ${DEV_PORT}...${NC}"
DOCUGIT_API_PORT=$API_PORT npx vite --port "$DEV_PORT" --strictPort &
VITE_PID=$!

# Cleanup on exit
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $API_PID $VITE_PID 2>/dev/null
  wait $API_PID $VITE_PID 2>/dev/null
}
trap cleanup EXIT INT TERM

# Wait for servers to start
sleep 2

echo ""
echo -e "${CYAN}DocuGit is running at http://localhost:${DEV_PORT}${NC}"
echo "Press Ctrl+C to stop."
echo ""

# Keep script alive
wait
