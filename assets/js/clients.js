// ============================================================
// BASE DE DONNÉES CRM LE ROY FACTORY — Intégralité des 279 fiches
// ============================================================

// 1. CONNECTION À FIREBASE
// ============================================================
// Importation des SDK Firebase (CDN modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuration Firebase (Tes vraies clés récupérées précédemment)
const firebaseConfig = {
  apiKey: "AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is",
  authDomain: "le-roy-factory.firebaseapp.com",
  projectId: "le-roy-factory",
  storageBucket: "le-roy-factory.firebasestorage.app",
  messagingSenderId: "249878619253",
  appId: "1:249878619253:web:05f051710b6251dbfa843c"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. DONNÉES BRUTES À MIGRER (Tes 279 fiches structurées)
// ============================================================
const legacyDataToMigrate = [
  {type: "Prospect", societe: "MP CETIN. EDEN", adresse: "6 Bd des Jardiniers", cp: "06200", ville: "Nice", tel: "0674813721", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona", adresse: "875 Route du Thor", cp: "84800", ville: "L'Isle-sur-la-Sorgue", tel: "04 90 20 52 22", email: "", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona", adresse: "3 Rue Marie Magdeleine Signouret", cp: "84160", ville: "Cadenet", tel: "04 90 08 74 50", email: "", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "4 Rue Berlioz", adresse: "4 Rue Berlioz", cp: "06000", ville: "Nice", tel: "", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Balitrand", adresse: "280 Rue Bastide de Verdaches", cp: "13290", ville: "Aix-en-Provence", tel: "04 42 97 74 74", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona Plaquiste - Facade", adresse: "132 Avenue de la Roubine", cp: "06150", ville: "Cannes", tel: "04 92 19 42 30", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "Pool & House Renov", adresse: "28 Allee des Jacinthes", cp: "06800", ville: "Cagnes-sur-Mer", tel: "06 12 95 16 76", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona Showroom", adresse: "211 Avenue Francis Tonner", cp: "06150", ville: "Cannes", tel: "04 92 19 49 49", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona", adresse: "2143 Avenue Guillaume Dulac", cp: "13600", ville: "La Ciotat", tel: "04 42 08 21 21", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "JEM Carrelages Venelles", adresse: "104 Avenue des Logissons", cp: "13770", ville: "Venelles", tel: "04 42 22 86 55", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "La Maison par Carreau Concept", adresse: "1955 Chemin de Saint-Bernard", cp: "06220", ville: "Vallauris", tel: "04 93 67 28 04", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "C.B.L Carrelages Batiment du littoral", adresse: "1887 Chemin de Saint-Bernard Porte", cp: "06220", ville: "Vallauris", tel: "04 93 64 60 60", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Costamagna Distribution Mouans-Sartoux", adresse: "370 Chemin des Plaines", cp: "06370", ville: "Mouans-Sartoux", tel: "04 89 97 75 05", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Espace Aubade Laur & Abad Nimes", adresse: "291 Avenue du Docteur Fleming", cp: "30900", ville: "Nimes", tel: "04 66 28 86 86", email: "", autreTel: "", dept: "FR-30", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "Espace Aubade Comtat et Allardet Le Tholonet (Aix Carrelages)", adresse: "1160 Avenue Paul Jullien", cp: "13100", ville: "Le Tholonet", tel: "04 42 66 91 92", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Carreaux Shop Brignoles aubade", adresse: "190 Boulevard Bernard Long", cp: "83170", ville: "Brignoles", tel: "04 89 11 18 66", email: "", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Espace Aubade Comtat & Allardet Le Cannet-des-Maures", adresse: "5 Ancienne Route d'Italie", cp: "83340", ville: "Le Cannet-des-Maures", tel: "04 94 50 95 06", email: "", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Espace Aubade Socatra Carrelages Trans-en-Provence", adresse: "926 Route de Draguignan", cp: "83720", ville: "Trans-en-Provence", tel: "04 98 10 43 00", email: "socatra@comtat-allardet.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "La Gallerya", adresse: "1104 Avenue Sampiero Corso", cp: "20600", ville: "Furiani", tel: "04 95 54 00 16", email: "", autreTel: "", dept: "FR-2B", region: "FR-COR", pays: "FR"},
  {type: "Client", societe: "LCA BASTIA", adresse: "193 Ardisson", cp: "20600", ville: "Furiani", tel: "04 95 58 82 95", email: "LCA-med.bastia@orange.fR", autreTel: "", dept: "FR-2B", region: "FR-COR", pays: "FR"},
  {type: "Client", societe: "LCA PORTO VECCHIO", adresse: "", cp: "20137", ville: "Porto-Vecchio", tel: "04 95 70 74 74", email: "lca-med.pvecchio@orange.fr", autreTel: "", dept: "FR-2A", region: "FR-COR", pays: "FR"},
  {type: "Prospect", societe: "Raibaldi Ets", adresse: "D72", cp: "20167", ville: "Sarrola-Carcopino", tel: "06 28 84 19 92", email: "amb.raibaldi@orange.fr", autreTel: "", dept: "FR-2A", region: "FR-COR", pays: "FR"},
  {type: "Client", societe: "ITAL 3 Ajaccio", adresse: "Zoning Industriel Baleone", cp: "20167", ville: "Afa", tel: "04 95 20 90 48", email: "", autreTel: "", dept: "FR-2A", region: "FR-COR", pays: "FR"},
  {type: "Client", societe: "Upptile by asdecarreaux", adresse: "25 Rue de Bourgogne", cp: "75007", ville: "Paris", tel: "01 87 44 79 45", email: "berenice@asdecarreaux.com", autreTel: "", dept: "FR-75", region: "FR-IDF", pays: "FR"},
  {type: "Client", societe: "as de carreaux", adresse: "725 Route de Beziers", cp: "34120", ville: "Pezenas", tel: "04 48 20 50 91", email: "commande@asdecarreaux.com", autreTel: "", dept: "FR-34", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "Tout pour le Paysage", adresse: "Chemin du Jas Neuf", cp: "83910", ville: "Pourrieres", tel: "06 77 03 99 17", email: "pierre.tplp@gmail.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Richardson Carros 16eme Rue", adresse: "16eme Rue", cp: "06510", ville: "Le Broc", tel: "", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "RICHARDSON Nice centre", adresse: "", cp: "06000", ville: "Nice", tel: "04 93 82 26 64", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "SMCE PRESTIGE", adresse: "Route Nationale 96", cp: "13650", ville: "Meyrargues", tel: "04 42 63 48 38", email: "kenza@smce-prestige.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "l’expert carrelage", adresse: "165 Boulevard de la Madeleine", cp: "06000", ville: "Nice", tel: "", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "RICHARDSON DIGNES", adresse: "Rue Ferdinand de Lesseps", cp: "04000", ville: "Digne-les-Bains", tel: "04 13 36 10 37", email: "Stephanie.luc@richardson.fr", autreTel: "", dept: "FR-04", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "Adonis Piscines", adresse: "1609 Chemin de Saint-Bernard", cp: "06220", ville: "Vallauris", tel: "04 93 74 52 77", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CIFFREO BONA PASTEUR", adresse: "116 Boulevard Pasteur", cp: "06000", ville: "Nice", tel: "04 93 13 63 77", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "Tot Ceramica Carrelage", adresse: "43 Avenue du Champ de Mars", cp: "11100", ville: "Narbonne", tel: "04 68 40 00 68", email: "", autreTel: "", dept: "FR-11", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "RICHARDSON MANOSQUE", adresse: "265 Boulevard Saint-Joseph", cp: "04100", ville: "Manosque", tel: "04 92 72 14 43", email: "", autreTel: "", dept: "FR-04", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "RICHARDSON GAP", adresse: "1 Boulevard d'Orient", cp: "05000", ville: "Gap", tel: "04 92 52 24 77", email: "", autreTel: "", dept: "FR-05", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "NEO SOLS & MURS", adresse: "14 Rue Paul Langevin", cp: "34770", ville: "Gigean", tel: "09 82 54 30 10", email: "", autreTel: "", dept: "FR-34", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "le roi du carro", adresse: "Rue de la Pise", cp: "30110", ville: "La Grand-Combe", tel: "06 11 28 90 38", email: "leroiducarro30@gmail.com", autreTel: "", dept: "FR-30", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "RICHARDSON ANTIBES", adresse: "172 Avenue Weisweiller", cp: "06600", ville: "Antibes", tel: "04 93 74 63 66", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "RICHARDSON CARROS", adresse: "4eme Rue", cp: "06510", ville: "Carros", tel: "04 92 08 88 80", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "RICHARDSON NICE", adresse: "70-72 Route de Turin", cp: "06300", ville: "Nice", tel: "04 97 08 83 83", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "richardson frejus", adresse: "72 Rue de l'Avelan", cp: "83600", ville: "Frejus", tel: "0756461352", email: "Remy.jambon@richardson.fR", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Mondial Carrelages", adresse: "", cp: "34740", ville: "Vendargues", tel: "04 67 70 88 94", email: "info@mondialcarrelages.fr", autreTel: "", dept: "FR-34", region: "FR-OCC", pays: "FR"},
  {type: "Prospect", societe: "Ligne & Lumiere Delta Bois", adresse: "785 Avenue Frederic Bartholdi", cp: "30000", ville: "Nimes", tel: "04 66 27 80 60", email: "", autreTel: "", dept: "FR-30", region: "FR-OCC", pays: "FR"},
  {type: "Prospect", societe: "Sols Concept", adresse: "Chemin de Payannet", cp: "13120", ville: "Gardanne", tel: "04 42 64 17 65", email: "sols.concept@hotmail.com", autreTel: "0777834473", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Idea Carrelages", adresse: "1581 Avenue Paul Jullien", cp: "13100", ville: "Le Tholonet", tel: "04 42 20 99 38", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona sanary", adresse: "773 Avenue des Lavandieres", cp: "83310", ville: "Sanary-sur-Mer", tel: "+33 4 94 74 26 00", email: "", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona Frejus", adresse: "Avenue des Esclapes", cp: "83600", ville: "Frejus", tel: "+33 4 94 52 50 60", email: "", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona Carpentras", adresse: "Route de Pernes les Fontaines", cp: "84200", ville: "Carpentras", tel: "+33 4 90 67 74 00", email: "", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona Montauroux", adresse: "Fondurane", cp: "83440", ville: "Montauroux", tel: "+33 4 94 85 77 90", email: "", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona Peymeinade", adresse: "59 Route de Draguignan", cp: "06530", ville: "Peymeinade", tel: "+33 4 93 66 62 60", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona Grasse", adresse: "19 Route de Draguignan", cp: "06130", ville: "Grasse", tel: "+33 4 93 70 44 44", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona Cannes", adresse: "211 Avenue Francis Tonner", cp: "06150", ville: "Cannes", tel: "+33 4 92 19 49 49", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "DESIGN CARRELAGES (30 AUBORD) sol evolution", adresse: "2 Rue Joel de Rosnay", cp: "30620", ville: "Aubord", tel: "+33 6 84 68 36 00", email: "", autreTel: "", dept: "FR-30", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "Espace Carrelages du minervois", adresse: "1 Rue des Gabares", cp: "11000", ville: "Carcassonne", tel: "+33 4 68 25 60 67", email: "", autreTel: "", dept: "FR-11", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona Salernes", adresse: "1089 Route de Draguignan", cp: "83690", ville: "Salernes", tel: "+33 4 94 85 91 91", email: "", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona Draguignan", adresse: "Saint-Hermentaire", cp: "83300", ville: "Draguignan", tel: "+33 4 94 50 80 39", email: "", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "SAINT PAUL PISCINES", adresse: "980 Boulevard Pierre Sauvaigo", cp: "06480", ville: "La Colle-sur-Loup", tel: "+33 4 93 32 59 03", email: "", autreTel: "", dept: "", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona meyreuil", adresse: "", cp: "13590", ville: "Meyreuil", tel: "+33 4 42 51 29 70", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Ciffreo Bona la garde", adresse: "846 Avenue de Draguignan", cp: "83130", ville: "La Garde", tel: "+33 4 98 01 25 50", email: "", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Materiaux de construction BONIFAY La Londe", adresse: "43 Chemin du Pansard", cp: "83250", ville: "La Londe-les-Maures", tel: "+33 4 94 65 22 05", email: "", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "Tendance Carrelage", adresse: "37 Rue de la Seyne", cp: "83140", ville: "Six-Fours-les-Plages", tel: "04 94 06 30 63", email: "", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "Italsols", adresse: "Roquebrune", cp: "30130", ville: "Saint-Alexandre", tel: "+33 4 66 33 51 88", email: "italsols@hotmail.fr", autreTel: "", dept: "FR-30", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "Mes Jolis Carreaux - Perpignan (ex Caro & Deco)", adresse: "557 Boulevard Paul Langevin", cp: "66000", ville: "Perpignan", tel: "04 49 23 21 38", email: "", autreTel: "", dept: "FR-66", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "MATRAFER", adresse: "4 Avenue de Rome", cp: "66270", ville: "Le Soler", tel: "+33 468555657", email: "jm@matrafer.com", autreTel: "", dept: "FR-66", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "CERAMIQUE DECOR", adresse: "30 Avenue Pierre Semard", cp: "11100", ville: "Narbonne", tel: "+33 468324657", email: "contact@ceramiquedecor.fr", autreTel: "", dept: "FR-11", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "ALLIANCE CARRELAGE", adresse: "31 Rue Charles Lindberg", cp: "34130", ville: "Mauguio", tel: "+33 467718932", email: "alliancecarrelage.mb@gmail.com", autreTel: "", dept: "FR-34", region: "FR-OCC", pays: "FR"},
  {type: "Prospect", societe: "AS CARRELAGE", adresse: "287 Quai de Bilina", cp: "30100", ville: "Ales", tel: "", email: "", autreTel: "", dept: "FR-30", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "RICHARDSON hyeres", adresse: "829 Route des Loubes", cp: "83400", ville: "Hyeres", tel: "0494575730", email: "abigael.duval@richardson.fr", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "SO DESIGN CANNES", adresse: "11 Rue du 14 Juillet", cp: "06400", ville: "Cannes", tel: "", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "RICHARSON marseille 2", adresse: "2 Place Gantes", cp: "13002", ville: "Marseille", tel: "", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "InOutlet Carrelages", adresse: "194 Avenue Simone Veil", cp: "06200", ville: "Nice", tel: "09 73 23 30 20", email: "", autreTel: "0422532791", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "GEDIMAT BARTHELEMY", adresse: "7 Avenue Paul Dalbret", cp: "13013", ville: "Marseille", tel: "", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "FC REALISATIONS", adresse: "85 Avenue de la Pointe Rouge", cp: "13008", ville: "Marseille", tel: "", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "CMA EXPERT HABITAT", adresse: "", cp: "20090", ville: "Ajaccio", tel: "", email: "", autreTel: "", dept: "FR-2A", region: "FR-COR", pays: "FR"},
  {type: "Prospect", societe: "CASANOVA", adresse: "4 Avenue Jose Nobre", cp: "13500", ville: "Martigues", tel: "", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "BRONZINI ETS BIGMAT MATERIAUX", adresse: "", cp: "20600", ville: "Bastia", tel: "", email: "", autreTel: "", dept: "FR-2B", region: "FR-COR", pays: "FR"},
  {type: "Client", societe: "ALPES CARRELAGES", adresse: "Pres Combaux", cp: "04100", ville: "Manosque", tel: "", email: "alpescarrelages@hotmail.fr", autreTel: "", dept: "FR-04", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "GALERIE CARDIALES", adresse: "6 Rue des Metiers", cp: "05000", ville: "Gap", tel: "", email: "martine@cardiales.fr", autreTel: "", dept: "FR-05", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CORSE CARRELAGE", adresse: "Route nationale 193", cp: "20600", ville: "Furiani", tel: "04 95 33 51 01", email: "corse-carrelage@wanadoo.fr", autreTel: "", dept: "FR-2B", region: "FR-COR", pays: "FR"},
  {type: "Client", societe: "CERAMIC OUTLET STORE VALLAURIS", adresse: "2121 Chemin de Saint-Bernard", cp: "06220", ville: "Vallauris", tel: "04 93 33 20 46", email: "cde.cosvallauris@gmail.com", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CARREAU CONCEPT OUTLET STORE", adresse: "380 Avenue Eugene Augias", cp: "83130", ville: "La Garde", tel: "04 94 42 54 57", email: "cde.cclagarde@gmail.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "Wellness Spa", adresse: "1415 Avenue Julien Panchot", cp: "66000", ville: "Perpignan", tel: "04 68 98 31 34", email: "commercial@wellness-spa.fr", autreTel: "", dept: "FR-66", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "MAT K.RO", adresse: "1211 Avenue d'Espagne", cp: "66100", ville: "Perpignan", tel: "", email: "dimitri@matrafer.com", autreTel: "", dept: "FR-66", region: "FR-OCC", pays: "FR"},
  {type: "Prospect", societe: "DRIVE MATERIAUX", adresse: "1773 Avenue du Languedoc", cp: "66000", ville: "Perpignan", tel: "", email: "drive-materiaux@hotmail.com", autreTel: "", dept: "FR-66", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "CARO ET DECO CABESTANY", adresse: "10 Rue Henri Becquerel", cp: "66330", ville: "Cabestany", tel: "09 51 01 01 53", email: "commandes@servicecarrelage.fr", autreTel: "", dept: "FR-66", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "Laurent Carrelage", adresse: "31 Avenue Maquis Montagne Noire", cp: "11400", ville: "Castelnaudary", tel: "04 68 23 35 85", email: "laurent.carrelage@orange.fr", autreTel: "", dept: "FR-11", region: "FR-OCC", pays: "FR"},
  {type: "Prospect", societe: "Languedoc Carrelages - Delobel Didier", adresse: "Rue Brillat Savarin", cp: "11000", ville: "Carcassonne", tel: "04 68 25 58 70", email: "languedoc.carrelage@orange.fr", autreTel: "", dept: "FR-11", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "Mon-Carrelage", adresse: "130 Avenue de Bordeaux", cp: "11100", ville: "Narbonne", tel: "04 68 41 61 29", email: "carrelagesduminervois@gmail.com", autreTel: "Christophe dos Santos ", dept: "FR-11", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "ECO CERAMIQUE", adresse: "25 Avenue de Louate", cp: "11100", ville: "Montredon-des-Corbieres", tel: "04 34 44 74 18", email: "eco.ceramique.montredon@gmail.com", autreTel: "", dept: "FR-11", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "CAMPREDON", adresse: "19 Rue Gaspard Monge", cp: "11000", ville: "Carcassonne", tel: "", email: "contact@campredon-deco.com", autreTel: "", dept: "FR-11", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "ANNETTE CARRELAGES", adresse: "29 Ratacas Zone Industrielle", cp: "11100", ville: "Narbonne", tel: "", email: "info@annettecarrelages.com", autreTel: "", dept: "FR-11", region: "FR-OCC", pays: "FR"},
  {type: "Prospect", societe: "SAMSE GAP SECOND OEUVRE", adresse: "22 Route des Fauvins", cp: "05000", ville: "Gap", tel: "", email: "christophe-triolet@samse.fr", autreTel: "", dept: "FR-05", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "SAMSE CAREO GAP", adresse: "91 Avenue d'Embrun", cp: "05000", ville: "Gap", tel: "", email: "michael-cassan@samse.fr", autreTel: "", dept: "FR-05", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "LUMSOL CARRELAGE ET BAIN", adresse: "3 Avenue des Alpes", cp: "05000", ville: "Chateauvieux", tel: "", email: "gap@carrelage-bain.fr", autreTel: "", dept: "FR-05", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "BONIFAY theus", adresse: "", cp: "05190", ville: "Theus", tel: "", email: "theus@bonifay.fr", autreTel: "", dept: "FR-05", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "LA BOUTIQUE DU CARRELAGE", adresse: "Les Cheminants", cp: "05230", ville: "La Batie-Neuve", tel: "", email: "contact@laboutiqueducarrelage.com", autreTel: "", dept: "FR-05", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CARRELAGE HABITAT", adresse: "La Plaine de Lachaup", cp: "05000", ville: "Gap", tel: "", email: "info@carrelage-habitat.fr", autreTel: "", dept: "FR-05", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "AGENCEMENT 05", adresse: "4 Rue des Bouilleurs de cru", cp: "05200", ville: "Embrun", tel: "", email: "lopezagencement05@gmail.com", autreTel: "", dept: "FR-05", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "SAMSE CAREO DIGNE", adresse: "2 Rue Claude Chappe", cp: "04000", ville: "Digne-les-Bains", tel: "", email: "aurelie-samin@samse.fr", autreTel: "", dept: "FR-04", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "MATERIAUX SIMC EDB MANOSQUE", adresse: "236 Avenue du 1er Mai", cp: "04100", ville: "Manosque", tel: "", email: "", autreTel: "", dept: "FR-04", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "SANTUNIONE", adresse: "Lieu-dit Campo di Fiori", cp: "20090", ville: "Ajaccio", tel: "", email: "", autreTel: "", dept: "FR-2A", region: "FR-COR", pays: "FR"},
  {type: "Client", societe: "PIFFERINI MATERIAUX", adresse: "120 Avenue Santa Laurina", cp: "20270", ville: "Aleria", tel: "", email: "carrelage@abcorse.fr", autreTel: "", dept: "FR-2B", region: "FR-COR", pays: "FR"},
  {type: "Client", societe: "MUFRAGGI MATERIAUX", adresse: "T22", cp: "20167", ville: "Sarrola-Carcopino", tel: "", email: "marie-laure.denechaud@mufraggi.fr", autreTel: "04 95 22 37 70", dept: "FR-2A", region: "FR-COR", pays: "FR"},
  {type: "Client", societe: "LUCIANI", adresse: "Route de Mezzavia", cp: "20090", ville: "Ajaccio", tel: "", email: "andrea.mistre@maisonluciani.com ", autreTel: "", dept: "FR-2A", region: "FR-COR", pays: "FR"},
  {type: "Client", societe: "ITAL 3 HABITAT", adresse: "Avenue Sampiero Corso", cp: "20600", ville: "Bastia", tel: " 04 95 30 44 30", email: "ital3habitat@orange.fr", autreTel: "", dept: "FR-2B", region: "FR-COR", pays: "FR"},
  {type: "Client", societe: "EUCLEIA", adresse: "Avenue de Bastia", cp: "20137", ville: "Porto-Vecchio", tel: "06 49 52 29 08", email: "a.andrietti@eucleia-interieur.com", autreTel: "", dept: "FR-2A", region: "FR-COR", pays: "FR"},
  {type: "Client", societe: "CAP MATERIAUX", adresse: "Chemin Cepitta", cp: "20228", ville: "Luri", tel: " 04 95 38 98 65", email: "cap.materiaux@orange.fr", autreTel: "", dept: "FR-2B", region: "FR-COR", pays: "FR"},
  {type: "Client", societe: "AMBIANCE ET CREATION", adresse: "", cp: "20129", ville: "Bastelicaccia", tel: "04 95 20 00 42", email: "info.carrelage@orange.fr", autreTel: "", dept: "FR-2A", region: "FR-COR", pays: "FR"},
  {type: "Client", societe: "SOLMAT vitrolles", adresse: "Route Nationale 113", cp: "13127", ville: "Vitrolles", tel: "04 42 77 40 45", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "AIXPO CARREAUX", adresse: "6145 Route d'Avignon", cp: "13540", ville: "Aix-en-Provence", tel: "", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "MCC", adresse: "2252 Avenue du Marechal Juin", cp: "06250", ville: "Mougins", tel: "", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "MILLE ET UN CARREAUX", adresse: "Zone Artisanale Les Bastides Blanches", cp: "04220", ville: "Sainte-Tulle", tel: "0492782790", email: "contact@milleetuncarreaux.com", autreTel: "", dept: "FR-04", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "KARELO DESIGN", adresse: "N85", cp: "05000", ville: "Gap", tel: "04 92 54 81 54", email: "contact@karelo.fr", autreTel: "", dept: "FR-05", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "LEXPO carrelage et bain", adresse: "300 Rue Roland Garros", cp: "34130", ville: "Mauguio", tel: "04 67 64 47 03", email: "", autreTel: "", dept: "FR-34", region: "FR-OCC", pays: "FR"},
  {type: "Prospect", societe: "MATTOUT", adresse: "10 Avenue des Paluds", cp: "13400", ville: "Aubagne", tel: "0442823190", email: "frederic.bertillon@mattout-carrelage.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "SB FERRATO", adresse: "370 Route de Saint-Canadet", cp: "13100", ville: "Aix-en-Provence", tel: "0442232086", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "TERRE D'EDEN", adresse: "694 Route de Carpentras", cp: "84270", ville: "Vedene", tel: "", email: "", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CARRELAGE MARKET", adresse: "301 Chemin de Saint-Tropez", cp: "83480", ville: "Puget-sur-Argens", tel: "0783068405", email: "info@carrelage-market.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CARREL'AS new concept", adresse: "Rd 908", cp: "13124", ville: "Peypin", tel: "0749725287", email: "carrelasnewconcept@gmail.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "SUP CARO mediterranee distribution", adresse: "211 Av. de la Condamine", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "SUP CARO bezier litoral", adresse: "Rte de Narbonne", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "SUNSHINE SERVICES", adresse: "Saint-Pierre", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "RICHARD CARRELAGES", adresse: "ZI Sud", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "PEREZ CARRELAGES", adresse: "Aire Ventouse", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "LE ROI DE CARREAU", adresse: "83 Rue des Fournels", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "LATINO CERAM", adresse: "Zae du Font de la Banquiere", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "IMAGINA CONCEPT", adresse: "1 Rue Pierre Flourens", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "DESIGN CARRELAGE mauguio", adresse: "78 Rue de la Jasse", cp: "34130", ville: "Mauguio", tel: "0467073726", email: "sarlsopgperols.34@gmail.com", autreTel: "", dept: "FR-34", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "CONCEPT MOSAIQUE", adresse: "ZAC la salamane", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "Carrelage et Bain Pezenas", adresse: "725 Route de Beziers", cp: "34120", ville: "Pezenas", tel: "04 67 98 77 51", email: "", autreTel: "", dept: "FR-34", region: "FR-OCC", pays: "FR"},
  {type: "Client", societe: "CMPB CARRELAGES tout faire", adresse: "16 Av. de Montpellier", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "CERAMIQUE LANGUEDOCIENNE", adresse: "835 Rue Paul Cezanne Zone Afation", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "CARRELAGE DESIGN 34", adresse: "ZAC", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "LE COMPTOIR DE CERAM", adresse: "4 Rue Louis Breguet", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "RUBIS MATERIAUX tout faire", adresse: "1064 Chem. de la Begude", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "NATURE AND STONE", adresse: "10 Av. Philippe Lamour", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "MERCIER CARRELAGES", adresse: "rocade est", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "COMTAT & ALLARDET aubade", adresse: "ZI Saint Cesaire", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "COMPAGNIE DES CARRELAGES", adresse: "3744 Av. Kennedy", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "ANGLES ET SURFACE", adresse: "510 Av. de Grand Angles", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "TENDANCE CARRELAGE MONTAREN", adresse: "D125 ROUTE DE GATTIGUES", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "MOUTON CARRELAGE", adresse: "1184 Av. Marechal Juin", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "CARRELAGES MERIDIONAUX", adresse: "Le Belvedere", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "LG CARO", adresse: "3839 Route de Barjac", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "ITALCERAME", adresse: "3290 Av. Kennedy", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "ICARD MATERIAUX", adresse: "108 rue Des Ecoles Qua Le Clet", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "DESIGN CARRELAGE nimes", adresse: "39 Rue de l'Abrivado", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "DEPOT CARREAUX ET BAINS", adresse: "896 Rte d'Ales", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "CARRENOVE CONCEPTION", adresse: "Batiment Empire ZAC Aubepine Intermarche", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "DAVID ET FILS tout faire", adresse: "VILLAGE ERO", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "MR BRICOLAGE APT", adresse: "151 Avenue De La Gare", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "LA MAISON DU CARRELAGE", adresse: "1541 Rte de Carpentras", cp: "84700", ville: "Sorgues", tel: "0490328898", email: "", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "JDO CARRELAGE ET BAINS", adresse: "180 Rue Denis Papin", cp: "84120", ville: "Pertuis", tel: "0490089167", email: "", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "DESTOCK CARRELAGE PPC", adresse: "340 Av. Louis Boudin", cp: "84800", ville: "L'Isle-sur-la-Sorgue", tel: "0609718460", email: "gohu292@yahoo.fr", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "CERAMIC 84", adresse: "142 All. du Mont Cenis", cp: "84260", ville: "Sarrians", tel: "0490654236", email: "gregory.reynaud@ceramic84.com", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "C M P carreaux et mosaique de provence", adresse: "328 Chem. des Escampades", cp: "84170", ville: "Monteux", tel: "0490663259", email: "contact@carrelagescmp.com", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "AUTHENTIQUE ORANGE CARRELAGE", adresse: "1195 Rte de Serignan", cp: "84100", ville: "Orange", tel: "0490347841", email: "olivier.vernigi@gmail.com", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "AU FIL DU BAIN", adresse: "123 Av. de Lancon", cp: "84400", ville: "Apt", tel: "0490043151", email: "", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "AMBIANCES DU SUD", adresse: "plan des Amandiers", cp: "84220", ville: " Beaumettes", tel: "0614029631", email: "mp@ambiancesdusud.com", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "SYLVESTRE MATERIAUX apt", adresse: "316 Le Chene", cp: "84400", ville: "Apt", tel: "0490746666", email: "", autreTel: "carrelageapt@groupesn.com", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "SYLVESTRE MATERIAUX coustellet", adresse: "155 Route de Gordes", cp: "84220", ville: "Cabrieres-d'Avignon", tel: "0490767838", email: "carrelagecoustellet@groupesn.com", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "SYLVESTRE MATERIAUX l'isle sur la sorgue", adresse: "120 chemin de Cheval Blanc", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "FLASH CARRELAGES", adresse: "2 bis Av. des Verdeaux", cp: "84370", ville: "Bedarrides", tel: "0490012811", email: "flashcarrelages.vaucluse@gmail.com", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "FRANCE MATERIAUX COMTAT", adresse: "704 bis Route d'Avignon", cp: "84170", ville: "Monteux", tel: "0490669999", email: "carrelagesanitaire@comtatsas.fr", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CERA PROVENCE", adresse: "365 Av. de la Canebiere", cp: "84460", ville: "Cheval-Blanc", tel: "0951414204", email: "ceraprovence2@gmail.com ", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CARO PROMO", adresse: "148 Rue des Artisans", cp: "84420", ville: "Piolenc", tel: "0490294130", email: "contact@caro-promo.com", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CERA MOD", adresse: "55 Rue d'Italie ", cp: "84100", ville: "Orange", tel: "0490348500", email: "secretariat.ceramod@orange.fr", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CARRO DECO", adresse: "860 Route de Robion", cp: "84300", ville: "Cavaillon", tel: "0490789806", email: "commande.carrodeco@orange.fr ", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "US STONE", adresse: "RN 113 quartier la jaufrette", cp: "13300", ville: "Salon-de-Provence", tel: "0680340062", email: "us.stone13@gmail.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "AQUARO SOLFEGE", adresse: "1390 Av. Lino Ventura", cp: "13180", ville: "Gignac-la-Nerthe", tel: "0486788060", email: "pllegouic@gmail.com aquarogignac@hotmail.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "PROGIBAT CARRELAGES", adresse: "3 Rue Henri Laugier", cp: "13200", ville: "Arles", tel: "0490979614", email: "contact@progibat.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "O&SOL", adresse: "4 Rue de la Transhumance", cp: "13310", ville: "Saint Martin de crau", tel: "0490915893", email: "contact@oetsol.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "LE SHOWROMM CARRELAGE la ciotat", adresse: "Zi athelia 4", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "KEI-STONE aix en provence", adresse: "5830-5870 Rte d'Avignon", cp: "13540", ville: "Aix en provence", tel: "0442503615", email: "serge.p@kei-stone.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "DECOR’HOME AIX", adresse: "410 chemin du Plan d'Aillane", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "CARRELAGES RIVES GAUCHE", adresse: "2148 Rte d'Avignon", cp: "13160", ville: "Chateaurenard", tel: "0977903759", email: "contact@carrelages-rive-gauche.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "BARDARO CARRELAGES", adresse: "1238 Av. Patrouille de France", cp: "13300", ville: "Salon-de-Provence", tel: "0490565732", email: "barbaro-joseph@orange.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "AZUR CARRELAGES faience sanitaires cuisne", adresse: "88 Av. Frederic Chevillon", cp: "13380", ville: " Plan-de-Cuques", tel: "0491051515", email: "azurcarrelage@orange.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "AMBIANCE PIERRE ET CARRELAGE", adresse: "652 Av. des Paluds", cp: "13400", ville: "Aubagne", tel: "0442704864", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "SOLMAT aubagne", adresse: "10 Av. des Paluds", cp: "13400", ville: "Aubagne", tel: "0442702391", email: "carmat.13@solmat.fr ", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "SM CARRELAGE", adresse: "489 Chem. des Hirondelles", cp: "13330", ville: "Pelissanne", tel: "0490551216", email: "smattout@smcarrelage.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "OUTLET LES CARREAUX DE JEAN", adresse: "113 Av. de Lattre de Tassigny", cp: "13090", ville: "Aix en provence", tel: "0413416464", email: "commande@outlet-lescarreauxdejean.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "NUANCES PIERRES", adresse: "1327 D7N", cp: "13550", ville: "Noves", tel: "0488610820", email: "contact@nuancepierres.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "MY CARRELAGE", adresse: "7 Av. du 8 Mai 1945", cp: "13410", ville: "Lambesc", tel: "0413910830", email: "mycarrelage13@gmail.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "MASTERCERAM", adresse: "1 Rue des Charpentiers", cp: "13150", ville: "Tarascon", tel: "0490914311", email: "contact@masterceram.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "LES CARRELAGES DE MARSEILLE", adresse: "83 Rte des Trois Lucs a la Valentine", cp: "13012", ville: "Marseille", tel: "0491873683", email: "carrelagesdemarseille.cde@gmail.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "LES CARREAUX DE JEAN ", adresse: "666 Chem. de Calameau", cp: "13140", ville: "Miramas", tel: "0484849900", email: "commande@lescarreauxdejean.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "LE PETIT VERSAILLE", adresse: "310 Av. de Fontfrege", cp: "13420", ville: "Gemenos", tel: "0442327373", email: "david.antherieu@le-petit-versailles.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "IN'D&CO", adresse: "4 Rue de Courtine", cp: "13290", ville: "Saint Mitre les remparts", tel: "0980314211", email: "indeco.carrelage@gmail.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "ID PROJECTT", adresse: "670 Rte de Berre", cp: "13510", ville: "Eguilles", tel: "0442286002", email: "alisson@idprojectt.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "ENERGIE CHAUFFAGE SANITAIRE", adresse: "478 Av. Ernest Subilia", cp: "13600", ville: "La ciotat", tel: "0486368761", email: "commande@ecspaca.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "EUROCARO", adresse: "Plan de Campagne", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "EDEN CARRELAGES", adresse: "15 Av. de Londres", cp: "13127", ville: "Vitrolles", tel: " 04 42 88 23 41", email: "contact@eden-carrelages.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "DM HOME", adresse: "Lotissement les Jardins du Toes", cp: "13700", ville: "Marignane", tel: " 06 11 69 71 18", email: "dm.home13@gmail.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "DIRECT MATERIAUX", adresse: "10 Avenue des Paluds", cp: "13400", ville: "Aubagne", tel: "04 42 70 27 57", email: "directmateriauxfr@gmail.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "DESIGN AND DECO", adresse: "Rue de Courtine", cp: "13920", ville: "Saint-Mitre-les-Remparts", tel: " 04 42 42 07 67", email: "contact@designanddeco.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "CERAMSTONE", adresse: "13630 Chem. des Cailloux O", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "CAROMAG", adresse: "850 Chemin du Plan d'Aillane", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "CARRELAGE LUPI", adresse: "4 Bd Crespi", cp: "13008", ville: "Marseille", tel: "0491734251", email: "contact@carrelageslupi.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "BLEU MARINE", adresse: "71 Chem. Gilbert Charmasson", cp: "13016", ville: "Marseille", tel: "04 96 20 83 83", email: "bleu-marine@bleu-marine.tm.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "AUBAGNE MATERIAUX", adresse: "Route de Saint-Jean de Garguier", cp: "13400", ville: "Aubagne", tel: "0442322173", email: "contact@aubagnemateriaux.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "ARLES CARRELAGES", adresse: "5 Rue Gaston Tessier", cp: "13200", ville: "Arles", tel: "0490963055", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "ARTEMIS PRESTIGUE", adresse: "Zone Industrielle", cp: "13480", ville: "Cabries", tel: "0442314140", email: "artemis-prestige@orange.fr", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "AMBIANCE CARRELAGE Marignane", adresse: "Rte de Martigues", cp: "13700", ville: "Marignane", tel: "0442303178", email: "contact@ambiancecarrelages.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "AMBIANCE CARRELAGES arles", adresse: "ZI Nord - 18 Rue Joseph Rainard", cp: "13200", ville: "Arles", tel: "09 77 02 00 47", email: "ambiance13@gmx.com", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "AMBIANCE CARRELAGES avignon", adresse: "33 route de montfavet", cp: "84000", ville: "Avignon", tel: "09 77 81 17 23", email: "ambiance84@gmx.com", autreTel: "", dept: "FR-84", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "AMBIANCE CARRELAGES milhaud", adresse: "Route de Nîmes", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "UR CERAM", adresse: "336 Av. lou Gabian", cp: "83600", ville: "Frejus", tel: " 04 94 82 24 37", email: "", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "SOLS ET MURS DESIGN", adresse: " Chem. du Puits de la Commune", cp: "83250", ville: "La Londe les Maures", tel: " 04 94 46 26 68", email: "contact@solsetmursdesign.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "PARODI CARRELAGES", adresse: "273 Rue d'Hyeres", cp: "83140", ville: "Six Fours les plages", tel: " 04 94 34 33 12", email: "contact@parodi-carrelages.fr", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "PACA CERAM", adresse: "90 Rue de l'Industrie", cp: "83600", ville: "Frejus", tel: "04 23 36 00 99", email: "contact@pacaceram.fr", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "LA CERAMIQUE", adresse: "Chemin du Drap", cp: "83480", ville: "Puget-sur-Argens", tel: "06 99 68 26 54", email: "laceramique.sas@gmail.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "IDEAL CARRELAGE", adresse: "793 RN 8", cp: "83330", ville: "Evenos", tel: " 06 66 18 10 00", email: "", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "CARRELAGE DE LA PAULINE", adresse: "380 Av. Eugene Augias", cp: "83130", ville: "La garde", tel: " 04 94 66 46 24", email: "", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CARO +", adresse: "33 Chem. de Bassaquet", cp: "83140", ville: "Six Fours les plages", tel: " 04 94 71 05 87", email: " 6fours@caro-plus.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "TDS CONCEPT", adresse: " 5649 Avenue lou Mistraou Quartier de", cp: "83230", ville: "Bormes les mimosas", tel: " 04 94 64 96 61", email: "bormes@tds-concept.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "SELECTION MEDITERRANEE", adresse: " 300 Av. de Valensole", cp: "83310", ville: "Cogolin", tel: " 04 94 54 04 40", email: "direction@selectionmediterranee.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "SABLE D'OR", adresse: "110 Rue des Narcisses", cp: "83310", ville: "Cogolin", tel: " 04 94 56 11 01", email: "florencebec@aol.fr", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "RICHARDSON six fours les plages", adresse: " 430 Bd de Lery", cp: "83140", ville: "Six Fours les plages", tel: " 04 94 10 47 10", email: "christelle.peltier@richardson.fr", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "RICHARDSON la garde", adresse: " 805 Av. Marechal de Lattre de Tassigny", cp: "83130", ville: "La garde", tel: " 04 94 08 61 62", email: "justine.knaepen@richardson.fr", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "RICHARDSON brignoles", adresse: "1016 Bd Bernard Long", cp: "83170", ville: "Brignoles", tel: " 04 94 69 59 67", email: "fabrice.roquebrun@richardson.fr", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "RG MATERIAUX", adresse: "222 Rue Georges Besse", cp: "83600", ville: "Frejus", tel: " 04 94 52 52 22", email: "serge@rg-materiaux.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "RCB Carrelages - Vente de carrelage", adresse: "Zone Artisanale", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "PISANO MATERIAUX tout faire", adresse: "572 Av. des Palmiers", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "L'ART DU CARREAU", adresse: "68 Av. de l'Europe", cp: "83300", ville: "Draguignan", tel: " 04 94 50 51 90", email: "sandro.lartducarreau@gmail.com ", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "KRO CERAMIQUE", adresse: "229 Av. Andre Citroen", cp: "83600", ville: "Frejus", tel: "04 94 51 52 01", email: "k.roceramique@orange.fr", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "HOUSQUARE frejus", adresse: "7 Boulevard Colonel Dessert", cp: "83480", ville: "Puget-sur-Argens", tel: " 04 94 82 02 54", email: "guillaume.hubert@housquare.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "EURO CARREAUX MATERIAUX", adresse: "128 chemin sainte barbe", cp: "83170", ville: "Brignoles", tel: "04 94 69 51 12", email: "commande.ecm@free.fr ", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "Elements Carrelage", adresse: "Route Departementale 562", cp: "83440", ville: "Montauroux", tel: "04 94 67 54 69", email: "commercial@elements-carrelage.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "DIFFUSION CERAMIQUE", adresse: "35 Rue de la Creation", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "COTE CARRELAGE", adresse: "2535 Av. President John Kennedy", cp: "83140", ville: "Six Fours les plages", tel: " 04 94 94 50 00", email: "david.cotecarrelage@orange.fr ", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CIFFREO BONA saint maxime", adresse: "Zone Artisanale", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "CASH CARRELAGE ccl distribution", adresse: "Za Les Playes", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "CASA CERAM CONCEPT", adresse: "Quartier Dit du", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "CARRELAGE DU MONDE", adresse: "1523 Av. de Draguignan", cp: "83130", ville: "La garde", tel: " 04 94 66 56 34", email: "direction@cdmstore.com ", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CARO'STYL la seyne", adresse: "480 Rue de Lisbonne", cp: "83500", ville: "La Seyne sur mer", tel: " 04 94 10 27 27", email: "info@carostyl.fr", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "BONIFAY flassant", adresse: "201 impasse de Peyrouas", cp: "83340", ville: "Flassans sur issole", tel: "04 94 59 63 81", email: "flassans@bonifay.fr", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "BONIFAY toulon saint jean", adresse: "849 Avenue Colonel Picot", cp: "83100", ville: "Toulon", tel: "04 94 23 17 58", email: "brunet@bonifay.fr", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "BONIFAY tourves", adresse: "Route Departementale 7", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "BONIFAY sanary", adresse: "134 Ancien Chemin de Toulon", cp: "83110", ville: "Sanary sur mer", tel: "04 94 74 23 83", email: "sanary@bonifay.fr", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "BONIFAY la garde", adresse: "873 Chemin Des Plantades", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "OUTLET & CO le showroom carrelage", adresse: "3588 Rte du Mont-Gros", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "LE SHOWROOM CARRELAGE", adresse: "Les Terrasses du Carei", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Prospect", societe: "CARRELAGE ET BAIN ceramic house", adresse: "2211 Rte de la Fenerie", cp: "06580", ville: "Pegomas", tel: " 04 93 48 00 00", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "CASALUX", adresse: "2 Rue Colonna d'Istria", cp: "06300", ville: "Nice", tel: "09 50 97 30 38", email: "info@casalux.fr", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "BAYLINE CARRELAGE", adresse: " 95 Av. de Nice", cp: "06800", ville: "Cagnes sur Mer", tel: "04 93 14 62 78", email: "contact@bayline.fr", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "AUTHENTIC DESIGN", adresse: "1 Rue du 8 Mai 1945", cp: "06310", ville: "Beaulieu sur Mer", tel: "0493799820", email: "contact@authentic-design.fr", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "PROVENCALE DE MATERIAUX tout faire cote d'azur", adresse: "609 Rte de la Roquette", cp: "06250", ville: "Mougins", tel: "04 93 75 79 25", email: "carrelage@toutfaire06.fr ", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "NEOPIO MOSAIQUE", adresse: "616 Av. Saint-Martin", cp: "06250", ville: "Mougins", tel: "0493401234", email: "info@neopio.com", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "MILLE COULEURS D'EAU", adresse: "23 Av. Thiers", cp: "06130", ville: "Grasse", tel: "06 62 53 94 14", email: "millecouleursdeau@gmail.com", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "LA MAISON MARMORINI", adresse: "32 Bd du General de Gaulle", cp: "06340", ville: "La trinite", tel: "0493549171", email: "gwenaelle@marmorini.com", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "LES CARRELAGES DU SOLEIL", adresse: " 1230 Bd Pierre Sauvaigo", cp: "06480", ville: "La colle sur loup", tel: "04 93 32 66 46", email: "comptoircds@groupe-octave.com", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "IDEA CASA", adresse: "31 chemin des fades", cp: "06110", ville: "Le cannet", tel: "0489892374", email: "contact@ideacasa.fr", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "HOUSQUARE mougins", adresse: "785 Chemin des Campelieres", cp: "06250", ville: "Mougins", tel: "0493698044", email: "stephane.garriou@housquare.com ", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "GILLES DELFINO", adresse: " 1390 Av. du Campon", cp: "06110", ville: "Le cannet", tel: " 04 93 69 94 91", email: "gilles@gillesdelfino.com", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "FLAUJAC CHARLES", adresse: "6 Bd Rainier III", cp: "98000", ville: "Monaco", tel: "0793508787", email: "info@flaujac.mc", autreTel: "", dept: "", region: "", pays: "MC"},
  {type: "Client", societe: "COSTAMAGNA hyeres", adresse: "508 Chem. de la Villette", cp: "83400", ville: "Hyeres", tel: "0494575251", email: "v.bouget@costamagna.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "COSTAMAGNA la seyne", adresse: "Camp Laurent", cp: "83500", ville: "La Seyne-sur-Mer", tel: "04 94 10 70 60", email: "o.besnier@costamagna.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "COSTAMAGNA saint tropez", adresse: "47 Avenue Marechal Leclerc", cp: "83990", ville: "Saint Tropez", tel: "04 94 97 93 74", email: "p.delcroix@costamagna.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "COSTAMAGNA moutauroux", adresse: "Route Departementale 562", cp: "83440", ville: "Montauroux", tel: "04 94 76 48 96", email: "s.lillo@costamagna.com", autreTel: "", dept: "FR-83", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "COSTAMAGNA cagnes", adresse: "ZI", cp: "", ville: "", tel: "", email: "", autreTel: "", dept: "", region: "", pays: ""},
  {type: "Client", societe: "COSTAMAGNA saint laurent du var", adresse: "172 Av. France d'Outremer", cp: "06700", ville: "Saint Laurent du Var", tel: "04 89 97 75 55", email: "g.fagot@costamagna.com", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "COSTAMAGNA carabacel", adresse: "7 Bd Carabacel", cp: "06000", ville: "Nice", tel: "0493620551", email: "l.coulanges@costamagna.com", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "COSTAMAGNA saint martin", adresse: "RN 202", cp: "06670", ville: "Saint Martin du Var", tel: "0492082485", email: "a.deville@costamagna.com", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "CLAIRAZUR SPA villeneuve loube", adresse: "35 rte du bord de mer", cp: "06270", ville: "Villeneuve Loubet", tel: "0 800 33 32 33", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Prospect", societe: "CLAIRAZUR SPA aix en provence", adresse: "400 Av. du Camp de Menthe", cp: "13900", ville: "Aix en provence", tel: "04 42 20 54 60", email: "", autreTel: "", dept: "FR-13", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CLAIRAZUR SPA antibes", adresse: "100 rue des alisiers", cp: "06600", ville: "Antibes", tel: "0 800 33 32 33", email: "", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CERAZUR CARRELAGE", adresse: "514 Boulevard du Mercantour", cp: "06200", ville: "Nice", tel: "0493298803", email: "contact@cerazur.com", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CERA STONE CARRELAGE", adresse: "89 Boulevard Georges Pompidou", cp: "06700", ville: "Saint-Laurent-du-Var", tel: "04 93 89 26 61", email: "cerastonecarrelage@orange.fr", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CARRELAGES DISCOUNT sarl carreau depot", adresse: "33 Chemin des Fades", cp: "06110", ville: "Le Cannet", tel: "0493465901", email: "carrelages.discount.06@gmail.com", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "CAREMA", adresse: "1 Av. Henry Dunant", cp: "98000", ville: "Monaco", tel: "0793503663", email: "commercial@carema.mc", autreTel: "", dept: "", region: "", pays: "MC"},
  {type: "Client", societe: "CARAT DIFFUSION", adresse: "11 Av. des Papalins", cp: "98000", ville: "Monaco", tel: "06 14 79 17 08", email: "jpm@carat-diffusion.com", autreTel: "", dept: "", region: "", pays: "MC"},
  {type: "Client", societe: "AZZURRA CERAMICHE", adresse: "5 Avenue des Alpes", cp: "06800", ville: "Cagnes-sur-Mer", tel: "0987040262", email: "azzurra.ceramiche@gmail.com", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "AZM AZUREENNE", adresse: "2344 Avenue Georges Clemenceau", cp: "06360", ville: "Eze", tel: "0493410739", email: "n.loiseau@azm-carrelages.fr", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "ATELIER SAUZE CARRELAGE omnium", adresse: "152 Rte du Cannet", cp: "06250", ville: "Mougins", tel: "0493753342", email: "contact@atelier-sauze.com", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "ATELIER CONTEMPORAIN", adresse: "840 route de la roquette", cp: "06370", ville: "Mouans Sartoux", tel: "0492288715", email: "gerald@ateliercontemporain.fr", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"},
  {type: "Client", societe: "ANTOINE QUINTANE", adresse: "5 Rte de Valbonne", cp: "06130", ville: "Grasse", tel: "0493601628", email: "carrelage@quintane.fr", autreTel: "", dept: "FR-06", region: "FR-PAC", pays: "FR"}
];

// 3. SCRIPT DE MIGRATION AUTOMATIQUE ( CRUD )
// ============================================================
// Cette fonction va lire tes 279 clients de 'legacyDataToMigrate'
// et les envoyer automatiquement vers Firebase Firestore.
async function migrateLegacyDataToFirebase() {
  console.log("Migration automatique : Vérification de la base de données...");

  try {
    // 1. Vérifier si Firebase est déjà rempli pour éviter les doublons
    const querySnapshot = await getDocs(collection(db, "clients"));
    if (!querySnapshot.empty) {
      console.log(`Migration automatique : Ignorée. Firebase contient déjà ${querySnapshot.size} clients.`);
      return; // On arrête tout, la migration est déjà faite.
    }

    // 2. Si Firebase est vide, on lance l'importation de tes 279 clients
    console.log(`Migration automatique : Démarrage pour ${legacyDataToMigrate.length} clients...`);
    
    // Pour une meilleure gestion des erreurs et de la performance, 
    // on utilise un batch (traitement par lots) pour 279 clients.
    // Firestore limite à 500 opérations par batch. 279 rentre dedans.
    
    // Toutefois, pour plus de simplicité ici, on utilise une boucle standard.
    for (const legacyClient of legacyDataToMigrate) {
      // Nous créons un nouvel objet client adapté à Firebase, en conservant tes données EXACTES.
      const newFirebaseClient = {
        type: legacyClient.type || "Prospect",
        societe: legacyClient.societe || "Nom inconnu",
        adresse: legacyClient.adresse || "",
        cp: legacyClient.cp || "",
        ville: legacyClient.ville || "",
        tel: legacyClient.tel || "",
        email: legacyClient.email || "",
        autreTel: legacyClient.autreTel || "",
        dept: legacyClient.dept || "",
        region: legacyClient.region || "",
        pays: legacyClient.pays || "FR",
        // Ajout des timestamps automatiques pour Firebase
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      // Ajouter le client comme un nouveau document avec un ID généré automatiquement
      await addDoc(collection(db, "clients"), newFirebaseClient);
    }
    console.log(`Migration automatique : Terminée avec succès pour ${legacyDataToMigrate.length} clients !`);
    alert("✅ Tes 279 clients ont été migrés automatiquement vers Firebase Firestore !");
    
    // Pour que ton site fonctionne, nous devons maintenant recharger la page 
    // afin qu'elle lise les données depuis Firebase.
    window.location.reload();

  } catch (error) {
    console.error("Erreur lors de la migration automatique :", error);
    alert("❌ La migration automatique a échoué. Firebase est vide.");
  }
}

// 4. Lancement de la migration
// ============================================================
// migrateLegacyDataToFirebase(); 
// REMARQUE : Désactive cette ligne (commente-la) APRÈS le premier lancement réussi.
