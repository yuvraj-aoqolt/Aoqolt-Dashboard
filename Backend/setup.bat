@echo off
REM Aoqolt Backend Setup Script for Windows

echo Setting up Aoqolt Backend...

REM Check Python version
python --version

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv
call venv\Scripts\activate

REM Install dependencies
echo Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Create .env file if not exists
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo Please update .env with your configuration
)

REM Create directories
echo Creating directories...
mkdir logs 2>nul
mkdir media\avatars 2>nul
mkdir media\service_icons 2>nul
mkdir media\booking_attachments 2>nul
mkdir media\chat_files 2>nul
mkdir media\case_results 2>nul
mkdir media\case_result_attachments 2>nul

REM Run migrations
echo Running migrations...
python manage.py makemigrations
python manage.py migrate

REM Create superuser
echo.
echo Create a superuser account:
python manage.py createsuperuser

REM Collect static files
echo Collecting static files...
python manage.py collectstatic --noinput

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Update .env file with your credentials
echo 2. Run: python manage.py runserver
echo 3. Visit: http://localhost:8000/api/docs/
echo.
pause
