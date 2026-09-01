# Estado do projeto — Web Path AR

> **Onde estamos.** Um lugar só, para não repetir o que já está registrado
> em outro arquivo.
>
> - `ARCHITECTURE.md` → como o sistema é construído
> - `DECISIONS.md` → por que cada escolha foi feita
> - `ROADMAP.md` → para onde vamos, e o que aprender em cada fase
> - **`PROGRESS.md`** → o que está pronto, o que está testado, o que trava
>
> Criado na Fase 6a (2026-09-01). Antes disso, essa informação vivia numa
> tabela dentro do `ROADMAP.md`, que agora aponta para cá.

**Última atualização:** 2026-09-01 — Fase 6a.

---

## Resumo

| | |
|---|---|
| **Fase corrente** | 6a concluída em código; falta abrir num celular real |
| **Próxima fase** | 7 — segundo e terceiro satélites |
| **Bloqueios** | Fase 6b (sem fotos); validação em Android (sem aparelho) |
| **Acervo** | 2 satélites, 5 localidades |

---

## Fases

As quatro colunas não são a mesma coisa, e confundi-las é o erro que este
arquivo existe para evitar. **Implementado** é código que roda.
**Testado** é verificado por quem escreveu, em servidor local ou por
simulação. **Validado** é confirmado em aparelho físico, por uma pessoa.
**Documentado** é registrado onde alguém vai achar depois.

| Fase | Implementado | Testado | Validado em aparelho | Documentado |
|---|:--:|:--:|:--:|---|
| **0** — esqueleto ambulante | sim | sim | sim, produção | ROADMAP |
| **1** — primeiro satélite | sim | sim | sim, iPhone | ROADMAP, ADR-009, ADR-010 |
| **2** — AR | sim | sim | **iOS sim / Android não** | ROADMAP, ADR-007 |
| **3** — cobertura de AR | — | — | iOS, 2 de 2 modelos | ROADMAP, CUBESAT_PILOT |
| **4** — erros e degradação | sim | sim | sim, iPhone e WhatsApp | ROADMAP, ADR-011 |
| **5** — globo | sim | sim | sim, celular | ROADMAP, ADR-008 |
| **6a** — páginas de localidade | sim | sim | **não** | ROADMAP, ARCHITECTURE §2.3 e §4 |
| **6b** — pipeline de imagens | não | — | — | ROADMAP |
| **7** — 2º e 3º satélites | não | — | — | ROADMAP |
| **8** — medição e otimização | não | — | — | ROADMAP |
| **9** — QR Codes e material | não | — | — | ROADMAP |

A Fase 3 não tem código próprio: é uma fase de validação.

---

## Acervo

### Satélites — `/satelites/<slug>/`

| Slug | Modelo | Tamanho em AR | AR validado |
|---|---|---|---|
| `cubesat` | 146 KB, Draco exigido | ~10 cm de corpo, escala `0.048` na página | iPhone, 2026-08-27 |
| `acrimsat` | 2,1 MB, sem Draco | 2,42 m, tamanho nativo do arquivo | iPhone, 2026-09-01 |

### Localidades — `/locais/<slug>/`

Cinco bases de lançamento, todas alcançáveis pelo globo. Nenhuma tem fotos
ainda (Fase 6b).

`alcantara` · `barreira-do-inferno` · `kourou` · `cabo-canaveral` · `baikonur`

**Faltam os locais de tipo `curso`.** Eles dependem do usuário: só ele sabe
onde as atividades pedagógicas aconteceram. Acrescentar um é uma feição no
`locais.geojson`, um `data/locais/<slug>.json` e um `locais/<slug>/index.html`.

---

## O que trava o quê

| Bloqueio | Trava | Como sai |
|---|---|---|
| **Nenhum aparelho Android** | Fechar a Fase 2; decidir a escala do `CUBESAT_PILOT.md` §6.5 | Um Android emprestado e um preview deployment |
| **Sem fotos das localidades** | Fase 6b inteira | O usuário fotografar ou reunir o material |
| **Sem domínio próprio** | Fase 9 — **nada é impresso apontando para `*.pages.dev`** | Registrar e apontar antes de gerar QR Code |

---

## Pendências que não travam nada

- `poster.webp` dos dois modelos — débito D-06, passo manual
- Teste 0 incompleto: faltam QR pela câmera, WhatsApp e Chrome iOS
- `Content-Type` do `.geojson` em produção nunca conferido (local sai
  `application/octet-stream`; o `response.json()` não checa cabeçalho, então
  funciona — mas diferença entre local e host já custou caro na Fase 0)
- `README.md` desatualizado — anuncia "Fase corrente: 2 — AR no Android"
- Dois QR Codes commitados em `satelites/*/` sem documentação e sem
  referência em nenhum arquivo; entraram no commit `6280708`

---

## Débitos técnicos

Detalhe e prazo de cada um em [ROADMAP.md](ROADMAP.md#débitos-técnicos).

| | | Quando |
|---|---|---|
| D-01 | Tokens de cor duplicados | **resolvido** na Fase 5 |
| D-02 | `modelo.credito` não usado | Fase 7 |
| D-03 | `descricao` vs `resumo` | **resolvido** na Fase 6a |
| D-04 | Satélites inalcançáveis por navegação | sem fase atribuída |
| D-05 | Draco nunca medido | Fase 8 |
| D-06 | `poster.webp` ausente | oportunisticamente |
| D-07 | Quatro funções duplicadas entre os módulos de página | Fase 7 |
