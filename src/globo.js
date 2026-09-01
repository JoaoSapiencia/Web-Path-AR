/* Globo interativo da home.
 *
 * Consome data/locais.geojson — a camada LEVE do modelo de dados (ADR-004).
 * O conteúdo completo de cada localidade vive em data/locais/<slug>.json e
 * não é carregado aqui: o globo desenha marcadores, não páginas.
 *
 * O MapLibre 6 distribui apenas ESM, então o import vem direto do CDN.
 * Versão exata pela mesma razão do ADR-010: a biblioteca não deve mudar
 * sozinha entre uma aula e outra.
 */

// O MapLibre 6 exporta apenas nomes — NÃO existe export default. Um
// `import maplibregl from ...` lança SyntaxError na avaliação do módulo,
// antes de qualquer linha deste arquivo rodar, e a página fica preta sem
// nenhuma mensagem. Exemplos antigos com import default são de versões
// anteriores.
import * as maplibregl from "https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs";

const ESTILO = "https://tiles.openfreemap.org/styles/dark";

const alvo = document.querySelector("#globo");
const estado = document.querySelector("#estado");

function mostrarEstado(mensagem, tipo = "erro") {
  estado.textContent = mensagem;
  estado.className = `estado estado--${tipo}`;
  estado.hidden = false;
}

/** Mesmo teste da página de satélite: capacidade, não navegador. */
function temWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") || canvas.getContext("webgl")
    );
  } catch {
    return false;
  }
}

if (!temWebGL()) {
  // Sem WebGL não há globo possível. Melhor remover a área do que deixar
  // um retângulo preto sem explicação — a mesma decisão da Fase 4.
  alvo.remove();
  mostrarEstado(
    "Este navegador não consegue exibir o globo interativo, que precisa de " +
    "gráficos 3D. As páginas dos satélites continuam acessíveis pelos " +
    "QR Codes do material impresso.",
    "aviso"
  );
} else {
  iniciar();
}

function iniciar() {
  const mapa = new maplibregl.Map({
    container: alvo,
    style: ESTILO,
    center: [-40, -10],
    zoom: 1.6,
    // Sem rotação por dois dedos: num celular, o gesto de girar compete com
    // o de arrastar o globo, e arrastar é o que interessa aqui.
    pitchWithRotate: false,
    dragRotate: false,
    // O logo do MapLibre some, mas a atribuição dos dados NÃO — ela é
    // exigência de licença do OpenStreetMap, não enfeite.
    attributionControl: { compact: true },
  });

  // Projeção de globo: desenha a esfera em vez de projetá-la num plano.
  // Precisa ser aplicada depois que o estilo carrega, porque o estilo pode
  // trazer a sua própria declaração de projeção.
  mapa.on("style.load", () => {
    mapa.setProjection({ type: "globe" });
    simplificarEstilo(mapa);
    personalizarCores(mapa);
    aplicarAtmosfera(mapa);
    adicionarLocais(mapa);
  });

  // O OpenFreeMap é gratuito e sem SLA — risco registrado no
  // ARCHITECTURE.md §9. Numa rede escolar com filtro, é cenário provável.
  mapa.on("error", (evento) => {
    console.error("MapLibre:", evento.error ?? evento);
    if (!mapa.isStyleLoaded()) {
      mostrarEstado(
        "Não foi possível carregar o mapa. As páginas dos satélites " +
        "continuam acessíveis pelos QR Codes do material impresso."
      );
    }
  });

  mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }));
}

/** Remove o ruído visual do estilo base, deixando só o contexto geográfico.
 *
 * O estilo "dark" do OpenFreeMap foi pensado para navegação de rua: seus
 * rótulos de cidade, vila e subúrbio têm minzoom 0, ou seja, aparecem mesmo
 * com o globo inteiro visível. Numa vista de continente isso vira poluição
 * — e é redundante, porque a camada "locais-rotulo" (ver adicionarLocais)
 * já desenha o nome de cada base.
 *
 * Filtrar por CATEGORIA em vez de listar IDs fixos: se o OpenFreeMap
 * reorganizar o estilo, esta função continua funcionando pelo que cada
 * camada FAZ, não pelo nome que tinha na versão testada. */
function simplificarEstilo(mapa) {
  for (const camada of mapa.getStyle().layers) {
    const escondeSempre =
      camada.type === "symbol" ||       // todo texto: nomes, rótulos de via
      camada.id === "boundary_state" || // fronteiras internas de país
      /^(highway|railway|road|aeroway|building)/.test(camada.id);

    if (escondeSempre) {
      mapa.setLayoutProperty(camada.id, "visibility", "none");
    }
  }
  // O que fica: fundo, água, terreno (gelo/floresta) e fronteiras de país
  // (boundary_country_*) — contexto geográfico sem detalhe de rua.
}

/** Recolore o terreno e a água. O estilo "dark" não tem uma camada de
 * "país" separada — o continente é só o que sobra sem cobertura mais
 * específica (água, gelo, floresta...). Recolorir "background" recolore
 * todo o continente de uma vez. */
function personalizarCores(mapa) {
  mapa.setPaintProperty("background", "background-color", "#0f2318");
  mapa.setPaintProperty("water", "fill-color", "#0b2d52");

  // Gelo e geleira: no estilo "dark" original, essas duas camadas eram
  // quase pretas (rgb(12,12,12) e hsl(0,1%,2%)) de propósito — para se
  // confundir com o antigo fundo, também quase preto. Ao recolorir o
  // continente para verde, essas duas camadas passaram a se destacar como
  // manchas pretas sólidas (Groenlândia, Antártida). Um tom claro e frio
  // lê como gelo de verdade, e volta a se misturar ao restante da paleta.
  mapa.setPaintProperty("landcover_ice_shelf", "fill-color", "#c9d6e3");
  mapa.setPaintProperty("landcover_glacier", "fill-color", "#c9d6e3");
}

/** Névoa/atmosfera ao redor do globo — recurso nativo do MapLibre para a
 * projeção "globe", não um efeito de CSS.
 *
 * horizon-color NÃO é um gradiente plano: o shader recebe a posição de tela
 * do contorno real da esfera (uniforme u_horizon, recalculado a cada
 * zoom/rotação) e desenha o brilho acompanhando essa curva — confirmado
 * lendo o bundle antes de usar. É o "brilho saindo do globo".
 *
 * sky-horizon-blend controla a LARGURA da faixa de brilho (maior = mais
 * larga, mais suave). Além dela, sky-color assume — mantido escuro para o
 * brilho ficar concentrado perto da borda, não espalhado pela tela toda. */
function aplicarAtmosfera(mapa) {
  mapa.setSky({
    "sky-color": "#050a14",
    "sky-horizon-blend": 0.5,
    "horizon-color": "#4fa3ff",
    "horizon-fog-blend": 0.6,
    "fog-color": "#05070d",
    "fog-ground-blend": 0.7,

    // O parâmetro que faltava. O padrão é 0, e o código-fonte do MapLibre
    // faz "if (atmosphere-blend === 0) return" — com 0, a rotina do céu
    // inteira era PULADA, não aplicada fracamente. Nenhuma cor acima
    // chegava a ser desenhada.
    //
    // Esse mesmo valor também controla o quanto o "vazio" ao redor do globo
    // vira transparente (mistura para preto totalmente transparente no
    // shader). Um valor no meio permite as duas coisas ao mesmo tempo: o
    // brilho perto da borda continua visível, e a região funda do céu fica
    // parcialmente transparente — revelando, atrás do <canvas>, o campo de
    // estrelas em CSS (ver .globo-area em styles.css). Ajustar este número
    // para mais transparência ou mais brilho é uma troca, não um acerto.
    "atmosphere-blend": 0.55,
  });
}

function adicionarLocais(mapa) {
  // Um SOURCE alimenta várias LAYERS. É a distinção central do MapLibre:
  // o source diz de onde vêm os dados, a layer diz como desenhá-los.
  mapa.addSource("locais", {
    type: "geojson",
    data: "/data/locais.geojson",
  });

  // Halo: um círculo maior e translúcido embaixo, que faz o ponto ser
  // visível sobre continente claro e sobre oceano escuro.
  mapa.addLayer({
    id: "locais-halo",
    type: "circle",
    source: "locais",
    paint: {
      "circle-radius": 12,
      "circle-color": "#7fb2ff",
      "circle-opacity": 0.18,
    },
  });

  mapa.addLayer({
    id: "locais-ponto",
    type: "circle",
    source: "locais",
    paint: {
      "circle-radius": 5,
      // Cor por propriedade: o dado decide a aparência, não o código.
      // Acrescentar um tipo novo é editar esta expressão, não escrever if.
      "circle-color": [
        "match",
        ["get", "tipo"],
        "base-lancamento", "#7fb2ff",
        "curso", "#ffc46b",
        "#e8eaf0",
      ],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#05070d",
    },
  });

  mapa.addLayer({
    id: "locais-rotulo",
    type: "symbol",
    source: "locais",
    layout: {
      "text-field": ["get", "nome"],
      "text-size": 12,
      "text-offset": [0, 1.4],
      "text-anchor": "top",
      // Onde não couber sem colidir, o MapLibre esconde o rótulo em vez de
      // sobrepor. Num globo com zoom baixo isso acontece bastante.
      "text-optional": true,
    },
    paint: {
      "text-color": "#e8eaf0",
      "text-halo-color": "#05070d",
      "text-halo-width": 1.5,
    },
  });

  // --- Interação ---

  const popup = new maplibregl.Popup({
    closeButton: true,
    offset: 12,
    maxWidth: "18rem",
  });

  mapa.on("click", "locais-ponto", (evento) => {
    const feicao = evento.features[0];
    const { nome, resumo } = feicao.properties;

    // O conteúdo do popup é montado com DOM, não com string de HTML:
    // o texto vem de um arquivo de dados e é tratado como texto.
    const caixa = document.createElement("div");
    caixa.className = "popup-local";

    const titulo = document.createElement("h2");
    titulo.textContent = nome;

    const texto = document.createElement("p");
    texto.textContent = resumo;

    caixa.append(titulo, texto);

    // A página da localidade chega na Fase 6. Até lá, não há link —
    // um link para uma rota que devolve 404 seria pior que nenhum link.

    popup
      // Ancorar na coordenada da feição, e não no ponto do clique, evita
      // o popup "escorregar" quando o globo gira.
      .setLngLat(feicao.geometry.coordinates)
      .setDOMContent(caixa)
      .addTo(mapa);
  });

  // Sinal visual de que o ponto é clicável. Só faz sentido com mouse;
  // em toque não há cursor, e não atrapalha.
  for (const evento of ["mouseenter", "mouseleave"]) {
    mapa.on(evento, "locais-ponto", () => {
      mapa.getCanvas().style.cursor =
        evento === "mouseenter" ? "pointer" : "";
    });
  }
}
