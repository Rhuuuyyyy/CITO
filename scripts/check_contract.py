#!/usr/bin/env python
"""Guard de contrato estático: Front-end ↔ Back-end (CITO).

Por que existe: o projeto nasceu com 3 grupos (front/back/banco) que se
desencontraram. Este script trava o contrato entre front e back para que uma
mudança em um lado que quebre o outro seja pega *antes* do E2E.

O que verifica (SEM precisar de banco — só tabela de rotas + schemas Pydantic):
  1. Todo endpoint que o front chama (espelho de frontend/src/api/client.js)
     existe no app FastAPI, com o método certo.
  2. Os payloads que o front envia validam contra os schemas de request
     (com extra="forbid", um campo renomeado/sobrando é detectado).

Uso:
    python scripts/check_contract.py      # exit 0 = OK, 1 = divergência
"""
from __future__ import annotations

import os
import sys

# Make the project root importable regardless of the current working directory
# (running a script puts scripts/ on sys.path, not the project root).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: E402
from app.presentation.api.v1.schemas.agendamento import AgendamentoCreateRequest
from app.presentation.api.v1.schemas.anamnesis import SubmitAnamnesisRequest
from app.presentation.api.v1.schemas.patient import PatientCreateRequest

PREFIX = "/api/v1"

# ── 1. Endpoints que o front consome (espelho de src/api/client.js) ──────────
EXPECTED_ROUTES: list[tuple[str, str]] = [
    ("POST", f"{PREFIX}/auth/login"),
    ("POST", f"{PREFIX}/auth/logout"),
    ("GET", f"{PREFIX}/sintomas"),
    ("GET", f"{PREFIX}/pacientes"),
    ("POST", f"{PREFIX}/pacientes"),
    ("GET", f"{PREFIX}/pacientes/{{paciente_id}}/historico"),
    ("POST", f"{PREFIX}/avaliacoes"),
    ("GET", f"{PREFIX}/dashboard/summary"),
    ("GET", f"{PREFIX}/relatorios/avaliacoes"),
    ("GET", f"{PREFIX}/agendamentos"),
    ("POST", f"{PREFIX}/agendamentos"),
]

# ── 2. Payloads representativos que o front envia (espelho dos componentes) ──
HISTORICO_KEYS = [
    "deficiencia_intelectual", "autismo_na_familia", "epilepsia",
    "falencia_ovariana_precoce", "menopausa_precoce", "infertilidade_masculina",
    "abortos_recorrentes", "tremor_ataxia_familiar",
]

PAYLOADS: list[tuple[str, type, dict]] = [
    (
        "PatientCreateRequest (Triagem — mínimo)",
        PatientCreateRequest,
        {
            "nome": "Maria Teste",
            "cpf": "12345678901",
            "data_nascimento": "2015-03-02",
            "sexo": "M",
            "acompanhante": {
                "nome": "Joana Teste", "relacao": "Mãe",
                "telefone": "11999999999", "email": "j@ex.com",
            },
        },
    ),
    (
        "PatientCreateRequest (Pacientes — completo)",
        PatientCreateRequest,
        {
            "nome": "Maria Teste", "cpf": "12345678901",
            "data_nascimento": "2015-03-02", "sexo": "F",
            "etnia": "parda", "escolaridade": "educacao_infantil",
            "prematuro": True, "tem_diagnostico_autismo": False,
            "tem_diagnostico_tdah": True, "outras_comorbidades": "epilepsia",
            "medicamentos_uso": "x",
            "acompanhante": {
                "nome": "Joana Teste", "relacao": "Mãe",
                "telefone": "11999999999", "email": "j@ex.com",
            },
        },
    ),
    (
        "SubmitAnamnesisRequest (Triagem)",
        SubmitAnamnesisRequest,
        {
            "paciente_id": 1, "sessao_id": 1, "observacoes": "",
            "diagnostico_previo_fxs": False,
            "respostas": [{"sintoma_id": 1, "presente": True}],
            "historico_familiar": {
                **{k: (i % 2 == 0) for i, k in enumerate(HISTORICO_KEYS)},
                "descricao_outros": None,
            },
        },
    ),
    (
        "AgendamentoCreateRequest (Agenda)",
        AgendamentoCreateRequest,
        {
            "titulo": "Consulta", "tipo": "Triagem SXF",
            "data_hora": "2026-06-10T14:30:00", "status": "confirmado",
            "paciente_id": 1,
        },
    ),
]


def _registered_routes() -> set[tuple[str, str]]:
    routes: set[tuple[str, str]] = set()
    for route in app.routes:
        methods = getattr(route, "methods", None)
        path = getattr(route, "path", None)
        if not methods or not path:
            continue
        for method in methods:
            if method in {"GET", "POST", "PUT", "PATCH", "DELETE"}:
                routes.add((method, path))
    return routes


def main() -> int:
    failures: list[str] = []

    # 1. rotas
    registered = _registered_routes()
    print("── Rotas (front → back) ──")
    for method, path in EXPECTED_ROUTES:
        ok = (method, path) in registered
        print(f"  {'OK ' if ok else 'FALTA'}  {method:5} {path}")
        if not ok:
            failures.append(f"rota ausente: {method} {path}")

    # 2. payloads
    print("\n── Payloads (front → schemas de request) ──")
    for label, schema, payload in PAYLOADS:
        try:
            schema.model_validate(payload)
            print(f"  OK     {label}")
        except Exception as exc:  # noqa: BLE001 — queremos a mensagem completa
            first = str(exc).splitlines()[0]
            print(f"  FALHA  {label} → {first}")
            failures.append(f"payload inválido: {label} → {first}")

    print()
    if failures:
        print(f"✗ CONTRATO QUEBRADO — {len(failures)} problema(s):")
        for f in failures:
            print(f"   - {f}")
        return 1
    print("✓ Contrato OK — todas as rotas existem e os payloads validam.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
