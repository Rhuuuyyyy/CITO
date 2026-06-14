from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.acompanhante import Acompanhante
from app.domain.value_objects.cpf import CPF


@dataclass(frozen=True)
class AcompanhanteListItem:
    id: int
    nome: str
    telefone: str | None
    email: str | None


class AcompanhanteRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, acompanhante: Acompanhante) -> Acompanhante:
        result = await self._session.execute(
            text(
                """
                INSERT INTO acompanhantes (nome, cpf_hash, telefone, email)
                VALUES (:nome, :cpf_hash, :telefone, :email)
                RETURNING id
                """
            ),
            {
                "nome": acompanhante.nome,
                "cpf_hash": acompanhante.cpf.sha256_hex if acompanhante.cpf else None,
                "telefone": acompanhante.telefone,
                "email": acompanhante.email,
            },
        )
        row = result.mappings().first()
        if row is None:
            raise RuntimeError(
                "Falha ao inserir acompanhante — RETURNING id não retornou valor"
            )
        return acompanhante.model_copy(update={"id": int(row["id"])})

    async def list_by_doctor(self, *, usuario_id: int) -> list[AcompanhanteListItem]:
        result = await self._session.execute(
            text(
                """
                SELECT DISTINCT a.id, a.nome, a.telefone, a.email
                FROM   acompanhantes a
                JOIN   pacientes p ON p.acompanhante_id = a.id
                WHERE  p.criado_por = :usuario_id
                ORDER BY a.nome
                """
            ),
            {"usuario_id": usuario_id},
        )
        return [
            AcompanhanteListItem(
                id=int(row["id"]),
                nome=str(row["nome"]) if row["nome"] else "",
                telefone=row["telefone"],
                email=row["email"],
            )
            for row in result.mappings().all()
        ]

    async def update(
        self,
        *,
        acompanhante_id: int,
        nome: str,
        telefone: str | None,
        email: str | None,
        restrict_to_usuario_id: int | None,
    ) -> bool:
        params: dict[str, object] = {
            "id": acompanhante_id,
            "nome": nome,
            "telefone": telefone,
            "email": email,
        }
        auth = ""
        if restrict_to_usuario_id is not None:
            auth = """
              AND EXISTS (
                SELECT 1 FROM tb_pacientes p
                WHERE p.acompanhante_id = tb_acompanhantes.id AND p.criado_por = :uid
                UNION
                SELECT 1 FROM tb_avaliacoes av
                JOIN   tb_pacientes p2 ON p2.id = av.paciente_id
                WHERE  av.acompanhante_id = tb_acompanhantes.id AND p2.criado_por = :uid
              )
            """
            params["uid"] = restrict_to_usuario_id

        result = await self._session.execute(
            text(
                f"""
                UPDATE tb_acompanhantes
                SET nome_criptografado = pgp_sym_encrypt(:nome, current_setting('app.pgp_key', true)),
                    telefone = :telefone,
                    email = :email
                WHERE id = :id {auth}
                """
            ),
            params,
        )
        return (result.rowcount or 0) > 0

    async def get_by_id(self, entity_id: int) -> Acompanhante | None:
        result = await self._session.execute(
            text(
                "SELECT id, nome, telefone, email FROM acompanhantes WHERE id = :id"
            ),
            {"id": entity_id},
        )
        row = result.mappings().first()
        if row is None:
            return None
        return Acompanhante(
            id=int(row["id"]),
            nome=str(row["nome"]),
            cpf=None,
            telefone=row["telefone"],
            email=row["email"],
        )

    async def get_by_cpf(self, cpf: CPF) -> Acompanhante | None:
        result = await self._session.execute(
            text(
                """
                SELECT id, nome, telefone, email
                FROM acompanhantes WHERE cpf_hash = :cpf_hash
                """
            ),
            {"cpf_hash": cpf.sha256_hex},
        )
        row = result.mappings().first()
        if row is None:
            return None
        return Acompanhante(
            id=int(row["id"]),
            nome=str(row["nome"]),
            cpf=None,
            telefone=row["telefone"],
            email=row["email"],
        )
