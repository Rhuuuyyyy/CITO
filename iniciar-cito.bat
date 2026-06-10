@echo off
cd /d "%~dp0"
echo Iniciando o CITO (backend + frontend)...
start "CITO - Backend" cmd /k ".venv-win\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
timeout /t 3 >nul
start "CITO - Frontend" cmd /k "cd frontend && python -m http.server 5500 --bind 127.0.0.1"
timeout /t 2 >nul
start http://127.0.0.1:5500
echo.
echo Pronto. O site vai abrir no navegador em http://127.0.0.1:5500
echo Para parar tudo, feche as duas janelas que abriram.
