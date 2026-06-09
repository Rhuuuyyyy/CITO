@echo off
setlocal
title CITO - Inicializador

rem Sempre executa a partir da pasta onde o .bat esta (raiz do projeto)
cd /d "%~dp0"

echo ============================================
echo  CITO - Sistema de Triagem (back + front)
echo ============================================
echo.

rem --- 1. Verifica se o Python esta instalado ---
where python >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado no PATH.
    echo        Instale o Python 3.11+ em https://www.python.org/downloads/
    echo        e marque a opcao "Add Python to PATH" na instalacao.
    pause
    exit /b 1
)

rem --- 2. Cria o ambiente virtual se ainda nao existir ---
if not exist ".venv\Scripts\python.exe" (
    echo [1/5] Criando ambiente virtual em .venv ...
    python -m venv .venv
    if errorlevel 1 (
        echo [ERRO] Falha ao criar o ambiente virtual.
        pause
        exit /b 1
    )
) else (
    echo [1/5] Ambiente virtual .venv ja existe.
)

rem --- 3. Ativa o venv e instala as dependencias do pyproject.toml ---
call ".venv\Scripts\activate.bat"

echo [2/5] Atualizando o pip ...
python -m pip install --upgrade pip --quiet

echo [3/5] Instalando dependencias (pip install -e .) ...
pip install -e .
if errorlevel 1 (
    echo [ERRO] Falha ao instalar as dependencias.
    pause
    exit /b 1
)

rem --- 4. Garante que o .env existe ---
if not exist ".env" (
    echo [4/5] Criando .env a partir do .env.example ...
    copy /y ".env.example" ".env" >nul
    echo.
    echo [AVISO] O arquivo .env foi criado com valores padrao.
    echo         Edite-o e configure: DATABASE_URL, PGP_KEY, SECRET_KEY e CORS_ORIGINS.
    echo         Sem um PostgreSQL configurado, os endpoints que usam banco vao falhar.
    echo.
) else (
    echo [4/5] Arquivo .env ja existe.
)

rem --- 5. Sobe back-end e front-end em janelas separadas ---
echo [5/5] Iniciando servidores ...

start "CITO Back-end (API :8000)" cmd /k "cd /d "%~dp0" && call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

start "CITO Front-end (:5500)" cmd /k "cd /d "%~dp0frontend" && python -m http.server 5500"

rem Aguarda alguns segundos para os servidores subirem antes de abrir o navegador
timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:5500"

echo.
echo ============================================
echo  Tudo pronto!
echo    API:    http://localhost:8000  (docs em /api/v1/docs)
echo    Front:  http://127.0.0.1:5500
echo  Para encerrar, feche as duas janelas abertas.
echo ============================================
echo.
pause
