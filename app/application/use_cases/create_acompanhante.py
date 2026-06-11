"""CreateAcompanhanteUseCase — register a standalone caregiver.

Lets the triagem (and patient flow) add a caregiver that doesn't exist yet,
so it can then be linked to an evaluation (model B). If a CPF is given and
already matches an existing caregiver, that one is reused (no duplicates).
"""
from __future__ import annotations

from app.core.exceptions import DomainError
from app.domain.entities.acompanhante import Acompanhante
from app.domain.value_objects.cpf import CPF
from app.interfaces.repositories.acompanhante_repository import AcompanhanteRepository


class CreateAcompanhanteUseCase:
    def __init__(self, acompanhantes: AcompanhanteRepository) -> None:
        self._acompanhantes = acompanhantes

    async def execute(
        self,
        *,
        nome: str,
        telefone: str | None,
        email: str | None,
        cpf: str | None,
    ) -> Acompanhante:
        nome = (nome or "").strip()
        if len(nome) < 2:
            raise DomainError("Informe o nome do acompanhante.")

        cpf_vo: CPF | None = None
        if cpf:
            try:
                cpf_vo = CPF(cpf)
            except ValueError as exc:
                raise DomainError("CPF do acompanhante inválido.") from exc
            existing = await self._acompanhantes.get_by_cpf(cpf_vo)
            if existing is not None:
                return existing

        novo = Acompanhante(
            nome=nome,
            cpf=cpf_vo,
            telefone=(telefone or "").strip() or None,
            email=(email or "").strip() or None,
        )
        return await self._acompanhantes.add(novo)
