@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Get the LTS version from https://nodejs.org then run this again. & start https://nodejs.org & pause & exit /b)
if not exist node_modules (echo First run: installing, this takes a minute... & call npm install --omit=dev)
start "" http://localhost:3000
node server.js
pause
