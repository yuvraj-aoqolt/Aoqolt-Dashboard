@echo off
REM Start Django server with ASGI support for WebSockets

echo.
echo ========================================
echo   Aoqolt Backend - ASGI Server
echo   WebSocket Support Enabled
echo ========================================
echo.

REM Activate virtual environment
if exist venv\Scripts\activate.bat (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo Warning: Virtual environment not found!
    echo Please run setup.bat first
    pause
    exit /b 1
)

REM Check if Redis is running
echo Checking Redis connection...
redis-cli ping >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Redis is not running!
    echo WebSockets require Redis for channel layers.
    echo.
    echo Please start Redis:
    echo   - Windows: Run redis-server.exe
    echo   - Docker: docker run -d -p 6379:6379 redis
    echo.
    pause
)

echo.
echo Starting ASGI server with WebSocket support...
echo Server will be available at http://127.0.0.1:8000
echo WebSocket endpoint: ws://127.0.0.1:8000/ws/
echo.
echo Press Ctrl+C to stop the server
echo.

REM Run with Daphne (ASGI server)
daphne -b 0.0.0.0 -p 8000 core.asgi:application

REM Fallback to Django runserver if Daphne fails
if %errorlevel% neq 0 (
    echo.
    echo Daphne failed, falling back to Django runserver...
    echo Note: Django runserver also supports Channels/WebSockets
    echo.
    python manage.py runserver 0.0.0.0:8000
)

pause
