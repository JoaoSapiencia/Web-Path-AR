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
| Caminho | `assets/models/cubesat/CubeSat - 1 RU Generic.glb` |
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

- **Suporte a Draco no `<model-viewer>` na prática.** O componente normalmente inclui o decodificador Draco e busca o WASM correspondente de um CDN do Google na primeira execução — isso introduz uma dependência de rede externa ainda não testada nesta rede/projeto.
- **Suporte a Draco no Scene Viewer (Android).** O Scene Viewer não roda dentro do `<model-viewer>`; ele é um app nativo que recebe um link para o GLB e faz seu próprio parsing. Não há confirmação de que ele descomprime Draco da mesma forma.
- **Geração de USDZ a partir de um modelo Draco-comprimido.** A conversão para USDZ acontece no dispositivo, a partir da cena já decodificada — em teoria não deveria ser afetada pela compressão em si, mas ainda depende do decode Draco ter funcionado primeiro.
- **Escala real de exibição.** Ver seção dedicada abaixo — este é o ponto mais importante em aberto.
- **Orientação visual correta.** A conversão de eixos é esperada, mas só a confirmação visual (modelo "em pé", não deitado ou de cabeça para baixo) valida isso de fato.

---

## 5. Próximos testes

Em ordem de prioridade para o piloto:

1. Carregar o GLB num `<model-viewer>` mínimo e confirmar visualmente orientação e proporções.
2. Testar carregamento em rede real (não apenas localhost) para validar a dependência do CDN do decodificador Draco.
3. Testar Scene Viewer em um Android real.
4. Testar AR Quick Look em um iPhone real (condição de aceitação do [ADR-007](../DECISIONS.md#adr-007--usdz-gerado-no-dispositivo)).
5. Resolver a questão de escala (seção 6) antes dos testes de AR, já que escala errada invalida qualquer teste de AR feito depois.

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

**Ainda não decidido.** Antes de escolher entre Opção A e Opção B, o teste que resolve a dúvida é justamente o item 3 da seção 5 (Scene Viewer em Android real) — carregar o modelo sem correção nenhuma, aplicar `scale` só via HTML, e ver se o Android respeita isso ou não. O resultado desse teste determina se a Opção B é suficiente ou se precisamos migrar para a Opção A.

Como isso envolve decidir se voltamos a tocar no pipeline de assets (potencialmente relevante para o ADR-005), a decisão final será registrada em `DECISIONS.md` como um novo ADR somente depois de confirmada com o usuário — não antes.
