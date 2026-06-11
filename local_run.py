#!/usr/bin/env python3
"""
CITO - Inicializador do projeto (back-end + front-end).

Uso:  python run.py

O script prepara tudo sozinho:
  1. Verifica a versao do Python (>= 3.11);
  2. Cria o ambiente virtual .venv se ainda nao existir;
  3. Instala as dependencias do pyproject.toml dentro do venv;
  4. Cria o .env a partir do .env.example se necessario;
  5. Sobe a API (uvicorn, porta 8000) e o front estatico (porta 5500),
     e abre o navegador quando os dois estiverem no ar.

Encerre com Ctrl+C — os dois servidores sao finalizados juntos.
"""

import os
import shutil
import subprocess
import sys
import time
import urllib.request
import venv
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENV_DIR = ROOT / ".venv"
FRONTEND_DIR = ROOT / "frontend"

BACKEND_PORT = 8000
FRONTEND_PORT = 5500

BACKEND_URL = f"http://localhost:{BACKEND_PORT}"
FRONTEND_URL = f"http://127.0.0.1:{FRONTEND_PORT}"


def info(msg: str) -> None:
    print(f"[CITO] {msg}")


def die(msg: str) -> None:
    print(f"[CITO][ERRO] {msg}", file=sys.stderr)
    sys.exit(1)


def venv_python() -> Path:
    """Caminho do interpretador Python dentro do venv (Windows ou Unix)."""
    if os.name == "nt":
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def check_python_version() -> None:
    if sys.version_info < (3, 11):
        die(
            f"Python 3.11+ e necessario (voce esta usando "
            f"{sys.version_info.major}.{sys.version_info.minor}). "
            "Baixe em https://www.python.org/downloads/"
        )
    info(f"Python {sys.version_info.major}.{sys.version_info.minor} OK.")


def venv_has_pip() -> bool:
    result = subprocess.run(
        [str(venv_python()), "-m", "pip", "--version"],
        capture_output=True,
    )
    return result.returncode == 0


def ensure_venv() -> None:
    if venv_python().exists():
        if venv_has_pip():
            info("Ambiente virtual .venv ja existe.")
            return
        # Venv existente mas sem pip: tenta consertar com ensurepip.
        info("O .venv existe mas esta sem pip — tentando reparar ...")
        subprocess.run(
            [str(venv_python()), "-m", "ensurepip", "--upgrade"],
            capture_output=True,
        )
        if venv_has_pip():
            info("pip instalado no .venv.")
            return
        info("Nao foi possivel reparar — recriando o .venv do zero ...")
        shutil.rmtree(VENV_DIR)

    info("Criando ambiente virtual em .venv ...")
    venv.EnvBuilder(with_pip=True).create(VENV_DIR)
    if not venv_has_pip():
        die(
            "O venv foi criado sem pip. No Linux/Debian, instale o pacote "
            "python3-venv (ex.: sudo apt install python3.11-venv) e rode de novo."
        )
    info("Ambiente virtual criado.")


def install_dependencies() -> None:
    py = str(venv_python())
    info("Atualizando o pip ...")
    subprocess.run(
        [py, "-m", "pip", "install", "--upgrade", "pip", "--quiet"],
        cwd=ROOT,
        check=True,
    )
    info("Instalando dependencias do pyproject.toml (pip install -e .) ...")
    result = subprocess.run([py, "-m", "pip", "install", "-e", "."], cwd=ROOT)
    if result.returncode != 0:
        die("Falha ao instalar as dependencias. Veja a saida do pip acima.")
    info("Dependencias instaladas.")


def ensure_env_file() -> None:
    env_file = ROOT / ".env"
    example = ROOT / ".env.example"
    if env_file.exists():
        info("Arquivo .env ja existe.")
        return
    if not example.exists():
        die("Nem .env nem .env.example foram encontrados na raiz do projeto.")
    shutil.copyfile(example, env_file)
    info(".env criado a partir do .env.example.")
    print(
        "\n  [AVISO] O .env foi criado com valores padrao. Edite-o e configure:\n"
        "          DATABASE_URL, PGP_KEY, SECRET_KEY e CORS_ORIGINS.\n"
        "          Sem um PostgreSQL configurado, os endpoints que usam banco\n"
        "          vao falhar em runtime (a API sobe mesmo assim).\n"
    )


def wait_for(url: str, timeout: float = 30.0) -> bool:
    """Aguarda ate `url` responder por HTTP (ou estoura o timeout)."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2):
                return True
        except Exception:
            time.sleep(0.5)
    return False


def start_servers() -> None:
    py = str(venv_python())

    info(f"Subindo o back-end (uvicorn) em {BACKEND_URL} ...")
    backend = subprocess.Popen(
        [py, "-m", "uvicorn", "app.main:app", "--reload", "--port", str(BACKEND_PORT)],
        cwd=ROOT,
    )

    info(f"Subindo o front-end (servidor estatico) em {FRONTEND_URL} ...")
    frontend = subprocess.Popen(
        [py, "-m", "http.server", str(FRONTEND_PORT), "--bind", "127.0.0.1"],
        cwd=FRONTEND_DIR,
    )

    procs = [("back-end", backend), ("front-end", frontend)]

    try:
        if wait_for(f"{BACKEND_URL}/health"):
            info(f"API no ar: {BACKEND_URL}/health (docs em {BACKEND_URL}/api/v1/docs)")
        else:
            info("A API ainda nao respondeu no /health — verifique os logs acima.")

        if wait_for(FRONTEND_URL):
            info(f"Front no ar: {FRONTEND_URL}")
            webbrowser.open(FRONTEND_URL)

        print()
        info("Tudo pronto! Pressione Ctrl+C para encerrar os dois servidores.")
        print()

        # Fica de olho nos processos: se um deles cair, encerra tudo.
        while True:
            for name, proc in procs:
                code = proc.poll()
                if code is not None:
                    info(f"O {name} encerrou (codigo {code}). Finalizando o restante ...")
                    raise KeyboardInterrupt
            time.sleep(1)
    except KeyboardInterrupt:
        print()
        info("Encerrando servidores ...")
    finally:
        for _, proc in procs:
            if proc.poll() is None:
                proc.terminate()
        for _, proc in procs:
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()
        info("Servidores finalizados. Ate mais!")


def main() -> None:
    os.chdir(ROOT)
    print("=" * 52)
    print("  CITO - Sistema de Triagem (back-end + front-end)")
    print("=" * 52)
    check_python_version()
    ensure_venv()
    install_dependencies()
    ensure_env_file()
    start_servers()


if __name__ == "__main__":
    main()
