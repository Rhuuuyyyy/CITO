# Architecture Decision Records (ADRs) — CITO

Registro das decisões de arquitetura **não-óbvias** tomadas durante a integração das três
camadas (Front-End, Back-End, Banco) do CITO. Cada ADR captura o **contexto**, a **decisão**
e as **consequências** — para que uma sessão futura (humana ou IA) entenda *por que* o código
está assim, sem precisar reconstruir o raciocínio.

> Formato: um arquivo por decisão, numerado. Status: `Proposto` → `Aceito` → (`Substituído por NNNN`).
> ADRs são imutáveis depois de aceitos; mudou de ideia? escreva um novo que substitui o anterior.

| # | Decisão | Status |
|---|---------|--------|
| [0001](0001-frontend-fala-exclusivamente-com-a-api.md) | Front-end fala **exclusivamente** com a API FastAPI (fim do Supabase direto) | Aceito |
| [0002](0002-pii-mascarada-na-borda-da-api.md) | PII mascarada na borda da API (nomes/CPF nunca em claro) | Aceito |
| [0003](0003-identidade-inteira-serial.md) | Identidade inteira (SERIAL) em vez de UUID para Paciente/Acompanhante | Aceito |
| [0004](0004-submissao-de-avaliacao-consolidada.md) | Submissão de avaliação consolidada num único endpoint | Aceito |
| [0005](0005-dependencia-da-view-recomenda-exame.md) | Dependência do contrato `avaliacoes.recomenda_exame` (grupo de banco) | Aceito |

**Pano de fundo comum:** projeto universitário com três grupos que evoluíram em ritmos diferentes.
O Front-End e o Banco estavam alinhados; o Back-End era uma versão antiga e desconectada. O
engajamento integrou as três camadas fazendo o front falar **somente** com o back, e atualizando o
back para o esquema real do banco. Spec de referência: [`../../SPEC.md`](../../SPEC.md).
