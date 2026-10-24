// Public prices in cents. Cabinet and column prices: official France tariff 22/10/2026.
export const CATALOG = {
  "source": {
    "repository": "aetherismanga/le-roy-factory",
    "commit": "233ab6dda7fb71c5048ac1f983a67ceb3fe0b0c9",
    "path": "assets/js/studio-one/catalog.js",
    "sha256": "fc826b4e33f48ecce4527270b48212746702e41720e1e11d460bff87f8450065",
    "rule": "Meubles et colonne : tarif officiel France du 22/10/2026. Vasques, miroirs et accessoires : prix publics existants conservés.",
    "tariffDate": "2026-10-22",
    "tariffSource": "TARIF STUDIO ONE FRANCE PRIX TTC 20261021.pdf",
    "tariffDetails": "TARIFA STUDIO ONE Références.pdf",
    "unconfirmedReferences": ["14214 100@"],
    "vat": 20
  },
  "media": "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/",
  "models": [
    {
      "id": "two",
      "name": "2 tiroirs",
      "height": 54,
      "depth": 46,
      "base": "13692",
      "top": "14215",
      "bareTTC": [49200, 51500, 58400, 60500],
      "topTTC": [57300, 61700, 70800, 74900],
      "image": "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/2-tiroirs.webp"
    },
    {
      "id": "three",
      "name": "3 tiroirs avec pieds",
      "height": 91,
      "bodyHeight": 81,
      "legHeight": 10,
      "photoImage": "assets/studio-three-photo-hd-v1.webp",
      "depth": 46,
      "base": "13693",
      "top": "14216",
      "bareTTC": [66000, 71300, 79900, 83300],
      "topTTC": [74200, 81500, 92200, 97700],
      "image": "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/3-tiroirs.webp"
    },
    {
      "id": "one-xl",
      "name": "1 tiroir XL",
      "height": 37.5,
      "depth": 46,
      "base": "13691",
      "top": "14178",
      "bareTTC": [44100, 46600, 53400, 55400],
      "topTTC": [52200, 56900, 65700, 69700],
      "image": "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/1-tiroir-xl.webp"
    },
    {
      "id": "two-xl",
      "name": "2 tiroirs XL",
      "height": 75,
      "depth": 46,
      "base": "14176",
      "top": "14214",
      "bareTTC": [54100, 56600, 64200, 66500],
      "topTTC": [62200, 66800, null, 80900],
      "image": "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/2-tiroirs-xl.webp"
    }
  ],
  "finishes": [
    {
      "id": "ROBLE",
      "refCode": "ROBLE",
      "name": "Roble Amazona",
      "hex": "#bda084"
    },
    {
      "id": "ALBA",
      "refCode": "ALBA",
      "name": "Serenade Alba",
      "hex": "#c4ae94"
    },
    {
      "id": "NOGAL",
      "refCode": "NOGAL",
      "name": "Nogal Valentina",
      "hex": "#53433e"
    },
    {
      "id": "WHITE",
      "refCode": "WHITE",
      "name": "White Bolero",
      "hex": "#dfdeda"
    },
    {
      "id": "AZUL",
      "refCode": "AZUL",
      "name": "Azul Acero",
      "hex": "#61717c"
    },
    {
      "id": "GRIS",
      "refCode": "GRIS",
      "name": "Gris Tórtora",
      "hex": "#5e5559"
    },
    {
      "id": "BISC",
      "refCode": "BISC.",
      "name": "Biscuit",
      "hex": "#c9b29a"
    },
    {
      "id": "GREEN",
      "refCode": "GREEN",
      "name": "Muted Green",
      "hex": "#949280"
    }
  ],
  "sizes": [
    {
      "lo": 40,
      "hi": 60,
      "ref": "60",
      "label": "40–60 cm"
    },
    {
      "lo": 61,
      "hi": 80,
      "ref": "80",
      "label": "61–80 cm"
    },
    {
      "lo": 81,
      "hi": 100,
      "ref": "100",
      "label": "81–100 cm"
    },
    {
      "lo": 101,
      "hi": 120,
      "ref": "120",
      "label": "101–120 cm"
    }
  ],
  "inset": {
    "sella": {
      "gloss": {
        "60": {
          "ttc": 13800,
          "ref": "2215"
        },
        "70": {
          "ttc": 15600,
          "ref": "2808"
        },
        "80": {
          "ttc": 16320,
          "ref": "2171"
        },
        "90": {
          "ttc": 19800,
          "ref": "13237"
        },
        "100": {
          "ttc": 21120,
          "ref": "3279"
        },
        "120": {
          "ttc": 46200,
          "ref": "6389"
        },
        "120double": {
          "ttc": 38160,
          "ref": "2809"
        }
      }
    },
    "tampa": {
      "gloss": {
        "60": {
          "ttc": 14640,
          "ref": "6227"
        },
        "70": {
          "ttc": 16560,
          "ref": "7781"
        },
        "80": {
          "ttc": 17040,
          "ref": "6228"
        },
        "90": {
          "ttc": 20760,
          "ref": "7782"
        },
        "100": {
          "ttc": 23040,
          "ref": "6229"
        },
        "120": {
          "ttc": 33480,
          "ref": "6232"
        },
        "120double": {
          "ttc": 38760,
          "ref": "6235"
        }
      },
      "matte": {
        "60": {
          "ttc": 24360,
          "ref": "13039"
        },
        "70": {
          "ttc": 31680,
          "ref": "13040"
        },
        "80": {
          "ttc": 31680,
          "ref": "13041"
        },
        "90": {
          "ttc": 37920,
          "ref": "13042"
        },
        "100": {
          "ttc": 39840,
          "ref": "13043"
        },
        "120": {
          "ttc": 57000,
          "ref": "13044"
        },
        "120double": {
          "ttc": 59880,
          "ref": "13045"
        }
      },
      "black": {
        "60": {
          "ttc": 24360,
          "ref": "13039"
        },
        "70": {
          "ttc": 31680,
          "ref": "13040"
        },
        "80": {
          "ttc": 31680,
          "ref": "13041"
        },
        "90": {
          "ttc": 37920,
          "ref": "13042"
        },
        "100": {
          "ttc": 39840,
          "ref": "13043"
        },
        "120": {
          "ttc": 57000,
          "ref": "13044"
        },
        "120double": {
          "ttc": 59880,
          "ref": "13045"
        }
      }
    }
  },
  "insetColors": [
    {
      "code": "gloss",
      "name": "Blanc brillant",
      "hex": "#fafaf7"
    },
    {
      "code": "matte",
      "name": "Blanc mat",
      "hex": "#e5e4df"
    },
    {
      "code": "black",
      "name": "Noir mat",
      "hex": "#363638"
    }
  ],
  "vesselColors": [
    {
      "code": "gloss",
      "name": "Blanc brillant",
      "hex": "#f6f5f1",
      "Neris": "9567",
      "Torne": "9559"
    },
    {
      "code": "pure",
      "name": "Blanc pur",
      "hex": "#ffffff",
      "Neris": "9560",
      "Torne": "9552"
    },
    {
      "code": "anthracite",
      "name": "Anthracite",
      "hex": "#858689",
      "Neris": "9564",
      "Torne": "9556"
    },
    {
      "code": "black",
      "name": "Noir mat",
      "hex": "#424042",
      "Neris": "11371",
      "Torne": "10444"
    },
    {
      "code": "taupe",
      "name": "Taupe",
      "hex": "#aa9a8a",
      "Neris": "9561",
      "Torne": "9553"
    },
    {
      "code": "namibie",
      "name": "Vert Namibie",
      "hex": "#767765",
      "Neris": "9562",
      "Torne": "9554"
    },
    {
      "code": "ivory",
      "name": "Blanc ivoire",
      "hex": "#e8e6db",
      "Neris": "9563",
      "Torne": "9555"
    },
    {
      "code": "pink",
      "name": "Rose Nadir",
      "hex": "#c6a397",
      "Neris": "9566",
      "Torne": "9558"
    },
    {
      "code": "blue",
      "name": "Bleu Kivu",
      "hex": "#123755",
      "Neris": "9565",
      "Torne": "9557"
    }
  ],
  "vesselTTC": 27120,
  "mirrors": [
    {
      "id": "basic",
      "name": "Basic",
      "image": "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/accessories/mirror-basic.webp",
      "metal": false,
      "sizes": [
        {
          "label": "60 × 80 cm",
          "ref": "10129",
          "ttc": 7080,
          "width": 60,
          "height": 80,
          "refs": null
        },
        {
          "label": "70 × 60 cm",
          "ref": "12449",
          "ttc": 6600,
          "width": 70,
          "height": 60,
          "refs": null
        },
        {
          "label": "100 × 60 cm",
          "ref": "11054",
          "ttc": 8520,
          "width": 100,
          "height": 60,
          "refs": null
        },
        {
          "label": "120 × 60 cm",
          "ref": "10130",
          "ttc": 9360,
          "width": 120,
          "height": 60,
          "refs": null
        }
      ]
    },
    {
      "id": "zen",
      "name": "Zen LED",
      "image": "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/accessories/mirror-zen-led.webp",
      "metal": false,
      "sizes": [
        {
          "label": "60 × 80 cm",
          "ref": "11713",
          "ttc": 22080,
          "width": 60,
          "height": 80,
          "refs": null
        },
        {
          "label": "80 × 80 cm",
          "ref": "11533",
          "ttc": 24600,
          "width": 80,
          "height": 80,
          "refs": null
        },
        {
          "label": "100 × 80 cm",
          "ref": "11714",
          "ttc": 27480,
          "width": 100,
          "height": 80,
          "refs": null
        },
        {
          "label": "120 × 80 cm",
          "ref": "11523",
          "ttc": 31560,
          "width": 120,
          "height": 80,
          "refs": null
        }
      ]
    },
    {
      "id": "ilse",
      "name": "Ilse LED",
      "image": "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/accessories/mirror-ilse-led.webp",
      "metal": false,
      "sizes": [
        {
          "label": "60 × 80 cm",
          "ref": "12743",
          "ttc": 46680,
          "width": 60,
          "height": 80,
          "refs": null
        },
        {
          "label": "80 × 80 cm",
          "ref": "12744",
          "ttc": 52080,
          "width": 80,
          "height": 80,
          "refs": null
        },
        {
          "label": "100 × 80 cm",
          "ref": "12745",
          "ttc": 57720,
          "width": 100,
          "height": 80,
          "refs": null
        },
        {
          "label": "120 × 80 cm",
          "ref": "12746",
          "ttc": 63960,
          "width": 120,
          "height": 80,
          "refs": null
        }
      ]
    },
    {
      "id": "capsule",
      "name": "Cápsula LED",
      "image": "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/accessories/mirror-capsula-led.webp",
      "metal": false,
      "sizes": [
        {
          "label": "45 × 90 cm",
          "ref": "12741",
          "ttc": 41640,
          "width": 45,
          "height": 90,
          "refs": null
        }
      ]
    },
    {
      "id": "metal-rect",
      "name": "Miroir métallique rectangulaire",
      "image": "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/accessories/mirror-metal-rectangular.webp",
      "metal": true,
      "sizes": [
        {
          "label": "80 × 60 cm",
          "ref": "3731",
          "ttc": 25800,
          "width": 80,
          "height": 60,
          "refs": {
            "Noir": "3731",
            "Doré": "3727",
            "Bronze": "3728",
            "Argent": "3730"
          }
        },
        {
          "label": "120 × 75 cm",
          "ref": "10572",
          "ttc": 40800,
          "width": 120,
          "height": 75,
          "refs": {
            "Noir": "10572",
            "Doré": "10574",
            "Bronze": "10575",
            "Argent": "10577"
          }
        }
      ]
    },
    {
      "id": "round",
      "name": "Miroir métallique rond",
      "image": "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/randal/accessories/mirror-metal-round.webp",
      "metal": true,
      "sizes": [
        {
          "label": "Ø 60 cm",
          "ref": "3717",
          "ttc": 19440,
          "width": 60,
          "height": 60,
          "refs": {
            "Noir": "3717",
            "Doré": "3722",
            "Bronze": "3723",
            "Argent": "3725"
          }
        }
      ]
    }
  ],
  "column": {
    "name": "Colonne STUDIO ONE · 1 porte",
    "width": 38,
    "height": 132,
    "depth": 27,
    "ref": "14177",
    "ttc": 41300,
    "image": null
  },
  "gaps": [
    "Conditions commerciales individuelles RANDAL : absentes de validateProSession et des sources consultées.",
    "Colonne 14177 : photographie isolée avec correspondance certaine introuvable. Aucun visuel d’un autre modèle utilisé.",
    "Miroirs : prix public vérifié dans RANDAL V04 page 36 ; prix d’achat professionnel non documenté, sur demande.",
    "Largeur 40 cm : confirmation usine déjà demandée par le configurateur historique.",
    "Doubles vasques 120 cm : références présentes mais géométrie non prise en charge par la Bêta ; non proposées dans le parcours.",
    "Accessoires, robinetterie, sanitaires, revêtements et profilés : aucun prix repris sans grille vérifiée."
  ]
};

// Neutral selection images; the 3D scene keeps its actual reflections.
import {mirrorThumbnail} from '../mirror-thumbnail.js';
for(const mirror of CATALOG.mirrors)mirror.image=mirrorThumbnail(mirror.id);
