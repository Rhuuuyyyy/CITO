# Cofre Obsidian — Documentação do Back-end CITO

Esta pasta é um **cofre (vault) do [Obsidian](https://obsidian.md)** com a documentação de
arquitetura do back-end do CITO. Foi pensada para que um(a) programador(a) novo(a) entenda a base de
código **sem precisar ler tudo de uma vez**.

## Como abrir

1. Abra o Obsidian → _Open folder as vault_ → selecione esta pasta `obsidian/`.
2. Comece por **[[Início]]** (o índice central / _Map of Content_).
3. Use o **Graph View** (ícone de grafo na lateral) para ver como os conceitos se interligam.
4. Abra os arquivos **`.canvas`** em `99-Diagramas/` para os mapas visuais.

## Como navegar

- Os documentos são interligados por **wikilinks** (`[[Nome do Documento]]`). Clique para saltar.
- As **tags** (ex.: `#camada/dominio`, `#fluxo`, `#lgpd`) agrupam temas — clique numa tag para ver
  todos os documentos relacionados.
- A numeração das pastas (`01-`, `02-`, …) sugere uma ordem de leitura, mas o conteúdo é não-linear:
  siga os links conforme a curiosidade.

## Estrutura

| Pasta | Conteúdo |
|-------|----------|
| `01-Arquitetura/` | Visão macro: camadas, hexágono, composition root, código ativo vs. legado. |
| `02-Fluxos/` | O passo a passo de cada operação importante (login, cadastro, anamnese…). |
| `03-Componentes/` | Referência módulo a módulo, organizada por camada. |
| `04-Dominio-do-Negocio/` | Regras clínicas (SXF, score), LGPD e modelo de dados. |
| `05-Referencia/` | Contrato de API, glossário e ADRs. |
| `99-Diagramas/` | Diagramas `.canvas` (topologia, camadas, fluxo, dados). |

> **Manutenção:** quando o código mudar de forma relevante (nova rota, nova regra, mudança de
> contrato), atualize o documento correspondente e, se for uma _decisão_, registre um ADR em
> `docs/adr/` e espelhe em [[Decisões de Arquitetura (ADRs)]].
