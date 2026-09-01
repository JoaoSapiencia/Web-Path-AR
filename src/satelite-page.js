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

function mostrarErro(mensagem) {
  erro.textContent = mensagem;
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

function montarModelo(modelo) {
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

  // A mensagem NÃO afirma a causa. Um modelo pode falhar por rede, por
  // caminho errado, por arquivo corrompido ou por falta de WebGL — e dizer
  // "verifique a conexão" manda quem lê procurar no lugar errado quando a
  // causa é outra. O diagnóstico vai para o console, onde é útil.
  mv.addEventListener("error", (evento) => {
    console.error("Falha ao carregar o modelo:", mv.src, evento.detail ?? evento);
    mostrarErro("Não foi possível carregar o modelo 3D desta página.");
  });

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
    mostrarErro("Não foi possível carregar o conteúdo desta página.");
  }
}

carregar();
