@echo off
setlocal
cd /d "%~dp0"

echo Installing / upgrading PyInstaller and pywebview...
py -3 -m pip install --upgrade pyinstaller pywebview
if errorlevel 1 (
  echo.
  echo Could not install PyInstaller.
  echo Install Python first: https://www.python.org/downloads/
  echo (tick "Add Python to PATH" during install), then run this file again.
  pause
  exit /b 1
)

echo.
echo Building PhonePreview.exe (onefile, takes ~30 seconds)...
py -3 -m PyInstaller --clean --noconfirm PhonePreview.spec
if errorlevel 1 (
  echo.
  echo Build failed. Read the error above.
  pause
  exit /b 1
)

echo.
echo Done! Your executable is:
echo   %~dp0dist\PhonePreview.exe
echo.
echo Double-click it, or drag your website folder onto it.
pause
