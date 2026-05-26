@echo off
cd /d "%~dp0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>nul
)
if exist ".next" rmdir /s /q ".next"
cmd /c npm run dev -- --hostname 127.0.0.1 --port 3001
