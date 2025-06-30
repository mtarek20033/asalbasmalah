@echo off
echo [INFO] Changing directory to the script's location...
cd /d "%~dp0"

echo [INFO] Activating virtual environment...
call .\venv\Scripts\activate.bat

echo [INFO] Starting the application...
python main.py

echo [INFO] Application has been closed.
pause