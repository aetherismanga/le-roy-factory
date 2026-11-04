// Verified ELIOS selection photos. Pool photographs and swatches are native
// images extracted from the official catalogue; no PDF screenshot or upscaling.
(() => {
  'use strict';
  const media = {
  "galleries": {
    "lithos": [
      "https://eliosceramica.com/wp-content/uploads/2023/10/Lithos_Ivory_amb2.jpg",
      "assets/img/elios/selection-20261028/lithos/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/lithos/ambiance-2.jpeg"
    ],
    "loveanddecors": [
      "https://www.tilelook.com/system/tile_picture/resource/23680891/d3d_default_Rainforest2.png",
      "assets/img/elios/selection-20261028/loveanddecors/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/loveanddecors/ambiance-2.jpeg",
      "assets/img/elios/selection-20261028/loveanddecors/ambiance-3.jpeg"
    ],
    "manhattan": [
      "https://eliosceramica.com/wp-content/uploads/2023/10/Manhattan_Pearl_amb2.jpg",
      "assets/img/elios/selection-20261028/manhattan/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/manhattan/ambiance-2.jpeg"
    ],
    "mysterium": [
      "https://eliosceramica.com/wp-content/uploads/2023/10/ELIOS_MYSTERIUM_ACQUA_LIVING.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/mysterium_amb_2-1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Mysterium_White_amb3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/mysterium_amb_3-1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/ELIOS_MYSTERIUM_OCEAN_BAGNO.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/ELIOS_MYSTERIUM_PEARL_COMMERCIALE.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Mysterium_Pearl_amb2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Mysterium_Pearl_amb1.jpg"
    ],
    "quercia": [
      "https://eliosceramica.com/wp-content/uploads/2022/11/Quercia_amb_kitchen.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-white-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-white-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-white-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-natural-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-natural-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-natural-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-honey-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-honey-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-honey-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-amber-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-amber-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-amber-03.jpg"
    ],
    "yosemite": [
      "https://eliosceramica.com/wp-content/uploads/2023/05/YOSEMITE_amb4.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-natural-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-natural-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-natural-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-honey-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-honey-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-honey-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-white-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-white-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-white-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-amber-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-amber-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-amber-03.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/05/YOSEMITE_amb3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/05/YOSEMITE_amb7.jpg"
    ],
    "bavaria-stone": [
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Bavaria_Stone_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Bavaria_Stone_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Bavaria_Stone_3-1-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/BAVARIA_ESTERNO.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/BAVARIA_STONE_OUTDOOR.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Bavaria_Stone_DETTAGLIO.jpg"
    ],
    "dolomiti": [
      "https://eliosceramica.com/wp-content/uploads/2021/11/DOLOMITI_LIVING_bianco_greige.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/DOLOMITI_CAMERA_beige.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_Beige_Ristorante_Interno_Esterno.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_Beige_Ristorante_Dett_Esterno.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_Beige_Ristorante_Dett_Interno.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/DOLOMITI_LIVING_greige.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_dettaglio.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_Greige_Sgabello.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_Pietra.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/DOLOMITI_BAGNO_grigio.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_Greige_Grigio_Esterno_Dett.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_greige_Grigio_Esterno.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_Grigio_In_Out_Dett.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/DOLOMITI_CUCINA_antracite.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_antracite_amb.jpg"
    ],
    "grand-place": [
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Bruxelles_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Bruxelles_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Bruxelles_4.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Bruxelles_5.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_1-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_4.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_5.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_6.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_7-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_8.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Namur_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/GrandPlace_namur_DecWarm_Esterno.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Namur_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Namur_1.jpg"
    ],
    "harmony": [
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_3-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_4.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_5-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Grey_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Grey_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Grey_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Grey_4-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Harmony_Grey_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Black_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Black_2-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Black_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Black_4.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Cream_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Harmony_Cream_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Harmony_Cream_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Cream_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Taupe_1-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Taupe_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Taupe_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Taupe_4.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Harmony_Taupe_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_6-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_7-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_8.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Grey_5-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Grey_6.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/HARMONY_GRAY.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Black_5-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Black_6.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Harmony_Cream_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Cream_4-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Cream_5-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/HARMONY_CREAM.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Taupe_5.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Taupe_6-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Taupe_7-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/harmony_taupe.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Harmony_Taupe_2.jpg"
    ],
    "millennium-quartz": [
      "https://eliosceramica.com/wp-content/uploads/2023/10/millenium_quartz_amb_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/millenium_quartz_amb_4.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/millenium_quartz_amb_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/millenium_quartz_amb_5.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/millenium_quartz_amb_1.jpg"
    ],
    "roma": [
      "https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Aventino_pav.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Aventino_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/ROMA_PALATINO_amb.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Roma_CELIO-1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Celio_pav_Cop.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Viminale_cucina.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Roma_viminale-1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Palatino_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Palatino_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Palatino_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Roma_palatino_esterno2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Palatino_PART.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Palatino_riv.jpg"
    ],
    "sedimenti": [
      "https://eliosceramica.com/wp-content/uploads/2024/10/SEDIMENTI-MODULO-BEIGE-TUMBLED-1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/EL_SEDIMENTI_BEIGE_LIRERIA.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_BEIGE_COMMERCIALE.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_TAGLI_INGRESSO_beige_white.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/SEDIMENTI-MODULO-GREY-TUMBLED.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_WHITE_GREY_IN_OUT.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_TAGLI_CUCINA_white_grey.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/SEDIMENTI-MODULO-SAND-TUMBLED.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_STICKS_BAGNO_sand.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_TAGLI_CAMERA_sand_white.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/SEDIMENTI-MODULO-BEIGE-TUMBLED.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_WHITE_SAND_BAGNO.jpg"
    ],
    "slate": [
      "https://eliosceramica.com/wp-content/uploads/2023/05/slate_amb_2-scaled.jpg",
      "https://www.fliesengigant.de/out/pictures/master/product/1/03f60606.jpg",
      "https://www.fliesengigant.de/out/pictures/master/product/4/ambiente3_dark.jpeg",
      "https://www.fliesengigant.de/out/pictures/master/product/4/slate_flame_cortile_04_1copia.jpg",
      "https://id-sol.fr/cdn/shop/files/slate_amb_7-scaled_1024x1024.jpg?v=1751123554",
      "https://www.fliesengigant.de/out/pictures/generated/product/4/1000_1000_75/stilllife_slate_gold60x120_30x60%281%29.jpg",
      "https://fliseshoppen.dk/wp-content/uploads/2022/06/Slate-Grey-60x60-2.jpg",
      "https://www.fliesengigant.de/out/pictures/master/product/3/03f60602.jpg",
      "https://www.fliesengigant.de/out/pictures/generated/product/1/1000_1000_75/03f60903.jpg",
      "https://www.fliesengigant.de/out/pictures/generated/product/4/1000_1000_75/03f36004.jpg"
    ],
    "brooklyn": [
      "https://eliosceramica.com/wp-content/uploads/2021/11/BROOKLYN_LVING_white.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/BROOKLYN_CAMERA_beige.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Brooklyn_Beige_Interno_Esterno.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Brooklyn_beige_amb.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Brooklyn_Beige_Vassoio.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/BROOKLYN_LIVING_taupe.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Brooklyn_Taupe_Esterno.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Brooklyn_Grey_PubblicoZenitale.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/BROOKLYN_BAR_dark_grey-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_BROOKLYN_ALMOND_LIVING.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_BROOKLYN_GOLD_BAGNO.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_BROOKLYN_GOLD_IN_OUT.jpg"
    ],
    "clay": [
      "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_BAR_COTTON_EMERALD.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_RISTORANTE_OCEAN_MUSTARD-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/Clay_Ocean_Bouquet_Cotton.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_BAGNO_LINEN.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_CAMERA_BOUQUET.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_bouquet_amb.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_CUCINA_SILK.jpg"
    ],
    "creta": [
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_CRETA_BISCOTTO_CLOE-AVENA_BAGNO.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-04.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-05.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-06.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-07.png",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-08.jpg"
    ],
    "deco": [
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-04.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-05.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-06.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-07.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-08.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-09.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-10.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-11.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-12.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-13.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-14.jpg"
    ],
    "d-esign-evo": [
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_evo_ciano_A-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_evo_ciano_B.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_evo_ciano_mix_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_evo_ciano_mix_2-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_evo_senape_A_dett.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_evo_senape_A.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_evo_senape_B-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_evo_Senape_mix_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_evo_Senape_mix_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_palazzo_ducale_A.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_palazzo_ducale_BW_B_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_palazzo_ducale_BW_B.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_palazzo_ducale_BW_D.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_palazzo_ducale_BW_X.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_palazzo_ducale_BW_Z.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_palazzo_ducale_C-scaled.jpg"
    ],
    "domus": [
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_DOMUS_MOONWHITE_OCEANBLUE_COMMERCIALE.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/domus/lot1-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/domus/lot1-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/domus/lot1-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/domus/lot1-04.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/domus/lot1-05.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/domus/lot1-06.jpg"
    ],
    "glow": [
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_GLOW_CALIFORNIA_BAGNO.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_GLOW_MONTANA_INGRESSO.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_GLOW_INDIANAVIRGINIA_COMMERCIALE.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_GLOW_ARIZONA_CUCINA.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_GLOW_DAKOTA_LIVING.jpg"
    ],
    "golden-hour": [
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_BAGNO_WHITE-LADY.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_COMMERCIALE_GIN-TONIC.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_BELLINI_RISTORANTE-1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_MARGARITA_CAMERA.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_ESTERNO-MOJITO_CAIPIRINHA.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN_HOUR_CAIPIRINHA_CUCINA.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_BAGNO_HAWAIAN_SHELL_GREY-LIGHT-copia.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_BLUE-LAGOON_SHELL_GREY-3D-SATEN_GREY-3D.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_BLUE-LAGOON-BAGNO.jpg"
    ],
    "hexagon": [
      "https://eliosceramica.com/wp-content/uploads/2023/05/hexagon_frame_grey_amb.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/05/hexagon_cube_sky_amb.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/05/hexagon_lily_teal_amb.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/05/hexagon_lily_grey_amb.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/05/HEXAGON_amb_1-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/05/HEXAGON_amb_4-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/05/HEXAGON_amb_8-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/05/HEXAGON_amb_6-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/05/HEXAGON_amb_7-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/05/HEXAGON_amb_5-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/05/HEXAGON_amb_3-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/05/HEXAGON_amb_2-scaled.jpg"
    ],
    "horizon": [
      "https://id-sol.fr/cdn/shop/files/Elios_Horizon_Carbone_1-scaled.jpg?v=1751116328",
      "assets/img/elios/selection-20261028/horizon/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/horizon/ambiance-2.jpeg"
    ],
    "marechiaro": [
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Amalfi_amb_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Amalfi_amb_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Amalfi_amb_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/marechiaro_amb_4.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_positano_amb_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_positano_blu_amb_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_positano_amb_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Sorrento_amb_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Sorrento_amb_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Sorrento_amb_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Sorrento_amb_4.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Sorrento_amb_5.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/marechiaro_amb_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_vietri_amb_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_vietri_bianco_amb_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_vietri_amb_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/marechiaro_amb_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/marechiaro_amb_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_mix_bianco_amb_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_mix_amb_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_mix_amb_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_mix_blu_amb_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_mix_amb_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_mix_amb_4.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/02/Marechiaro_positano_blu_amb_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/02/Marechiaro_mix_blu_amb_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/02/Marechiaro_blu_amb_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/02/Marechiaro_vietri_bianco_amb_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/02/Marechiaro_mix_bianco_amb_1.jpg"
    ],
    "montreal": [
      "https://peintner.shop/media/image/product/38853/md/montreal-boden-und-wandfliesen-85mm.jpg",
      "https://peintner.shop/media/image/variation/24831/md/montreal-boden-und-wandfliesen-85mm_farbe_white.jpg",
      "https://peintner.shop/media/image/variation/24832/md/montreal-boden-und-wandfliesen-85mm_farbe_grey.jpg",
      "https://peintner.shop/media/image/variation/24833/md/montreal-boden-und-wandfliesen-85mm_farbe_beige.jpg",
      "https://peintner.shop/media/image/variation/24834/md/montreal-boden-und-wandfliesen-85mm_farbe_taupe.jpg",
      "https://peintner.shop/media/image/variation/24835/md/montreal-boden-und-wandfliesen-85mm_farbe_dark.jpg"
    ],
    "shell": [
      "https://eliosceramica.com/wp-content/uploads/2025/10/shell.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_SHELL_IVORY-3D-SATEN_BAGNO-2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_SHELL_BEIGE-3D-MATT_CAMERA-1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_SHELL-BEIGE-copia.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_SHELL_BEIGE-3D-MATT_LIVING-1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_SHELL_GREY-3D-SATEN_GREY-3D.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_SHELL_COMMERCIALE-IVORY-LIGHT.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_-CUCINA_SHELL_BEIGE-LIGHT.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_SHELL_OUTDOOR_BEIGE-LIGHT.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_BAGNO_SHELL_GREY-LIGHT.jpg"
    ],
    "terre-etrusche": [
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Toscana_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Toscana_2-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Toscana_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Toscana_1-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Umbria_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Umbria_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Umbria_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Umbria_1-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Umbria_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Umbria_3-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Lazio_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Lazio_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Lazio_1-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Lazio_2-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TERRE_ETRUSCHE_outdoor.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Lazio_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Lazio_4-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Marche_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Marche_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Marche_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Marche_3-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Marche_4-scaled.jpg"
    ],
    "allure": [
      "https://cdn.dimora-shop.com/brands/6c148096c1e5aef97323b65ab5990523/products/f1f75f38a845f6a8e59bb8062dc46ee2/images/d7ad5d71917d41d5dd2394a9e8d15ab4.webp",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/allure/lot1-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/allure/lot1-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/allure/lot1-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/allure/lot1-04.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/allure/lot1-05.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/allure/lot1-06.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/allure/lot1-07.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/allure/lot1-08.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/allure/lot1-09.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/allure/lot1-10.jpg"
    ],
    "dust": [
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/terrae-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/terrae-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/terrae-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/terrae-04.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/blush-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/blush-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/blush-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/blush-04.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/blush-05.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/dove-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/dove-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/dove-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/dove-04.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ice-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ice-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ice-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ice-04.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/sage-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/sage-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/sage-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/sage-04.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/pine-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/pine-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/pine-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/pine-04.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/niagara-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/niagara-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/niagara-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/niagara-04.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/niagara-05.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ink-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ink-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ink-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ink-04.jpg",
      "https://eliosceramica.com/wp-content/uploads/2023/05/Dust_terrae_amb_2.jpg"
    ],
    "loveanddecors-creative": [
      "https://eliosceramica.com/wp-content/uploads/2021/05/LoveDecors_Equatorial_3.jpg",
      "assets/img/elios/selection-20261028/loveanddecors-creative/ambiance-1.jpeg"
    ],
    "segmento": [
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-03.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-04.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-05.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-06.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-07.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-08.jpg",
      "https://www.tilelook.com/system/tile_picture/resource/27518827/d3d_default_04I1510_1.jpg"
    ],
    "tropical": [
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Tropical_Salvia_1.jpg",
      "assets/img/elios/selection-20261028/tropical/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/tropical/ambiance-2.jpeg"
    ],
    "twist": [
      "https://eliosceramica.com/wp-content/uploads/2024/01/twist_amb_3.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/01/twist_amb_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/01/twist_amb_5.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/01/twist_amb_4.jpg",
      "https://eliosceramica.com/wp-content/uploads/2024/01/twist_amb_1.jpg"
    ],
    "venere": [
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_BAGNO_ATLANTE_PERLA-MATERICA.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_NUOVO-BAGNO_PERLA.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_BAGNO_AURA_AURA-MATERICA.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_COMMERCIALE-FLORA_RUGIADA-MATERICA_AURA-DORICA.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_NUOVO-BAGNO-SETA.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_COMMERCIALE-FLORA_RUGIADA-MATERICA_AURA-DORICA-1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_SCORCIO-OPTICA-ROSA_FLORA.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_BAGNO_RUGIADA_RUGIADA-MATERICA.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_BAGNO-ZEFIRO_DORICA-ZEFIRO.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_NUOVO-BAGNO-MARE.jpg",
      "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_BAGNO_ATLANTE_PERLA-MATERICA-1.jpg"
    ],
    "azuli-mood": [
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/chalk-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/chalk-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/sand-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/sand-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/bone-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/bone-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/thyme-green-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/thyme-green-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/burgundy-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/burgundy-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/coffee-bean-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/coffee-bean-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/blue-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/blue-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/bottle-green-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/bottle-green-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/turquoise-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/turquoise-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/dusk-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/dusk-02.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/dawn-01.jpg",
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/dawn-02.jpg"
    ],
    "dynasty": [
      "assets/img/elios/cersaie-2026/dynasty/ambiance-03.jpeg",
      "assets/img/elios/cersaie-2026/dynasty/ambiance-01.jpeg",
      "assets/img/elios/cersaie-2026/dynasty/ambiance-02.jpeg",
      "assets/img/elios/cersaie-2026/dynasty/ambiance-04.jpeg",
      "assets/img/elios/cersaie-2026/dynasty/ambiance-05.jpeg",
      "assets/img/elios/cersaie-2026/dynasty/ambiance-06.jpeg",
      "assets/img/elios/cersaie-2026/dynasty/ambiance-07.jpeg",
      "assets/img/elios/cersaie-2026/dynasty/ambiance-08.jpeg"
    ],
    "montblanc": [
      "assets/img/elios/cersaie-2026/montblanc/ambiance-02.jpeg",
      "assets/img/elios/cersaie-2026/montblanc/ambiance-01.jpeg",
      "assets/img/elios/cersaie-2026/montblanc/ambiance-03.jpeg",
      "assets/img/elios/cersaie-2026/montblanc/ambiance-04.jpeg",
      "assets/img/elios/cersaie-2026/montblanc/ambiance-05.jpeg",
      "assets/img/elios/cersaie-2026/montblanc/ambiance-06.jpeg"
    ],
    "stone-icon": [
      "assets/img/elios/cersaie-2026/stone-icon/ambiance-02.jpeg",
      "assets/img/elios/cersaie-2026/stone-icon/ambiance-01.jpeg",
      "assets/img/elios/cersaie-2026/stone-icon/ambiance-03.jpeg",
      "assets/img/elios/cersaie-2026/stone-icon/ambiance-04.jpeg",
      "assets/img/elios/cersaie-2026/stone-icon/ambiance-05.jpeg",
      "assets/img/elios/cersaie-2026/stone-icon/ambiance-06.jpeg",
      "assets/img/elios/cersaie-2026/stone-icon/ambiance-07.jpeg"
    ],
    "terraforma": [
      "assets/img/elios/cersaie-2026/terraforma/ambiance-04.jpeg",
      "assets/img/elios/cersaie-2026/terraforma/ambiance-01.jpeg",
      "assets/img/elios/cersaie-2026/terraforma/ambiance-02.jpeg",
      "assets/img/elios/cersaie-2026/terraforma/ambiance-03.jpeg",
      "assets/img/elios/cersaie-2026/terraforma/ambiance-05.jpeg",
      "assets/img/elios/cersaie-2026/terraforma/ambiance-06.jpeg"
    ],
    "pool-abyss": [
      "assets/img/elios/selection-20261028/pool-abyss/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/pool-abyss/ambiance-2.jpeg",
      "assets/img/elios/selection-20261028/pool-abyss/color-tikal.jpeg",
      "assets/img/elios/selection-20261028/pool-abyss/color-port-royal.jpeg",
      "assets/img/elios/selection-20261028/pool-abyss/color-atlantis.jpeg",
      "assets/img/elios/selection-20261028/pool-abyss/color-thonis.jpeg"
    ],
    "pool-acqua": [
      "assets/img/elios/selection-20261028/pool-acqua/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/pool-acqua/ambiance-2.jpeg",
      "assets/img/elios/selection-20261028/pool-acqua/color-light.jpeg",
      "assets/img/elios/selection-20261028/pool-acqua/color-river.jpeg",
      "assets/img/elios/selection-20261028/pool-acqua/color-deep.jpeg",
      "assets/img/elios/selection-20261028/pool-acqua/color-cobalt.jpeg"
    ],
    "pool-greek-isles": [
      "assets/img/elios/selection-20261028/pool-greek-isles/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/pool-greek-isles/ambiance-2.jpeg",
      "assets/img/elios/selection-20261028/pool-greek-isles/color-crete.jpeg"
    ],
    "pool-italian-slate": [
      "assets/img/elios/selection-20261028/pool-italian-slate/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/pool-italian-slate/ambiance-2.jpeg",
      "assets/img/elios/selection-20261028/pool-italian-slate/color-naples.jpeg",
      "assets/img/elios/selection-20261028/pool-italian-slate/color-firenze.jpeg"
    ],
    "pool-lakes": [
      "assets/img/elios/selection-20261028/pool-lakes/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/pool-lakes/ambiance-2.jpeg",
      "assets/img/elios/selection-20261028/pool-lakes/color-shasta.jpeg",
      "assets/img/elios/selection-20261028/pool-lakes/color-tahoe.jpeg"
    ],
    "pool-mare": [
      "assets/img/elios/selection-20261028/pool-mare/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/pool-mare/ambiance-2.jpeg",
      "assets/img/elios/selection-20261028/pool-mare/color-viridus.jpeg",
      "assets/img/elios/selection-20261028/pool-mare/color-altum.jpeg",
      "assets/img/elios/selection-20261028/pool-mare/color-caeles.jpeg"
    ],
    "pool-nevada": [
      "assets/img/elios/selection-20261028/pool-nevada/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/pool-nevada/ambiance-2.jpeg",
      "assets/img/elios/selection-20261028/pool-nevada/color-mohave.jpeg",
      "assets/img/elios/selection-20261028/pool-nevada/color-carson.jpeg",
      "assets/img/elios/selection-20261028/pool-nevada/color-vegas.jpeg",
      "assets/img/elios/selection-20261028/pool-nevada/color-reno.jpeg"
    ],
    "pool-pacific": [
      "assets/img/elios/selection-20261028/pool-pacific/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/pool-pacific/ambiance-2.jpeg",
      "assets/img/elios/selection-20261028/pool-pacific/color-japan.jpeg"
    ],
    "pool-quantum": [
      "assets/img/elios/selection-20261028/pool-quantum/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/pool-quantum/color-prism.jpeg",
      "assets/img/elios/selection-20261028/pool-quantum/color-vector.jpeg",
      "assets/img/elios/selection-20261028/pool-quantum/color-nova.jpeg"
    ],
    "pool-sea-breeze": [
      "assets/img/elios/selection-20261028/pool-sea-breeze/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/pool-sea-breeze/ambiance-2.jpeg",
      "assets/img/elios/selection-20261028/pool-sea-breeze/color-sky.jpeg",
      "assets/img/elios/selection-20261028/pool-sea-breeze/color-teal.jpeg"
    ],
    "pool-seychelles": [
      "assets/img/elios/selection-20261028/pool-seychelles/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/pool-seychelles/ambiance-2.jpeg",
      "assets/img/elios/selection-20261028/pool-seychelles/color-original.jpeg",
      "assets/img/elios/selection-20261028/pool-seychelles/color-blue.jpeg",
      "assets/img/elios/selection-20261028/pool-seychelles/color-cobalt.jpeg",
      "assets/img/elios/selection-20261028/pool-seychelles/color-light.jpeg",
      "assets/img/elios/selection-20261028/pool-seychelles/color-pearl.jpeg"
    ],
    "pool-twelfth-night": [
      "assets/img/elios/selection-20261028/pool-twelfth-night/ambiance-1.jpeg",
      "assets/img/elios/selection-20261028/pool-twelfth-night/ambiance-2.jpeg",
      "assets/img/elios/selection-20261028/pool-twelfth-night/color-orsino.jpeg",
      "assets/img/elios/selection-20261028/pool-twelfth-night/color-viola.jpeg"
    ]
  },
  "variants": {
    "lithos": {
      "Ivory": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/Lithos_Ivory_amb2.jpg"
      ]
    },
    "loveanddecors": {
      "Rainforest": [
        "https://www.tilelook.com/system/tile_picture/resource/23680891/d3d_default_Rainforest2.png"
      ]
    },
    "manhattan": {
      "Pearl": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/Manhattan_Pearl_amb2.jpg"
      ]
    },
    "mysterium": {
      "Acqua": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/ELIOS_MYSTERIUM_ACQUA_LIVING.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/mysterium_amb_2-1.jpg"
      ],
      "White": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/Mysterium_White_amb3.jpg"
      ],
      "Amber": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/mysterium_amb_3-1.jpg"
      ],
      "Ocean": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/ELIOS_MYSTERIUM_OCEAN_BAGNO.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/mysterium_amb_3-1.jpg"
      ],
      "Pearl": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/ELIOS_MYSTERIUM_PEARL_COMMERCIALE.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Mysterium_Pearl_amb2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Mysterium_Pearl_amb1.jpg"
      ],
      "Black": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/mysterium_amb_2-1.jpg"
      ]
    },
    "quercia": {
      "Honey": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-honey-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-honey-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-honey-03.jpg"
      ],
      "Amber": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-amber-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-amber-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-amber-03.jpg"
      ],
      "Natural": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-natural-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-natural-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-natural-03.jpg"
      ],
      "White": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-white-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-white-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-white-03.jpg"
      ]
    },
    "yosemite": {
      "Honey": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-honey-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-honey-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-honey-03.jpg"
      ],
      "Amber": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-amber-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-amber-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-amber-03.jpg"
      ],
      "Natural": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-natural-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-natural-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-natural-03.jpg"
      ],
      "White": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-white-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-white-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/yosemite/yosemite-white-03.jpg"
      ]
    },
    "bavaria-stone": {
      "Bavaria Stone": [
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Bavaria_Stone_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Bavaria_Stone_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Bavaria_Stone_3-1-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/BAVARIA_ESTERNO.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/BAVARIA_STONE_OUTDOOR.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Bavaria_Stone_DETTAGLIO.jpg"
      ]
    },
    "dolomiti": {
      "Bianco": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/DOLOMITI_LIVING_bianco_greige.jpg"
      ],
      "Beige": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/DOLOMITI_CAMERA_beige.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_Beige_Ristorante_Interno_Esterno.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_Beige_Ristorante_Dett_Esterno.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_Beige_Ristorante_Dett_Interno.jpg"
      ],
      "Greige": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/DOLOMITI_LIVING_bianco_greige.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/DOLOMITI_LIVING_greige.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_dettaglio.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_Greige_Sgabello.jpg"
      ],
      "Grigio": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/DOLOMITI_BAGNO_grigio.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_Greige_Grigio_Esterno_Dett.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_greige_Grigio_Esterno.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_Grigio_In_Out_Dett.jpg"
      ],
      "Antracite": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/DOLOMITI_CUCINA_antracite.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_antracite_amb.jpg"
      ]
    },
    "grand-place": {
      "Bruxelles": [
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Bruxelles_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Bruxelles_3.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Bruxelles_4.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Bruxelles_5.jpg"
      ],
      "Antwerpen": [
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_1-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_3.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_4.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_5.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_6.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_7-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Antwerpen_8.jpg"
      ],
      "Namur": [
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Namur_3.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/01/GrandPlace_namur_DecWarm_Esterno.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Namur_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Namur_1.jpg"
      ]
    },
    "harmony": {
      "White": [
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_3-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_4.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_5-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_6-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_7-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_8.jpg"
      ],
      "Grey": [
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Grey_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Grey_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Grey_3.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Grey_4-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Grey_5-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Grey_6.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Harmony_Grey_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/HARMONY_GRAY.jpg"
      ],
      "Black": [
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Black_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Black_2-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Black_3.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Black_4.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Black_5-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Black_6.jpg"
      ],
      "Cream": [
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Cream_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Harmony_Cream_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Harmony_Cream_3.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Cream_3.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Harmony_Cream_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Cream_4-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Cream_5-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/HARMONY_CREAM.jpg"
      ],
      "Taupe": [
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Taupe_1-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Taupe_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Taupe_3.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Taupe_4.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Taupe_5.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Taupe_6-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_Taupe_7-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Harmony_Taupe_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/harmony_taupe.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Harmony_Taupe_2.jpg"
      ]
    },
    "millennium-quartz": {},
    "roma": {
      "Aventino": [
        "https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Aventino_pav.jpg"
      ]
    },
    "sedimenti": {
      "Beige": [
        "https://eliosceramica.com/wp-content/uploads/2024/10/SEDIMENTI-MODULO-BEIGE-TUMBLED-1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/EL_SEDIMENTI_BEIGE_LIRERIA.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_BEIGE_COMMERCIALE.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_TAGLI_INGRESSO_beige_white.jpg"
      ],
      "Grey": [
        "https://eliosceramica.com/wp-content/uploads/2024/10/SEDIMENTI-MODULO-GREY-TUMBLED.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_WHITE_GREY_IN_OUT.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_TAGLI_CUCINA_white_grey.jpg"
      ],
      "Sand": [
        "https://eliosceramica.com/wp-content/uploads/2024/10/SEDIMENTI-MODULO-SAND-TUMBLED.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/EL_SEDIMENTI_BEIGE_LIRERIA.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_BEIGE_COMMERCIALE.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_STICKS_BAGNO_sand.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_TAGLI_CAMERA_sand_white.jpg"
      ],
      "White": [
        "https://eliosceramica.com/wp-content/uploads/2024/10/SEDIMENTI-MODULO-BEIGE-TUMBLED.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_WHITE_SAND_BAGNO.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_WHITE_GREY_IN_OUT.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_TAGLI_INGRESSO_beige_white.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_TAGLI_CUCINA_white_grey.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_SEDIMENTI_TAGLI_CAMERA_sand_white.jpg"
      ]
    },
    "slate": {
      "River": [
        "https://www.fliesengigant.de/out/pictures/master/product/1/03f60606.jpg",
        "https://www.fliesengigant.de/out/pictures/master/product/3/03f60602.jpg"
      ],
      "Dark": [
        "https://www.fliesengigant.de/out/pictures/master/product/4/ambiente3_dark.jpeg",
        "https://www.fliesengigant.de/out/pictures/generated/product/1/1000_1000_75/03f60903.jpg"
      ],
      "Flame": [
        "https://www.fliesengigant.de/out/pictures/master/product/4/slate_flame_cortile_04_1copia.jpg"
      ],
      "Natural": [
        "https://id-sol.fr/cdn/shop/files/slate_amb_7-scaled_1024x1024.jpg?v=1751123554",
        "https://www.fliesengigant.de/out/pictures/generated/product/4/1000_1000_75/03f36004.jpg"
      ],
      "Gold": [
        "https://www.fliesengigant.de/out/pictures/generated/product/4/1000_1000_75/stilllife_slate_gold60x120_30x60%281%29.jpg"
      ],
      "Grey": [
        "https://fliseshoppen.dk/wp-content/uploads/2022/06/Slate-Grey-60x60-2.jpg"
      ]
    },
    "brooklyn": {
      "White": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/BROOKLYN_LVING_white.jpg"
      ],
      "Beige": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/BROOKLYN_CAMERA_beige.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Brooklyn_Beige_Interno_Esterno.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Brooklyn_beige_amb.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Brooklyn_Beige_Vassoio.jpg"
      ],
      "Taupe": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/BROOKLYN_LIVING_taupe.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Brooklyn_Taupe_Esterno.jpg"
      ],
      "Grey": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/Brooklyn_Grey_PubblicoZenitale.jpg"
      ],
      "Dark": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/BROOKLYN_BAR_dark_grey-scaled.jpg"
      ],
      "Almond": [
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_BROOKLYN_ALMOND_LIVING.jpg"
      ],
      "Gold": [
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_BROOKLYN_GOLD_BAGNO.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_BROOKLYN_GOLD_IN_OUT.jpg"
      ]
    },
    "clay": {
      "Emerald": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_BAR_COTTON_EMERALD.jpg"
      ],
      "Cotton": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_BAR_COTTON_EMERALD.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Clay_Ocean_Bouquet_Cotton.jpg"
      ],
      "Ocean": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_RISTORANTE_OCEAN_MUSTARD-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/Clay_Ocean_Bouquet_Cotton.jpg"
      ],
      "Mustard": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_RISTORANTE_OCEAN_MUSTARD-scaled.jpg"
      ],
      "Linen": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_BAGNO_LINEN.jpg"
      ],
      "Bouquet": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/Clay_Ocean_Bouquet_Cotton.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_CAMERA_BOUQUET.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_bouquet_amb.jpg"
      ],
      "Silk": [
        "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_CUCINA_SILK.jpg"
      ]
    },
    "creta": {
      "Zucchero": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-06.jpg"
      ],
      "Matcha": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-06.jpg"
      ],
      "Avena": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-02.jpg"
      ],
      "Biscotto": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-01.jpg"
      ],
      "Caramello": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-03.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-04.jpg"
      ],
      "Ginepro": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-05.jpg"
      ],
      "Pepe": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/creta/lot1-08.jpg"
      ]
    },
    "deco": {
      "Taupe": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-13.jpg"
      ],
      "Light Blue": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-03.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-04.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/deco/lot1-06.jpg"
      ]
    },
    "d-esign-evo": {
      "Ciano": [
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_evo_ciano_A-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_evo_ciano_B.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_evo_ciano_mix_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_evo_ciano_mix_2-scaled.jpg"
      ]
    },
    "domus": {
      "Canyon Rust": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/domus/lot1-05.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/domus/lot1-06.jpg"
      ],
      "Forest Green": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/domus/lot1-04.jpg"
      ],
      "Clay Red": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/domus/lot1-03.jpg"
      ],
      "Ocean Blue": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/domus/lot1-01.jpg"
      ],
      "Moon White": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/domus/lot1-01.jpg"
      ],
      "Sunset Rose": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/domus/lot1-02.jpg"
      ]
    },
    "glow": {
      "California": [
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_GLOW_CALIFORNIA_BAGNO.jpg"
      ],
      "Montana": [
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_GLOW_MONTANA_INGRESSO.jpg"
      ],
      "Virginia": [
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_GLOW_INDIANAVIRGINIA_COMMERCIALE.jpg"
      ],
      "Indiana": [
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_GLOW_INDIANAVIRGINIA_COMMERCIALE.jpg"
      ],
      "Arizona": [
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_GLOW_ARIZONA_CUCINA.jpg"
      ],
      "Dakota": [
        "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_GLOW_DAKOTA_LIVING.jpg"
      ]
    },
    "golden-hour": {
      "White Lady": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_BAGNO_WHITE-LADY.jpg"
      ],
      "Gin Tonic": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_COMMERCIALE_GIN-TONIC.jpg"
      ],
      "Bellini": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_BELLINI_RISTORANTE-1.jpg"
      ],
      "Margarita": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_MARGARITA_CAMERA.jpg"
      ],
      "Mojito": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_ESTERNO-MOJITO_CAIPIRINHA.jpg"
      ],
      "Caipirinha": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_ESTERNO-MOJITO_CAIPIRINHA.jpg",
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN_HOUR_CAIPIRINHA_CUCINA.jpg"
      ],
      "Hawaian": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_BAGNO_HAWAIAN_SHELL_GREY-LIGHT-copia.jpg"
      ],
      "Blue Lagoon": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_BLUE-LAGOON_SHELL_GREY-3D-SATEN_GREY-3D.jpg",
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_BLUE-LAGOON-BAGNO.jpg"
      ]
    },
    "hexagon": {
      "Sky": [
        "https://eliosceramica.com/wp-content/uploads/2023/05/hexagon_cube_sky_amb.jpg"
      ],
      "Teal": [
        "https://eliosceramica.com/wp-content/uploads/2023/05/hexagon_lily_teal_amb.jpg"
      ],
      "Grey": [
        "https://eliosceramica.com/wp-content/uploads/2023/05/hexagon_frame_grey_amb.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/05/hexagon_lily_grey_amb.jpg"
      ]
    },
    "horizon": {
      "Carbone": [
        "https://id-sol.fr/cdn/shop/files/Elios_Horizon_Carbone_1-scaled.jpg?v=1751116328"
      ]
    },
    "marechiaro": {
      "Amalfi": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Amalfi_amb_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Amalfi_amb_3.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Amalfi_amb_1.jpg"
      ],
      "Positano": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_positano_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_positano_blu_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_positano_amb_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/02/Marechiaro_positano_blu_amb_1.jpg"
      ],
      "Sorrento": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Sorrento_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Sorrento_amb_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Sorrento_amb_3.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Sorrento_amb_4.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Sorrento_amb_5.jpg"
      ],
      "Vietri": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_vietri_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_vietri_bianco_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_vietri_amb_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/02/Marechiaro_vietri_bianco_amb_1.jpg"
      ],
      "Mix": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_mix_bianco_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_mix_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_mix_amb_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_mix_blu_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_mix_amb_3.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_mix_amb_4.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/02/Marechiaro_mix_blu_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/02/Marechiaro_mix_bianco_amb_1.jpg"
      ],
      "Blu": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_positano_blu_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_mix_blu_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/02/Marechiaro_positano_blu_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/02/Marechiaro_mix_blu_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/02/Marechiaro_blu_amb_1.jpg"
      ],
      "Bianco": [
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_vietri_bianco_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_mix_bianco_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/02/Marechiaro_vietri_bianco_amb_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2024/02/Marechiaro_mix_bianco_amb_1.jpg"
      ]
    },
    "montreal": {
      "White": [
        "https://peintner.shop/media/image/variation/24831/md/montreal-boden-und-wandfliesen-85mm_farbe_white.jpg"
      ],
      "Grey": [
        "https://peintner.shop/media/image/variation/24832/md/montreal-boden-und-wandfliesen-85mm_farbe_grey.jpg"
      ],
      "Beige": [
        "https://peintner.shop/media/image/variation/24833/md/montreal-boden-und-wandfliesen-85mm_farbe_beige.jpg"
      ],
      "Taupe": [
        "https://peintner.shop/media/image/variation/24834/md/montreal-boden-und-wandfliesen-85mm_farbe_taupe.jpg"
      ],
      "Dark": [
        "https://peintner.shop/media/image/variation/24835/md/montreal-boden-und-wandfliesen-85mm_farbe_dark.jpg"
      ]
    },
    "shell": {
      "Ivory": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_SHELL_IVORY-3D-SATEN_BAGNO-2.jpg"
      ],
      "Beige": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_SHELL_BEIGE-3D-MATT_CAMERA-1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_SHELL-BEIGE-copia.jpg",
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_SHELL_BEIGE-3D-MATT_LIVING-1.jpg"
      ],
      "Grey": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_SHELL_GREY-3D-SATEN_GREY-3D.jpg"
      ],
      "Ivory Light": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_SHELL_COMMERCIALE-IVORY-LIGHT.jpg"
      ],
      "Beige Light": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_-CUCINA_SHELL_BEIGE-LIGHT.jpg",
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_SHELL_OUTDOOR_BEIGE-LIGHT.jpg"
      ],
      "Grey Light": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_BAGNO_SHELL_GREY-LIGHT.jpg"
      ]
    },
    "terre-etrusche": {
      "Toscana": [
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Toscana_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Toscana_2-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Toscana_3.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Toscana_1-scaled.jpg"
      ],
      "Umbria": [
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Umbria_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Umbria_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Umbria_3.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Umbria_1-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Umbria_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Umbria_3-scaled.jpg"
      ],
      "Lazio": [
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Lazio_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Lazio_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Lazio_1-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Lazio_2-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Lazio_3.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Lazio_4-scaled.jpg"
      ],
      "Marche": [
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Marche_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Marche_1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Marche_2.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Marche_3-scaled.jpg",
        "https://eliosceramica.com/wp-content/uploads/2021/02/TerreEtrusche_Marche_4-scaled.jpg"
      ]
    },
    "allure": {
      "Eden": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/allure/lot1-02.jpg"
      ]
    },
    "dust": {
      "Terrae": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/terrae-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/terrae-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/terrae-03.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/terrae-04.jpg"
      ],
      "Blush": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/blush-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/blush-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/blush-03.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/blush-04.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/blush-05.jpg"
      ],
      "Dove": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/dove-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/dove-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/dove-03.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/dove-04.jpg"
      ],
      "Ice": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ice-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ice-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ice-03.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ice-04.jpg"
      ],
      "Sage": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/sage-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/sage-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/sage-03.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/sage-04.jpg"
      ],
      "Pine": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/pine-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/pine-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/pine-03.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/pine-04.jpg"
      ],
      "Niagara": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/niagara-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/niagara-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/niagara-03.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/niagara-04.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/niagara-05.jpg"
      ],
      "Ink": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ink-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ink-02.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ink-03.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/dust/ink-04.jpg"
      ]
    },
    "loveanddecors-creative": {
      "Equatorial": [
        "https://eliosceramica.com/wp-content/uploads/2021/05/LoveDecors_Equatorial_3.jpg"
      ]
    },
    "segmento": {
      "Albus": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-01.jpg"
      ],
      "Nigrum": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-04.jpg"
      ],
      "Flavus": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-05.jpg"
      ],
      "Lapis": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-06.jpg"
      ],
      "Duplex A": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-07.jpg"
      ],
      "Duplex B": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-08.jpg"
      ],
      "Duplex C": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/segmento/lot1-03.jpg"
      ]
    },
    "tropical": {
      "Salvia": [
        "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Tropical_Salvia_1.jpg"
      ]
    },
    "twist": {},
    "venere": {
      "Perla": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_BAGNO_ATLANTE_PERLA-MATERICA.jpg",
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_NUOVO-BAGNO_PERLA.jpg",
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_BAGNO_ATLANTE_PERLA-MATERICA-1.jpg"
      ],
      "Aura": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_BAGNO_AURA_AURA-MATERICA.jpg",
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_COMMERCIALE-FLORA_RUGIADA-MATERICA_AURA-DORICA.jpg"
      ],
      "Seta": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_NUOVO-BAGNO-SETA.jpg"
      ],
      "Flora": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_COMMERCIALE-FLORA_RUGIADA-MATERICA_AURA-DORICA.jpg",
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_COMMERCIALE-FLORA_RUGIADA-MATERICA_AURA-DORICA-1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_SCORCIO-OPTICA-ROSA_FLORA.jpg"
      ],
      "Rugiada": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_COMMERCIALE-FLORA_RUGIADA-MATERICA_AURA-DORICA.jpg",
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_COMMERCIALE-FLORA_RUGIADA-MATERICA_AURA-DORICA-1.jpg",
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_BAGNO_RUGIADA_RUGIADA-MATERICA.jpg"
      ],
      "Zefiro": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_BAGNO-ZEFIRO_DORICA-ZEFIRO.jpg"
      ],
      "Mare": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_NUOVO-BAGNO-MARE.jpg"
      ],
      "Atlante": [
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_BAGNO_ATLANTE_PERLA-MATERICA.jpg",
        "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_BAGNO_ATLANTE_PERLA-MATERICA-1.jpg"
      ]
    },
    "azuli-mood": {
      "Chalk": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/chalk-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/chalk-02.jpg"
      ],
      "Sand": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/sand-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/sand-02.jpg"
      ],
      "Bone": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/bone-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/bone-02.jpg"
      ],
      "Thyme Green": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/thyme-green-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/thyme-green-02.jpg"
      ],
      "Burgundy": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/burgundy-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/burgundy-02.jpg"
      ],
      "Coffee Bean": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/coffee-bean-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/coffee-bean-02.jpg"
      ],
      "Blue": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/blue-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/blue-02.jpg"
      ],
      "Bottle Green": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/bottle-green-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/bottle-green-02.jpg"
      ],
      "Turquoise": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/turquoise-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/turquoise-02.jpg"
      ],
      "Dusk": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/dusk-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/dusk-02.jpg"
      ],
      "Dawn": [
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/dawn-01.jpg",
        "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/azuli-mood/dawn-02.jpg"
      ]
    },
    "dynasty": {},
    "montblanc": {},
    "stone-icon": {},
    "terraforma": {},
    "pool-abyss": {
      "Tikal": [
        "assets/img/elios/selection-20261028/pool-abyss/color-tikal.jpeg"
      ],
      "Port Royal": [
        "assets/img/elios/selection-20261028/pool-abyss/color-port-royal.jpeg"
      ],
      "Atlantis": [
        "assets/img/elios/selection-20261028/pool-abyss/color-atlantis.jpeg"
      ],
      "Thonis": [
        "assets/img/elios/selection-20261028/pool-abyss/color-thonis.jpeg"
      ]
    },
    "pool-acqua": {
      "Light": [
        "assets/img/elios/selection-20261028/pool-acqua/color-light.jpeg"
      ],
      "River": [
        "assets/img/elios/selection-20261028/pool-acqua/color-river.jpeg"
      ],
      "Deep": [
        "assets/img/elios/selection-20261028/pool-acqua/color-deep.jpeg"
      ],
      "Cobalt": [
        "assets/img/elios/selection-20261028/pool-acqua/color-cobalt.jpeg"
      ]
    },
    "pool-greek-isles": {
      "Crete": [
        "assets/img/elios/selection-20261028/pool-greek-isles/color-crete.jpeg"
      ]
    },
    "pool-italian-slate": {
      "Naples": [
        "assets/img/elios/selection-20261028/pool-italian-slate/color-naples.jpeg"
      ],
      "Firenze": [
        "assets/img/elios/selection-20261028/pool-italian-slate/color-firenze.jpeg"
      ]
    },
    "pool-lakes": {
      "Shasta": [
        "assets/img/elios/selection-20261028/pool-lakes/color-shasta.jpeg"
      ],
      "Tahoe": [
        "assets/img/elios/selection-20261028/pool-lakes/color-tahoe.jpeg"
      ]
    },
    "pool-mare": {
      "Viridus": [
        "assets/img/elios/selection-20261028/pool-mare/color-viridus.jpeg"
      ],
      "Altum": [
        "assets/img/elios/selection-20261028/pool-mare/color-altum.jpeg"
      ],
      "Caeles": [
        "assets/img/elios/selection-20261028/pool-mare/color-caeles.jpeg"
      ]
    },
    "pool-nevada": {
      "Mohave": [
        "assets/img/elios/selection-20261028/pool-nevada/color-mohave.jpeg"
      ],
      "Carson": [
        "assets/img/elios/selection-20261028/pool-nevada/color-carson.jpeg"
      ],
      "Vegas": [
        "assets/img/elios/selection-20261028/pool-nevada/color-vegas.jpeg"
      ],
      "Reno": [
        "assets/img/elios/selection-20261028/pool-nevada/color-reno.jpeg"
      ]
    },
    "pool-pacific": {
      "Japan": [
        "assets/img/elios/selection-20261028/pool-pacific/color-japan.jpeg"
      ],
      "Mex": [
        "assets/img/elios/selection-20261028/pool-pacific/color-mex.jpeg"
      ],
      "Australia": [
        "assets/img/elios/selection-20261028/pool-pacific/color-australia.jpeg"
      ]
    },
    "pool-quantum": {
      "Prism": [
        "assets/img/elios/selection-20261028/pool-quantum/color-prism.jpeg"
      ],
      "Vector": [
        "assets/img/elios/selection-20261028/pool-quantum/color-vector.jpeg"
      ],
      "Nova": [
        "assets/img/elios/selection-20261028/pool-quantum/color-nova.jpeg"
      ]
    },
    "pool-sea-breeze": {
      "Sky": [
        "assets/img/elios/selection-20261028/pool-sea-breeze/color-sky.jpeg"
      ],
      "Teal": [
        "assets/img/elios/selection-20261028/pool-sea-breeze/color-teal.jpeg"
      ]
    },
    "pool-seychelles": {
      "Original": [
        "assets/img/elios/selection-20261028/pool-seychelles/color-original.jpeg"
      ],
      "Blue": [
        "assets/img/elios/selection-20261028/pool-seychelles/color-blue.jpeg"
      ],
      "Cobalt": [
        "assets/img/elios/selection-20261028/pool-seychelles/color-cobalt.jpeg"
      ],
      "Light": [
        "assets/img/elios/selection-20261028/pool-seychelles/color-light.jpeg"
      ],
      "Pearl": [
        "assets/img/elios/selection-20261028/pool-seychelles/color-pearl.jpeg"
      ]
    },
    "pool-twelfth-night": {
      "Orsino": [
        "assets/img/elios/selection-20261028/pool-twelfth-night/color-orsino.jpeg"
      ],
      "Viola": [
        "assets/img/elios/selection-20261028/pool-twelfth-night/color-viola.jpeg"
      ]
    }
  }
};
  window.ELIOS_SELECTION_MEDIA = media;
  const images = window.ELIOS_IMAGE_DATA ||= {};
  for (const product of window.ELIOS_CATALOGUE || []) {
    const gallery = media.galleries[product.slug];
    if (!gallery?.length) continue;
    product.gallery = gallery.map((src, index) => {
      const key = product.slug + '-verified-' + index;
      images[key] = src;
      return key;
    });
  }
})();
