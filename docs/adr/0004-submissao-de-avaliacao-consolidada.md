# 0004 — Submissão de avaliação consolidada num único endpoint

- **Status:** Aceito
- **Data:** 2026-06-08
- **Decisores:** engenharia de integração

## Contexto

Para finalizar uma triagem, o front (versão Supabase) orquestrava **7 operações** em sequência no
navegador:

1. `insert tb_acompanhantes` → 2. `insert tb_pacientes` → 3. `insert tb_avaliacoes (rascunho)` →
4. `insert respostas_checklist` → 5. `insert tb_historico_familiar` →
6. `rpc fn_calcular_score_triagem` → 7. `if recomenda: insert tb_encaminhamentos` +
`rpc fn_registrar_auditoria`.

Problemas: regra de negócio (limiar, encaminhamento, auditoria) no cliente; sem atomicidade (uma
falha no meio deixava lixo); duplicação em relação ao Back-End.

## Decisão

Consolidar tudo num **único endpoint** `POST /api/v1/avaliacoes`. O front envia **um** payload:

```json
{
  "paciente_id": 12, "sessao_id": 34,
  "observacoes": "", "diagnostico_previo_fxs": false,
  "respostas": [{ "sintoma_id": 1, "presente": true }, ...],
  "historico_familiar": { "deficiencia_intelectual": true, ..., "descricao_outros": null }
}
```

O caso de uso `submit_anamnesis` no back executa o fluxo completo: cria rascunho → grava respostas →
grava histórico familiar → calcula score e aplica o limiar por sexo → cria encaminhamento
`exame_fmr1` quando `recomenda_exame` → registra auditoria. O cadastro de paciente novo, quando
necessário, é uma chamada separada anterior (`POST /pacientes`, que já cria o acompanhante junto).

## Consequências

**Positivas**
- O front deixa de conter regra de negócio clínica; passa a só coletar e exibir.
- Um lugar para evoluir o modelo de score; contrato claro entre os grupos.

**Decisões finas**
- **Auditoria é best-effort:** roda em `begin_nested()` (savepoint) com try/except; se a função de
  auditoria não existir/falhar, o fluxo clínico **não** é derrubado. Já histórico e encaminhamento
  são **fatais** (consistência clínica importa).
- `respostas` exige `min_length=1`. O front mapeia o id do sintoma pelo catálogo (`GET /sintomas`,
  casando `descricao`); se o mapa vier vazio, o front aborta com aviso em vez de mandar lista vazia.
- O front continua **calculando o score localmente** apenas para *preview* na tela de revisão; o
  valor que vale é o que o back devolve.

## Relacionados

[[0001]] (API única), [[0005]] (dependência da coluna `recomenda_exame`).
