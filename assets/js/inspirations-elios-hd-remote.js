(() => {
  const images = window.ELIOS_IMAGE_DATA = window.ELIOS_IMAGE_DATA || {};
  const hd = {
  "lithos": "https://eliosceramica.com/wp-content/uploads/2023/10/Lithos_Ivory_amb2.jpg",
  "manhattan": "https://eliosceramica.com/wp-content/uploads/2023/10/Manhattan_Pearl_amb2.jpg",
  "mysterium": "https://eliosceramica.com/wp-content/uploads/2023/10/ELIOS_MYSTERIUM_ACQUA_LIVING.jpg",
  "quercia": "https://eliosceramica.com/wp-content/uploads/2022/11/Quercia_amb_kitchen.jpg",
  "yosemite": "https://eliosceramica.com/wp-content/uploads/2023/05/YOSEMITE_amb4.jpg",
  "bavaria-stone": "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Bavaria_Stone_1.jpg",
  "dolomiti": "https://eliosceramica.com/wp-content/uploads/2021/11/DOLOMITI_LIVING_bianco_greige.jpg",
  "grand-place": "https://eliosceramica.com/wp-content/uploads/2021/01/Elios_GrandPlace_Bruxelles_1.jpg",
  "harmony": "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Harmony_White_1.jpg",
  "millennium-quartz": "https://eliosceramica.com/wp-content/uploads/2023/10/millenium_quartz_amb_2.jpg",
  "roma": "https://eliosceramica.com/wp-content/uploads/2021/02/Roma_Aventino_pav.jpg",
  "sedimenti": "https://eliosceramica.com/wp-content/uploads/2024/10/SEDIMENTI-MODULO-BEIGE-TUMBLED-1.jpg",
  "slate": "https://eliosceramica.com/wp-content/uploads/2023/05/slate_amb_2-scaled.jpg",
  "brooklyn": "https://eliosceramica.com/wp-content/uploads/2021/11/BROOKLYN_LVING_white.jpg",
  "clay": "https://eliosceramica.com/wp-content/uploads/2021/11/CLAY_BAR_COTTON_EMERALD.jpg",
  "creta": "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_CRETA_BISCOTTO_CLOE-AVENA_BAGNO.jpg",
  "d-esign-evo": "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_DesignEvo_evo_ciano_A-scaled.jpg",
  "domus": "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_DOMUS_MOONWHITE_OCEANBLUE_COMMERCIALE.jpg",
  "glow": "https://eliosceramica.com/wp-content/uploads/2024/10/ELIOS_GLOW_CALIFORNIA_BAGNO.jpg",
  "golden-hour": "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_GOLDEN-HOUR_BAGNO_WHITE-LADY.jpg",
  "hexagon": "https://eliosceramica.com/wp-content/uploads/2023/05/hexagon_frame_grey_amb.jpg",
  "marechiaro": "https://eliosceramica.com/wp-content/uploads/2023/10/Marechiaro_Amalfi_amb_2.jpg",
  "montreal": "https://eliosceramica.com/wp-content/uploads/2022/11/Montreal_amb_evidenza.jpg",
  "terre-etrusche": "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_TerreEtrusche_Toscana_1.jpg",
  "dust": "https://eliosceramica.com/wp-content/uploads/2023/05/Dust_terrae_amb_2.jpg",
  "loveanddecors-creative": "https://eliosceramica.com/wp-content/uploads/2021/05/LoveDecors_Equatorial_3.jpg",
  "tropical": "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Tropical_Salvia_1.jpg",
  "twist": "https://eliosceramica.com/wp-content/uploads/2024/01/twist_amb_3.jpg",
  "venere": "https://eliosceramica.com/wp-content/uploads/2025/10/ELIOS_VENERE_BAGNO_ATLANTE_PERLA-MATERICA.jpg"
};
  Object.entries(hd).forEach(([slug, src]) => {
    images[`${slug}-1`] = src;
    for (let i = 2; i <= 6; i++) delete images[`${slug}-${i}`];
  });
  window.ELIOS_HD_REMOTE = hd;
})();
