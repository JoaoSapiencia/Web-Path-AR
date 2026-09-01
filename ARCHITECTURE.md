# Arquitetura — Web Path AR

> Documento vivo. Descreve **como** a aplicação é construída e **por quê**.
> As decisões individuais e suas justificativas estão em `DECISIONS.md`.

---

## 1. Visão geral

Aplicação web **estática**, sem framework e sem build step, destinada ao apoio
de aulas sobre satélites, missões e exploração espacial.

Dois modos de acesso, com propósitos pedagógicos distintos:

| Modo | Entrada | Uso |
|---|---|---|
| Dirigido | QR Code impresso → página de satélite | Aula: professor aponta um conteúdo |
| Exploratório | Globo interativo na home | Aluno navega e descobre |

Alvo principal: **dispositivos móveis**.

---

## 2. Tipos de página

A aplicação tem três tipos de página, e cada tipo carrega **apenas** o que precisa.

### 2.1 Globo (`/`)

- Renderiza MapLibre GL JS em projeção de globo.
- Consome `data/locais.geojson` (camada leve de marcadores).
- Marcadores abrem popup com resumo e link para a página da localidade.
- **Não carrega `<model-viewer>`.**

### 2.2 Página de satélite (`/satelites/<slug>/`)

- HTML mínimo (shell) + `<model-viewer>`.
- Consome `data/satelites/<slug>.json`.
- Oferece visualização 3D e, quando suportado, Realidade Aumentada.
- **Não carrega MapLibre.**

### 2.3 Página de localidade (`/locais/<slug>/`)

- Conteúdo textual + ficha + galeria de fotos otimizadas.
- Consome `data/locais/<slug>.json`.
- **Não carrega MapLibre nem `<model-viewer>`.**

Implementada na Fase 6 para as 5 bases de lançamento. A galeria de fotos é a
Fase 6b e depende de fotos que ainda não existem; o campo `fotos` já está no
schema, vazio.

É a página mais leve do projeto — **19,8 KB somando HTML, CSS, JS e JSON, sem
nenhuma biblioteca externa**. Essa leveza não é otimização: é consequência
direta da regra acima. `tools/validar.py` falha se uma página de localidade
passar a carregar qualquer uma das duas bibliotecas.

### Consequência

A separação em páginas estáticas produz **code splitting sem bundler**.
Nenhuma página baixa código de outra. Isso é obtido pela arquitetura, não
por configuração.

---

## 3. Fluxo de Realidade Aumentada

```
<model-viewer ar ar-modes="webxr scene-viewer quick-look">
```

O atributo `ar-modes` é uma **cascata**: o componente tenta os motores na
ordem declarada e usa o primeiro disponível.

| Plataforma | Motor efetivo |
|---|---|
| Android (Chrome) | Scene Viewer |
| iOS (Safari) | AR Quick Look |
| Desktop / sem suporte | Apenas visualização 3D |

### USDZ no iOS

O `<model-viewer>` gera o USDZ **no dispositivo**, a partir da cena já
carregada, quando `ios-src` não é fornecido.

Restrições conhecidas:

- exige `quick-look` explícito em `ar-modes`;
- **não suporta animação** — modelos animados exigem USDZ pré-gerado;
- não funciona para todos os modelos;
- consome tempo e memória no aparelho do aluno.

Como o acervo é majoritariamente estático, a auto-geração é a abordagem
inicial. **Validação obrigatória em iPhone real (Fase 3), modelo a modelo.**

Compressão do GLB (Draco / meshopt / KTX2) **não** impede a auto-geração,
pois a conversão parte da cena já decodificada em memória.

---

## 4. Modelo de dados

Princípio: **a forma dos dados segue o padrão de acesso.**

O globo carrega 15 pontos de uma vez; a página de localidade carrega um
conteúdo sob demanda. Misturar os dois faria o globo baixar conteúdo que
não exibe.

### 4.1 Camada leve — `data/locais.geojson`

Consumida pelo globo. Apenas o necessário para desenhar e rotular.

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [-44.40, -2.37] },
      "properties": {
        "slug": "alcantara",
        "nome": "Centro de Lançamento de Alcântara",
        "tipo": "base-lancamento",
        "resumo": "Base de lançamento brasileira no Maranhão."
      }
    }
  ]
}
```

> **Atenção:** GeoJSON usa `[longitude, latitude]`, nessa ordem.
> A inversão é a causa mais comum de marcadores caindo no oceano.

Valores controlados de `tipo`:

- `base-lancamento`
- `curso` — local onde foi ministrado curso pedagógico

### 4.2 Camada completa — `data/locais/<slug>.json`

Consumida apenas pela página da localidade.

```json
{
  "slug": "alcantara",
  "nome": "Centro de Lançamento de Alcântara",
  "tipo": "base-lancamento",
  "coordenadas": [-44.396, -2.317],
  "resumo": "Base de lançamento brasileira no Maranhão. ...",
  "ficha": [{ "rotulo": "Latitude", "valor": "2,3° Sul" }],
  "secoes": [{ "titulo": "...", "texto": "..." }],
  "fotos": [],
  "data_atividade": null,
  "satelites_relacionados": []
}
```

`satelites_relacionados` está **previsto e vazio**. Nenhum código o consome
hoje. Reservar o campo é barato; migrar o schema depois não é.

`fotos` está **previsto e vazio** pela mesma razão. A galeria é a Fase 6b e
depende de fotos que ainda não existem; `src/local-page.js` não lê o campo.

**`resumo`, e não `descricao`** (mudança da Fase 6). O schema planejado
usava `descricao`, que divergia do `resumo` do lado do satélite. Era o
débito D-03, e foi pago no momento certo: antes de existir a primeira
localidade, renomear é editar um documento; depois de quinze, é migração.
O `locais.geojson` já usava `resumo` desde a Fase 5, então nenhum dado
precisou mudar.

**`ficha` acrescentada na Fase 6.** Não estava no schema planejado. Uma base
de lançamento sem latitude, operador e ano de operação é pedagogicamente
pobre, e a `ficha` é justamente o campo que faltava para os dois schemas
serem simétricos (§4.4). É acréscimo, não quebra.

`nome`, `tipo` e `resumo` existem **também** no `locais.geojson`. É a
duplicação que o ADR-004 aceitou conscientemente, e a mitigação que ele
prometeu existe desde a Fase 6: `tools/validar.py` compara os dois arquivos
campo a campo e falha se divergirem.

### 4.3 Satélites — `data/satelites/<slug>.json`

Consumido apenas pela página do satélite.

```json
{
  "slug": "cubesat",
  "nome": "CubeSat 1U",
  "resumo": "Um satélite do tamanho de um cubo de 10 centímetros.",
  "modelo": {
    "arquivo": "modelo.glb",
    "poster": null,
    "escala": "0.048 0.048 0.048",
    "alt": "Descrição textual do modelo, para leitores de tela.",
    "credito": "NASA 3D Resources"
  },
  "ficha": [{ "rotulo": "Dimensões", "valor": "10 × 10 × 10 cm" }],
  "secoes": [{ "titulo": "...", "texto": "..." }],
  "locais_relacionados": []
}
```

`modelo.poster` é `null` enquanto a imagem não existir — o código omite o
atributo nesse caso, em vez de apontar para um arquivo ausente.

`modelo.escala` existe porque o GLB não declara unidade confiável. Ver
`docs/CUBESAT_PILOT.md` §6.

`locais_relacionados` está **previsto e vazio**, espelhando
`satelites_relacionados` do lado da localidade (ADR-004).

### 4.4 Simetria entre os dois schemas

A intenção é que adicionar um satélite e adicionar uma localidade sejam a
mesma operação previsível. Os campos comuns são:

| Campo | Localidade | Satélite |
|---|---|---|
| `slug` | sim | sim |
| `nome` | sim | sim |
| Texto curto | `resumo` | `resumo` |
| `ficha` | sim | sim |
| `secoes` | sim | sim |
| Relação recíproca | `satelites_relacionados` | `locais_relacionados` |
| Específico do tipo | `tipo`, `coordenadas`, `fotos`, `data_atividade` | `modelo` |

**A simetria está completa desde a Fase 6.** Os cinco campos comuns têm o
mesmo nome e o mesmo formato dos dois lados, e o que diverge diverge porque
os objetos são de fato diferentes: uma localidade tem coordenadas e fotos,
um satélite tem um modelo 3D.

A consequência prática é a que se queria: **adicionar uma localidade e
adicionar um satélite são a mesma operação** — um JSON, um HTML curto, e o
`tools/validar.py` confere o resto. A Fase 7 testa essa promessa do lado do
satélite.

---

## 5. Estrutura de diretórios

```
/
├── index.html                    → globo (home)
├── satelites/
│   └── <slug>/index.html
├── locais/
│   └── <slug>/index.html
├── data/
│   ├── locais.geojson
│   ├── locais/<slug>.json
│   └── satelites/<slug>.json
├── assets/
│   ├── models/<slug>/modelo.glb
│   │                 poster.webp
│   └── fotos/<slug>/01.webp
├── src/
│   ├── globo.js                  → só a home
│   ├── local-page.js             → só as páginas de localidade
│   ├── satelite-page.js          → só as páginas de satélite
│   └── styles.css                → todas as páginas
├── tools/                        → scripts de otimização (modelos e imagens)
└── docs/
```

---

## 6. Pipelines de assets

Nenhum asset entra no repositório em estado bruto.

### 6.1 Modelos 3D

```
NASA 3D Resources → inspeção → Blender (se necessário)
  → glTF Transform (otimização) → GLB → repositório
```

### 6.2 Imagens

```
Foto original → redimensionar → WebP → 2–3 tamanhos → repositório
```

Uma foto de 4 MB tipicamente resulta em 80–150 KB sem perda perceptível em
tela de celular. É a otimização de maior retorno do projeto.

**Regra:** originais (fotos e modelos brutos) ficam **fora** do repositório.
Apenas o resultado final otimizado é versionado. Ver ADR-005.

---

## 7. Orçamento de performance

Valores iniciais, a calibrar com medição real na fase de otimização.

| Métrica | Limite |
|---|---|
| GLB final | ≤ 3 MB |
| Poster (WebP) | ≤ 50 KB |
| Foto de galeria (WebP) | ≤ 150 KB |
| Primeiro conteúdo visível | < 1,5 s em 4G |
| Modelo utilizável | < 5 s em 4G |

**Método:** medir → otimizar → medir de novo.
Otimização que não move um número do orçamento não entra.

### Medições reais

| O que | Valor | Quando |
|---|---|---|
| GLB do CubeSat 1U | 149.424 bytes (~146 KB) | 2026-08-27 |
| `model-viewer@3.5.0`, transferido | 252.390 bytes (~246 KB) | 2026-08-31 |
| `model-viewer@3.5.0`, descomprimido | 935.194 bytes (~913 KB) | 2026-08-31 |
| GLB do ACRIMSAT | 2.115.124 bytes (~2.065 KB) | 2026-09-01 |
| `maplibre-gl@6.6.0`, transferido | 294.520 bytes (~287 KB) | 2026-09-01 |
| Estilo `dark` do OpenFreeMap | 20.959 bytes (~20 KB) | 2026-09-01 |
| Página de localidade completa | 20.286 bytes (~19,8 KB) | 2026-09-01 |

A página de localidade é medida **inteira** — HTML + CSS + JS + JSON, sem
comprimir — porque ela não tem biblioteca externa nenhuma para separar. Esse
é o número que mostra o que a separação por página compra: **a página de
localidade completa cabe 12 vezes dentro do `model-viewer` sozinho.**

Numa aplicação de página única, ler sobre Alcântara custaria os 533 KB das
duas bibliotecas somadas. Aqui custa 19,8 KB.

**Consequência para o orçamento:** numa página de satélite, a biblioteca
pesa **1,7× o modelo 3D**. O orçamento de ≤3 MB por GLB está folgadíssimo
para este modelo; o custo dominante é o runtime 3D, que é fixo e igual para
todas as páginas de satélite. Otimizar mais o GLB deste satélite não moveria
número nenhum.

**O peso do MapLibre (287 KB) é comparável ao do `model-viewer` (246 KB).**
As duas páginas mais importantes do projeto custam praticamente o mesmo em
biblioteca, e em ambas o runtime domina o orçamento — não os dados.

A separação por página do ADR-001 é o que impede que se somem: quem abre um
satélite não baixa MapLibre, e quem abre o globo não baixa `model-viewer`.
Numa aplicação de página única, seriam 533 KB para qualquer visitante.

**Ainda não medido:** o decodificador Draco (WASM), buscado à parte de um CDN
do Google; e os tiles vetoriais do globo, cujo volume depende de quanto o
usuário navega.

---

## 8. Hospedagem e deploy

- **Cloudflare Pages**, deploy a partir do repositório GitHub.
- Sem build command; output directory na raiz.
- **Preview deployments por branch/PR** são parte do fluxo de trabalho:
  são o único meio prático de testar AR em iPhone real sem publicar em produção.

Limites relevantes da plataforma:

| Limite | Valor | Situação do projeto |
|---|---|---|
| Tamanho por arquivo | ~25 MB | Folgado (GLBs ~3 MB) |
| Arquivos por deploy | 20.000 | Irrelevante |

Domínio próprio a ser registrado **antes da Fase 9** (material impresso).
Nada é impresso apontando para `*.pages.dev`.

---

## 9. Riscos técnicos conhecidos

| Risco | Impacto | Mitigação |
|---|---|---|
| Auto-geração de USDZ falhar em algum modelo | Sem AR no iOS | Testar modelo a modelo na Fase 3; USDZ pré-gerado como plano B |
| Escala real em AR (satélites de 10 m+) | Modelo não cabe na sala | Definir escala pedagógica explícita |
| WebGL indisponível em celular antigo | Globo e 3D falham | Estado de erro claro, nunca tela branca; ver `docs/DIAGNOSTICO_MODELO.md` |
| OpenFreeMap sem SLA | Globo indisponível | Fallback visual; documentar risco |
| Estilo de mapa de ruas em tema espacial | Estética conflitante | Estilo escuro/minimalista, trabalho de estilo previsto |
| Rede escolar saturada | Assets não carregam | Orçamento de performance + cache HTTP |
| QR Code impresso é imutável | Material inutilizado | URLs decididas antes da impressão (ADR-002) |
| Binários inflando o histórico Git | Repositório pesado | ADR-005 |
