# 0002 — PII mascarada na borda da API

- **Status:** Aceito
- **Data:** 2026-06-08
- **Decisores:** engenharia de integração (alinhado ao foco de LGPD do Charter)

## Contexto

O banco guarda dados sensíveis cifrados (BYTEA via `pgp_sym_encrypt`) e expõe views lógicas que
decifram de forma transparente por sessão. O CPF é armazenado **apenas como hash SHA-256**. Com o
front falando direto com o banco ([[0001]] reverteu isso), nomes em claro chegavam ao navegador.

Como agora **todo** dado passa pela API, surge a pergunta: a API deve devolver nome/CPF em claro?

## Decisão

A API **mascara PII na borda**. Respostas nunca trazem nome completo nem CPF em claro:

- `mask_name()` (em `app/presentation/api/v1/masking.py`) mostra o primeiro nome e mascara o resto:
  `"Maria Aparecida Silva"` → `"Maria A*** S***"`.
- CPF é representado pelo placeholder `CPF_MASK = "***.***.***-**"` (no banco só existe o hash).
- Schemas de resposta usam campos explicitamente mascarados: `nome_masked`, `cpf_masked`.

## Consequências

**Positivas**
- Conformidade com LGPD por padrão; minimização de exposição de PII no cliente e em logs.
- Reduz o risco de vazamento mesmo que o `sessionStorage`/DOM seja inspecionado.

**Negativas / limitações (importantes para quem mexer no front)**
- O front **nunca** tem o nome em claro de um paciente já cadastrado. Logo:
  - No **laudo PDF de paciente já existente**, o nome sai mascarado.
  - No fluxo de **paciente novo**, o nome do PDF é o que o médico acabou de digitar (correto),
    pois ainda está na memória do formulário antes de ir ao servidor.
- A **busca por nome** precisa ser **server-side** (filtrar nome mascarado no cliente não funciona).
  Por isso a lista de pacientes usa `GET /pacientes?nome=...` com debounce.
- O endpoint de lista não expõe a lista de acompanhantes de um paciente (só o telefone do
  acompanhante). Em triagem de paciente existente, os campos de acompanhante ficam em branco —
  aceitável porque o acompanhante não é reenviado nesse caso (ver [[0004]]).

## Alternativas consideradas

- **Devolver nome em claro só para o médico dono:** rejeitada por ora — aumenta a superfície de
  exposição e exigiria endpoint de "detalhe completo" com autorização fina. Pode virar um ADR
  futuro se o laudo de paciente existente precisar do nome real.
