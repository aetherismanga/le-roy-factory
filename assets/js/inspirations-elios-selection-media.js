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
      "https://storage.googleapis.com/le-roy-factory.firebasestorage.app/public-site-assets/le-roy-factory/064a2492b7c0/assets/img/elios/quercia/quercia-amber-03.jpg",
      "data:image/webp;base64,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",
      "data:image/webp;base64,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"
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
      "data:image/webp;base64,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",
      "data:image/webp;base64,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"
    ],
    "bavaria-stone": [
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Bavaria_Stone_1.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Bavaria_Stone_2.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Elios_Bavaria_Stone_3-1-scaled.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/BAVARIA_ESTERNO.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/BAVARIA_STONE_OUTDOOR.jpg",
      "https://eliosceramica.com/wp-content/uploads/2021/02/Bavaria_Stone_DETTAGLIO.jpg",
      "data:image/webp;base64,UklGRjoJAABXRUJQVlA4IC4JAACQOACdASqSAL4APxl6sVMsp68sKzgNaeAjCWVrsqD4s+35oOIy2SbBGWPoj/48pXHbnfh04D0X37L/NjCD8SqjtMZQH0KPEaAIaymq5bGMOPoOE9VWrgRqE93tdEhj9/QhnBbrxJeIM9EO52cYJmEyjdbQGZCRAlWRZTbR6UNW9N8gfig3nu1BofBzwdiH8wZXfTahlmOehh8coGBDdTNHohQhRHVWBs1OF+EpafhqoaycnMsdGJxrfYwIBnDvI6NQdJ8+wU9Gndhapw1OPqg+7DhlFwe4M8Tual/SBzO8BiBdzWufLSckcnl1QdVrGNUgiesRIB4QiGC86nd9OwEg3r6aAS/j5/4m3MWhv0OeFpdTKQHGqkILIRj0wo1fdw5HzRYxD48T27KDF/kD8mHndI+o+YePbHma1HC9FaQc5A130F7lpjn0S64GbfrefLdlv7cOtcamJoPb7/nxpZKslpIPAJYsaM7OSzvJoY3BpNIO9rFyCMGDjgw1a2nCoEL/koiFlHVSf4hScn5P3a97mWMYVaBiVgpRG5lVlKkeHjVM9mxDZlLrRgJstspAGVE3ucgs7KynRahapxWx7PZjPB1ZM2+nr/JjmmLcYAD+7SP4QDpiQjhhQsHGaQkRuWM6cgODzRyx81UE+fS3V4Xnsje4w9bygd8yCcCqawDC/cEm4Ez6F9Y5t75AXNAXyR6yIzUn6Y4ymrWSmafVEoijWaxKwmmsX1QHU7Y7PqHmPTxXhzr+hmj7og48BLTzQ43Tu2b91ikFnyQhSuDKlp/lduoDO8lUWvGdziEef4n62fv/35cl94PX9aShZuONf9mrgrYp//i7BeJUTTYjTmSWUff9HyKHr8K6Zh5D/UZPv2FuiH/c3Tv/oKg308URkuwLaEjxchbSFKIJ7tjedhNAzqUGQWI3gfXSvG4fJenklePT8axAOl6zbJd5b8FlB45eTTuw1EYpxdlzj49Ms9NfqhmIVP12Tuw5tQSHrvRtrzFA1ofzqF16XZlMDifagFsTBVrjDVtr1gquGBLFAOGbE6W3ETB6ZLPw4SEYSJ4Xwxoal6w2pZ8dYo5DmKkrzZuTfZDNpCVLhe/G6YKUaRbDpLhcC5Yr54LfxgFO7S+bi+umRsSL/EEZwre+kt8RD+p9K10eZEu+pE6YlOCb0qYEvfAqIULQbXXjc26Jky2qBh36H82nlAhiHlMgG+jY0+PrOvIun4wC+uL9wnESFKgxwySjomhjGC/LgWbvCqOMTDnftNeZnrP1PzzC6ZjR0Ao7TGcHZQ41WyPzGmAYax1MOCNZ+R7AURMefJLo1tm1moYBy2D+vTRvWGO/ULkeUVyWau9H8yfpljYxPcsiu2Iqsl7TWLt7ARQ6MxXIkAME4PgzcxYuFQ2lRd7KfctmmQflEn0Lz2n+dV0tDbMJ7TZrlXxkszcp0W+H/r0nhPiZBErf3xMFmqve1IQ+Zy8efU3NqpMLB5wqHlBedEQTh4brwbARNAwpRtpCR9qvUs40bu1Fiu01+JflnvVjRW0IuklzIQkLgeOEJzZdOK05Qc/Bh0ZJOcpPlskRcOVkgmjaNulSWgRh6yfgfkW5aUde9mfcIZeJEYU9gsbR6XKdAPMz/nrX5zLlBti9tMJXB+ivzufyCev5olz29t4u90FgBiSsLYKeRgNMAl5fZzzNvDhg8ye4H0YwABAHsoV36cVA0K/gJdN3nulJRFXJZBglk0bBwjXjIsq/u9DNllvTxNhCsaaEZgiz8mfrKoFAfSm22BwKEpl+AJty27BN/zv9Vi+asQJfCi2tA1K7tF5f6cVIB426JONFQl7Q/4DN0eYjWcS0+jPpoJgQ9Opiplho9R7nFo+rUK3DFFoxGHNb6NXetidjovThtMiUMvIOoDSpIAIDy6/MJyUKltoAxHv86ZHX3QSBxD+nLWlvSIJc1SUsFKo9cy7s4JZTemdVVjhXjj0/AnRsQKWDU+tC4pO3r/Fmok1Y9s+JPaYT/GasnxxJuuVgaS/SGhwVqaSqn7mp4YtKNmTo2Vq2oZvSQp00RfnKaLnE47SM6TJ5Y95vc4TulhChNchj+kiYYEGvFp67vw0nRWlnNCLaH4zqAzhkiLmFJJjrZZUKc8Clt8kraZDVwZVfvy9sbVOf4DYhBBNzV+ghuwmjSwN+lB+eGZ7GLgXPRmidfsUZyk2FTRnb+gHMdipRhZJKsiDAcxgoNKLjnIewSjsNr7FQsnHgcm2n6oW4+x2GOTVHsirOfYhQvL/OR0l+tu/Ny9R70FXa6KBTUJkYFhaXjd+hGII2NkWPi/2JdULhDK6aJAGnnCLXNbrX/JtMiru9lhKPf6DLCZ7YRkP0PVNH8Jn+WWNI9G1jhubHZssUFlIdbW//hHCQInnFQNXIQksel7C4+v0VaN00tDvWZjDP3ywwcrx09yFlef+LAeDoZ34CRT0ZRZnxBe9Bxfu1n/c2wq+y2gonMBNAQ1e+Ka22b5HGrs3RcROYl2AorEEan+2OO49dLLrOnnW8LD7cHBnBWUxRKro7ZT+SSjGQwaM00rtUmnK033YInskiKh9fczbBnt7WAOCYjtYfqryS5heDL2OkNiaD37Y10iUn3VeNejYr+dKKQ3bcYbQlZRPRYI1PJmmVfAGjgcwS/7m4ho1MzXgomLj2BxsuKwa9/lqJQAZLQCRgBolZ1UHDWVWp3OKUVXi37bIz23ElKSnOmdmODUD2MZj5qreRV83IpUrpVbSfA9i/Uvb0yPdx//wb+527r1YjdBjXe8k3hgFrDOIrKihOHF70SV9x80xHmC15aaHOl0CZXzeXg2EICE/LSJuF38ivIxVNYkh56wibLwFRM+nX/EVb0cz+N2bM+zx/bor+//ffI5+DhOnBBtBzN9W+vjBSiYUS8ijw59ipRZOgEaV31+PKh6Zh3yo9TnwggBlUBsUxiWIjqIZvR2hRRlL6xfn1Y2ce7jU+94B/oI+eMZ5msxmkg071hiy1uUtIZdNte/pqSlaTzsfn82rxF9w8DA2NcRBtxQYUVvn+1bhxx00W/wOG3w8kx1LPH3+W2Ji3yvped6bYDA2gVL6YHso9b6Wp8xMqfXDJ4BuM4se5gVmCm5R26b/hROfvnqYjaBJ7NvyCdSgA",
      "data:image/webp;base64,UklGRmwEAABXRUJQVlA4IGAEAABQIACdASqSAL4APxmCu1gsr60vJFEKmfAjCWdtmgu9iZC5ltXXN0KvDxZdqcCCHN9656bFuU3EDv9sO7fh2clzG6uTDaSf0OiPBfEuQ9nlnWUTl0LvolYsV5VNIATHLivJEUXgJgb61MZj9Ox6XMqDZoU+O574WeNGNEBpGTF88/GIvEE5HFtoJzhyCp57naPG4tV7n3PpoR2iE/Lt4dNWD+aQBYUVvDbRV69ZiD4Oot/yonP9oCEe6Gq9leX92Fyck3xUr6SFyfpG/r3wSx8sEzSTOVIgxM059Ri2N50GneJ+mX0Jtixn0rvEvb4nrTKOOmSDx8mBBartZMcdu0QBy9IXPqL0HeXpHwAA/c7K1h5chZNoFkD19e15NdB8sV+oWrcazq+O/04MtZsubukCOO3bnvxlpeT9ZwVAWPBnsuwb96SjvwVwZNJPhwNnxF8A9duNxc2KvDRoVpniuNQOn9ueXoJMMIYGtYIsjwO7qFEEbfUoJmj2+N9Vzosa2LJByKL4KMe5Ce7acrkoZmxbQ0++sS/Rvf5DO0uD59nGai4SRj4KLBpJDpRqdTWUVuLd8nHQWFX0DaPmA43NNonixmvXRTBb/JPynTs8/rFVJc0o4085iXM3z1TmuMcCsIqhKmBGHcUm+KvhMP9Hy+vD2qNS5Y31DkxtAmbmuQlaeLlDU25m1QJCTXlYMh1lD7BMnFOMNEZQwN/3MjfViMivPBaMjnbIn1EWxMcIvYZL1V/DnDTYutvANoe508Vq6T9zJieOeF61EVG0R4MiyP6SFvVllUI3KiJ9Ud/ulX46FCcd1sf0O/EGTyRljedPK5xbc+j4LpgnRSBR/zIVgVZ3FZiJCBdqIF4HQ4CnTDzRspxwdIQPbhWgRvptZMpcCX2IDRRgTPXmp+LxLjutQws2OXEkqc0BTb+2ShExDiOYE4amoWcJ9UCN2trvx70CDQN1d53Rel4n0C7x53zNSwD97rCADlWDVBnCgqxEuAFsExBKM/Zm2PFkQdYWeGbHE07IlhIszA5BUNAxGNCHUnrxUudTFVDmnl96B47SNMwU0ZudqFqvTOeo+IQhaY8lNKopDWgkmkeDzjSjOsnVEid6WL5k4jKJb7MuKt7kjAhe7jcOLXft1uOK77OTktQXsMqJvO8gF0kU3UedUsAIJqHH7M1Mj5v+PHdEuHugpmmgqVJqEa5i4n/FUbbsZrmALLSYVpsyjabi2SsV2N0zEGEvaysH/4iuHJhnQDZ2DJPyWA2emeydguf/huRQ9P1qgSK8qHMmYxtRapAcg5gQhRtjjA923br6tjBa4v5Q88OSk2UJND3o4ys6q61C72hydQkvY4/fkkryRaixyzixphJTW+1w+wEEVw9s3LY9RA0SDl6cciZ3rBTPx6l4M2eCyKtM1ds8VvOhplM0cqFPM3/D4CrOeuVD8IyGfHbJM6KrWjrbQLJ/vO3fUv+mkYBqCzMJG0oT3tybxDOfWeA4CAAA"
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
      "https://eliosceramica.com/wp-content/uploads/2021/11/Dolomiti_antracite_amb.jpg",
      "data:image/webp;base64,UklGRkQDAABXRUJQVlA4IDgDAADQGACdASqSAL4APxmGuVksqDKqJBM5qlAjCWdudzQszuqQGFZS7pbFrYJxriUr2pRy04vY+O4/GG05metmWSLoL5dfVqLhAFzBwyTf6o0yOl+Irn+FpePz47RdGPFn9rk/jHtTV+Sd9J+AaLxrIh3jcdRmD62SaWNltgxwOZPwxsiOLKz3Yo0ziWNPwbd6mgM9m5mp8vKCjueoQPqEB7uQ23wQDw2ktMtowInzYpRmRVnZ0umjyZ1GTZwqnGFYKJ1TCUTQJYen4wQqyUFuLQAA/ujroyJrqtD0QBwb+MPx/Z71BVromvS1yNvwSNXIQzYSCX3c0PMwgtCF/PMPKqJDWaUrDnM/7J6Bw/QKQVp8I5My4NeLo+QUs+6WulmZg83Y0v34QPItZS+tcTDpArFM0Nr5v0sYZp7cyDZKH4DDTYIYvTDZOJI1FosvNs1Kgqppd0mVoKZvmMQGF7WhpD+1ItwQCFKTTZqs/PrPGkY1N+mw0e7/AzZiLitJE+rH/y+mZ/rPJAmd+DsrBmGYFi8/N1GfVBN+sU7ZuoV0P2K8MoylRakfn8pZR7Ey+tKIoR59+ypG8MfT72saj3OjG44tAuNeAjIemcsqjij8z60O4XbJZoF1LIjjGsL6/EcPlchWdmW1Rkj40bMsAoWeuxYqd0fra/XbSw4AunzmZ60xeO6tCWvCYaga5S6JzwtmvF1jjqvRwmEb7kvyDO6Xxea3Ew599/OYBBWZ+Dsd2wdmAzWk7xJ49FzSF+XpFRJXmYXTbyKOJCpRP65OsrQ5eG62NEtvIeYiUUAtsHhZvYnyDWC9jjBcT4QEWp6P3TOZ9nqCwPLCF7WYiLc8GUul1A9XnqP3pkoZpdEBGsf/XYxmXbgTAwsM1+HNyHU+JmDvT02RZcYfTc13oXN50roimKYJJyKXJQ04iLl/+1Rxau81HWH6vlwA8AmhQuWSTbD8T0dY48UHY/wsMYR8/C0XZW9n7Ln5vY0m/9IPU5u0GSABMaUQlgRm79l3rYatTt7gcBxutOjaLgbUhKTx2HmmsZu4nTtnLjCQL6f0rJfZUPwtxrv9qs5jbky4jTUUGic0cPd4FEoNfZgAAA==",
      "data:image/webp;base64,UklGRrwDAABXRUJQVlA4ILADAACwHwCdASq+AL4APxmGuVessCwppdJ6SgAjCWdtGTYYdiBfAxUpvq9C/Hpl91dHHp+YedVASoTvzEkDhXQARiXQpVwlQvMliUIsfqrZq+XLnTzYxGnr36SnzJwa4UYiBmAn8LLHGoDM3kRRE02t/tJxM991jG20qAbRy23r6pmPi/On0yCC0UrQAficcvMZfZQnPb2umfgi6DvoViyNdoiP2ncRnpT+v7A56VY3bd8KDU1XOPoag0kRlH2UkeGhwk3+OczMVGRGEpkgXWtHekLKtXLAykeq6Kl8ikyebNHu0nVYAZ7SXgZgHQTB/BIf4RyfaSlYzv1gDaVUjWANEuzILrvEPQSAAP7m/R7MPGtfNjsH6zVN//y/3T4zTh0EM4dV1SeirT2e940t9yLapCU4K2L/f8d0q6BoVoQj6DlxXw+2NgyX4659z3kchwC6+BJQftEVqIE/bh8BJUizr47rn/U2g/vbdGcUEWRFSTZq1CpWA2bZsfP8vZsMsOoGshaEzXgvkchcwkaWrSXa3Aq8uKWtaQ/2pg+hmgkQFcAmUJ4SkJDCRvbsKzJvTJn6errkbBfhVH1SlLtRZU8GS57pBLsi3wAWoiD9hayRNBifBpq57TeI/WkovpMRK2yARix5MVnA+4xoF0kcs0E/Z0IFjXz02YVwSeCr/OdHWFFZ8Y2eLTNEo/YYAziDrjVZnAXvNTGG/7AbUAhP7daDIesxaTgPnVtMB3JwYCxO0AizDep1hBJbZ4XOk552pLfbg+rYffGNviAaBwIdgJSgZEzkjZAROc7/UwD+ynIG9jVWkeFu3R6zJbOyAtM2LbzZgtRwiXDsWhigkBDa/XMkOMkziJLV2lUTvL/EIzAYCWysHjpURX8FR0qmPudY7ru8Ls6lPsby9JWgEGBDsXFaMp0H+4kRNqwTSGVbHyXkyiRx1oAOe+F6VOUp+oPzPI79MX4zgZLQ9E6V7kDW/dIlPXhTGKifvx4a9EnilQgXo+nHEfK2CUjoOOlNl+UUsSWHIzyYFQ5E+phDzwrHYkPLfIYJqTG9qaa86LI+hO7hQhdMYionepEDMAR80GcADrX9Ma1gwRURPasjfuFaF1RfiYZE3A0h8zxB8gIVT4JbszNa2i+9LesiqCqKVIu30E2JBcxClOc4PViMS+LqbsAAjO+pHQXOKsg7iFhKKUs886XhQF6kkVNxxrgCJrAkRgMjhuia2XRIxMP+SCzDWNMf1Z92ACZdKWQoN5x4AzR7QAAAAA=="
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
      "data:image/webp;base64,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",
      "data:image/webp;base64,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"
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
      "https://peintner.shop/media/image/variation/24835/md/montreal-boden-und-wandfliesen-85mm_farbe_dark.jpg",
      "data:image/webp;base64,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"
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
      "assets/img/elios/selection-20261028/pool-pacific/color-japan.jpeg",
      "assets/img/elios/selection-20261028/pool-pacific/color-mex.jpeg",
      "assets/img/elios/selection-20261028/pool-pacific/color-australia.jpeg"
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
