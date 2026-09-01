/* Página de localidade — carrega o conteúdo de data/locais/<slug>.json
 *
 * É a página mais leve do projeto, e isso é arquitetura, não acaso: pelo
 * ARCHITECTURE.md §2.3 ela NÃO carrega MapLibre nem <model-viewer>. Quem
 * chega aqui pelo globo já pagou o MapLibre na home; fazê-lo pagar de novo
 * seria desperdício, e quem chega direto por link não precisa de mapa
 * nenhum para ler sobre um lugar.
 *
 * O HTML já traz título e resumo, pintados antes de qualquer JavaScript
 * rodar (ADR-009). Este módulo preenche só o que é longo: ficha e seções.
 *
 * O slug vem de um atributo no <body>, não da URL — mesma razão da página
 * de satélite: não quebra se a página for aberta por
 * /locais/kourou/index.html em vez de /locais/kourou/.
 */

const slug = document.body.dataset.slug;

const ficha = document.querySelector("#ficha");
const secoes = document.querySelector("#secoes");
const erro = document.querySelector("#erro");

/* As quatro funções abaixo são gêmeas das de src/satelite-page.js.
 *
 * A duplicação é consciente, e está registrada como débito D-07 no
 * ROADMAP.md. Extrair um módulo compartilhado obrigaria a mexer no
 * satelite-page.js, que está validado em iPhone real — mudança de escopo
 * maior do que esta fase comporta. A Fase 7 é o lugar de convergir, porque
 * é a fase cujo propósito declarado é justamente testar se a arquitetura
 * aguenta crescer. */

/** Cria um elemento com texto. Evita innerHTML: o conteúdo do JSON é
 *  tratado como texto, nunca como marcação. */
function elemento(tag, texto, classe) {
  const el = document.createElement(tag);
  if (texto !== undefined) el.textContent = texto;
  if (classe) el.className = classe;
  return el;
}

/** Um único elemento serve os três tipos de aviso — erro, aviso e info.
 *  Assim é impossível ter dois estados contraditórios na tela, e leitores
 *  de tela têm um só ponto para anunciar. */
function mostrarEstado(mensagem, tipo = "erro") {
  erro.textContent = mensagem;
  erro.className = `estado estado--${tipo}`;
  erro.hidden = false;
}

function montarFicha(itens) {
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

async function carregar() {
  try {
    const resposta = await fetch(`/data/locais/${slug}.json`);

    // fetch NÃO rejeita em 404 ou 500 — ele resolve normalmente. Sem esta
    // verificação, o 404.html chegaria até o JSON.parse e o erro apareceria
    // como "unexpected token <", que não descreve o problema.
    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status} ao buscar os dados`);
    }

    const dados = await resposta.json();

    // A galeria de fotos é a Fase 6b e depende de fotos que ainda não
    // existem. O campo `fotos` já está no schema, vazio — reservar é
    // barato, migrar depois não é (mesmo raciocínio do ADR-004).
    montarFicha(dados.ficha);
    montarSecoes(dados.secoes);
  } catch (causa) {
    // A mensagem relata o que se sabe e não adivinha a causa; o diagnóstico
    // vai para o console, onde é útil. Ver docs/DIAGNOSTICO_MODELO.md,
    // seção "Mensagens de erro: uma lição".
    console.error(`Falha ao carregar /data/locais/${slug}.json —`, causa);
    mostrarEstado("Não foi possível carregar o conteúdo desta página.");
  }
}

carregar();
