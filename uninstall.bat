@echo off
setlocal

set "DEST=%LOCALAPPDATA%\PhonePreview"
set "DESKTOP=%DEST%"
for /f "delims=" %%i in ('powershell -NoProfile -Command "[Environment]::GetFolderPath('Desktop')"') do set "DESKTOP=%%i"
set "SM=%DEST%"
for /f "delims=" %%i in ('powershell -NoProfile -Command "[Environment]::GetFolderPath('Programs')"') do set "SM=%%i"

if exist "%DESKTOP%\Phone Preview.lnk" del "%DESKTOP%\Phone Preview.lnk"
if exist "%SM%\Phone Preview.lnk" del "%SM%\Phone Preview.lnk"
if exist "%DEST%" rmdir /s /q "%DEST%"

echo.
echo Phone Preview Tool removed.
echo If it is running, close its window first.
echo.
pause
