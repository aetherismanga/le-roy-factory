// Only exterior photographs checked against each official shop/location.
const photos = [
  {
    "societe": "MONDIAL CARRELAGES",
    "ville": "Vendargues",
    "codePostal": "34740",
    "sourceUrl": "https://www.carrelagesmontpellier.fr/a-propos",
    "verifiedAt": "2026-11-05",
    "url": "https://leroyfactory.fr/assets/img/client-facades/mondial-carrelages-vendargues.jpg",
    "originalUrl": "https://le-de.cdn-website.com/13790338525f46e29b5ddc8a6446e840/dms3rep/multi/opt/P1024085-1920w.JPG",
    "source": "site-officiel"
  },
  {
    "societe": "NEO SOLS & MURS",
    "ville": "Gigean",
    "codePostal": "34770",
    "sourceUrl": "https://neosolsetmurs.fr/",
    "verifiedAt": "2026-11-05",
    "url": "https://leroyfactory.fr/assets/img/client-facades/neo-sols-murs-gigean.jpg",
    "originalUrl": "https://neosolsetmurs.fr/images/home/building.jpeg",
    "source": "site-officiel"
  },
  {
    "societe": "SUP CARO mediterranee distribution",
    "ville": "Saint-Jean-de-Védas",
    "codePostal": "34430",
    "sourceUrl": "https://supcaro-montpellier.fr/",
    "verifiedAt": "2026-11-05",
    "url": "https://leroyfactory.fr/assets/img/client-facades/sup-caro-mediterranee-distribution-saint-jean-de-v-das.jpg",
    "originalUrl": "https://supcaro-montpellier.fr/wp-content/uploads/2026/05/drone-retouche-chaude-scaled.jpg",
    "source": "site-officiel"
  },
  {
    "societe": "CAMPREDON",
    "ville": "Carcassonne",
    "codePostal": "11000",
    "sourceUrl": "https://www.campredon-carrelage.com/societe/",
    "verifiedAt": "2026-11-05",
    "url": "https://leroyfactory.fr/assets/img/client-facades/campredon-carcassonne.jpg",
    "originalUrl": "https://www.campredon-carrelage.com/wp-content/uploads/2024/03/campredon-carrelage-einture-carcassonne@2x.jpg",
    "source": "site-officiel"
  },
  {
    "societe": "BONIFAY la garde",
    "ville": "La Garde",
    "codePostal": "83130",
    "sourceUrl": "https://www.bonifay.fr/agence-la-garde",
    "verifiedAt": "2026-11-05",
    "url": "https://leroyfactory.fr/assets/img/client-facades/bonifay-la-garde-materiaux.jpg",
    "originalUrl": "https://www.bonifay.fr/sites/default/files/styles/image_agence_400x300/public/2018-07/STM.jpg?itok=SQYaw7gu",
    "source": "site-officiel",
    "addressNumber": "873"
  },
  {
    "societe": "BONIFAY la garde",
    "ville": "La Garde",
    "codePostal": "83130",
    "sourceUrl": "https://www.bonifay.fr/showroom-experience-carrelage-la-garde",
    "verifiedAt": "2026-11-05",
    "url": "https://leroyfactory.fr/assets/img/client-facades/bonifay-la-garde.jpg",
    "originalUrl": "https://www.bonifay.fr/sites/default/files/styles/image_agence_400x300/public/2022-06/showroom_experience-carrelageSTX.jpg?itok=fNwaJ1EJ",
    "source": "site-officiel",
    "addressNumber": "964"
  },
  {
    "societe": "BONIFAY tourves",
    "ville": "Tourves",
    "codePostal": "83170",
    "sourceUrl": "https://www.bonifay.fr/agences?num_agence=356",
    "verifiedAt": "2026-11-05",
    "url": "https://leroyfactory.fr/assets/img/client-facades/bonifay-tourves.jpg",
    "originalUrl": "https://www.bonifay.fr/sites/default/files/styles/image_agence_400x300/public/2018-06/TOURVES.jpg?itok=dKkRbAaX",
    "source": "site-officiel"
  },
  {
    "societe": "COSTAMAGNA cagnes",
    "ville": "Cagnes-sur-Mer",
    "codePostal": "06800",
    "sourceUrl": "https://www.costamagna.com/fr/points-de-vente/Cagnes-sur-mer",
    "verifiedAt": "2026-11-05",
    "url": "https://leroyfactory.fr/assets/img/client-facades/costamagna-cagnes-sur-mer.jpg",
    "originalUrl": "https://www.costamagna.com/content/assets/uploads/1400x802_exterieur_cagnes_2_dsc01174.jpg",
    "source": "site-officiel"
  }
];
const normal = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function verifiedFacade(client) {
  const found=photos.find(photo=>normal(photo.societe)===normal(client?.societe)&&normal(photo.ville)===normal(client?.ville)&&photo.codePostal===String(client?.codePostal||client?.code_postal||'').trim()&&(!photo.addressNumber||new RegExp('(^|\\D)'+photo.addressNumber+'(\\D|$)').test(String(client?.adresse||''))));
  return found ? {...found} : null;
}
