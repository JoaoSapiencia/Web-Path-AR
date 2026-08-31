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
| **Fase corrente** | 0 — Esqueleto ambulante |
| **Concluído** | `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, `README.md`, `.gitignore`, `index.html` e `404.html` no `main`; inspeção técnica completa do GLB do CubeSat (`docs/CUBESAT_PILOT.md`); cadeia Git → GitHub → Cloudflare Pages → URL pública exercitada via preview deployment na branch de teste |
| **Adiantado de propósito** | Parte da Fase 3 (AR no iOS) já foi testada em iPhone real com o CubeSat, antes da ordem do roteiro — decisão deliberada para validar primeiro o risco técnico mais alto (ver [ADR-007](DECISIONS.md#adr-007--usdz-gerado-no-dispositivo) e [docs/CUBESAT_PILOT.md](docs/CUBESAT_PILOT.md)). Resultado: AR Quick Look, USDZ on-device e escala confirmados para este modelo. Isso não substitui a Fase 3 completa (falta o resto do acervo) nem a Fase 2 (AR no Android, ainda não testada) |
| **Bloqueios** | Nenhum. **Em aberto (não bloqueante):** confirmar em deploy real que `/satelites/<slug>/` e o `.glb` são servidos corretamente — no teste de 2026-08-27 o Cloudflare Pages devolvia o mesmo HTML com status 200 para qualquer rota (CUBESAT_PILOT.md §7). O `404.html` recém-adicionado é a hipótese de correção, ainda não verificada. |
| **Pendências** | Registro de ADR-009 (PWA); teste equivalente em Android real (Scene Viewer); domínio próprio (bloqueante só na Fase 9) |

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

- [ ] `/` abre e mostra a página inicial
- [ ] `/satelites/cubesat/` abre a página de teste, **não** a página inicial
- [ ] `/assets/models/cubesat/modelo.glb` baixa o binário
      (`Content-Type: model/gltf-binary`, ~146 KB), não HTML
- [ ] uma rota inexistente devolve status **404**, não 200
- [ ] os quatro itens acima conferidos também num celular real

O segundo, o terceiro e o quarto item são o motivo de esta fase ainda não
estar fechada: no teste de 2026-08-27 todas as rotas devolviam o mesmo HTML
com status 200 (CUBESAT_PILOT.md §7). Enquanto isso não for verificado, o
contrato de URL do [ADR-002](DECISIONS.md#adr-002--urls-em-caminho-não-em-query-string)
— que vai virar QR Code impresso — não está validado.

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
real; o conteúdo textual vem do JSON, não do HTML.

**Decisão a tomar nesta fase:** quanto do conteúdo educacional fica no HTML e
quanto vem do JSON.

**Medição obrigatória:** peso real do `<model-viewer>` no deploy. Este número
entra no orçamento de performance — não usar estimativas de terceiros.

**Aprendizado:** HTML semântico; CSS mobile-first; módulos ES; Web Components;
`fetch` e JSON; glTF vs GLB; pipeline de modelos (Blender, glTF Transform);
poster e carregamento progressivo.

---

## Fase 2 — AR no Android

**Objetivo:** primeira experiência de AR funcional.

**Entrega:** `ar` e `ar-modes="webxr scene-viewer quick-look"` configurados.

**Critério de pronto:** AR abre e ancora em superfície num Android real.

**Aprendizado:** a cascata de `ar-modes`; como o Android dispara o Scene Viewer;
WebXR vs Scene Viewer; escala em AR.

---

## Fase 3 — AR no iOS

**Objetivo:** validar o ADR-007 (USDZ gerado no dispositivo).

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

## Fases futuras (não planejadas)

Registradas apenas para não serem esquecidas. Nenhuma tem escopo definido.

- Ligação entre localidades e satélites (`satelites_relacionados`, ADR-004)
- Filtro por tipo de ponto no globo
- Órbitas — exigiria página separada e outra ferramenta (ADR-008)
- Service Worker, se a Fase 8 justificar (ADR-009)