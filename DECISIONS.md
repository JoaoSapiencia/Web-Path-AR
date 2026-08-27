# Registro de Decisões — Web Path AR

> Cada entrada é um ADR (*Architecture Decision Record*): registra o contexto,
> a decisão, a razão e as consequências.
>
> O objetivo não é documentar o óbvio, é **preservar o raciocínio**. Daqui a um
> ano, o código mostra *o que* foi feito; só este arquivo mostra *por quê*.
>
> Decisões não são apagadas. Quando superadas, são marcadas como
> `Substituída por ADR-XXX`.

---

## ADR-001 — Sem framework na fase inicial

**Status:** Aceita

**Contexto**
Páginas simples, uma por objeto educacional, entrada principal por QR Code
(carregamento a frio, direto na página final). Não há estado compartilhado
entre telas. O `<model-viewer>` é um Web Component e gerencia o próprio
estado interno.

**Decisão**
HTML, CSS e módulos ES puros. Sem React, sem bundler, sem build step.

**Razão**
- Roteamento SPA não é exercido: ninguém navega entre satélites; cada aluno
  entra direto pelo seu QR Code.
- Um build step adiciona `node_modules`, configuração de bundler e
  configuração de build no Cloudflare — camadas entre o autor e o HTML,
  justamente na fase em que os fundamentos estão sendo aprendidos.
- Depuração: quando o AR falhar no iPhone, o problema deve ser investigável
  como problema de AR, não como possível problema de bundler.

**Argumentos considerados e descartados**
- *"React é pesado"* — **não se sustenta.** `react` + `react-dom` somam
  ~45 KB gzip, ruído num orçamento de megabytes (o `<model-viewer>` carrega
  three.js; os modelos têm ~3 MB).
- *"React não funciona com Web Components"* — **não se sustenta mais.**
  O React 19 tem suporte adequado a custom elements.

**Consequências**
- (+) Adicionar um objeto é operação previsível: 1 JSON + assets + 1 HTML curto.
- (+) Code splitting obtido de graça pela arquitetura multi-página.
- (−) Conteúdo chega via JavaScript: há um instante de página vazia e nada
  funciona sem JS. Aceitável para uso em sala; inadequado se SEO virar
  requisito.

**Reavaliar quando**
Surgir UI com estado real: listagem com filtros, busca, ou interações
complexas no globo (Fase 5+).

**Nota**
React permanece objetivo de aprendizado, em projeto futuro mais adequado.

---

## ADR-002 — URLs em caminho, não em query string

**Status:** Aceita

**Contexto**
QR Codes serão impressos em material didático. Papel impresso não se
atualiza: uma URL publicada é permanente na prática.

**Decisão**

```
/                      → globo (home)
/satelites/<slug>/     → objeto espacial
/locais/<slug>/        → base de lançamento ou local de atividade
```

**Razão**
Legível, curta, imprimível. Sem extensão e sem query string, permanece
estável mesmo se a tecnologia interna mudar.

**Consequências**
- (+) Estrutura de diretórios espelha a estrutura de URLs: fácil localizar
  qualquer arquivo a partir da URL.
- (−) O slug torna-se identidade permanente. Renomear quebra QR Codes já
  impressos.

**Regra derivada**
Slugs curtos e atemporais (`hubble`, não `telescopio-espacial-hubble-v2`).

---

## ADR-003 — O globo é a home

**Status:** Aceita

**Contexto**
Navegação livre pelas localidades, sem QR Code. O globo é, na prática, o
índice do acervo geográfico.

**Decisão**
`/` renderiza o globo interativo, com cabeçalho sobreposto discreto. Não há
página de capa intermediária.

**Razão**
O globo é o melhor argumento visual do projeto; colocá-lo atrás de uma capa
adiciona um clique sem entregar nada em troca.

**Consequências**
- (+) Uma página a menos para manter.
- (−) Quem abre `/` baixa MapLibre imediatamente. Não é desperdício: é
  exatamente o propósito da página.
- (=) As páginas de satélite não são afetadas — são páginas separadas e
  nunca carregam MapLibre.

---

## ADR-004 — Modelo de dados em dois níveis

**Status:** Aceita

**Contexto**
O globo precisa de 15 pontos de uma vez. Cada página de localidade precisa
do conteúdo completo de **um** ponto. Padrões de acesso diferentes.

**Decisão**
- `data/locais.geojson` — camada leve, só o que o mapa desenha (~4 KB).
- `data/locais/<slug>.json` — conteúdo completo, carregado sob demanda.

**Razão**
Colocar textos e galerias no GeoJSON faria o globo baixar o conteúdo de 15
localidades para exibir 15 marcadores.

**Consequências**
- (+) Globo leve independentemente do volume de conteúdo.
- (−) O nome da localidade existe em dois arquivos: risco de divergência.
  Mitigação futura: script de validação em `tools/`.

**Decisão associada**
`satelites_relacionados` fica **previsto e vazio** no schema de localidade.
Nenhum código o consome hoje. Reservar o campo é barato; migrar o schema
depois não é.

---

## ADR-005 — Originais fora do repositório

**Status:** Aceita

**Contexto**
Git armazena cada versão de arquivo binário **por inteiro** — não há diff
útil de GLB ou JPEG. Cinco tentativas de otimizar um modelo de 3 MB são
15 MB permanentes no histórico, que `git rm` não remove.

O acervo de fotos é o maior peso potencial: 15 localidades × ~5 fotos de
4 MB ≈ 300–400 MB de originais.

**Decisão**
- Modelos brutos da NASA e fotos originais **não** entram no repositório.
- Apenas o resultado final otimizado (GLB, WebP) é versionado.
- Tentativas intermediárias de otimização não são commitadas.
- A localização dos originais é documentada, não versionada.

**Consequências**
- (+) Repositório na casa de dezenas de MB, não centenas.
- (−) Os originais precisam de backup próprio, fora do Git.

---

## ADR-006 — Sem Git LFS

**Status:** Aceita

**Contexto**
Cloudflare Pages tem limite de ~25 MB por arquivo. Os GLBs do acervo estão
na faixa de 2–3 MB; as fotos otimizadas, abaixo de 150 KB.

**Decisão**
Não utilizar Git LFS.

**Razão**
Todos os assets estão uma ordem de grandeza abaixo do limite da plataforma.
LFS adicionaria uma dependência, configuração e uma classe inteira de
problemas de deploy sem resolver nenhum problema existente.

**Reavaliar quando**
Algum asset individual se aproximar de 20 MB.

---

## ADR-007 — USDZ gerado no dispositivo

**Status:** Aceita — **validada em iPhone real para o modelo CubeSat 1U (2026-08-27); pendente para os demais modelos do acervo**

**Contexto**
AR no iOS exige USDZ. Gerar USDZ previamente costuma exigir macOS e produz
um segundo arquivo por modelo. O `<model-viewer>` sabe gerar USDZ no próprio
dispositivo, a partir da cena carregada.

**Decisão**
Usar a auto-geração; não manter USDZ pré-gerados no repositório.

**Razão**
O acervo é majoritariamente estático (satélites sem animação), que é
exatamente o caso suportado. Elimina metade do pipeline de assets.

**Consequências e limites**
- Exige `quick-look` explícito em `ar-modes`.
- **Não suporta animação.** Qualquer modelo animado exige USDZ pré-gerado.
- Não funciona para todos os modelos.
- Custa tempo e memória no aparelho do aluno.

**Condição de aceitação**
Validar em iPhone real, **modelo a modelo**, na Fase 3. Se um modelo falhar,
ele recebe `ios-src` pré-gerado — a decisão é revertida por exceção, não no
todo.

**Validação registrada**
CubeSat 1U testado em iPhone real em 2026-08-27: AR Quick Look abriu, USDZ
gerado on-device com sucesso, escala fisicamente plausível. Detalhes completos
em [docs/CUBESAT_PILOT.md](docs/CUBESAT_PILOT.md#7-resultado-do-teste-em-iphone-real--2026-08-27).
Continua pendente: os demais modelos do acervo, e o comportamento equivalente
no Android (Scene Viewer) para este mesmo modelo.

---

## ADR-008 — Globo de marcadores, não de órbitas

**Status:** Aceita

**Contexto**
"Globo" pode significar um mapa projetado sobre esfera (MapLibre) ou um
ambiente 3D com espaço acima da superfície, onde órbitas podem existir
(Cesium, three.js).

O MapLibre é um renderizador de **superfície**: não representa altitude
orbital. Pode desenhar o trajeto no solo de um satélite, mas não um arco
orbital no espaço.

**Decisão**
Globo de marcadores geográficos estáticos, com MapLibre GL JS (projeção de
globo, disponível a partir da v5).

**Razão**
O requisito real é marcar bases de lançamento e locais de cursos com links
para páginas de conteúdo. Órbitas não estão no escopo.

**Consequências**
- (+) A stack já escolhida resolve; nenhuma tecnologia nova.
- (−) Órbitas ficam impossíveis nesta página. Se um dia forem desejadas,
  a saída é uma página separada com outra ferramenta — não substituir o
  MapLibre.

**Nota técnica**
As versões recentes do MapLibre GL JS distribuem **apenas ESM** (bundles UMD
foram descontinuados). Sem bundler, o carregamento é via
`<script type="module">` com import de CDN. Exemplos antigos com
`<script src>` não funcionarão.
