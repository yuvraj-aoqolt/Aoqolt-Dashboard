#!/bin/bash

echo ""
echo "========================================"
echo "  Aoqolt Backend - ASGI Server"
echo "  WebSocket Support Enabled"
echo "========================================"
echo ""

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
else
    echo "Warning: Virtual environment not found!"
    echo "Please run setup.sh first"
    exit 1
fi

# Check if Redis is running
echo "Checking Redis connection..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo ""
    echo "[WARNING] Redis is not running!"
    echo "WebSockets require Redis for channel layers."
    echo ""
    echo "Please start Redis:"
    echo "  - Linux: sudo service redis-server start"
    echo "  - Mac: brew services start redis"
    echo "  - Docker: docker run -d -p 6379:6379 redis"
    echo ""
    read -p "Press Enter to continue anyway..."
fi

echo ""
echo "Starting ASGI server with WebSocket support..."
echo "Server will be available at http://127.0.0.1:8000"
echo "WebSocket endpoint: ws://127.0.0.1:8000/ws/"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run with Daphne (ASGI server)
if command -v daphne &> /dev/null; then
    daphne -b 0.0.0.0 -p 8000 core.asgi:application
else
    echo ""
    echo "Daphne not found, falling back to Django runserver..."
    echo "Note: Django runserver also supports Channels/WebSockets"
    echo ""
    python manage.py runserver 0.0.0.0:8000
fi
