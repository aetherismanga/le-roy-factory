#!/usr/bin/env python3
"""Construit les calques français des pages de robinetterie AQUAHOME."""

from __future__ import annotations

import json
from pathlib import Path

import fitz


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "assets/pdf/aquahome2026.pdf"
OUTPUT = ROOT / "assets/data/aquahome-french-overlays.json"

TRANSLATIONS = {
    "SERIES DE BAÑO": "SÉRIES DE SALLE DE BAINS",
    "GRIFERÍA EXENTA": "ROBINETTERIE SUR PIED",
    "WC BIDÉ": "DOUCHETTES HYGIÉNIQUES",
    "LAVABO XL": "MITIGEUR LAVABO HAUT",
    "LAVABO": "MITIGEUR LAVABO",
    "BIDÉ": "MITIGEUR BIDET",
    "BAÑO": "MITIGEUR BAIN-DOUCHE",
    "DUCHA": "MITIGEUR DOUCHE",
    "LAVABO ENCASTRAR": "MITIGEUR LAVABO ENCASTRÉ",
    "LAVABO APERTURA EN FRÍO": "MITIGEUR LAVABO - OUVERTURE À FROID",
    "ACABADOS DISPONIBLES": "FINITIONS DISPONIBLES",
    "KIT DE GRIFO MONOMANDO ENCASTRAR DE DUCHA": "KIT DOUCHE ENCASTRÉ MONOCOMMANDE",
    "KIT DE GRIFO TERMOSTÁTICO ENCASTRAR DE DUCHA": "KIT DOUCHE ENCASTRÉ THERMOSTATIQUE",
    "- Cuerpo latón / maneta zamac": "- Corps en laiton / manette en zamak",
    "- Cuerpo de latón / maneta zamac": "- Corps en laiton / manette en zamak",
    "- Cuerpo latón cromado / maneta zamac": "- Corps en laiton chromé / manette en zamak",
    "- Cuerpo latón cromado / volante zamac": "- Corps en laiton chromé / croisillons en zamak",
    "- Cuerpo latón / volante zamac": "- Corps en laiton / croisillons en zamak",
    "- Cuerpo y caño latón / maneta zamac": "- Corps et bec en laiton / manette en zamak",
    "- Cartucho de 35 mm normalizado": "- Cartouche normalisée de 35 mm",
    "- Cartucho cerámico 40 mm normalizado": "- Cartouche céramique normalisée de 40 mm",
    "- Atomizador de latón normalizado AENOR": "- Aérateur en laiton normalisé AENOR",
    "- Atomizador de latón normalizado": "- Aérateur en laiton normalisé",
    "- Atomizador de latón": "- Aérateur en laiton",
    "- Atomizador empotrado": "- Aérateur intégré",
    "- Base incluida": "- Embase incluse",
    "- Tornillo fijación de acero AISI 301": "- Vis de fixation en acier AISI 301",
    "- Distribuidor de latón": "- Inverseur en laiton",
    "- Distribuidor de latón manual": "- Inverseur manuel en laiton",
    "- Distribuidor de latón volante redondo": "- Inverseur en laiton à commande ronde",
    "- Distribuidor de latón volante redondo 2 vías": "- Inverseur 2 voies en laiton à commande ronde",
    "- Distribuidor de latón volante 2 vías": "- Inverseur 2 voies en laiton",
    "- Distribuidor de baño - ducha latón": "- Inverseur bain-douche en laiton",
    "- Rótula + aireador de latón": "- Rotule et aérateur en laiton",
    "- Rótula y aireador de latón": "- Rotule et aérateur en laiton",
    "- Excéntricas con florón en latón niquelado": "- Raccords excentrés avec rosaces en laiton nickelé",
    "- Manual ducha antical, soporte": "- Douchette anticalcaire et support",
    "- Manual ducha antical": "- Douchette anticalcaire",
    "- Manual ducha antical, soporte articulado en ABS y": "- Douchette anticalcaire et support articulé en ABS",
    "- Manual ducha antical, soporte articulado en ABS": "- Douchette anticalcaire et support articulé en ABS",
    "- Manual ducha antical, soporte articulado": "- Douchette anticalcaire et support articulé",
    "- Manual ducha antical, soporte articulado en": "- Douchette anticalcaire et support articulé",
    "- Flexible metálico reforzado 1,5 mts": "- Flexible métallique renforcé de 1,5 m",
    "- Flexible de ducha metálico reforzado 1,50 mts": "- Flexible de douche métallique renforcé de 1,5 m",
    "- Flexible metal reforzado 1,2mts": "- Flexible métallique renforcé de 1,2 m",
    "- Flexible reforzado 1,2 mts": "- Flexible renforcé de 1,2 m",
    "- Cuerpo empotrado a pared/caja de registro": "- Corps encastré mural avec boîtier de protection",
    "- Cuerpo empotrado con caja de registro": "- Corps encastré avec boîtier de protection",
    "- Soporte con toma de agua con salida a pared": "- Support mural avec arrivée d’eau intégrée",
    "- Soporte con toma de agua a pared": "- Support avec arrivée d’eau murale",
    "- Brazo de ducha pared (opción a techo) latón": "- Bras de douche mural en laiton, pose plafond possible",
    "- Brazo de ducha pared latón": "- Bras de douche mural en laiton",
    "- Rociador ø25 acero inoxidable S304 extraplano antical": "- Pomme de douche Ø 25 cm en inox S304, extraplate et anticalcaire",
    "- Rociador 25x25 acero inoxidable S304 extraplano antical": "- Pomme de douche 25 x 25 cm en inox S304, extraplate et anticalcaire",
    "- Mango de ducha redondo 1 posición": "- Douchette ronde 1 jet",
    "- Mango de ducha tubular 1 posición": "- Douchette tubulaire 1 jet",
    "- Volante ABS con regulador de caudal y temperatura": "- Commande ABS avec réglage du débit et de la température",
    "- Grifería termostática agua fría y caliente": "- Mitigeur thermostatique eau chaude/eau froide",
    "- Grifería monomando latón cromo 2 vías": "- Mitigeur monocommande 2 voies en laiton chromé",
    "- Bimando": "- Deux poignées",
    "- Rosca de sujeción": "- Filetage de fixation",
    "- Opción maneta intercambiable": "- Manette interchangeable en option",
    "- Aireador anticalcáreo M 24 x 1": "- Aérateur anticalcaire M24 x 1",
    "- Caño giratorio 360º": "- Bec orientable à 360°",
    "- Altura 120cms / Base 26,5 x 5cm": "- Hauteur 120 cm / embase 26,5 x 5 cm",
    "- Ducha de mano monochorro y flexible 1,5 m": "- Douchette 1 jet avec flexible de 1,5 m",
    "- Caño desplazable/oculto debajo del grifo": "- Bec mobile escamotable sous le mitigeur",
    "- Cuerpo de lavabo universal necesario": "- Corps universel pour lavabo requis",
    "- Entrada agua caliente y fría de ø 1/2”": "- Arrivées eau chaude et eau froide Ø 1/2”",
    "- Sistema válido para todo tipo de paredes": "- Compatible avec tous les types de murs",
    "- Grifo empotrado fabricado en latón": "- Robinet encastré fabriqué en laiton",
    "- Mango de una posición": "- Douchette 1 jet",
    "- Mezclador": "- Mélangeur",
    "- Sustitutivo llave paso WC": "- Remplace le robinet d’arrêt du WC",
    "- Cierre 1/4 de vuelta.": "- Fermeture quart de tour",
    "- No requiere instalación": "- Aucune installation spécifique requise",
    "Cromo brillo": "Chrome brillant",
    "Negro mate": "Noir mat",
    "Oro cepillado": "Or brossé",
    "Inox cepillado": "Inox brossé",
    "Blanco mate": "Blanc mat",
    "Acero inoxidable": "Acier inoxydable",
    "Latón envejecido": "Laiton vieilli",
}

FINISHES = {
    "Cromo brillo", "Negro mate", "Oro cepillado", "Inox cepillado",
    "Blanco mate", "Acero inoxidable", "Latón envejecido",
}

FINISH_REPLACEMENTS = {
    "Cromo brillo": "Chrome brillant",
    "Negro mate": "Noir mat",
    "Oro cepillado": "Or brossé",
    "Inox cepillado": "Inox brossé",
    "Blanco mate": "Blanc mat",
    "Acero inoxidable": "Acier inoxydable",
    "Latón envejecido": "Laiton vieilli",
    "Copper cepillado": "Cuivre brossé",
}


def main() -> None:
    document = fitz.open(PDF)
    overlays = []
    for page_number in range(9, 30):
        page = document[page_number - 1]
        width, height = page.rect.width, page.rect.height
        for block in page.get_text("blocks"):
            x0, y0, x1, y1, raw = block[:5]
            source = " ".join(raw.split())
            translated = TRANSLATIONS.get(source)
            compound_finish = False
            if not translated and not any(character.isdigit() for character in source):
                translated = source
                for spanish, french in FINISH_REPLACEMENTS.items():
                    translated = translated.replace(spanish, french)
                compound_finish = translated != source
                if not compound_finish:
                    translated = None
            if not translated:
                continue
            title = not source.startswith("-") and source.upper() == source
            finish = source in FINISHES or compound_finish
            # Les traductions françaises sont parfois plus longues : la zone peut
            # s'étendre jusqu'à la colonne suivante sans recouvrir les références.
            available = 60 if finish else (220 if x0 >= width / 2 else 260)
            box_width = min(max(x1 - x0 + 5, available), width - x0 - 6)
            box_height = max(y1 - y0 + 3, 16 if title else 14)
            overlays.append({
                "page": page_number,
                "box": [round(x0 / width, 7), round((y0 - 1) / height, 7), round(box_width / width, 7), round(box_height / height, 7)],
                "text": translated,
                "kind": "finish" if finish else ("title" if title else "technical"),
            })
    OUTPUT.write_text(json.dumps({"version": "2026-09-14", "overlays": overlays}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(overlays)} calques français écrits dans {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
