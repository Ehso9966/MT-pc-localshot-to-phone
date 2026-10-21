@echo off
setlocal
cd /d "%~dp0"

set "PY="
py -3 --version >nul 2>&1 && set "PY=py -3"
if not defined PY python --version >nul 2>&1 && set "PY=python"
if not defined PY python3 --version >nul 2>&1 && set "PY=python3"

if not defined PY (
  echo.
  echo  Python was not found on this PC.
  echo.
  echo  Option 1 - easiest: use PhonePreview.exe in this folder (no Python needed).
  echo  Option 2 - install Python:
  echo     1. Open https://www.python.org/downloads/
  echo     2. Download and run the installer.
  echo     3. IMPORTANT: tick "Add Python to PATH" before clicking Install.
  echo     4. Run this start.bat again.
  echo.
  start "" "https://www.python.org/downloads/"
  pause
  exit /b 1
)

if "%~1"=="" (
  %PY% "%~dp0serve.py"
) else (
  %PY% "%~dp0serve.py" "%~1"
)

if errorlevel 1 (
  echo.
  echo The server stopped with an error. Read the message above, fix it, then run this file again.
  pause
)
