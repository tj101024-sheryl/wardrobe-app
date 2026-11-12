@echo off
cd /d "%~dp0"
echo Starting backend on :8000 (0.0.0.0) ...
start "wardrobe-backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo Starting Expo (web + Expo Go QR) on :8081 ...
start "wardrobe-expo" cmd /k "cd /d %~dp0frontend && npx expo start --port 8081"
echo.
echo Web:      http://localhost:8081
echo Expo Go:  scan the QR code in the wardrobe-expo window
echo           or enter exp://140.118.219.6:8081 manually
echo NOTE: phone must be on the SAME Wi-Fi as this computer.
pause
