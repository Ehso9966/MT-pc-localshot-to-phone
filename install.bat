@echo off
setlocal
cd /d "%~dp0"

set "SRC=%~dp0dist\PhonePreview.exe"
if not exist "%SRC%" set "SRC=%~dp0PhonePreview.exe"
if not exist "%SRC%" (
  echo.
  echo  PhonePreview.exe not found.
  echo  Put install.bat next to PhonePreview.exe ^(or in dist\^) and run it again.
  echo  Download the exe from:
  echo  https://github.com/Ehso9966/MT-pc-localshot-to-phone/releases
  echo.
  pause
  exit /b 1
)

set "DEST=%LOCALAPPDATA%\PhonePreview"
if not exist "%DEST%" mkdir "%DEST%"
copy /Y "%SRC%" "%DEST%\PhonePreview.exe" >nul
if errorlevel 1 (
  echo.
  echo  Could not copy the exe to %DEST%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$w=New-Object -ComObject WScript.Shell;" ^
  "$desktop=[Environment]::GetFolderPath('Desktop');" ^
  "$sm=[Environment]::GetFolderPath('Programs');" ^
  "$s=$w.CreateShortcut((Join-Path $desktop 'Phone Preview.lnk')); $s.TargetPath='%DEST%\PhonePreview.exe'; $s.WorkingDirectory='%DEST%'; $s.Description='Phone Preview Tool'; $s.Save();" ^
  "$s2=$w.CreateShortcut((Join-Path $sm 'Phone Preview.lnk')); $s2.TargetPath='%DEST%\PhonePreview.exe'; $s2.WorkingDirectory='%DEST%'; $s2.Description='Phone Preview Tool'; $s2.Save();"

if errorlevel 1 (
  echo.
  echo  Installed the exe to %DEST% but could not create shortcuts.
  echo  Right-click PhonePreview.exe and choose "Create shortcut" manually.
) else (
  echo.
  echo  Installed! Shortcuts created:
  echo    - Desktop:      Phone Preview
  echo    - Start Menu:   Phone Preview
  echo.
  echo  Files are in: %DEST%
)

echo.
pause
