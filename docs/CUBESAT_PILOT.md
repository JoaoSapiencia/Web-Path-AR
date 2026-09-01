# Piloto técnico — CubeSat 1U

> Documento de registro histórico. Descreve a inspeção técnica do modelo
> escolhido como piloto de arquitetura (ver [DECISIONS.md](../DECISIONS.md)
> para o raciocínio de por que o CubeSat foi escolhido como piloto).
>
> Este documento é atualizado conforme o piloto avança. Data da primeira
> inspeção: 2026-08-27.

---

## 1. Identificação do arquivo

| Campo | Valor |
|---|---|
| Caminho | `assets/models/cubesat/modelo.glb` |
| Nome original | `CubeSat - 1 RU Generic.glb` (renomeado na Fase 0 para o padrão `assets/models/<slug>/modelo.glb` do [ARCHITECTURE.md](../ARCHITECTURE.md#5-estrutura-de-diretórios); os espaços no nome também eram um suspeito no problema de roteamento da §7) |
| Origem | NASA 3D Resources |
| Tamanho real | 149.424 bytes (~145,9 KB) |
| Gerador declarado | `Khronos glTF Blender I/O v4.2.57` |
| Versão glTF | 2.0 |

O tamanho estimado inicialmente (~170 KB) estava impreciso; o valor real medido é ~145,9 KB — bem abaixo do orçamento de ≤3 MB definido em [ARCHITECTURE.md](../ARCHITECTURE.md#7-orçamento-de-performance).

---

## 2. Fatos observados

Estes são valores lidos diretamente da estrutura binária do arquivo (cabeçalho GLB + chunk JSON + chunk BIN), sem inferência.

- **Meshes:** 1 mesh (`Mesh_0`), dividido em **18 primitivas** (uma por material).
- **Vértices:** ~70.710 (soma das 18 primitivas — cada primitiva tem seu próprio buffer, não há deduplicação global).
- **Triângulos:** ~23.570 (soma das 18 primitivas).
- **Materiais:** 18, todos `pbrMetallicRoughness` usando apenas `baseColorFactor` (cor sólida) + `roughnessFactor`. Nenhum material referencia textura.
- **Texturas/imagens:** 0. Arrays `textures` e `images` vazios.
- **Animações:** 0. Array `animations` vazio.
- **Skins (rig):** 0. Array `skins` vazio.
- **Hierarquia de nós:**
  ```
  Pivot-Layer_0 (raiz, sem mesh)
   └── Layer_0 (mesh = 0)
  ```
  Nenhum dos dois nós define `translation`, `rotation`, `scale` ou `matrix` — ambos usam os valores padrão do glTF (posição zero, sem rotação, escala 1).
- **Compressão:** usa a extensão `KHR_draco_mesh_compression`, declarada em `extensionsRequired` (não apenas `extensionsUsed`) — ou seja, é **obrigatória** para qualquer visualizador conseguir renderizar o modelo.
- **Atributos por vértice:** apenas `POSITION` e `NORMAL`. Sem `UV`, `TANGENT` ou `COLOR`.
- **Índices:** todos `UNSIGNED_SHORT` (16 bits), dentro do limite (maior primitiva tem 11.340 vértices, muito abaixo de 65.535).
- **Bounding box agregada** (min/max de posição, todas as primitivas):

  | Eixo | Mínimo | Máximo | Extensão |
  |---|---|---|---|
  | X | -2,60 | 2,59 | 5,19 unidades |
  | Y | -1,15 | 1,45 | 2,60 unidades |
  | Z | -1,07 | 1,12 | 2,20 unidades |

  O corpo principal (a maioria das primitivas) ocupa aproximadamente ±1,05 em X/Z; a extensão maior em X vem de uma primitiva pequena (300 vértices) compatível com uma antena/haste fina se projetando do corpo.
- **Metadados de unidade:** nenhum. Não há `extras` no `asset` nem na cena indicando a unidade pretendida pelo modelador.

---

## 3. Hipóteses / interpretações

Estas são leituras que fazem sentido técnico, mas dependem de inferência — não são garantidas apenas pela estrutura do arquivo.

- **Draco reduziu a geometria em ~92%.** Estimando o tamanho não comprimido (~70.710 vértices × 24 bytes para posição+normal em float32 ≈ 1,7 MB) contra o tamanho real do chunk BIN (136.572 bytes), a compressão parece ter sido efetiva. É uma estimativa, não uma medição direta do dado antes da compressão.
- **A conversão Z-up (Blender) → Y-up (glTF) foi feita corretamente pelo exportador.** O gerador declarado é o exportador oficial da Khronos, que faz essa conversão automaticamente. Isso é uma expectativa razoável dado o software usado, não uma confirmação visual.
- **18 materiais quase idênticos sugerem variações de shading originalmente pensadas para iluminação diferente por painel**, não 18 aparências distintas. Fundir os que são visualmente equivalentes reduziria draw calls, mas o ganho é marginal dado que a página carrega um único objeto.
- **O arquivo já está bem otimizado na parte que depende de ferramenta** (compressão de geometria, ausência de textura, atributos mínimos). Não há indício de gordura óbvia sobrando.

---

## 4. Pontos ainda não validados

Itens que exigem teste em navegador/dispositivo real antes de serem tratados como fato.

- ~~Suporte a Draco no `<model-viewer>` na prática.~~ **Validado em 2026-08-27** — ver seção 7. O modelo carregou e decodificou corretamente no Safari do iPhone via preview do Cloudflare Pages.
- **Suporte a Draco no Scene Viewer (Android).** Ainda não testado. O Scene Viewer não roda dentro do `<model-viewer>`; ele é um app nativo que recebe um link para o GLB e faz seu próprio parsing. Não há confirmação de que ele descomprime Draco da mesma forma — a validação no iOS não se estende ao Android, porque o caminho de dados é diferente (ver seção 6.6).
- ~~Geração de USDZ a partir de um modelo Draco-comprimido.~~ **Validado em 2026-08-27** — ver seção 7. A conversão para USDZ funcionou no dispositivo.
- ~~Escala real de exibição.~~ **Validado para iOS em 2026-08-27**, com ressalvas — ver seções 6.7 e 7. Ainda pendente para Android.
- ~~Orientação visual correta.~~ **Validada em 2026-08-31**, na página da Fase 1 aberta em iPhone real: o modelo renderiza em pé e responde à rotação por toque. A conversão Z-up (Blender) → Y-up (glTF) da §3 está confirmada visualmente.

---

## 5. Próximos testes

1. ~~Carregar o GLB num `<model-viewer>` mínimo e confirmar visualmente orientação e proporções.~~ **Feito em 2026-08-27.**
2. ~~Testar carregamento em rede real (não apenas localhost) para validar a dependência do CDN do decodificador Draco.~~ **Feito em 2026-08-27**, via preview do Cloudflare Pages + rede do iPhone.
3. **Testar Scene Viewer em um Android real.** Ainda pendente — é o maior ponto em aberto do piloto agora (ver seção 6.6).
4. ~~Testar AR Quick Look em um iPhone real.~~ **Feito em 2026-08-27** — ver seção 7. Condição de aceitação do [ADR-007](../DECISIONS.md#adr-007--usdz-gerado-no-dispositivo) cumprida para este modelo.
5. ~~Resolver a questão de escala antes dos testes de AR.~~ Superado pela ordem real dos eventos: o teste de AR acabou também testando a escala (seção 7). Resultado dentro do esperado.
6. **Repetir o teste no Android real**, isolando se a correção de escala via atributo HTML chega ou não ao Scene Viewer — este é o teste que decide entre a Opção A e a Opção B da seção 6.5.

---

## 6. Investigação: escala física do modelo

### 6.1 O que o arquivo efetivamente contém (fato)

Os nós do modelo (`Pivot-Layer_0` e `Layer_0`) não têm nenhum fator de escala aplicado — não existe `scale` nem `matrix` em nenhum dos dois. Isso significa que **os números de posição no arquivo são os números finais**, sem nenhuma transformação adicional a caminho do visualizador.

A bounding box do corpo principal do satélite gira em torno de **~2,1 unidades** de lado (seção 2). Não há nenhum campo no glTF que declare "essas unidades representam X metros" — porque, pela especificação, não precisa haver.

### 6.2 Como o glTF representa unidades

O núcleo da especificação glTF 2.0 define, como convenção fixa: **todas as distâncias lineares são expressas em metros**. Não é um campo configurável — é uma regra da especificação, do mesmo jeito que "coordenadas geográficas em GeoJSON são `[longitude, latitude]`" é uma regra fixa do GeoJSON.

Isso quer dizer que, para qualquer visualizador compatível com glTF, `1.0` no eixo X **deveria** significar 1 metro. O problema não é o formato — é que o **conteúdo pode estar errado** em relação a essa convenção, se quem modelou não configurou a cena do Blender para que a unidade de trabalho fosse de fato o metro antes de exportar. Isso é um erro comum em modelos de acervos técnicos/CAD reaproveitados (frequentemente modelados originalmente em polegadas ou em unidades arbitrárias do software de origem, sem recalibração antes de virarem glTF).

Ou seja: **o glTF não tem ambiguidade de unidade — o que pode estar ambíguo é se o conteúdo deste arquivo específico respeita essa convenção.**

### 6.3 Como o `<model-viewer>` interpreta a escala

O `<model-viewer>` carrega o glTF/GLB e trata os valores brutos de posição **como metros**, seguindo a especificação à risca — não faz nenhuma correção automática de unidade.

Ele expõe um atributo `scale` (formato `"x y z"`, padrão `"1 1 1"`) que multiplica a geometria de forma não destrutiva, em tempo de renderização — não altera o arquivo, só o que é desenhado na tela. Esse atributo afeta tanto a visualização 3D dentro da página quanto, em princípio, a sessão de AR iniciada a partir dela.

### 6.4 Qual seria a escala apropriada para um CubeSat 1U

Um CubeSat 1U real mede **10 × 10 × 10 cm** (0,1 m de lado), por definição do padrão CubeSat.

O corpo principal do nosso modelo mede ~2,1 unidades de lado. Se tratarmos essas unidades como metros (a leitura mais defensável, por ser a convenção da própria especificação, e não uma suposição adicional que eu estaria inventando), o modelo está sendo interpretado hoje como um objeto de **~2,1 metros** — cerca de 20× maior que o CubeSat real.

Fator de correção estimado, calculado como `tamanho real desejado ÷ tamanho bruto observado`:

```
0,10 m ÷ 2,1 unidades ≈ 0,048
```

Ou seja, um `scale="0.048 0.048 0.048"` (aproximadamente) traria o corpo principal para perto de 10 cm.

**Isso é uma hipótese de trabalho, não um valor confirmado.** Ela assume que "unidade bruta = metro" é a leitura correta, o que é razoável (é a convenção da especificação), mas só a confirmação visual — carregar o modelo ao lado de uma referência de tamanho conhecido — valida esse número. Não vou tratar `0.048` como definitivo até esse teste acontecer.

### 6.5 Corrigir no arquivo GLB ou controlar a escala na aplicação?

Duas abordagens possíveis, ambas viáveis tecnicamente:

**Opção A — Corrigir no arquivo.**
Aplicar a escala permanentemente (por exemplo, escrevendo um `scale` no nó raiz via glTF Transform — não precisa re-exportar do Blender nem alterar vértice por vértice). O arquivo passaria a declarar seu tamanho real corretamente, para qualquer consumidor.

**Opção B — Controlar via `<model-viewer scale="...">` na página.**
O arquivo permanece como está; a página aplica a correção em tempo de exibição.

| | Opção A (arquivo) | Opção B (aplicação) |
|---|---|---|
| Alinhamento com ADR-005 (só resultado final otimizado é versionado) | Neutro — ainda seria só o resultado final | Mais alinhado — mantém a correção como decisão de apresentação, não de asset |
| Esforço | Exige reabrir o pipeline de assets (glTF Transform) | Um atributo HTML |
| Reversibilidade | Precisa gerar novo GLB para ajustar | Editar um atributo, ver o diff no Git |
| Risco de "esquecer" a correção em outro contexto | Baixo — a correção viaja com o arquivo | Existe, mas mitigado pela arquitetura multi-página: cada satélite só é carregado pela sua própria página ([ADR-001](../DECISIONS.md#adr-001--sem-framework-na-fase-inicial)), então não há "vários lugares" para esquecer |

Isolado, isso favoreceria a Opção B pela simplicidade — exceto por um detalhe técnico que muda o peso da decisão, descrito a seguir.

### 6.6 Consequências para AR no Android e no iOS — o ponto que decide

As duas plataformas obtêm o modelo de formas estruturalmente diferentes, e isso afeta se a Opção B realmente funciona:

**iOS (AR Quick Look / USDZ):** o `<model-viewer>` gera o USDZ **no próprio navegador**, a partir da cena que já está carregada em memória — a mesma cena onde o atributo `scale` já foi aplicado (ver [ADR-007](../DECISIONS.md#adr-007--usdz-gerado-no-dispositivo)). Como a conversão acontece depois da escala já estar aplicada, é razoável esperar que a correção feita via HTML **seja herdada pelo USDZ** automaticamente. Ainda não testado, mas o caminho de dados favorece a Opção B funcionar aqui.

**Android (Scene Viewer):** aqui o caminho é diferente. O `<model-viewer>` **não** processa o modelo e entrega uma cena pronta para o Android — ele monta um link (`intent://arvr.google.com/scene-viewer/...`) apontando para o **arquivo GLB bruto**, e o Scene Viewer (um app nativo separado, fora da página) baixa e interpreta esse arquivo por conta própria. Ou seja, o Scene Viewer nunca vê o atributo `scale` da página — ele só vê o link do arquivo.

Isso significa que **a Opção B pode não funcionar no Android**: se o Scene Viewer ler o GLB bruto e aplicar a convenção padrão do glTF (unidade = metro), o satélite pode aparecer com ~2 metros dentro da sala, mesmo que a página tenha `scale="0.048 0.048 0.048"` configurado — porque essa configuração nunca chega até o Scene Viewer.

Este é o motivo pelo qual não estou recomendando a Opção B de forma unilateral: **ela resolve o problema garantidamente só na visualização 3D dentro da página e, com razoável confiança, no iOS; no Android, ainda não sabemos.** A Opção A (corrigir a escala dentro do próprio arquivo GLB) elimina essa incerteza por completo, porque o Scene Viewer passaria a ler o mesmo arquivo já corrigido, sem depender de nenhuma configuração vinda da página.

### 6.7 Estado da decisão

**Parcialmente decidido — confirmado para iOS, pendente para Android.**

O teste de 2026-08-27 (seção 7) confirma que a Opção B (`scale` via `<model-viewer>`, sem tocar no arquivo) funciona no iOS: o USDZ gerado on-device herdou a correção de escala aplicada na página, resultando num objeto fisicamente próximo do tamanho real de um CubeSat 1U.

Isso **não decide a questão para o Android**. O raciocínio da seção 6.6 continua de pé: o Scene Viewer recebe um link para o arquivo bruto, fora do runtime da página, então nada garante que ele respeite o mesmo atributo `scale`. Enquanto esse teste não for feito, a Opção B é considerada válida apenas para iOS.

Se o teste em Android confirmar que a Opção B também funciona lá, ela vira a abordagem padrão do projeto para todos os satélites, e não é necessário nenhum ADR novo — apenas registrar o padrão de implementação.

Se o teste em Android mostrar que a correção não chega ao Scene Viewer, migramos para a Opção A (corrigir a escala no próprio GLB) e, aí sim, registro um ADR novo em `DECISIONS.md`, só depois de confirmado com o usuário.

---

## 7. Resultado do teste em iPhone real — 2026-08-27

**Ambiente:** página `test/cubesat-ios-ar-scale`, publicada via preview deployment do Cloudflare Pages, aberta no Safari de um iPhone real.

**Nota sobre o deploy:** o teste só funcionou depois de mover o arquivo de teste para a raiz do repositório nessa branch (`index.html` em vez de `satelites/cubesat/index.html`), porque o Cloudflare Pages estava servindo o mesmo HTML para qualquer rota não encontrada (comportamento de fallback tipo SPA), o que incluía o caminho do `.glb` — o modelo nunca era servido de fato, resultando em tela preta. Isso foi confirmado comparando as respostas HTTP de `/`, `/satelites/cubesat/`, do próprio `.glb` e de uma rota inexistente: todas retornavam o mesmo HTML com status 200. **Esse posicionamento na raiz era temporário, só para viabilizar o teste**, e conflita com o [ADR-003](../DECISIONS.md#adr-003--o-globo-é-a-home) (raiz reservada para o globo). **Já revertido** para `satelites/cubesat/index.html` no commit `fbf71ad`, antes do merge para `main`.

**Consequência não resolvida:** como o teste rodou com o arquivo na raiz, ele **não** validou a rota `/satelites/cubesat/`. O contrato de URL do [ADR-002](../DECISIONS.md#adr-002--urls-em-caminho-não-em-query-string) continua sem confirmação em deploy real — é o item em aberto da Fase 0 (ver `ROADMAP.md`). Duas causas plausíveis foram identificadas para o comportamento de 200-para-tudo, e nenhuma está confirmada:

1. **Ausência de `404.html`.** Sem esse arquivo, o Cloudflare Pages pode cair num fallback que devolve o `index.html` da raiz. Um `404.html` foi adicionado na Fase 0 como hipótese de correção.
2. **Espaços no nome do arquivo GLB.** O caminho original continha espaços (`CubeSat%20-%201%20RU%20Generic.glb`). O arquivo foi renomeado para `modelo.glb` na Fase 0, eliminando essa variável.

Como as duas mudanças entram juntas, um teste bem-sucedido não distingue qual delas resolveu. Isso é aceitável aqui — o objetivo é a rota funcionar, não atribuir a causa —, mas fica registrado que a atribuição de causa não foi feita.

**Resultados:**

| Item | Resultado |
|---|---|
| Botão de AR aparece | Sim |
| Cena abre (sem travar em carregamento infinito) | Sim |
| Draco decodificado corretamente | Sim (implícito — o modelo é ilegível sem isso) |
| USDZ gerado on-device com sucesso | Sim |
| Escala fisicamente plausível | Sim — medido ~12 cm de altura com régua física, contra os ~10-11,35 cm esperados de um CubeSat 1U real |
| Conflito conhecido entre `ar-scale="fixed"` e auto-geração de USDZ (nota do `ROADMAP.md`, Fase 3) | Não observado neste teste |

**Interpretação:** a hipótese de escala (`scale="0.048 0.048 0.048"`, seção 6.4) está validada para iOS dentro da margem de erro de uma medição manual com régua. Não há indicação de que precise de ajuste fino agora.

**Não testado neste momento:** materiais/cores comparados lado a lado com a visualização no navegador; tempo entre toque e abertura do AR; comportamento em outros pontos de entrada além do Safari direto (ver `ROADMAP.md`, Teste 0 — Safari vs QR Code vs navegador embutido). Ficam como itens da Fase 3 completa, não deste piloto.
