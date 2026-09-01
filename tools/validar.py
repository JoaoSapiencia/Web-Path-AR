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
        for campo in ("nome", "resumo"):
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

    # --- escala herdada por engano ---
    escala = modelo.get("escala")
    if escala:
        outros = [
            p.stem
            for p in (RAIZ / "data" / "satelites").glob("*.json")
            if p.stem != slug_arquivo
            and json.loads(p.read_text(encoding="utf-8"))
            .get("modelo", {})
            .get("escala") == escala
        ]
        if outros:
            aviso(
                f"{slug_arquivo}: escala {escala!r} é idêntica à de "
                f"{', '.join(outros)}. Escala é calculada a partir da caixa "
                f"delimitadora de CADA modelo — confira se não foi copiada."
            )


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
