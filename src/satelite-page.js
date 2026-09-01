/* Página de satélite — carrega o conteúdo a partir de data/satelites/<slug>.json
 *
 * O HTML já traz título e resumo (pintados de imediato, sem depender de JS).
 * Este módulo preenche o que é longo: ficha técnica, seções e o modelo 3D.
 *
 * O slug vem de um atributo no <body>, não da URL. É explícito, e não quebra
 * se a página for aberta por /satelites/cubesat/index.html em vez de
 * /satelites/cubesat/.
 */

const slug = document.body.dataset.slug;

const visor = document.querySelector("#visor");
const ficha = document.querySelector("#ficha");
const secoes = document.querySelector("#secoes");
const erro = document.querySelector("#erro");

/** Cria um elemento com texto. Evita innerHTML: o conteúdo do JSON é tratado
 *  como texto, nunca como marcação. */
function elemento(tag, texto, classe) {
  const el = document.createElement(tag);
  if (texto !== undefined) el.textContent = texto;
  if (classe) el.className = classe;
  return el;
}

/* ---------- Estados da página ----------
 *
 * Um único elemento serve os três tipos de aviso. Duas razões:
 * é impossível ter dois estados contraditórios na tela ao mesmo tempo,
 * e leitores de tela têm um só ponto para anunciar.
 *
 *   erro  — algo falhou e o aluno perdeu uma funcionalidade
 *   aviso — funciona, mas há uma ressalva que ele precisa saber
 *   info  — explicação neutra, sem nada quebrado
 */
function mostrarEstado(mensagem, tipo = "erro") {
  erro.textContent = mensagem;
  erro.className = `estado estado--${tipo}`;
  erro.hidden = false;
}

function montarFicha(itens) {
  // <dl> com um <div> por par: é o agrupamento que o HTML permite dentro de
  // uma lista de descrição, e o que torna o flexbox do CSS possível.
  for (const item of itens) {
    const linha = document.createElement("div");
    linha.append(
      elemento("dt", item.rotulo),
      elemento("dd", item.valor)
    );
    ficha.append(linha);
  }
}

function montarSecoes(lista) {
  for (const secao of lista) {
    secoes.append(
      elemento("h2", secao.titulo),
      elemento("p", secao.texto)
    );
  }
}

/** O navegador consegue desenhar 3D?
 *
 * Detecção de CAPACIDADE: tenta obter um contexto WebGL num canvas
 * descartável e vê se veio. Não pergunta qual é o navegador nem qual é o
 * aparelho — pergunta se a coisa funciona. Continua correto em hardware
 * que ainda não existe.
 *
 * O canvas nunca entra no documento; é criado, consultado e descartado. */
function temWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    // Alguns navegadores lançam exceção em vez de devolver null quando a
    // aceleração está desligada por política.
    return false;
  }
}

/* ---------- O caso em que a regra precisa ser quebrada ----------
 *
 * Em todo o resto deste arquivo eu pergunto "isto funciona aqui?" em vez de
 * "quem é você?". Aqui não dá.
 *
 * O AR Quick Look só funciona de verdade no Safari. Num navegador embutido
 * de aplicativo (WhatsApp, Instagram, Slack) o iOS usa um WKWebView, que
 * responde que SABE abrir AR — e depois exibe o USDZ como texto, ou não faz
 * nada. A verificação de capacidade mente, e o userAgent é o único sinal
 * que sobra.
 *
 * Por isso este aviso é NÃO-BLOQUEANTE: a heurística pode errar, e o custo
 * de errar precisa ser baixo. A visualização 3D funciona nesses navegadores
 * e não é tocada aqui.
 */
function ehIOS() {
  const ua = navigator.userAgent;
  // iPad recente se identifica como Mac; o toque é o que o denuncia.
  return /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function ehSafariDeVerdade() {
  const ua = navigator.userAgent;
  // Chrome, Firefox e Edge no iOS são WKWebView com outro nome, e têm o
  // mesmo problema de AR — por isso entram na lista.
  if (/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua)) return false;
  // O Safari completo traz "Version/" e "Safari/". WKWebView embutido
  // normalmente não traz nenhum dos dois.
  return /Version\//.test(ua) && /Safari\//.test(ua);
}

function avisarSobreAR(mv) {
  // Capacidade primeiro: se o próprio componente diz que não ativa AR,
  // o motivo é estrutural e o userAgent só escolhe a explicação.
  if (!mv.canActivateAR) {
    if (ehIOS() || /Android/.test(navigator.userAgent)) {
      mostrarEstado(
        "A Realidade Aumentada não está disponível neste navegador. " +
        "A visualização 3D acima continua funcionando.",
        "info"
      );
    }
    // Em desktop a ausência de AR é esperada e não merece aviso nenhum.
    return;
  }

  // O componente diz que consegue — mas num navegador embutido no iOS essa
  // resposta não é confiável.
  if (ehIOS() && !ehSafariDeVerdade()) {
    mostrarEstado(
      "Para ver em Realidade Aumentada, abra esta página no Safari. " +
      "Dentro de outros aplicativos o AR pode não funcionar.",
      "aviso"
    );
  }
}

function montarModelo(modelo) {
  if (!temWebGL()) {
    // Sem WebGL o <model-viewer> não tem como funcionar. Criar o elemento
    // produziria uma caixa preta sem explicação — melhor não criar e dizer
    // o que houve. A ficha técnica e as seções continuam normalmente.
    console.warn("WebGL indisponível: o visor 3D não será criado.");
    visor.remove();
    document.querySelector(".visor-legenda")?.remove();
    mostrarEstado(
      "Este navegador não consegue exibir gráficos 3D. O conteúdo em texto " +
      "abaixo continua disponível.",
      "aviso"
    );
    return;
  }

  const mv = document.createElement("model-viewer");

  // Caminho absoluto: o modelo mora em /assets, não ao lado desta página.
  mv.src = `/assets/models/${slug}/${modelo.arquivo}`;
  mv.alt = modelo.alt;

  if (modelo.poster) {
    mv.poster = `/assets/models/${slug}/${modelo.poster}`;
  }
  if (modelo.escala) {
    mv.setAttribute("scale", modelo.escala);
  }

  mv.setAttribute("camera-controls", "");
  // Sem isso, arrastar o dedo sobre o modelo sequestra a rolagem da página
  // e o aluno fica preso no visor. Com pan-y, o gesto vertical rola a
  // página e o horizontal gira o modelo.
  mv.setAttribute("touch-action", "pan-y");
  mv.setAttribute("shadow-intensity", "1");

  // --- Realidade Aumentada ---
  //
  // ar-modes é uma CASCATA: o componente tenta os motores na ordem
  // declarada e usa o primeiro disponível no aparelho.
  //
  //   Android  -> scene-viewer  (app nativo; recebe um link para o GLB bruto)
  //   iOS      -> quick-look    (USDZ gerado aqui no navegador — ADR-007)
  //   Desktop  -> nenhum        (o botão não aparece; o 3D continua)
  //
  // quick-look precisa estar explícito, senão a auto-geração de USDZ não
  // acontece e o iOS fica sem AR.
  mv.setAttribute("ar", "");
  mv.setAttribute("ar-modes", "webxr scene-viewer quick-look");

  // Escala real, sem redimensionar com os dedos. É o ponto pedagógico deste
  // modelo: um CubeSat 1U tem 10 cm de lado, e vê-lo do tamanho certo na
  // mesa é a informação. Validado em iPhone real em 2026-08-27.
  mv.setAttribute("ar-scale", "fixed");
  mv.setAttribute("ar-placement", "floor");

  // Botão próprio, em português. O botão padrão do model-viewer é em inglês.
  // O componente cuida de escondê-lo onde AR não é suportado.
  const botaoAr = document.createElement("button");
  botaoAr.setAttribute("slot", "ar-button");
  botaoAr.className = "botao-ar";
  botaoAr.type = "button";
  botaoAr.textContent = "Ver no seu espaço";
  mv.append(botaoAr);

  // --- Progresso ---
  //
  // O ACRIMSAT tem 2,1 MB. Em rede escolar isso são vários segundos de nada
  // acontecendo, e "nada acontecendo" é indistinguível de "quebrou".
  //
  // <progress> nativo em vez de uma div animada: o navegador já sabe
  // anunciá-lo a leitores de tela e desenhá-lo sem CSS nenhum.
  const barra = document.createElement("progress");
  barra.className = "progresso";
  barra.max = 1;
  barra.value = 0;
  visor.append(barra);

  mv.addEventListener("progress", (evento) => {
    const fracao = evento.detail.totalProgress;
    barra.value = fracao;
    // O evento dispara com 1 quando termina — inclusive quando o modelo vem
    // do cache e a barra mal chega a aparecer.
    if (fracao === 1) barra.remove();
  });

  // A mensagem NÃO afirma a causa. Um modelo pode falhar por rede, por
  // caminho errado, por arquivo corrompido ou por falta de WebGL — e dizer
  // "verifique a conexão" manda quem lê procurar no lugar errado quando a
  // causa é outra. O diagnóstico vai para o console, onde é útil.
  mv.addEventListener("error", (evento) => {
    console.error("Falha ao carregar o modelo:", mv.src, evento.detail ?? evento);
    barra.remove();
    mostrarEstado("Não foi possível carregar o modelo 3D desta página.");
  });

  // canActivateAR só tem resposta confiável depois da cena carregada —
  // antes disso o componente ainda não sabe o que consegue fazer.
  mv.addEventListener("load", () => {
    barra.remove();
    avisarSobreAR(mv);
  }, { once: true });

  visor.append(mv);
}

async function carregar() {
  try {
    const resposta = await fetch(`/data/satelites/${slug}.json`);

    // fetch NÃO rejeita em 404 ou 500 — ele resolve normalmente.
    // Sem esta verificação, o 404.html chegaria até o JSON.parse e o erro
    // apareceria como "unexpected token <", que não descreve o problema.
    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status} ao buscar os dados`);
    }

    const dados = await resposta.json();

    montarModelo(dados.modelo);
    montarFicha(dados.ficha);
    montarSecoes(dados.secoes);
  } catch (causa) {
    console.error(`Falha ao carregar /data/satelites/${slug}.json —`, causa);
    mostrarEstado("Não foi possível carregar o conteúdo desta página.");
  }
}

carregar();
