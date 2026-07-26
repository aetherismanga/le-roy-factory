// Base de données CRM LE ROY FACTORY — 278 Fiches nettoyées, adresses complétées et codes postaux à 5 chiffres
const clientsDatabase = [
  {"type": "Prospect", "societe": "MP CETIN. EDEN", "adresse": "6 Bd des Jardiniers", "code_postal": "06200", "ville": "Nice", "telephone": "0674813721", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "875 Route du Thor", "code_postal": "84800", "ville": "L'Isle-sur-la-Sorgue", "telephone": "04 90 20 52 22", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "3 Rue Marie Magdeleine Signouret", "code_postal": "84160", "ville": "Cadenet", "telephone": "04 90 08 74 50", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "4 Rue Berlioz", "adresse": "4 Rue Berlioz", "code_postal": "06000", "ville": "Nice", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Balitrand", "adresse": "280 Rue Bastide de Verdaches", "code_postal": "13290", "ville": "Aix-en-Provence", "telephone": "04 42 97 74 74", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona Plaquiste - Facade", "adresse": "132 Avenue de la Roubine", "code_postal": "06150", "ville": "Cannes", "telephone": "04 92 19 42 30", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "Pool & House Renov", "adresse": "28 Allee des Jacinthes", "code_postal": "06800", "ville": "Cagnes-sur-Mer", "telephone": "06 12 95 16 76", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona Showroom", "adresse": "211 Avenue Francis Tonner", "code_postal": "06150", "ville": "Cannes", "telephone": "04 92 19 49 49", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "2143 Avenue Guillaume Dulac", "code_postal": "13600", "ville": "La Ciotat", "telephone": "04 42 08 21 21", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "JEM Carrelages Venelles", "adresse": "104 Avenue des Logissons", "code_postal": "13770", "ville": "Venelles", "telephone": "04 42 22 86 55", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "La Maison par Carreau Concept", "adresse": "1955 Chemin de Saint-Bernard", "code_postal": "06220", "ville": "Vallauris", "telephone": "04 93 67 28 04", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "C.B.L Carrelages Batiment du littoral", "adresse": "1887 Chemin de Saint-Bernard Porte", "code_postal": "06220", "ville": "Vallauris", "telephone": "04 93 64 60 60", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Costamagna Distribution Mouans-Sartoux", "adresse": "370 Chemin des Plaines", "code_postal": "06370", "ville": "Mouans-Sartoux", "telephone": "04 89 97 75 05", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Espace Aubade Laur & Abad Nimes", "adresse": "291 Avenue du Docteur Fleming", "code_postal": "30900", "ville": "Nimes", "telephone": "04 66 28 86 86", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Espace Aubade Comtat et Allardet Le Tholonet (Aix Carrelages)", "adresse": "1160 Avenue Paul Jullien", "code_postal": "13100", "ville": "Le Tholonet", "telephone": "04 42 66 91 92", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Carreaux Shop Brignoles aubade", "adresse": "190 Boulevard Bernard Long", "code_postal": "83170", "ville": "Brignoles", "telephone": "04 89 11 18 66", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Espace Aubade Comtat & Allardet Le Cannet-des-Maures", "adresse": "5 Ancienne Route d'Italie", "code_postal": "83340", "ville": "Le Cannet-des-Maures", "telephone": "04 94 50 95 06", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Espace Aubade Socatra Carrelages Trans-en-Provence", "adresse": "926 Route de Draguignan", "code_postal": "83720", "ville": "Trans-en-Provence", "telephone": "04 98 10 43 00", "email": "socatra@comtat-allardet.com", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "La Gallerya", "adresse": "1104 Avenue Sampiero Corso", "code_postal": "20600", "ville": "Furiani", "telephone": "04 95 54 00 16", "email": "", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "LCA BASTIA", "adresse": "193 Ardisson", "code_postal": "20600", "ville": "Furiani", "telephone": "04 95 58 82 95", "email": "LCA-med.bastia@orange.fR", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "LCA PORTO VECCHIO", "adresse": "ZI Les Salines", "code_postal": "20137", "ville": "Porto-Vecchio", "telephone": "04 95 70 74 74", "email": "lca-med.pvecchio@orange.fr", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Prospect", "societe": "Raibaldi Ets", "adresse": "D72", "code_postal": "20167", "ville": "Sarrola-Carcopino", "telephone": "06 28 84 19 92", "email": "amb.raibaldi@orange.fr", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "ITAL 3 Ajaccio", "adresse": "Zoning Industriel Baleone", "code_postal": "20167", "ville": "Afa", "telephone": "04 95 20 90 48", "email": "", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Upptile by asdecarreaux", "adresse": "25 Rue de Bourgogne", "code_postal": "75007", "ville": "Paris", "telephone": "01 87 44 79 45", "email": "berenice@asdecarreaux.com", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "as de carreaux", "adresse": "725 Route de Beziers", "code_postal": "34120", "ville": "Pezenas", "telephone": "04 48 20 50 91", "email": "commande@asdecarreaux.com", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Tout pour le Paysage", "adresse": "Chemin du Jas Neuf", "code_postal": "83910", "ville": "Pourrieres", "telephone": "06 77 03 99 17", "email": "pierre.tplp@gmail.com", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Richardson Carros 16eme Rue", "adresse": "16eme Rue", "code_postal": "06510", "ville": "Le Broc", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "RICHARDSON Nice centre", "adresse": "70-72 Route de Turin", "code_postal": "06000", "ville": "Nice", "telephone": "04 93 82 26 64", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "SMCE PRESTIGE", "adresse": "Route Nationale 96", "code_postal": "13650", "ville": "Meyrargues", "telephone": "04 42 63 48 38", "email": "kenza@smce-prestige.fr", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "l’expert carrelage", "adresse": "165 Boulevard de la Madeleine", "code_postal": "06000", "ville": "Nice", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "RICHARDSON DIGNES", "adresse": "Rue Ferdinand de Lesseps", "code_postal": "04000", "ville": "Digne-les-Bains", "telephone": "04 13 36 10 37", "email": "Stephanie.luc@richardson.fr", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "Adonis Piscines", "adresse": "1609 Chemin de Saint-Bernard", "code_postal": "06220", "ville": "Vallauris", "telephone": "04 93 74 52 77", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "CIFFREO BONA PASTEUR", "adresse": "116 Boulevard Pasteur", "code_postal": "06000", "ville": "Nice", "telephone": "04 93 13 63 77", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "Tot Ceramica Carrelage", "adresse": "43 Avenue du Champ de Mars", "code_postal": "11100", "ville": "Narbonne", "telephone": "04 68 40 00 68", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "RICHARDSON MANOSQUE", "adresse": "265 Boulevard Saint-Joseph", "code_postal": "04100", "ville": "Manosque", "telephone": "04 92 72 14 43", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "RICHARDSON GAP", "adresse": "1 Boulevard d'Orient", "code_postal": "05000", "ville": "Gap", "telephone": "04 92 52 24 77", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "NEO SOLS & MURS", "adresse": "14 Rue Paul Langevin", "code_postal": "34770", "ville": "Gigean", "telephone": "09 82 54 30 10", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "le roi du carro", "adresse": "Rue de la Pise", "code_postal": "30110", "ville": "La Grand-Combe", "telephone": "06 11 28 90 38", "email": "leroiducarro30@gmail.com", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "RICHARDSON ANTIBES", "adresse": "172 Avenue Weisweiller", "code_postal": "06600", "ville": "Antibes", "telephone": "04 93 74 63 66", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "RICHARDSON CARROS", "adresse": "4eme Rue", "code_postal": "06510", "ville": "Carros", "telephone": "04 92 08 88 80", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "RICHARDSON NICE", "adresse": "70-72 Route de Turin", "code_postal": "06300", "ville": "Nice", "telephone": "04 97 08 83 83", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "richardson frejus", "adresse": "72 Rue de l'Avelan", "code_postal": "83600", "ville": "Frejus", "telephone": "0756461352", "email": "Remy.jambon@richardson.fR", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Mondial Carrelages", "adresse": "Zone Industrielle / Route de Nîmes", "code_postal": "34740", "ville": "Vendargues", "telephone": "04 67 70 88 94", "email": "info@mondialcarrelages.fr", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Prospect", "societe": "Ligne & Lumiere Delta Bois", "adresse": "785 Avenue Frederic Bartholdi", "code_postal": "30000", "ville": "Nimes", "telephone": "04 66 27 80 60", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Prospect", "societe": "Sols Concept", "adresse": "Chemin de Payannet", "code_postal": "13120", "ville": "Gardanne", "telephone": "04 42 64 17 65", "email": "sols.concept@hotmail.com", "autre_telephone": "0777834473", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Idea Carrelages", "adresse": "1581 Avenue Paul Jullien", "code_postal": "13100", "ville": "Le Tholonet", "telephone": "04 42 20 99 38", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona sanary", "adresse": "773 Avenue des Lavandieres", "code_postal": "83310", "ville": "Sanary-sur-Mer", "telephone": "+33 4 94 74 26 00", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona Frejus", "adresse": "Avenue des Esclapes", "code_postal": "83600", "ville": "Frejus", "telephone": "+33 4 94 52 50 60", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona Carpentras", "adresse": "Route de Pernes les Fontaines", "code_postal": "84200", "ville": "Carpentras", "telephone": "+33 4 90 67 74 00", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona Montauroux", "adresse": "Fondurane", "code_postal": "83440", "ville": "Montauroux", "telephone": "+33 4 94 85 77 90", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona Peymeinade", "adresse": "59 Route de Draguignan", "code_postal": "06530", "ville": "Peymeinade", "telephone": "+33 4 93 66 62 60", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona Grasse", "adresse": "19 Route de Draguignan", "code_postal": "06130", "ville": "Grasse", "telephone": "+33 4 93 70 44 44", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona Cannes", "adresse": "211 Avenue Francis Tonner", "code_postal": "06150", "ville": "Cannes", "telephone": "+33 4 92 19 49 49", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "DESIGN CARRELAGES (30 AUBORD) sol evolution", "adresse": "2 Rue Joel de Rosnay", "code_postal": "30620", "ville": "Aubord", "telephone": "+33 6 84 68 36 00", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Espace Carrelages du minervois", "adresse": "1 Rue des Gabares", "code_postal": "11000", "ville": "Carcassonne", "telephone": "+33 4 68 25 60 67", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona Salernes", "adresse": "1089 Route de Draguignan", "code_postal": "83690", "ville": "Salernes", "telephone": "+33 4 94 85 91 91", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona Draguignan", "adresse": "Saint-Hermentaire", "code_postal": "83300", "ville": "Draguignan", "telephone": "+33 4 94 50 80 39", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "SAINT PAUL PISCINES", "adresse": "980 Boulevard Pierre Sauvaigo", "code_postal": "06480", "ville": "La Colle-sur-Loup", "telephone": "+33 4 93 32 59 03", "email": "", "autre_telephone": "", "departement": "", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona meyreuil", "adresse": "Z.I. de Meyreuil", "code_postal": "13590", "ville": "Meyreuil", "telephone": "+33 4 42 51 29 70", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona la garde", "adresse": "846 Avenue de Draguignan", "code_postal": "83130", "ville": "La Garde", "telephone": "+33 4 98 01 25 50", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Materiaux de construction BONIFAY La Londe", "adresse": "43 Chemin du Pansard", "code_postal": "83250", "ville": "La Londe-les-Maures", "telephone": "+33 4 94 65 22 05", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "Tendance Carrelage", "adresse": "37 Rue de la Seyne", "code_postal": "83140", "ville": "Six-Fours-les-Plages", "telephone": "04 94 06 30 63", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "Italsols", "adresse": "Roquebrune", "code_postal": "30130", "ville": "Saint-Alexandre", "telephone": "+33 4 66 33 51 88", "email": "italsols@hotmail.fr", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Mes Jolis Carreaux - Perpignan (ex Caro & Deco)", "adresse": "557 Boulevard Paul Langevin", "code_postal": "66000", "ville": "Perpignan", "telephone": "04 49 23 21 38", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "MATRAFER", "adresse": "4 Avenue de Rome", "code_postal": "66270", "ville": "Le Soler", "telephone": "+33 468555657", "email": "jm@matrafer.com", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "CERAMIQUE DECOR", "adresse": "30 Avenue Pierre Semard", "code_postal": "11100", "ville": "Narbonne", "telephone": "+33 468324657", "email": "contact@ceramiquedecor.fr", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "ALLIANCE CARRELAGE", "adresse": "31 Rue Charles Lindberg", "code_postal": "34130", "ville": "Mauguio", "telephone": "+33 467718932", "email": "alliancecarrelage.mb@gmail.com", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Prospect", "societe": "AS CARRELAGE", "adresse": "287 Quai de Bilina", "code_postal": "30100", "ville": "Ales", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "RICHARDSON hyeres", "adresse": "829 Route des Loubes", "code_postal": "83400", "ville": "Hyeres", "telephone": "0494575730", "email": "abigael.duval@richardson.fr", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "SO DESIGN CANNES", "adresse": "11 Rue du 14 Juillet", "code_postal": "06400", "ville": "Cannes", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "RICHARSON marseille 2", "adresse": "2 Place Gantes", "code_postal": "13002", "ville": "Marseille", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "InOutlet Carrelages", "adresse": "194 Avenue Simone Veil", "code_postal": "06200", "ville": "Nice", "telephone": "09 73 23 30 20", "email": "", "autre_telephone": "0422532791", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "GEDIMAT BARTHELEMY", "adresse": "7 Avenue Paul Dalbret", "code_postal": "13013", "ville": "Marseille", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "FC REALISATIONS", "adresse": "85 Avenue de la Pointe Rouge", "code_postal": "13008", "ville": "Marseille", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "CMA EXPERT HABITAT", "adresse": "Cours Grandval", "code_postal": "20090", "ville": "Ajaccio", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Prospect", "societe": "CASANOVA", "adresse": "4 Avenue Jose Nobre", "code_postal": "13500", "ville": "Martigues", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "BRONZINI ETS BIGMAT MATERIAUX", "adresse": "Z.I. de Toga", "code_postal": "20600", "ville": "Bastia", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "ALPES CARRELAGES", "adresse": "Pres Combaux", "code_postal": "04100", "ville": "Manosque", "telephone": "", "email": "alpescarrelages@hotmail.fr", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "GALERIE CARDIALES", "adresse": "6 Rue des Metiers", "code_postal": "05000", "ville": "Gap", "telephone": "", "email": "martine@cardiales.fr", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "CORSE CARRELAGE", "adresse": "Route nationale 193", "code_postal": "20600", "ville": "Furiani", "telephone": "04 95 33 51 01", "email": "corse-carrelage@wanadoo.fr", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "CERAMIC OUTLET STORE VALLAURIS", "adresse": "2121 Chemin de Saint-Bernard", "code_postal": "06220", "ville": "Vallauris", "telephone": "04 93 33 20 46", "email": "cde.cosvallauris@gmail.com", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "CARREAU CONCEPT OUTLET STORE", "adresse": "380 Avenue Eugene Augias", "code_postal": "83130", "ville": "La Garde", "telephone": "04 94 42 54 57", "email": "cde.cclagarde@gmail.com", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "Wellness Spa", "adresse": "1415 Avenue Julien Panchot", "code_postal": "66000", "ville": "Perpignan", "telephone": "04 68 98 31 34", "email": "commercial@wellness-spa.fr", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "MAT K.RO", "adresse": "1211 Avenue d'Espagne", "code_postal": "66100", "ville": "Perpignan", "telephone": "", "email": "dimitri@matrafer.com", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Prospect", "societe": "DRIVE MATERIAUX", "adresse": "1773 Avenue du Languedoc", "code_postal": "66000", "ville": "Perpignan", "telephone": "", "email": "drive-materiaux@hotmail.com", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "CARO ET DECO CABESTANY", "adresse": "10 Rue Henri Becquerel", "code_postal": "66330", "ville": "Cabestany", "telephone": "09 51 01 01 53", "email": "commandes@servicecarrelage.fr", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Laurent Carrelage", "adresse": "31 Avenue Maquis Montagne Noire", "code_postal": "11400", "ville": "Castelnaudary", "telephone": "04 68 23 35 85", "email": "laurent.carrelage@orange.fr", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Prospect", "societe": "Languedoc Carrelages - Delobel Didier", "adresse": "Rue Brillat Savarin", "code_postal": "11000", "ville": "Carcassonne", "telephone": "04 68 25 58 70", "email": "languedoc.carrelage@orange.fr", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Mon-Carrelage", "adresse": "130 Avenue de Bordeaux", "code_postal": "11100", "ville": "Narbonne", "telephone": "04 68 41 61 29", "email": "carrelagesduminervois@gmail.com", "autre_telephone": "Christophe dos Santos ", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "ECO CERAMIQUE", "adresse": "25 Avenue de Louate", "code_postal": "11100", "ville": "Montredon-des-Corbieres", "telephone": "04 34 44 74 18", "email": "eco.ceramique.montredon@gmail.com", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "CAMPREDON", "adresse": "19 Rue Gaspard Monge", "code_postal": "11000", "ville": "Carcassonne", "telephone": "", "email": "contact@campredon-deco.com", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "ANNETTE CARRELAGES", "adresse": "29 Ratacas Zone Industrielle", "code_postal": "11100", "ville": "Narbonne", "telephone": "", "email": "info@annettecarrelages.com", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Prospect", "societe": "SAMSE GAP SECOND OEUVRE", "adresse": "22 Route des Fauvins", "code_postal": "05000", "ville": "Gap", "telephone": "", "email": "christophe-triolet@samse.fr", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "SAMSE CAREO GAP", "adresse": "91 Avenue d'Embrun", "code_postal": "05000", "ville": "Gap", "telephone": "", "email": "michael-cassan@samse.fr", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "LUMSOL CARRELAGE ET BAIN", "adresse": "3 Avenue des Alpes", "code_postal": "05000", "ville": "Chateauvieux", "telephone": "", "email": "gap@carrelage-bain.fr", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "BONIFAY theus", "adresse": "Route Départementale 942", "code_postal": "05190", "ville": "Theus", "telephone": "", "email": "theus@bonifay.fr", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "LA BOUTIQUE DU CARRELAGE", "adresse": "Les Cheminants", "code_postal": "05230", "ville": "La Batie-Neuve", "telephone": "", "email": "contact@laboutiqueducarrelage.com", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "CARRELAGE HABITAT", "adresse": "La Plaine de Lachaup", "code_postal": "05000", "ville": "Gap", "telephone": "", "email": "info@carrelage-habitat.fr", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "AGENCEMENT 05", "adresse": "4 Rue des Bouilleurs de cru", "code_postal": "05200", "ville": "Embrun", "telephone": "", "email": "lopezagencement05@gmail.com", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "SAMSE CAREO DIGNE", "adresse": "2 Rue Claude Chappe", "code_postal": "04000", "ville": "Digne-les-Bains", "telephone": "", "email": "aurelie-samin@samse.fr", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "MATERIAUX SIMC EDB MANOSQUE", "adresse": "236 Avenue du 1er Mai", "code_postal": "04100", "ville": "Manosque", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "SANTUNIONE", "adresse": "Lieu-dit Campo di Fiori", "code_postal": "20090", "ville": "Ajaccio", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "PIFFERINI MATERIAUX", "adresse": "120 Avenue Santa Laurina", "code_postal": "20270", "ville": "Aleria", "telephone": "", "email": "carrelage@abcorse.fr", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "MUFRAGGI MATERIAUX", "adresse": "T22", "code_postal": "20167", "ville": "Sarrola-Carcopino", "telephone": "", "email": "marie-laure.denechaud@mufraggi.fr", "autre_telephone": "04 95 22 37 70", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "LUCIANI", "adresse": "Route de Mezzavia", "code_postal": "20090", "ville": "Ajaccio", "telephone": "", "email": "andrea.mistre@maisonluciani.com ", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "ITAL 3 HABITAT", "adresse": "Avenue Sampiero Corso", "code_postal": "20600", "ville": "Bastia", "telephone": " 04 95 30 44 30", "email": "ital3habitat@orange.fr", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "EUCLEIA", "adresse": "Avenue de Bastia", "code_postal": "20137", "ville": "Porto-Vecchio", "telephone": "06 49 52 29 08", "email": "a.andrietti@eucleia-interieur.com", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "CAP MATERIAUX", "adresse": "Chemin Cepitta", "code_postal": "20228", "ville": "Luri", "telephone": " 04 95 38 98 65", "email": "cap.materiaux@orange.fr", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "AMBIANCE ET CREATION", "adresse": "Route Principale", "code_postal": "20129", "ville": "Bastelicaccia", "telephone": "04 95 20 00 42", "email": "info.carrelage@orange.fr", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "SOLMAT vitrolles", "adresse": "Route Nationale 113", "code_postal": "13127", "ville": "Vitrolles", "telephone": "04 42 77 40 45", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "AIXPO CARREAUX", "adresse": "6145 Route d'Avignon", "code_postal": "13540", "ville": "Aix-en-Provence", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "MCC", "adresse": "2252 Avenue du Marechal Juin", "code_postal": "06250", "ville": "Mougins", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "MILLE ET UN CARREAUX", "adresse": "Zone Artisanale Les Bastides Blanches", "code_postal": "04220", "ville": "Sainte-Tulle", "telephone": "0492782790", "email": "contact@milleetuncarreaux.com", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "KARELO DESIGN", "adresse": "N85", "code_postal": "05000", "ville": "Gap", "telephone": "04 92 54 81 54", "email": "contact@karelo.fr", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "LEXPO carrelage et bain", "adresse": "300 Rue Roland Garros", "code_postal": "34130", "ville": "Mauguio", "telephone": "04 67 64 47 03", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Prospect", "societe": "MATTOUT", "adresse": "10 Avenue des Paluds", "code_postal": "13400", "ville": "Aubagne", "telephone": "0442823190", "email": "frederic.bertillon@mattout-carrelage.fr", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "SB FERRATO", "adresse": "370 Route de Saint-Canadet", "code_postal": "13100", "ville": "Aix-en-Provence", "telephone": "0442232086", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "TERRE D'EDEN", "adresse": "694 Route de Carpentras", "code_postal": "84270", "ville": "Vedene", "telephone": "", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "CARRELAGE MARKET", "adresse": "301 Chemin de Saint-Tropez", "code_postal": "83480", "ville": "Puget-sur-Argens", "telephone": "0783068405", "email": "info@carrelage-market.com", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "CARREL'AS new concept", "adresse": "Rd 908", "code_postal": "13124", "ville": "Peypin", "telephone": "0749725287", "email": "carrelasnewconcept@gmail.com", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"}
];

document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = localStorage.getItem("agentLoggedIn");
  if (!isLoggedIn) {
    window.location.href = "agent.html";
    return;
  }

  const agentName = localStorage.getItem("agentName") || "Agent";
  const firstName = agentName.split(" ")[0];
  const greetingEl = document.getElementById("user-greeting");
  if (greetingEl) {
    greetingEl.textContent = `Bonjour ${firstName} 👋 — Espace Commercial LE ROY FACTORY`;
  }

  function updateDateTime() {
    const now = new Date();
    const dateEl = document.getElementById("current-date");
    const timeEl = document.getElementById("current-time");
    if (dateEl) {
      let formatted = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
  }
  updateDateTime();
  setInterval(updateDateTime, 1000);

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("agentLoggedIn");
      localStorage.removeItem("agentName");
      localStorage.removeItem("agentEmail");
      window.location.href = "agent.html";
    });
  }

  // Listes déroulantes de classement ergonomique
  const deptSelect = document.getElementById("filter-dept");
  const cpSelect = document.getElementById("filter-cp");
  const citySelect = document.getElementById("filter-city");

  const departments = [...new Set(clientsDatabase.map(c => c.departement).filter(Boolean))].sort();
  const postalCodes = [...new Set(clientsDatabase.map(c => c.code_postal).filter(Boolean))].sort();
  const cities = [...new Set(clientsDatabase.map(c => c.ville).filter(Boolean))].sort();

  if (deptSelect) {
    departments.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      deptSelect.appendChild(opt);
    });
  }

  if (cpSelect) {
    postalCodes.forEach(cp => {
      const opt = document.createElement("option");
      opt.value = cp;
      opt.textContent = cp;
      cpSelect.appendChild(opt);
    });
  }

  if (citySelect) {
    cities.forEach(city => {
      const opt = document.createElement("option");
      opt.value = city;
      opt.textContent = city;
      citySelect.appendChild(opt);
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  let currentFilter = urlParams.get("filter") || "all";

  // Mise à jour des KPI en haut
  const totalCountEl = document.getElementById("count-total");
  const clientsCountEl = document.getElementById("count-clients");
  const prospectsCountEl = document.getElementById("count-prospects");

  if (totalCountEl) totalCountEl.textContent = clientsDatabase.length;
  if (clientsCountEl) clientsCountEl.textContent = clientsDatabase.filter(c => c.type && c.type.toLowerCase() === 'client').length;
  if (prospectsCountEl) prospectsCountEl.textContent = clientsDatabase.filter(c => c.type && c.type.toLowerCase() === 'prospect').length;

  const tableBody = document.getElementById("clients-table-body");
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  const noResultsDiv = document.getElementById("no-results");
  const filterBtns = document.querySelectorAll(".filter-btn[data-filter]");
  const resetBtn = document.getElementById("reset-filters");

  filterBtns.forEach(btn => {
    if (btn.getAttribute("data-filter") === currentFilter) {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.getAttribute("data-filter");
      renderTable();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (deptSelect) deptSelect.value = "";
      if (cpSelect) cpSelect.value = "";
      if (citySelect) citySelect.value = "";
      currentFilter = "all";
      filterBtns.forEach(b => b.classList.remove("active"));
      document.querySelector('.filter-btn[data-filter="all"]').classList.add("active");
      renderTable();
    });
  }

  function renderTable() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const selectedDept = deptSelect ? deptSelect.value : "";
    const selectedCp = cpSelect ? String(cpSelect.value) : "";
    const selectedCity = citySelect ? citySelect.value : "";

    if (!tableBody) return;
    tableBody.innerHTML = "";

    const filtered = clientsDatabase.filter(item => {
      const itemType = item.type ? item.type.toLowerCase() : "";
      const matchType = currentFilter === "all" || itemType === currentFilter;
      const matchDept = !selectedDept || item.departement === selectedDept;
      const matchCp = !selectedCp || String(item.code_postal) === selectedCp;
      const matchCity = !selectedCity || item.ville === selectedCity;

      const matchSearch = !searchTerm || 
        (item.societe && item.societe.toLowerCase().includes(searchTerm)) ||
        (item.ville && item.ville.toLowerCase().includes(searchTerm)) ||
        (item.code_postal && String(item.code_postal).includes(searchTerm)) ||
        (item.departement && item.departement.toLowerCase().includes(searchTerm)) ||
        (item.telephone && item.telephone.toLowerCase().includes(searchTerm)) ||
        (item.email && item.email.toLowerCase().includes(searchTerm));

      return matchType && matchDept && matchCp && matchCity && matchSearch;
    });

    if (filtered.length === 0) {
      if (noResultsDiv) noResultsDiv.style.display = "block";
      return;
    } else {
      if (noResultsDiv) noResultsDiv.style.display = "none";
    }

    filtered.forEach(client => {
      const tr = document.createElement("tr");
      const cType = client.type ? client.type.toLowerCase() : "";
      const badgeClass = cType === 'client' ? 'badge-client' : 'badge-prospect';
      
      tr.innerHTML = `
        <td><strong>${client.societe || 'Sans nom'}</strong></td>
        <td><span class="badge ${badgeClass}">${client.type || 'Inconnu'}</span></td>
        <td>${client.adresse || '-'}</td>
        <td><strong>${client.code_postal || '-'}</strong> ${client.ville || ''}</td>
        <td><span class="badge" style="background:#f1f1f1; color:#333;">${client.departement || '-'}</span></td>
        <td>${client.telephone || '-'}</td>
      `;

      tr.addEventListener("click", () => openModal(client));
      tableBody.appendChild(tr);
    });
  }

  if (searchInput) searchInput.addEventListener("input", renderTable);
  if (searchBtn) searchBtn.addEventListener("click", renderTable);
  if (deptSelect) deptSelect.addEventListener("change", renderTable);
  if (cpSelect) cpSelect.addEventListener("change", renderTable);
  if (citySelect) citySelect.addEventListener("change", renderTable);

  renderTable();

  const modal = document.getElementById("client-modal");
  const modalClose = document.getElementById("modal-close-btn");

  function openModal(client) {
    if (!modal) return;
    document.getElementById("modal-societe").textContent = client.societe || 'Sans nom';
    document.getElementById("modal-type").textContent = client.type || '-';
    document.getElementById("modal-adresse").textContent = client.adresse || '-';
    document.getElementById("modal-ville").textContent = `${client.code_postal || ''} ${client.ville || '-'}`;
    document.getElementById("modal-telephone").textContent = client.telephone || '-';
    document.getElementById("modal-email").textContent = client.email || 'Aucun e-mail renseigné';
    document.getElementById("modal-autre-tel").textContent = client.autre_telephone || 'Aucun';
    document.getElementById("modal-dept").textContent = client.departement || '-';
    document.getElementById("modal-region").textContent = client.region || '-';
    
    modal.style.display = "flex";
  }

  if (modalClose) {
    modalClose.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
});
