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

- Conteúdo textual + galeria de fotos otimizadas.
- Consome `data/locais/<slug>.json`.
- **Não carrega MapLibre nem `<model-viewer>`.**

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
  "coordenadas": [-44.40, -2.37],
  "descricao": "...",
  "secoes": [{ "titulo": "...", "texto": "..." }],
  "fotos": [{ "arquivo": "01.webp", "legenda": "...", "largura": 1200, "altura": 800 }],
  "data_atividade": null,
  "satelites_relacionados": []
}
```

`satelites_relacionados` está **previsto e vazio**. Nenhum código o consome
hoje. Reservar o campo é barato; migrar o schema depois não é.

### 4.3 Satélites — `data/satelites/<slug>.json`

Mesma forma simétrica: adicionar um satélite e adicionar uma localidade são
a mesma operação previsível.

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
│   ├── globo.js
│   ├── local-page.js
│   ├── satelite-page.js
│   └── styles.css
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

**Consequência para o orçamento:** numa página de satélite, a biblioteca
pesa **1,7× o modelo 3D**. O orçamento de ≤3 MB por GLB está folgadíssimo
para este modelo; o custo dominante é o runtime 3D, que é fixo e igual para
todas as páginas de satélite. Otimizar mais o GLB deste satélite não moveria
número nenhum.

**Ainda não medido:** o decodificador Draco (WASM), buscado à parte de um CDN
do Google. O modelo exige `KHR_draco_mesh_compression`, então esse download
está no caminho crítico e não aparece nos números acima.

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
| WebGL indisponível em celular antigo | Globo e 3D falham | Estado de erro claro, nunca tela branca |
| OpenFreeMap sem SLA | Globo indisponível | Fallback visual; documentar risco |
| Estilo de mapa de ruas em tema espacial | Estética conflitante | Estilo escuro/minimalista, trabalho de estilo previsto |
| Rede escolar saturada | Assets não carregam | Orçamento de performance + cache HTTP |
| QR Code impresso é imutável | Material inutilizado | URLs decididas antes da impressão (ADR-002) |
| Binários inflando o histórico Git | Repositório pesado | ADR-005 |
