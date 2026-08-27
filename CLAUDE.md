# Web Path AR — Instruções para Claude Code

## 1. Contexto

Satellite AR é uma aplicação web estática educacional para suporte a aulas sobre satélites, missões e exploração espacial.

O fluxo principal é:

QR Code impresso
→ URL específica
→ conteúdo educacional
→ visualização 3D
→ Realidade Aumentada quando suportada.

Existe também um modo exploratório através de um globo interativo na página inicial.

O público principal utiliza dispositivos móveis.

---

## 2. Documentação de referência

Antes de realizar alterações arquiteturais ou implementar funcionalidades relevantes, consulte:

* `ARCHITECTURE.md` — arquitetura atual;
* `DECISIONS.md` — decisões arquiteturais e suas justificativas;
* `README.md` — instruções gerais do projeto, quando disponível;
* `LEARNING.md` — registro de conceitos e aprendizados, quando disponível.

Esses arquivos representam o conhecimento persistente do projeto.

Não contradiga uma decisão documentada silenciosamente.

Se uma nova necessidade exigir mudança de uma decisão existente:

1. identifique a decisão afetada;
2. explique o conflito;
3. apresente a alternativa;
4. aguarde confirmação quando a mudança for arquitetural;
5. atualize a documentação correspondente após a decisão.

---

# 3. Stack

A stack inicial definida para o projeto é:

* HTML;
* CSS;
* JavaScript com módulos ES;
* `<model-viewer>`;
* Scene Viewer;
* AR Quick Look;
* Blender;
* glTF Transform;
* MapLibre GL JS;
* OpenFreeMap;
* GeoJSON;
* Cloudflare Pages;
* GitHub.

Não introduza frameworks, bundlers, bibliotecas, backend, banco de dados ou serviços adicionais sem justificar tecnicamente a necessidade.

A ausência de framework e build step é uma decisão arquitetural intencional nesta fase.

---

# 4. Princípios de implementação

Priorize:

1. simplicidade;
2. clareza;
3. manutenção;
4. desempenho mobile;
5. acessibilidade;
6. compatibilidade;
7. baixo custo;
8. facilidade de aprendizado.

Evite overengineering.

Não crie abstrações ou infraestrutura apenas porque seriam comuns em aplicações maiores.

Se HTML, CSS e JavaScript nativos resolverem adequadamente o problema, não introduza outra camada.

---

# 5. Arquitetura atual

A aplicação utiliza arquitetura multi-página.

Tipos principais:

* `/` → globo;
* `/satelites/<slug>/` → página de satélite;
* `/locais/<slug>/` → página de localidade.

Cada página deve carregar apenas os recursos necessários para sua função.

A página do globo não deve carregar `<model-viewer>`.

A página de satélite não deve carregar MapLibre.

A página de localidade não deve carregar MapLibre nem `<model-viewer>`.

Não transforme a aplicação em SPA sem uma decisão arquitetural explícita.

---

# 6. Estrutura de dados

O padrão de acesso determina a estrutura dos dados.

Globo:

`data/locais.geojson`

Conteúdo completo:

`data/locais/<slug>.json`

Satélites:

`data/satelites/<slug>.json`

Não coloque informações pesadas ou conteúdo que o globo não precisa dentro do GeoJSON.

GeoJSON utiliza:

`[longitude, latitude]`

e não:

`[latitude, longitude]`.

---

# 7. URLs

As URLs fazem parte da arquitetura pedagógica e do material impresso.

Formato esperado:

`/satelites/<slug>/`

`/locais/<slug>/`

Slugs devem ser:

* curtos;
* estáveis;
* legíveis;
* atemporais.

Não altere um slug existente sem considerar que QR Codes podem já ter sido impressos apontando para ele.

---

# 8. Assets

Assets originais não devem ser adicionados ao repositório.

Modelos brutos e fotografias originais permanecem fora do Git.

O repositório contém somente os resultados finais otimizados.

Modelos:

NASA
→ inspeção
→ Blender, quando necessário
→ glTF Transform
→ GLB otimizado
→ repositório.

Imagens:

original
→ redimensionamento
→ WebP
→ tamanhos apropriados
→ repositório.

Não commit arquivos intermediários ou tentativas de otimização.

---

# 9. Realidade Aumentada

O fluxo esperado utiliza `<model-viewer>`.

A configuração atual considera:

`webxr scene-viewer quick-look`

Android deve priorizar Scene Viewer.

iOS deve utilizar AR Quick Look.

Desktop ou dispositivos incompatíveis devem continuar permitindo a visualização 3D quando possível.

Nunca assuma que AR estará disponível.

Sempre considerar:

* suporte do dispositivo;
* navegador;
* fallback;
* estados de erro;
* tempo de carregamento;
* tamanho do modelo.

A geração automática de USDZ no dispositivo é uma decisão ainda sujeita a validação.

Não considere essa decisão definitivamente validada até que os testes em iPhone real tenham sido realizados.

Modelos animados podem exigir uma estratégia diferente.

---

# 10. Performance

Performance é requisito arquitetural.

Orçamentos iniciais:

* GLB final: ≤ 3 MB;
* poster WebP: ≤ 50 KB;
* foto de galeria: ≤ 150 KB;
* primeiro conteúdo visível: < 1,5 s em 4G;
* modelo utilizável: < 5 s em 4G.

Esses valores são metas iniciais e devem ser validados por medição real.

Não faça otimização baseada apenas em opinião.

Utilize:

medir
→ identificar gargalo
→ otimizar
→ medir novamente.

Se uma otimização não produzir melhoria mensurável ou tiver uma justificativa clara de compatibilidade/manutenção, questione se ela realmente deve existir.

---

# 11. Mobile-first

Considere celulares como ambiente primário.

Ao implementar qualquer funcionalidade, pense primeiro em:

* tela pequena;
* toque;
* orientação;
* rede móvel;
* memória limitada;
* GPU limitada;
* carregamento lento;
* ausência de mouse;
* compatibilidade de navegador.

Desktop é importante, mas não deve definir sozinho a experiência.

---

# 12. Ensino

Meu objetivo não é apenas terminar a aplicação.

Quero aprender a desenvolver sistemas semelhantes sozinho.

Portanto, quando estivermos implementando uma funcionalidade relevante, siga este processo:

### Antes de alterar

Explique:

* qual problema estamos resolvendo;
* quais arquivos provavelmente serão envolvidos;
* qual abordagem pretende utilizar;
* quais conceitos técnicos estão envolvidos;
* quais alternativas relevantes existem.

### Durante a implementação

Faça alterações pequenas e coerentes.

Evite modificar arquivos não relacionados à tarefa.

### Depois da implementação

Explique:

* o que foi alterado;
* como as partes se relacionam;
* como testar;
* quais conceitos devo reter;
* quais erros seriam comuns ao implementar isso sozinho.

Não explique trivialidades linha por linha.

Priorize o raciocínio.

---

# 13. Não faça mudanças silenciosas

Não:

* altere a arquitetura sem avisar;
* troque tecnologias silenciosamente;
* adicione dependências sem explicar;
* modifique contratos de dados sem explicar;
* renomeie URLs sem considerar QR Codes;
* remova funcionalidades para fazer testes passarem sem explicar.

Se encontrar um problema fora do escopo da tarefa atual:

1. registre que encontrou;
2. explique brevemente;
3. não corrija automaticamente se a correção não fizer parte da tarefa.

Isso é especialmente importante quando estou trabalhando em uma issue específica.

---

# 14. Escopo

Ao receber uma tarefa específica, mantenha o foco nela.

Se encontrar outros problemas:

* não os ignore;
* não os corrija automaticamente;
* informe-os ao final como observações.

Não transforme uma pequena tarefa em uma refatoração geral do projeto.

---

# 15. Testes

Toda implementação relevante deve possuir uma maneira clara de ser validada.

Antes de considerar uma tarefa concluída, informe:

* o que foi testado;
* como foi testado;
* resultado;
* limitações do teste.

Quando uma funcionalidade depender de hardware ou plataforma específica, deixe isso explícito.

Exemplo:

> "Visualização 3D validada no navegador."

não significa:

> "AR validada no iPhone."

Não trate testes simulados como equivalentes a testes em dispositivo real.

---

# 16. Git

Faça alterações pequenas e logicamente agrupadas.

Não faça commits gigantes contendo funcionalidades não relacionadas.

Não altere histórico Git sem solicitação explícita.

Nunca adicione:

* `.env`;
* credenciais;
* tokens;
* chaves privadas;
* arquivos originais pesados;
* secrets;

ao repositório.

---

# 17. Documentação

Quando uma decisão arquitetural nova for tomada, registre-a em `DECISIONS.md`.

Quando a arquitetura mudar, atualize `ARCHITECTURE.md`.

Quando houver conhecimento relevante para meu aprendizado, considere registrar em `LEARNING.md`.

A documentação deve refletir o estado real do projeto.

Não escreva documentação fictícia sobre funcionalidades que ainda não existem.

---

# 18. Ordem de desenvolvimento

Prefira desenvolvimento incremental.

Uma funcionalidade deve seguir aproximadamente:

entender
→ planejar
→ implementar
→ testar
→ revisar
→ documentar.

Não implemente grandes partes do sistema de uma só vez quando elas puderem ser divididas em incrementos verificáveis.

---

# 19. Estado da arquitetura

`ARCHITECTURE.md` e `DECISIONS.md` representam a arquitetura planejada, mas algumas decisões ainda possuem validação prática pendente.

Especialmente:

* compatibilidade da auto-geração USDZ;
* comportamento real dos modelos em AR;
* desempenho dos assets;
* desempenho em dispositivos móveis;
* comportamento do mapa em condições reais de rede.

Diferencie sempre:

**decisão arquitetural**

de

**decisão validada experimentalmente**.

---

# 20. Regra principal

Não otimize para produzir a maior quantidade possível de código.

Otimize para:

**código correto + arquitetura compreensível + aprendizado + capacidade de manutenção.**

Quando uma solução puder ser explicada de maneira simples, prefira-a.

Quando uma solução for complexa, explique por que a complexidade é necessária.
