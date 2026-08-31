# Web Path AR

Aplicação web **estática** de apoio a aulas sobre satélites, missões e
exploração espacial.

O fluxo principal é físico → digital:

```
QR Code impresso → URL específica → conteúdo educacional
  → visualização 3D → Realidade Aumentada (quando suportada)
```

Há também um modo exploratório, através de um globo interativo na página
inicial.

**Ambiente-alvo primário: celular.**

---

## Estado atual

**Fase 0 — Esqueleto ambulante.** O planejamento completo está em
[ROADMAP.md](ROADMAP.md).

O que já existe e foi verificado em dispositivo real:

- AR Quick Look validado em iPhone real com o modelo CubeSat 1U
  (2026-08-27) — USDZ gerado no próprio dispositivo, escala fisicamente
  plausível. Detalhes em [docs/CUBESAT_PILOT.md](docs/CUBESAT_PILOT.md).

O que ainda **não** foi verificado:

- AR no Android (Scene Viewer) — nenhum teste feito.
- Os demais modelos do acervo no iOS.
- Roteamento de `/satelites/<slug>/` em produção (ver
  [docs/CUBESAT_PILOT.md](docs/CUBESAT_PILOT.md) §7).

---

## Stack

Sem framework, sem bundler, sem build step — decisão arquitetural
deliberada, registrada em [ADR-001](DECISIONS.md#adr-001--sem-framework-na-fase-inicial).

| Camada | Ferramenta |
|---|---|
| Páginas | HTML, CSS, módulos ES |
| 3D e AR | [`<model-viewer>`](https://modelviewer.dev), Scene Viewer, AR Quick Look |
| Mapa | MapLibre GL JS + OpenFreeMap |
| Dados | GeoJSON e JSON estáticos |
| Pipeline de assets | Blender, glTF Transform |
| Hospedagem | Cloudflare Pages |

---

## Rodar localmente

O projeto é servido como arquivos estáticos. Um `file://` aberto direto no
navegador **não** funciona: módulos ES e `fetch` exigem origem HTTP.

Qualquer servidor estático serve. Com Python:

```bash
python -m http.server 8000
```

Depois abra <http://localhost:8000>.

> **Limitação importante:** um servidor local não reproduz o roteamento nem
> o tratamento de 404 do Cloudflare Pages. Comportamento de URL só é
> conclusivo testando num deploy real.

### Testar no celular na mesma rede

```bash
python -m http.server 8000 --bind 0.0.0.0
```

E acessar `http://<ip-da-máquina>:8000` pelo celular. Serve para conferir
layout; **não serve para validar AR** — o AR Quick Look e o Scene Viewer
exigem HTTPS, ou seja, um preview deployment.

---

## Fluxo de trabalho

Testes em dispositivo real são feitos por **preview deployment**, nunca em
produção:

```
branch → push → URL de preview do Cloudflare Pages
  → iPhone/Android real → só então PR para main
```

---

## Estrutura

```
/
├── index.html                 → home (globo, a partir da Fase 5)
├── 404.html
├── satelites/<slug>/          → páginas de satélite
├── locais/<slug>/             → páginas de localidade
├── data/                      → GeoJSON e JSON de conteúdo
├── assets/models/<slug>/      → modelo.glb, poster.webp
├── assets/fotos/<slug>/
├── src/                       → JS e CSS compartilhados
├── tools/                     → scripts de otimização de assets
└── docs/
```

**Assets originais não entram no repositório** — apenas o resultado final
otimizado. Ver [ADR-005](DECISIONS.md#adr-005--originais-fora-do-repositório).

---

## Documentação

| Arquivo | Papel |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Como o sistema é construído |
| [DECISIONS.md](DECISIONS.md) | Por que cada escolha foi feita (ADRs, acumulativo) |
| [ROADMAP.md](ROADMAP.md) | Em que ordem construir, e o que aprender em cada fase |
| [docs/CUBESAT_PILOT.md](docs/CUBESAT_PILOT.md) | Piloto técnico: inspeção e testes do primeiro modelo |

---

## Convenções que causam erro se ignoradas

- **GeoJSON usa `[longitude, latitude]`**, nessa ordem. Inverter coloca os
  marcadores no oceano.
- **Slugs de URL são permanentes.** QR Codes impressos não se atualizam.
  Ver [ADR-002](DECISIONS.md#adr-002--urls-em-caminho-não-em-query-string).
- **glTF expressa distâncias em metros**, por especificação. Um modelo com
  escala errada abre em AR do tamanho errado.
