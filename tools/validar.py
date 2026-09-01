#!/usr/bin/env python3
"""Valida a coerência entre dados, assets e páginas antes de publicar.

Existe por causa de um bug real: um GLB chamado `Acrimsat.glb` referenciado
no JSON como `acrimsat.glb`. O Windows não vê diferença entre os dois; o
Linux do Cloudflare Pages vê. O modelo funcionou local e deu 404 em produção.

Uso:
    python tools/validar.py

Sai com código 1 se encontrar qualquer problema, para poder ser usado
em automação depois.
"""

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
problemas = []
avisos = []


def erro(msg):
    problemas.append(msg)


def aviso(msg):
    avisos.append(msg)


def validar_satelite(caminho_json):
    slug_arquivo = caminho_json.stem

    try:
        dados = json.loads(caminho_json.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        erro(f"{caminho_json.relative_to(RAIZ)}: JSON inválido — {e}")
        return
    except UnicodeDecodeError as e:
        erro(f"{caminho_json.relative_to(RAIZ)}: não é UTF-8 válido — {e}")
        return

    # O slug precisa bater com o nome do arquivo, com a pasta da página e
    # com a pasta dos assets — é ele que amarra as três coisas.
    slug = dados.get("slug")
    if slug != slug_arquivo:
        erro(f"{caminho_json.name}: campo slug é {slug!r}, esperado {slug_arquivo!r}")

    for campo in ("slug", "nome", "resumo", "modelo", "ficha", "secoes"):
        if campo not in dados:
            erro(f"{slug_arquivo}: falta o campo obrigatório {campo!r}")

    # --- o modelo 3D ---
    modelo = dados.get("modelo", {})
    arquivo = modelo.get("arquivo")
    if arquivo:
        caminho = RAIZ / "assets" / "models" / slug_arquivo / arquivo
        if not existe_com_maiusculas_exatas(caminho):
            reais = listar(RAIZ / "assets" / "models" / slug_arquivo)
            erro(
                f"{slug_arquivo}: JSON pede {arquivo!r}, "
                f"mas em assets/models/{slug_arquivo}/ existe {reais}"
            )

    poster = modelo.get("poster")
    if poster:
        caminho = RAIZ / "assets" / "models" / slug_arquivo / poster
        if not existe_com_maiusculas_exatas(caminho):
            erro(f"{slug_arquivo}: poster {poster!r} não encontrado")

    if not modelo.get("alt"):
        erro(f"{slug_arquivo}: modelo.alt está vazio (acessibilidade)")

    # --- a página ---
    pagina = RAIZ / "satelites" / slug_arquivo / "index.html"
    if not pagina.exists():
        erro(f"{slug_arquivo}: falta satelites/{slug_arquivo}/index.html")
    else:
        html = pagina.read_text(encoding="utf-8")
        if f'data-slug="{slug_arquivo}"' not in html:
            erro(
                f"satelites/{slug_arquivo}/index.html: data-slug não é "
                f'"{slug_arquivo}" — a página buscaria o JSON errado'
            )
        # ADR-009: nome e resumo são copiados de propósito para o HTML.
        # Cópia deliberada precisa ser conferida, senão vira divergência.
        for campo in ("nome", "nome_completo", "resumo"):
            valor = dados.get(campo)
            if valor and valor not in html:
                aviso(
                    f"satelites/{slug_arquivo}/index.html: o {campo} do HTML "
                    f"não bate com o do JSON (ADR-009)"
                )

    # --- nomes seguros para URL ---
    for nome in listar(RAIZ / "assets" / "models" / slug_arquivo):
        if nome != nome.lower() or " " in nome:
            erro(
                f"assets/models/{slug_arquivo}/{nome}: nome de arquivo com "
                f"maiúscula ou espaço — quebra em servidor Linux"
            )

    # --- tamanho final em metros ---
    # Comparar o campo "escala" entre satélites não basta: o mesmo número
    # produz tamanhos diferentes conforme a caixa delimitadora e a escala
    # dos NÓS de cada modelo. O que importa é o tamanho final.
    if arquivo:
        caminho = RAIZ / "assets" / "models" / slug_arquivo / arquivo
        if existe_com_maiusculas_exatas(caminho):
            # Sinal forte de escala copiada por engano: o arquivo JÁ declara
            # escala nos próprios nós (ou seja, o autor calibrou o tamanho)
            # e ainda assim a página aplica um fator por cima.
            if modelo.get("escala") and nos_tem_escala(caminho):
                erro(
                    f"{slug_arquivo}: o GLB já declara escala nos próprios nós "
                    f"(o arquivo foi calibrado pelo autor), mas o JSON aplica "
                    f"modelo.escala={modelo['escala']!r} por cima. "
                    f"Provável cópia de outro satélite — use escala: null."
                )

            nativo = maior_dimensao_glb(caminho)
            if nativo:
                fator = primeiro_fator(modelo.get("escala"))
                final = nativo * fator
                if not (0.03 <= final <= 4.0):
                    erro(
                        f"{slug_arquivo}: o modelo apareceria com {final:.3f} m "
                        f"(nativo {nativo:.3f} m x escala {fator}). "
                        f"Fora da faixa utilizável em sala (3 cm a 4 m)."
                    )
                else:
                    aviso(
                        f"{slug_arquivo}: tamanho final {final:.3f} m "
                        f"({final * 100:.1f} cm) — confira se corresponde ao "
                        f"objeto real."
                    )


def primeiro_fator(escala) -> float:
    """O campo escala é uma string "x y z" ou None. None significa
    "usar o tamanho nativo do arquivo", ou seja, fator 1."""
    if not escala:
        return 1.0
    try:
        return float(str(escala).split()[0])
    except (ValueError, IndexError):
        return 1.0


def maior_dimensao_glb(caminho: Path):
    """Maior dimensão do modelo em metros, COMO O VISUALIZADOR VÊ.

    A armadilha que originou esta função: ler apenas min/max dos vértices
    ignora o campo `scale` dos nós. O ACRIMSAT tem escala 0,01737 nos nós —
    seus vértices vão a 138 unidades, mas ele renderiza com 2,42 m. Ler só
    os vértices levaria à conclusão oposta.
    """
    import struct

    try:
        with open(caminho, "rb") as f:
            struct.unpack("<III", f.read(12))
            tam, _ = struct.unpack("<II", f.read(8))
            g = json.loads(f.read(tam).decode("utf-8"))
    except (OSError, struct.error, json.JSONDecodeError, UnicodeDecodeError):
        return None

    acessores = g.get("accessors", [])
    lo = [float("inf")] * 3
    hi = [float("-inf")] * 3

    for no in g.get("nodes", []):
        if "mesh" not in no:
            continue
        # matrix combinaria rotação e escala; não ocorre no acervo atual e
        # decompô-la aqui não se paga. Se aparecer, é melhor avisar.
        if "matrix" in no:
            return None
        s = no.get("scale", [1, 1, 1])
        t = no.get("translation", [0, 0, 0])
        for prim in g["meshes"][no["mesh"]].get("primitives", []):
            i = prim.get("attributes", {}).get("POSITION")
            if i is None or "min" not in acessores[i]:
                continue
            a = acessores[i]
            for k in range(3):
                lo[k] = min(lo[k], a["min"][k] * s[k] + t[k])
                hi[k] = max(hi[k], a["max"][k] * s[k] + t[k])

    if lo[0] == float("inf"):
        return None
    return max(hi[k] - lo[k] for k in range(3))


def nos_tem_escala(caminho: Path) -> bool:
    """True se algum nó com malha declara escala diferente de 1.

    Quando isso acontece, o modelador já converteu o arquivo para metros —
    aplicar outro fator na página quase sempre é engano."""
    import struct

    try:
        with open(caminho, "rb") as f:
            struct.unpack("<III", f.read(12))
            tam, _ = struct.unpack("<II", f.read(8))
            g = json.loads(f.read(tam).decode("utf-8"))
    except (OSError, struct.error, json.JSONDecodeError, UnicodeDecodeError):
        return False

    for no in g.get("nodes", []):
        if "mesh" in no and no.get("scale", [1, 1, 1]) != [1, 1, 1]:
            return True
    return False


def existe_com_maiusculas_exatas(caminho: Path) -> bool:
    """Path.exists() mente no Windows: ele acha 'Acrimsat.glb' quando você
    pergunta por 'acrimsat.glb'. Comparar com o que o diretório realmente
    lista é o que reproduz o comportamento do servidor Linux."""
    if not caminho.parent.is_dir():
        return False
    return caminho.name in {p.name for p in caminho.parent.iterdir()}


def listar(pasta: Path):
    return sorted(p.name for p in pasta.iterdir()) if pasta.is_dir() else []


def main():
    pasta = RAIZ / "data" / "satelites"
    arquivos = sorted(pasta.glob("*.json")) if pasta.is_dir() else []

    if not arquivos:
        print("Nenhum satélite encontrado em data/satelites/")
        return 0

    for caminho in arquivos:
        validar_satelite(caminho)

    for a in avisos:
        print(f"  aviso  {a}")
    for p in problemas:
        print(f"  ERRO   {p}")

    print()
    print(
        f"{len(arquivos)} satélite(s) verificado(s) — "
        f"{len(problemas)} erro(s), {len(avisos)} aviso(s)"
    )
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main())
