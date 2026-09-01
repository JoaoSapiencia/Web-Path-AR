# Roteiro de Desenvolvimento — Web Path AR

> Documento de **planejamento**. Muda com frequência.
>
> - `ARCHITECTURE.md` → como o sistema é construído
> - `DECISIONS.md` → por que cada escolha foi feita (acumulativo, não se apaga)
> - `ROADMAP.md` → em que ordem construir e o que aprender em cada etapa
>
> Cada fase tem um **critério de pronto** objetivo. Fase sem critério de pronto
> vira fase infinita.

---

## Estado atual

| | |
|---|---|
| **Fase corrente** | 2 — AR no Android |
| **Concluído** | **Fase 0** — cadeia de publicação validada em produção (`web-path-ar.pages.dev`), quatro rotas conferidas por `curl`. **Fase 1** — página de satélite completa, conteúdo vindo de JSON, validada em iPhone real (Safari) em 2026-08-31: modelo carrega, gira ao toque, página rola com gesto vertical, ficha e seções renderizadas |
| **Adiantado de propósito** | Parte da Fase 3 (AR no iOS) já foi testada em iPhone real com o CubeSat, antes da ordem do roteiro — decisão deliberada para validar primeiro o risco técnico mais alto (ver [ADR-007](DECISIONS.md#adr-007--usdz-gerado-no-dispositivo) e [docs/CUBESAT_PILOT.md](docs/CUBESAT_PILOT.md)). Resultado: AR Quick Look, USDZ on-device e escala confirmados para este modelo. Isso não substitui a Fase 3 completa (falta o resto do acervo) nem a Fase 2 (AR no Android, ainda não testada) |
| **Bloqueios** | Nenhum |
| **Pendências** | `poster.webp` do CubeSat (passo manual); **nenhum teste em Android até hoje**; ADR de PWA, se a Fase 8 justificar; domínio próprio (bloqueante só na Fase 9) |

---

## Princípios do roteiro

1. **Cada fase termina com teste em dispositivo físico.** AR não é validável em emulador.
2. **Preview deployments são o mecanismo de teste.** Branch → push → URL de preview → iPhone/Android real → só então PR para `main`.
3. **Medir antes de otimizar.** Nenhuma otimização entra sem número que a justifique.
4. **Uma fase não começa antes de a anterior atender seu critério de pronto.**

---

## Teste 0 — Linha de base do iOS

**Pode ser feito imediatamente. Não depende de nenhuma fase.**

Abrir o exemplo oficial de AR do `<model-viewer>` (`modelviewer.dev`) no **Safari do iPhone** e acionar o botão de AR.

Repetir o mesmo link por caminhos diferentes de abertura:

- [ ] Safari, digitando a URL
- [ ] QR Code lido pelo app de Câmera do iPhone
- [ ] Link aberto dentro do WhatsApp (navegador embutido)
- [ ] Link aberto no Chrome para iOS

**Por que importa:** estabelece a linha de base antes de introduzir os modelos
próprios. Se o modelo de referência do Google falhar, nenhum teste posterior
tem interpretação confiável.

**Risco que este teste mapeia:** o AR Quick Look funciona apenas no Safari.
Em Chrome/Firefox/Edge no iOS e em navegadores embutidos de aplicativos, o
USDZ pode ser exibido como texto em vez de abrir em AR. Como a entrada
principal do projeto é QR Code, e muitos apps abrem links em navegador
embutido, este é um risco de fluxo principal.

---

## Fase 0 — Esqueleto ambulante

**Objetivo:** validar a cadeia Git → GitHub → Cloudflare Pages → URL pública
enquanto ainda não há nada para culpar por uma falha.

**Entrega:** `index.html` mínimo, `.gitignore`, `README.md`, documentação em
`docs/`, deploy configurado.

**Critério de pronto:** a página abre numa URL pública, no celular.

**Verificação em deploy real** (localhost não reproduz o roteamento do
Cloudflare Pages — só o deploy é conclusivo):

- [x] `/` abre e mostra a página inicial — 200, 2.108 bytes
- [x] `/satelites/cubesat/` abre a página de satélite, **não** a página
      inicial — 200, tamanho distinto
- [x] `/assets/models/cubesat/modelo.glb` devolve o binário
      (`model/gltf-binary`, 149.424 bytes), não HTML
- [x] rota inexistente devolve status **404**, não 200
- [X] conferido também num celular real

**Verificado em 2026-08-31** em `web-path-ar.pages.dev`. O comportamento de
"200 para tudo" de 2026-08-27 (CUBESAT_PILOT.md §7) não se reproduz mais, e
o contrato de URL do [ADR-002](DECISIONS.md#adr-002--urls-em-caminho-não-em-query-string)
está validado em produção. Duas mudanças entraram juntas (`404.html` e a
remoção dos espaços do nome do GLB), então a causa não foi atribuída.

**Não fazer:** dependências, diretórios de fases futuras, qualquer código de
mapa ou 3D.

> **Exceção consciente:** `satelites/cubesat/index.html` está no `main` e
> carrega `<model-viewer>`. Ele é o artefato do teste de AR já realizado, e
> serve de sonda para verificar o roteamento acima. Não é a entrega da
> Fase 1 — aquela vem de JSON, com poster e CSS próprio.

**Aprendizado:** o que é um site estático; Git e GitHub aplicados a deploy;
Cloudflare Pages; preview deployments por branch.

---

## Fase 1 — Primeiro satélite

**Objetivo:** um objeto educacional completo, sem AR.

**Entrega:** `/satelites/<slug>/` com `<model-viewer>`, GLB otimizado, poster,
JSON de conteúdo, CSS mobile-first.

**Critério de pronto:** modelo carrega, gira e responde ao toque num celular
real; o conteúdo longo vem do JSON, não do HTML.

- [x] conteúdo em `data/satelites/cubesat.json`
- [x] `src/satelite-page.js` monta ficha e seções a partir do JSON
- [x] `src/styles.css` mobile-first
- [x] rotas e tipos MIME conferidos em servidor local e em produção
- [x] **modelo carrega, gira e responde ao toque em iPhone real** (Safari,
      2026-08-31) — inclui a rolagem vertical sobre o visor, que valida o
      `touch-action="pan-y"`
- [ ] `poster.webp` gerado (passo manual — ver abaixo)

**Fase concluída em 2026-08-31.** O `poster.webp` fica como débito: é
melhoria de carregamento percebido, não parte do critério de pronto.

**Não testado em Android.** O projeto não tem nenhum dado de Android até
aqui — nem de visualização 3D, nem de AR.

**Decisão tomada nesta fase:** conteúdo híbrido — título e resumo no HTML
estático, corpo em JSON. Registrada em
[ADR-009](DECISIONS.md#adr-009--conteúdo-híbrido-casca-estática-corpo-em-json).
Isso relaxa o critério original, que pedia *todo* o texto vindo do JSON; a
razão está no ADR.

**Medição obrigatória — feita em 2026-08-31:**

| `@google/model-viewer@3.5.0` | |
|---|---|
| Transferido (comprimido) | 252.390 bytes (~246 KB) |
| Descomprimido | 935.194 bytes (~913 KB) |

A biblioteca pesa **1,7× o GLB** (146 KB). O gargalo desta página não é o
modelo 3D. Versão fixada em exata por causa disso —
[ADR-010](DECISIONS.md#adr-010--versão-exata-do-model-viewer-servido-por-cdn).

**Ainda não medido:** o decodificador Draco (WASM), buscado à parte de um CDN
do Google. O modelo exige Draco, então esse download está no caminho crítico.

**Passo manual pendente — `poster.webp`:** a imagem que aparece enquanto o
modelo carrega. Não foi gerada porque exige renderizar a cena. Receita:
abrir a página, enquadrar o modelo, usar `model-viewer.toBlob()` pelo
console ou uma captura de tela, recortar, converter para WebP em ≤50 KB e
salvar em `assets/models/cubesat/poster.webp`. Depois preencher
`modelo.poster` no JSON — o código já usa o campo se ele existir.

**Aprendizado:** HTML semântico; CSS mobile-first; módulos ES; Web Components;
`fetch` e JSON; glTF vs GLB; pipeline de modelos (Blender, glTF Transform);
poster e carregamento progressivo.

---

## Fase 2 — AR (implementação única, validação por plataforma)

> **Reorganizada em 2026-09-01.** O roteiro original separava "Fase 2 — AR no
> Android" e "Fase 3 — AR no iOS", como se fossem duas implementações. Não
> são: `ar-modes` é uma cascata, e o mesmo código serve as duas plataformas.
> O que difere é a **validação**, que depende de hardware.
>
> Como não há Android disponível no momento, separar a fase por plataforma
> travaria a implementação atrás de um aparelho que não existe. A fase passa
> a ser: implementar uma vez, validar por plataforma, e fechar
> **parcialmente** enquanto uma plataforma seguir sem teste.

**Objetivo:** AR funcional a partir da página de satélite.

**Entrega:** `ar` e `ar-modes="webxr scene-viewer quick-look"` configurados,
com botão de AR em português.

**Critério de pronto (parcial, por plataforma):**

- [ ] **iOS** — AR abre em iPhone real e ancora em superfície
- [ ] **Android** — AR abre em Android real e ancora em superfície
      — **bloqueado: sem aparelho disponível**

**Consequência de fechar parcialmente:** a decisão de escala
(`docs/CUBESAT_PILOT.md` §6.5) permanece em aberto. O teste que a resolve é
justamente o do Android: saber se o Scene Viewer respeita o atributo `scale`
da página ou lê apenas o GLB bruto. Até lá, a Opção B vale **só para iOS**,
e nenhum ADR novo é registrado sobre isso.

**Aprendizado:** a cascata de `ar-modes`; WebXR vs Scene Viewer vs Quick Look;
por que o Android recebe um link para o arquivo e o iOS recebe uma cena;
escala em AR.

---

## Fase 3 — Cobertura de AR do acervo

**Objetivo:** validar o ADR-007 (USDZ gerado no dispositivo) para **cada
modelo**, não só para o piloto.

**Critério de pronto:** AR abre no iPhone real, **para cada modelo do acervo**.

**Verificar, modelo a modelo:**

- [ ] O botão de AR aparece
- [ ] A cena abre (não trava em carregamento infinito)
- [ ] A escala é pedagogicamente utilizável dentro de uma sala
- [ ] Materiais e cores correspondem à visualização no navegador
- [ ] Tempo entre toque e abertura é aceitável

**Se um modelo falhar:** ele recebe `ios-src` pré-gerado. A decisão é revertida
por exceção, não no todo.

**Depuração conhecida:** já houve conflito entre auto-geração de USDZ e escala
fixa (`ar-scale="fixed"`). Isolar essa variável antes de concluir que o
problema é do modelo.

**Aprendizado:** ecossistema USD/USDZ; por que o iOS difere; limites do
exportador; restrição de animação.

---

## Fase 4 — Fallback e estados de erro

**Objetivo:** falhar de forma compreensível.

**Cobrir:**

- [ ] Dispositivo sem suporte a AR → visualização 3D sem botão quebrado
- [ ] Sem WebGL → mensagem clara, nunca tela branca
- [ ] Modelo não carrega → estado de erro visível
- [ ] Rede lenta → poster e indicação de progresso
- [ ] **Navegador embutido no iOS → instrução para abrir no Safari**

**Critério de pronto:** nenhum cenário acima resulta em tela branca ou botão
que não faz nada.

**Aprendizado:** detecção de capacidade (não de navegador); degradação
graciosa; design de estados de erro.

---

## Fase 5 — Globo

**Objetivo:** globo interativo com os marcadores, sem páginas de destino ainda.

**Entrega:** `index.html` com MapLibre GL JS em projeção de globo, consumindo
`data/locais.geojson`; popups com resumo.

**Critério de pronto:** os pontos aparecem nas coordenadas corretas e o globo
é utilizável num celular.

**Antecipado de propósito:** um globo com marcadores que ainda não levam a
lugar nenhum já revela problemas de coordenadas, estilo e desempenho, sem
depender do acervo de fotos estar pronto.

**Armadilha:** GeoJSON usa `[longitude, latitude]`. A inversão é a causa mais
comum de marcadores no oceano.

**Aprendizado:** tiles vetoriais; projeções; GeoJSON; MapLibre GL JS;
distribuição ESM sem bundler.

---

## Fase 6 — Páginas de localidade e pipeline de imagens

**Objetivo:** conectar o globo ao conteúdo e resolver o maior peso do projeto.

**Entrega:** `/locais/<slug>/`, pipeline de otimização de imagens em `tools/`,
lazy loading da galeria.

**Critério de pronto:** as 15 localidades acessíveis pelo globo, com fotos
abaixo de 150 KB cada.

**Atenção:** as fotos, não os modelos 3D, são o maior peso potencial do acervo.

**Aprendizado:** WebP; imagens responsivas; lazy loading; `width`/`height` para
evitar deslocamento de layout; pipeline de assets.

---

## Fase 7 — Segundo e terceiro satélites

**Objetivo:** testar a extensibilidade prometida no ADR-004.

**Critério de pronto:** adicionar um satélite exigiu apenas 1 JSON + assets +
1 HTML curto, sem alterar código compartilhado.

**Se exigiu mais que isso, a arquitetura falhou** — e é melhor descobrir com
três satélites do que com quinze.

**Aprendizado:** separação dados/apresentação; o que torna uma arquitetura
extensível na prática.

---

## Fase 8 — Medição e otimização

**Objetivo:** transformar o orçamento de performance em números reais.

**Medir:** Lighthouse; tempo real em 4G; peso por tipo de página; comportamento
com rede saturada.

**Só então decidir sobre:** Draco/meshopt/KTX2; cache HTTP; e **PWA/Service
Worker** — ver ADR-009. Se a medição não mostrar um problema, a otimização não
entra.

**Critério de pronto:** todos os limites do orçamento atendidos ou revisados
com justificativa escrita.

**Aprendizado:** Lighthouse; Core Web Vitals; compressão de malha e textura;
cache HTTP; quando uma otimização não vale a pena.

---

## Fase 9 — QR Codes e material didático

**Objetivo:** fechar o fluxo de entrada em sala de aula.

**Pré-requisito bloqueante:** domínio próprio registrado e ativo. **Nada é
impresso apontando para `*.pages.dev`** — trocar de hospedagem depois
inutilizaria todo o material.

**Entrega:** QR Codes gerados, testados impressos, em tamanho e contraste
adequados.

**Testar impresso, não só na tela:** leitura a distância de carteira escolar,
sob luz de sala de aula, em papel fosco.

**Instrução no material:** orientar leitura pela câmera do celular — no iPhone
isso abre o Safari, onde o AR funciona.

**Aprendizado:** níveis de correção de erro em QR Code; densidade e tamanho
mínimo; ergonomia de impressão.

---

## Débitos técnicos

Encontrados no checkpoint da Fase 1 (2026-08-31). Nenhum bloqueia a Fase 2.
Registrados para não virarem descoberta cara depois.

### D-01 — Tokens de cor duplicados em três arquivos

`index.html`, `404.html` e `src/styles.css` cada um declara suas próprias
cores em hexadecimal. Os mesmos cinco valores, três vezes.

`index.html` e `404.html` não carregam `src/styles.css` — o CSS delas é
inline, herdado da Fase 0, quando `src/` ainda não existia.

**Risco:** mudar o tema exige editar três arquivos, e esquecer um produz uma
página fora do padrão.

**Quando corrigir:** Fase 5, quando o `index.html` virar o globo e for
reescrito de qualquer forma. Corrigir antes seria mexer num arquivo que já
está marcado para substituição.

### D-02 — `modelo.credito` existe no JSON e não é usado

A legenda "Modelo: NASA 3D Resources" está escrita à mão em
`satelites/cubesat/index.html`, enquanto `data/satelites/cubesat.json` traz
o mesmo dado em `modelo.credito`.

**Diferença importante em relação ao ADR-009:** a duplicação de `nome` e
`resumo` é decisão registrada, com razão de desempenho. Esta aqui é
descuido — não há ganho nenhum, e o crédito de autoria é justamente o tipo
de campo que muda por satélite.

**Risco:** o segundo satélite terá crédito diferente, e quem copiar a página
vai esquecer de trocar — atribuindo à NASA um modelo que não é dela.

**Quando corrigir:** Fase 7, ao adicionar o segundo satélite, que é
exatamente quando o problema aparece. Ou antes, é uma linha.

### D-03 — Texto curto tem nome diferente nos dois schemas

Localidade usa `descricao`; satélite usa `resumo`. O `ARCHITECTURE.md` §4.3
promete "mesma forma simétrica".

**Quando corrigir:** Fase 6, antes de a primeira localidade existir. Enquanto
só um lado está implementado, renomear é editar um arquivo. Depois de 15
localidades, é migração de schema.

### D-04 — Nenhum satélite é alcançável por navegação

`index.html` não tem link nenhum. `/satelites/cubesat/` só é acessível
digitando a URL ou por QR Code.

**Não é bug:** a arquitetura prevê entrada por QR Code, e o globo (Fase 5)
indexa localidades, não satélites.

**É uma pergunta em aberto:** como alguém descobre um satélite sem ter o
papel impresso na mão? O `ROADMAP.md` não responde isso em nenhuma fase.

### D-05 — Decodificador Draco nunca medido

O GLB exige `KHR_draco_mesh_compression`. O `<model-viewer>` busca o
decodificador WASM de um CDN do Google, à parte da biblioteca. Está no
caminho crítico e não entrou em nenhuma medição.

**Sabemos que funciona** (o modelo renderizou em iPhone real, em rede real).
**Não sabemos quanto custa.**

**Quando corrigir:** Fase 8, junto com a medição de rede móvel.

### D-06 — `poster.webp` ausente

Sem poster, a área do visor fica vazia até o modelo carregar. O código já
consome `modelo.poster` quando o campo não é `null`.

**Quando corrigir:** oportunisticamente. Exige renderizar a cena — passo
manual.

---

## Fases futuras (não planejadas)

Registradas apenas para não serem esquecidas. Nenhuma tem escopo definido.

- Ligação entre localidades e satélites (`satelites_relacionados`, ADR-004)
- Filtro por tipo de ponto no globo
- Órbitas — exigiria página separada e outra ferramenta (ADR-008)
- Service Worker, se a Fase 8 justificar (ADR-009)