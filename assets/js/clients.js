// Importation de la base de données Firebase
import { db } from "./firebase.js";
import { collection, getDocs, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Base de données initiale de secours (si Firestore est vide)
const initialClientsDatabase = [
  {"type": "Prospect", "societe": "MP CETIN. EDEN", "contact": "", "agent": "Jérôme", "adresse": "6 Bd des Jardiniers", "code_postal": "06200", "ville": "Nice", "telephone": "0674813721", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona", "contact": "", "agent": "Jérôme", "adresse": "875 Route du Thor", "code_postal": "84800", "ville": "L'Isle-sur-la-Sorgue", "telephone": "04 90 20 52 22", "email": "", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona", "contact": "", "agent": "Jérôme", "adresse": "3 Rue Marie Magdeleine Signouret", "code_postal": "84160", "ville": "Cadenet", "telephone": "04 90 08 74 50", "email": "", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "4 Rue Berlioz", "contact": "", "agent": "Coryne", "adresse": "4 Rue Berlioz", "code_postal": "06000", "ville": "Nice", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Balitrand", "contact": "", "agent": "Coryne", "adresse": "280 Rue Bastide de Verdaches", "code_postal": "13290", "ville": "Aix-en-Provence", "telephone": "04 42 97 74 74", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona Plaquiste - Facade", "contact": "", "agent": "Coryne", "adresse": "132 Avenue de la Roubine", "code_postal": "06150", "ville": "Cannes", "telephone": "04 92 19 42 30", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "Pool & House Renov", "contact": "", "agent": "Coryne", "adresse": "28 Allee des Jacinthes", "code_postal": "06800", "ville": "Cagnes-sur-Mer", "telephone": "06 12 95 16 76", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona Showroom", "contact": "", "agent": "Coryne", "adresse": "211 Avenue Francis Tonner", "code_postal": "06150", "ville": "Cannes", "telephone": "04 92 19 49 49", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona", "contact": "", "agent": "Coryne", "adresse": "2143 Avenue Guillaume Dulac", "code_postal": "13600", "ville": "La Ciotat", "telephone": "04 42 08 21 21", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "JEM Carrelages Venelles", "contact": "", "agent": "Coryne", "adresse": "104 Avenue des Logissons", "code_postal": "13770", "ville": "Venelles", "telephone": "04 42 22 86 55", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "La Maison par Carreau Concept", "contact": "", "agent": "Coryne", "adresse": "1955 Chemin de Saint-Bernard", "code_postal": "06220", "ville": "Vallauris", "telephone": "04 93 67 28 04", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "C.B.L Carrelages Batiment du littoral", "contact": "", "agent": "Coryne", "adresse": "1887 Chemin de Saint-Bernard Porte", "code_postal": "06220", "ville": "Vallauris", "telephone": "04 93 64 60 60", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Costamagna Distribution Mouans-Sartoux", "contact": "", "agent": "Coryne", "adresse": "370 Chemin des Plaines", "code_postal": "06370", "ville": "Mouans-Sartoux", "telephone": "04 89 97 75 05", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Espace Aubade Laur & Abad Nimes", "contact": "", "agent": "Jérôme", "adresse": "291 Avenue du Docteur Fleming", "code_postal": "30900", "ville": "Nimes", "telephone": "04 66 28 86 86", "email": "", "autres_telephones": [], "departement": "FR-30", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Espace Aubade Comtat et Allardet Le Tholonet (Aix Carrelages)", "contact": "", "agent": "Coryne", "adresse": "1160 Avenue Paul Jullien", "code_postal": "13100", "ville": "Le Tholonet", "telephone": "04 42 66 91 92", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Carreaux Shop Brignoles aubade", "contact": "", "agent": "Coryne", "adresse": "190 Boulevard Bernard Long", "code_postal": "83170", "ville": "Brignoles", "telephone": "04 89 11 18 66", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Espace Aubade Comtat & Allardet Le Cannet-des-Maures", "contact": "", "agent": "Coryne", "adresse": "5 Ancienne Route d'Italie", "code_postal": "83340", "ville": "Le Cannet-des-Maures", "telephone": "04 94 50 95 06", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Espace Aubade Socatra Carrelages Trans-en-Provence", "contact": "", "agent": "Coryne", "adresse": "926 Route de Draguignan", "code_postal": "83720", "ville": "Trans-en-Provence", "telephone": "04 98 10 43 00", "email": "socatra@comtat-allardet.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "La Gallerya", "contact": "", "agent": "Coryne", "adresse": "1104 Avenue Sampiero Corso", "code_postal": "20600", "ville": "Furiani", "telephone": "04 95 54 00 16", "email": "", "autres_telephones": [], "departement": "FR-2B", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "LCA BASTIA", "contact": "", "agent": "Coryne", "adresse": "193 Ardisson", "code_postal": "20600", "ville": "Furiani", "telephone": "04 95 58 82 95", "email": "LCA-med.bastia@orange.fR", "autres_telephones": [], "departement": "FR-2B", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "LCA PORTO VECCHIO", "contact": "", "agent": "Coryne", "adresse": "ZI Les Salines", "code_postal": "20137", "ville": "Porto-Vecchio", "telephone": "04 95 70 74 74", "email": "lca-med.pvecchio@orange.fr", "autres_telephones": [], "departement": "FR-2A", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "Raibaldi Ets", "contact": "", "agent": "Coryne", "adresse": "D72", "code_postal": "20167", "ville": "Sarrola-Carcopino", "telephone": "06 28 84 19 92", "email": "amb.raibaldi@orange.fr", "autres_telephones": [], "departement": "FR-2A", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "ITAL 3 Ajaccio", "contact": "", "agent": "Coryne", "adresse": "Zoning Industriel Baleone", "code_postal": "20167", "ville": "Afa", "telephone": "04 95 20 90 48", "email": "", "autres_telephones": [], "departement": "FR-2A", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Upptile by asdecarreaux", "contact": "", "agent": "Jérôme", "adresse": "25 Rue de Bourgogne", "code_postal": "75007", "ville": "Paris", "telephone": "01 87 44 79 45", "email": "berenice@asdecarreaux.com", "autres_telephones": [], "departement": "FR-75", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "as de carreaux", "contact": "", "agent": "Jérôme", "adresse": "725 Route de Beziers", "code_postal": "34120", "ville": "Pezenas", "telephone": "04 48 20 50 91", "email": "commande@asdecarreaux.com", "autres_telephones": [], "departement": "FR-34", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Tout pour le Paysage", "contact": "", "agent": "Coryne", "adresse": "Chemin du Jas Neuf", "code_postal": "83910", "ville": "Pourrieres", "telephone": "06 77 03 99 17", "email": "pierre.tplp@gmail.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Richardson Carros 16eme Rue", "contact": "", "agent": "Coryne", "adresse": "16eme Rue", "code_postal": "06510", "ville": "Le Broc", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "RICHARDSON Nice centre", "contact": "", "agent": "Coryne", "adresse": "70-72 Route de Turin", "code_postal": "06000", "ville": "Nice", "telephone": "04 93 82 26 64", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "SMCE PRESTIGE", "contact": "", "agent": "Coryne", "adresse": "Route Nationale 96", "code_postal": "13650", "ville": "Meyrargues", "telephone": "04 42 63 48 38", "email": "kenza@smce-prestige.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "l’expert carrelage", "contact": "", "agent": "Coryne", "adresse": "165 Boulevard de la Madeleine", "code_postal": "06000", "ville": "Nice", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "RICHARDSON DIGNES", "contact": "", "agent": "Coryne", "adresse": "Rue Ferdinand de Lesseps", "code_postal": "04000", "ville": "Digne-les-Bains", "telephone": "04 13 36 10 37", "email": "Stephanie.luc@richardson.fr", "autres_telephones": [], "departement": "FR-04", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "Adonis Piscines", "contact": "", "agent": "Coryne", "adresse": "1609 Chemin de Saint-Bernard", "code_postal": "06220", "ville": "Vallauris", "telephone": "04 93 74 52 77", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CIFFREO BONA PASTEUR", "contact": "", "agent": "Coryne", "adresse": "116 Boulevard Pasteur", "code_postal": "06000", "ville": "Nice", "telephone": "04 93 13 63 77", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "Tot Ceramica Carrelage", "contact": "", "agent": "Jérôme", "adresse": "43 Avenue du Champ de Mars", "code_postal": "11100", "ville": "Narbonne", "telephone": "04 68 40 00 68", "email": "", "autres_telephones": [], "departement": "FR-11", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "RICHARDSON MANOSQUE", "contact": "", "agent": "Coryne", "adresse": "265 Boulevard Saint-Joseph", "code_postal": "04100", "ville": "Manosque", "telephone": "04 92 72 14 43", "email": "", "autres_telephones": [], "departement": "FR-04", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "RICHARDSON GAP", "contact": "", "agent": "Coryne", "adresse": "1 Boulevard d'Orient", "code_postal": "05000", "ville": "Gap", "telephone": "04 92 52 24 77", "email": "", "autres_telephones": [], "departement": "FR-05", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "NEO SOLS & MURS", "contact": "", "agent": "Jérôme", "adresse": "14 Rue Paul Langevin", "code_postal": "34770", "ville": "Gigean", "telephone": "09 82 54 30 10", "email": "", "autres_telephones": [], "departement": "FR-34", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "le roi du carro", "contact": "", "agent": "Jérôme", "adresse": "Rue de la Pise", "code_postal": "30110", "ville": "La Grand-Combe", "telephone": "06 11 28 90 38", "email": "leroiducarro30@gmail.com", "autres_telephones": [], "departement": "FR-30", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "RICHARDSON ANTIBES", "contact": "", "agent": "Coryne", "adresse": "172 Avenue Weisweiller", "code_postal": "06600", "ville": "Antibes", "telephone": "04 93 74 63 66", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "RICHARDSON CARROS", "contact": "", "agent": "Coryne", "adresse": "4eme Rue", "code_postal": "06510", "ville": "Carros", "telephone": "04 92 08 88 80", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "RICHARDSON NICE", "contact": "", "agent": "Coryne", "adresse": "70-72 Route de Turin", "code_postal": "06300", "ville": "Nice", "telephone": "04 97 08 83 83", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "richardson frejus", "contact": "", "agent": "Coryne", "adresse": "72 Rue de l'Avelan", "code_postal": "83600", "ville": "Frejus", "telephone": "0756461352", "email": "Remy.jambon@richardson.fR", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Mondial Carrelages", "contact": "", "agent": "Jérôme", "adresse": "Zone Industrielle / Route de Nîmes", "code_postal": "34740", "ville": "Vendargues", "telephone": "04 67 70 88 94", "email": "info@mondialcarrelages.fr", "autres_telephones": [], "departement": "FR-34", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "Ligne & Lumiere Delta Bois", "contact": "", "agent": "Jérôme", "adresse": "785 Avenue Frederic Bartholdi", "code_postal": "30000", "ville": "Nimes", "telephone": "04 66 27 80 60", "email": "", "autres_telephones": [], "departement": "FR-30", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "Sols Concept", "contact": "", "agent": "Coryne", "adresse": "Chemin de Payannet", "code_postal": "13120", "ville": "Gardanne", "telephone": "04 42 64 17 65", "email": "sols.concept@hotmail.com", "autres_telephones": ["0777834473"], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Idea Carrelages", "contact": "", "agent": "Coryne", "adresse": "1581 Avenue Paul Jullien", "code_postal": "13100", "ville": "Le Tholonet", "telephone": "04 42 20 99 38", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona sanary", "contact": "", "agent": "Coryne", "adresse": "773 Avenue des Lavandieres", "code_postal": "83310", "ville": "Sanary-sur-Mer", "telephone": "+33 4 94 74 26 00", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona Frejus", "contact": "", "agent": "Coryne", "adresse": "Avenue des Esclapes", "code_postal": "83600", "ville": "Frejus", "telephone": "+33 4 94 52 50 60", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona Carpentras", "contact": "", "agent": "Coryne", "adresse": "Route de Pernes les Fontaines", "code_postal": "84200", "ville": "Carpentras", "telephone": "+33 4 90 67 74 00", "email": "", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona Montauroux", "contact": "", "agent": "Coryne", "adresse": "Fondurane", "code_postal": "83440", "ville": "Montauroux", "telephone": "+33 4 94 85 77 90", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona Peymeinade", "contact": "", "agent": "Coryne", "adresse": "59 Route de Draguignan", "code_postal": "06530", "ville": "Peymeinade", "telephone": "+33 4 93 66 62 60", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona Grasse", "contact": "", "agent": "Coryne", "adresse": "19 Route de Draguignan", "code_postal": "06130", "ville": "Grasse", "telephone": "+33 4 93 70 44 44", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona Cannes", "contact": "", "agent": "Coryne", "adresse": "211 Avenue Francis Tonner", "code_postal": "06150", "ville": "Cannes", "telephone": "+33 4 92 19 49 49", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "DESIGN CARRELAGES (30 AUBORD) sol evolution", "contact": "", "agent": "Jérôme", "adresse": "2 Rue Joel de Rosnay", "code_postal": "30620", "ville": "Aubord", "telephone": "+33 6 84 68 36 00", "email": "", "autres_telephones": [], "departement": "FR-30", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Espace Carrelages du minervois", "contact": "", "agent": "Jérôme", "adresse": "1 Rue des Gabares", "code_postal": "11000", "ville": "Carcassonne", "telephone": "+33 4 68 25 60 67", "email": "", "autres_telephones": [], "departement": "FR-11", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona Salernes", "contact": "", "agent": "Coryne", "adresse": "1089 Route de Draguignan", "code_postal": "83690", "ville": "Salernes", "telephone": "+33 4 94 85 91 91", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona Draguignan", "contact": "", "agent": "Coryne", "adresse": "Saint-Hermentaire", "code_postal": "83300", "ville": "Draguignan", "telephone": "+33 4 94 50 80 39", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "SAINT PAUL PISCINES", "contact": "", "agent": "Coryne", "adresse": "980 Boulevard Pierre Sauvaigo", "code_postal": "06480", "ville": "La Colle-sur-Loup", "telephone": "+33 4 93 32 59 03", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona meyreuil", "contact": "", "agent": "Coryne", "adresse": "Z.I. de Meyreuil", "code_postal": "13590", "ville": "Meyreuil", "telephone": "+33 4 42 51 29 70", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Ciffreo Bona la garde", "contact": "", "agent": "Coryne", "adresse": "846 Avenue de Draguignan", "code_postal": "83130", "ville": "La Garde", "telephone": "+33 4 98 01 25 50", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Materiaux de construction BONIFAY La Londe", "contact": "", "agent": "Coryne", "adresse": "43 Chemin du Pansard", "code_postal": "83250", "ville": "La Londe-les-Maures", "telephone": "+33 4 94 65 22 05", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "Tendance Carrelage", "contact": "", "agent": "Coryne", "adresse": "37 Rue de la Seyne", "code_postal": "83140", "ville": "Six-Fours-les-Plages", "telephone": "04 94 06 30 63", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "Italsols", "contact": "", "agent": "Jérôme", "adresse": "Roquebrune", "code_postal": "30130", "ville": "Saint-Alexandre", "telephone": "+33 4 66 33 51 88", "email": "italsols@hotmail.fr", "autres_telephones": [], "departement": "FR-30", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Mes Jolis Carreaux - Perpignan (ex Caro & Deco)", "contact": "", "agent": "Jérôme", "adresse": "557 Boulevard Paul Langevin", "code_postal": "66000", "ville": "Perpignan", "telephone": "04 49 23 21 38", "email": "", "autres_telephones": [], "departement": "FR-66", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "MATRAFER", "contact": "", "agent": "Jérôme", "adresse": "4 Avenue de Rome", "code_postal": "66270", "ville": "Le Soler", "telephone": "+33 468555657", "email": "jm@matrafer.com", "autres_telephones": [], "departement": "FR-66", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CERAMIQUE DECOR", "contact": "", "agent": "Jérôme", "adresse": "30 Avenue Pierre Semard", "code_postal": "11100", "ville": "Narbonne", "telephone": "+33 468324657", "email": "contact@ceramiquedecor.fr", "autres_telephones": [], "departement": "FR-11", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "ALLIANCE CARRELAGE", "contact": "", "agent": "Jérôme", "adresse": "31 Rue Charles Lindberg", "code_postal": "34130", "ville": "Mauguio", "telephone": "+33 467718932", "email": "alliancecarrelage.mb@gmail.com", "autres_telephones": [], "departement": "FR-34", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "AS CARRELAGE", "contact": "", "agent": "Jérôme", "adresse": "287 Quai de Bilina", "code_postal": "30100", "ville": "Ales", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-30", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "RICHARDSON hyeres", "contact": "", "agent": "Coryne", "adresse": "829 Route des Loubes", "code_postal": "83400", "ville": "Hyeres", "telephone": "0494575730", "email": "abigael.duval@richardson.fr", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "SO DESIGN CANNES", "contact": "", "agent": "Coryne", "adresse": "11 Rue du 14 Juillet", "code_postal": "06400", "ville": "Cannes", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "RICHARSON marseille 2", "contact": "", "agent": "Coryne", "adresse": "2 Place Gantes", "code_postal": "13002", "ville": "Marseille", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "InOutlet Carrelages", "contact": "", "agent": "Coryne", "adresse": "194 Avenue Simone Veil", "code_postal": "06200", "ville": "Nice", "telephone": "09 73 23 30 20", "email": "", "autres_telephones": ["0422532791"], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "GEDIMAT BARTHELEMY", "contact": "", "agent": "Coryne", "adresse": "7 Avenue Paul Dalbret", "code_postal": "13013", "ville": "Marseille", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "FC REALISATIONS", "contact": "", "agent": "Coryne", "adresse": "85 Avenue de la Pointe Rouge", "code_postal": "13008", "ville": "Marseille", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "CMA EXPERT HABITAT", "contact": "", "agent": "Coryne", "adresse": "Cours Grandval", "code_postal": "20090", "ville": "Ajaccio", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-2A", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "CASANOVA", "contact": "", "agent": "Coryne", "adresse": "4 Avenue Jose Nobre", "code_postal": "13500", "ville": "Martigues", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "BRONZINI ETS BIGMAT MATERIAUX", "contact": "", "agent": "Coryne", "adresse": "Z.I. de Toga", "code_postal": "20600", "ville": "Bastia", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-2B", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "ALPES CARRELAGES", "contact": "", "agent": "Coryne", "adresse": "Pres Combaux", "code_postal": "04100", "ville": "Manosque", "telephone": "", "email": "alpescarrelages@hotmail.fr", "autres_telephones": [], "departement": "FR-04", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "GALERIE CARDIALES", "contact": "", "agent": "Coryne", "adresse": "6 Rue des Metiers", "code_postal": "05000", "ville": "Gap", "telephone": "", "email": "martine@cardiales.fr", "autres_telephones": [], "departement": "FR-05", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CORSE CARRELAGE", "contact": "", "agent": "Coryne", "adresse": "Route nationale 193", "code_postal": "20600", "ville": "Furiani", "telephone": "04 95 33 51 01", "email": "corse-carrelage@wanadoo.fr", "autres_telephones": [], "departement": "FR-2B", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CERAMIC OUTLET STORE VALLAURIS", "contact": "", "agent": "Coryne", "adresse": "2121 Chemin de Saint-Bernard", "code_postal": "06220", "ville": "Vallauris", "telephone": "04 93 33 20 46", "email": "cde.cosvallauris@gmail.com", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CARREAU CONCEPT OUTLET STORE", "contact": "", "agent": "Coryne", "adresse": "380 Avenue Eugene Augias", "code_postal": "83130", "ville": "La Garde", "telephone": "04 94 42 54 57", "email": "cde.cclagarde@gmail.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "Wellness Spa", "contact": "", "agent": "Jérôme", "adresse": "1415 Avenue Julien Panchot", "code_postal": "66000", "ville": "Perpignan", "telephone": "04 68 98 31 34", "email": "commercial@wellness-spa.fr", "autres_telephones": [], "departement": "FR-66", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "MAT K.RO", "contact": "", "agent": "Jérôme", "adresse": "1211 Avenue d'Espagne", "code_postal": "66100", "ville": "Perpignan", "telephone": "", "email": "dimitri@matrafer.com", "autres_telephones": [], "departement": "FR-66", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "DRIVE MATERIAUX", "contact": "", "agent": "Jérôme", "adresse": "1773 Avenue du Languedoc", "code_postal": "66000", "ville": "Perpignan", "telephone": "", "email": "drive-materiaux@hotmail.com", "autres_telephones": [], "departement": "FR-66", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CARO ET DECO CABESTANY", "contact": "", "agent": "Jérôme", "adresse": "10 Rue Henri Becquerel", "code_postal": "66330", "ville": "Cabestany", "telephone": "09 51 01 01 53", "email": "commandes@servicecarrelage.fr", "autres_telephones": [], "departement": "FR-66", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Laurent Carrelage", "contact": "", "agent": "Jérôme", "adresse": "31 Avenue Maquis Montagne Noire", "code_postal": "11400", "ville": "Castelnaudary", "telephone": "04 68 23 35 85", "email": "laurent.carrelage@orange.fr", "autres_telephones": [], "departement": "FR-11", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "Languedoc Carrelages - Delobel Didier", "contact": "", "agent": "Jérôme", "adresse": "Rue Brillat Savarin", "code_postal": "11000", "ville": "Carcassonne", "telephone": "04 68 25 58 70", "email": "languedoc.carrelage@orange.fr", "autres_telephones": [], "departement": "FR-11", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Mon-Carrelage", "contact": "Christophe dos Santos", "agent": "Jérôme", "adresse": "130 Avenue de Bordeaux", "code_postal": "11100", "ville": "Narbonne", "telephone": "04 68 41 61 29", "email": "carrelagesduminervois@gmail.com", "autres_telephones": [], "departement": "FR-11", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "ECO CERAMIQUE", "contact": "", "agent": "Jérôme", "adresse": "25 Avenue de Louate", "code_postal": "11100", "ville": "Montredon-des-Corbieres", "telephone": "04 34 44 74 18", "email": "eco.ceramique.montredon@gmail.com", "autres_telephones": [], "departement": "FR-11", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CAMPREDON", "contact": "", "agent": "Jérôme", "adresse": "19 Rue Gaspard Monge", "code_postal": "11000", "ville": "Carcassonne", "telephone": "", "email": "contact@campredon-deco.com", "autres_telephones": [], "departement": "FR-11", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "ANNETTE CARRELAGES", "contact": "", "agent": "Jérôme", "adresse": "29 Ratacas Zone Industrielle", "code_postal": "11100", "ville": "Narbonne", "telephone": "", "email": "info@annettecarrelages.com", "autres_telephones": [], "departement": "FR-11", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "SAMSE GAP SECOND OEUVRE", "contact": "", "agent": "Coryne", "adresse": "22 Route des Fauvins", "code_postal": "05000", "ville": "Gap", "telephone": "", "email": "christophe-triolet@samse.fr", "autres_telephones": [], "departement": "FR-05", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "SAMSE CAREO GAP", "contact": "", "agent": "Coryne", "adresse": "91 Avenue d'Embrun", "code_postal": "05000", "ville": "Gap", "telephone": "", "email": "michael-cassan@samse.fr", "autres_telephones": [], "departement": "FR-05", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "LUMSOL CARRELAGE ET BAIN", "contact": "", "agent": "Coryne", "adresse": "3 Avenue des Alpes", "code_postal": "05000", "ville": "Chateauvieux", "telephone": "", "email": "gap@carrelage-bain.fr", "autres_telephones": [], "departement": "FR-05", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "BONIFAY theus", "contact": "", "agent": "Coryne", "adresse": "Route Départementale 942", "code_postal": "05190", "ville": "Theus", "telephone": "", "email": "theus@bonifay.fr", "autres_telephones": [], "departement": "FR-05", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "LA BOUTIQUE DU CARRELAGE", "contact": "", "agent": "Coryne", "adresse": "Les Cheminants", "code_postal": "05230", "ville": "La Batie-Neuve", "telephone": "", "email": "contact@laboutiqueducarrelage.com", "autres_telephones": [], "departement": "FR-05", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CARRELAGE HABITAT", "contact": "", "agent": "Coryne", "adresse": "La Plaine de Lachaup", "code_postal": "05000", "ville": "Gap", "telephone": "", "email": "info@carrelage-habitat.fr", "autres_telephones": [], "departement": "FR-05", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "AGENCEMENT 05", "contact": "", "agent": "Coryne", "adresse": "4 Rue des Bouilleurs de cru", "code_postal": "05200", "ville": "Embrun", "telephone": "", "email": "lopezagencement05@gmail.com", "autres_telephones": [], "departement": "FR-05", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "SAMSE CAREO DIGNE", "contact": "", "agent": "Coryne", "adresse": "2 Rue Claude Chappe", "code_postal": "04000", "ville": "Digne-les-Bains", "telephone": "", "email": "aurelie-samin@samse.fr", "autres_telephones": [], "departement": "FR-04", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "MATERIAUX SIMC EDB MANOSQUE", "contact": "", "agent": "Coryne", "adresse": "236 Avenue du 1er Mai", "code_postal": "04100", "ville": "Manosque", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-04", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "SANTUNIONE", "contact": "", "agent": "Coryne", "adresse": "Lieu-dit Campo di Fiori", "code_postal": "20090", "ville": "Ajaccio", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-2A", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "PIFFERINI MATERIAUX", "contact": "", "agent": "Coryne", "adresse": "120 Avenue Santa Laurina", "code_postal": "20270", "ville": "Aleria", "telephone": "", "email": "carrelage@abcorse.fr", "autres_telephones": [], "departement": "FR-2B", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "MUFRAGGI MATERIAUX", "contact": "", "agent": "Coryne", "adresse": "T22", "code_postal": "20167", "ville": "Sarrola-Carcopino", "telephone": "", "email": "marie-laure.denechaud@mufraggi.fr", "autres_telephones": ["04 95 22 37 70"], "departement": "FR-2A", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "LUCIANI", "contact": "", "agent": "Coryne", "adresse": "Route de Mezzavia", "code_postal": "20090", "ville": "Ajaccio", "telephone": "", "email": "andrea.mistre@maisonluciani.com ", "autres_telephones": [], "departement": "FR-2A", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "ITAL 3 HABITAT", "contact": "", "agent": "Coryne", "adresse": "Avenue Sampiero Corso", "code_postal": "20600", "ville": "Bastia", "telephone": " 04 95 30 44 30", "email": "ital3habitat@orange.fr", "autres_telephones": [], "departement": "FR-2B", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "EUCLEIA", "contact": "", "agent": "Coryne", "adresse": "Avenue de Bastia", "code_postal": "20137", "ville": "Porto-Vecchio", "telephone": "06 49 52 29 08", "email": "a.andrietti@eucleia-interieur.com", "autres_telephones": [], "departement": "FR-2A", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CAP MATERIAUX", "contact": "", "agent": "Coryne", "adresse": "Chemin Cepitta", "code_postal": "20228", "ville": "Luri", "telephone": " 04 95 38 98 65", "email": "cap.materiaux@orange.fr", "autres_telephones": [], "departement": "FR-2B", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "AMBIANCE ET CREATION", "contact": "", "agent": "Coryne", "adresse": "Route Principale", "code_postal": "20129", "ville": "Bastelicaccia", "telephone": "04 95 20 00 42", "email": "info.carrelage@orange.fr", "autres_telephones": [], "departement": "FR-2A", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "SOLMAT vitrolles", "contact": "", "agent": "Coryne", "adresse": "Route Nationale 113", "code_postal": "13127", "ville": "Vitrolles", "telephone": "04 42 77 40 45", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "AIXPO CARREAUX", "contact": "", "agent": "Coryne", "adresse": "6145 Route d'Avignon", "code_postal": "13540", "ville": "Aix-en-Provence", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "MCC", "contact": "", "agent": "Coryne", "adresse": "2252 Avenue du Marechal Juin", "code_postal": "06250", "ville": "Mougins", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "MILLE ET UN CARREAUX", "contact": "", "agent": "Coryne", "adresse": "Zone Artisanale Les Bastides Blanches", "code_postal": "04220", "ville": "Sainte-Tulle", "telephone": "0492782790", "email": "contact@milleetuncarreaux.com", "autres_telephones": [], "departement": "FR-04", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "KARELO DESIGN", "contact": "", "agent": "Coryne", "adresse": "N85", "code_postal": "05000", "ville": "Gap", "telephone": "04 92 54 81 54", "email": "contact@karelo.fr", "autres_telephones": [], "departement": "FR-05", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "LEXPO carrelage et bain", "contact": "", "agent": "Jérôme", "adresse": "300 Rue Roland Garros", "code_postal": "34130", "ville": "Mauguio", "telephone": "04 67 64 47 03", "email": "", "autres_telephones": [], "departement": "FR-34", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "MATTOUT", "contact": "", "agent": "Coryne", "adresse": "10 Avenue des Paluds", "code_postal": "13400", "ville": "Aubagne", "telephone": "0442823190", "email": "frederic.bertillon@mattout-carrelage.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "SB FERRATO", "contact": "", "agent": "Coryne", "adresse": "370 Route de Saint-Canadet", "code_postal": "13100", "ville": "Aix-en-Provence", "telephone": "0442232086", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "TERRE D'EDEN", "contact": "", "agent": "Coryne", "adresse": "694 Route de Carpentras", "code_postal": "84270", "ville": "Vedene", "telephone": "", "email": "", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CARRELAGE MARKET", "contact": "", "agent": "Coryne", "adresse": "301 Chemin de Saint-Tropez", "code_postal": "83480", "ville": "Puget-sur-Argens", "telephone": "0783068405", "email": "info@carrelage-market.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CARREL'AS new concept", "contact": "", "agent": "Coryne", "adresse": "Rd 908", "code_postal": "13124", "ville": "Peypin", "telephone": "0749725287", "email": "carrelasnewconcept@gmail.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "DESIGN CARRELAGE mauguio", "contact": "", "agent": "Jérôme", "adresse": "78 Rue de la Jasse", "code_postal": "34130", "ville": "Mauguio", "telephone": "0467073726", "email": "sarlsopgperols.34@gmail.com", "autres_telephones": [], "departement": "FR-34", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "Carrelage et Bain Pezenas", "contact": "", "agent": "Jérôme", "adresse": "725 Route de Beziers", "code_postal": "34120", "ville": "Pezenas", "telephone": "04 67 98 77 51", "email": "", "autres_telephones": [], "departement": "FR-34", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "LA MAISON DU CARRELAGE", "contact": "", "agent": "Coryne", "adresse": "1541 Rte de Carpentras", "code_postal": "84700", "ville": "Sorgues", "telephone": "0490328898", "email": "", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "JDO CARRELAGE ET BAINS", "contact": "", "agent": "Coryne", "adresse": "180 Rue Denis Papin", "code_postal": "84120", "ville": "Pertuis", "telephone": "0490089167", "email": "", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "DESTOCK CARRELAGE PPC", "contact": "", "agent": "Coryne", "adresse": "340 Av. Louis Boudin", "code_postal": "84800", "ville": "L'Isle-sur-la-Sorgue", "telephone": "0609718460", "email": "gohu292@yahoo.fr", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "CERAMIC 84", "contact": "", "agent": "Coryne", "adresse": "142 All. du Mont Cenis", "code_postal": "84260", "ville": "Sarrians", "telephone": "0490654236", "email": "gregory.reynaud@ceramic84.com", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "C M P carreaux et mosaique de provence", "contact": "", "agent": "Coryne", "adresse": "328 Chem. des Escampades", "code_postal": "84170", "ville": "Monteux", "telephone": "0490663259", "email": "contact@carrelagescmp.com", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "AUTHENTIQUE ORANGE CARRELAGE", "contact": "", "agent": "Coryne", "adresse": "1195 Rte de Serignan", "code_postal": "84100", "ville": "Orange", "telephone": "0490347841", "email": "olivier.vernigi@gmail.com", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "AU FIL DU BAIN", "contact": "", "agent": "Coryne", "adresse": "123 Av. de Lancon", "code_postal": "84400", "ville": "Apt", "telephone": "0490043151", "email": "", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "AMBIANCES DU SUD", "contact": "", "agent": "Coryne", "adresse": "plan des Amandiers", "code_postal": "84220", "ville": "Beaumettes", "telephone": "0614029631", "email": "mp@ambiancesdusud.com", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "SYLVESTRE MATERIAUX apt", "contact": "", "agent": "Coryne", "adresse": "316 Le Chene", "code_postal": "84400", "ville": "Apt", "telephone": "0490746666", "email": "", "autres_telephones": ["carrelageapt@groupesn.com"], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "SYLVESTRE MATERIAUX coustellet", "contact": "", "agent": "Coryne", "adresse": "155 Route de Gordes", "code_postal": "84220", "ville": "Cabrieres-d'Avignon", "telephone": "0490767838", "email": "", "autres_telephones": ["carrelagecoustellet@groupesn.com"], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "FLASH CARRELAGES", "contact": "", "agent": "Coryne", "adresse": "2 bis Av. des Verdeaux", "code_postal": "84370", "ville": "Bedarrides", "telephone": "0490012811", "email": "flashcarrelages.vaucluse@gmail.com", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "FRANCE MATERIAUX COMTAT", "contact": "", "agent": "Coryne", "adresse": "704 bis Route d'Avignon", "code_postal": "84170", "ville": "Monteux", "telephone": "0490669999", "email": "carrelagesanitaire@comtatsas.fr", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CERA PROVENCE", "contact": "", "agent": "Coryne", "adresse": "365 Av. de la Canebiere", "code_postal": "84460", "ville": "Cheval-Blanc", "telephone": "0951414204", "email": "ceraprovence2@gmail.com ", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CARO PROMO", "contact": "", "agent": "Coryne", "adresse": "148 Rue des Artisans", "code_postal": "84420", "ville": "Piolenc", "telephone": "0490294130", "email": "contact@caro-promo.com", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CERA MOD", "contact": "", "agent": "Coryne", "adresse": "55 Rue d'Italie ", "code_postal": "84100", "ville": "Orange", "telephone": "0490348500", "email": "secretariat.ceramod@orange.fr", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CARRO DECO", "contact": "", "agent": "Coryne", "adresse": "860 Route de Robion", "code_postal": "84300", "ville": "Cavaillon", "telephone": "0490789806", "email": "commande.carrodeco@orange.fr ", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "US STONE", "contact": "", "agent": "Coryne", "adresse": "RN 113 quartier la jaufrette", "code_postal": "13300", "ville": "Salon-de-Provence", "telephone": "0680340062", "email": "us.stone13@gmail.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "AQUARO SOLFEGE", "contact": "", "agent": "Coryne", "adresse": "1390 Av. Lino Ventura", "code_postal": "13180", "ville": "Gignac-la-Nerthe", "telephone": "0486788060", "email": "pllegouic@gmail.com", "autres_telephones": ["aquarogignac@hotmail.com"], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "PROGIBAT CARRELAGES", "contact": "", "agent": "Coryne", "adresse": "3 Rue Henri Laugier", "code_postal": "13200", "ville": "Arles", "telephone": "0490979614", "email": "contact@progibat.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "O&SOL", "contact": "", "agent": "Coryne", "adresse": "4 Rue de la Transhumance", "code_postal": "13310", "ville": "Saint Martin de crau", "telephone": "0490915893", "email": "contact@oetsol.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "KEI-STONE aix en provence", "contact": "", "agent": "Coryne", "adresse": "5830-5870 Rte d'Avignon", "code_postal": "13540", "ville": "Aix en provence", "telephone": "0442503615", "email": "serge.p@kei-stone.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "CARRELAGES RIVES GAUCHE", "contact": "", "agent": "Coryne", "adresse": "2148 Rte d'Avignon", "code_postal": "13160", "ville": "Chateaurenard", "telephone": "0977903759", "email": "contact@carrelages-rive-gauche.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "BARDARO CARRELAGES", "contact": "", "agent": "Coryne", "adresse": "1238 Av. Patrouille de France", "code_postal": "13300", "ville": "Salon-de-Provence", "telephone": "0490565732", "email": "barbaro-joseph@orange.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "AZUR CARRELAGES faience sanitaires cuisne", "contact": "", "agent": "Coryne", "adresse": "88 Av. Frederic Chevillon", "code_postal": "13380", "ville": "Plan-de-Cuques", "telephone": "0491051515", "email": "azurcarrelage@orange.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "AMBIANCE PIERRE ET CARRELAGE", "contact": "", "agent": "Coryne", "adresse": "652 Av. des Paluds", "code_postal": "13400", "ville": "Aubagne", "telephone": "0442704864", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "SOLMAT aubagne", "contact": "", "agent": "Coryne", "adresse": "10 Av. des Paluds", "code_postal": "13400", "ville": "Aubagne", "telephone": "0442702391", "email": "carmat.13@solmat.fr ", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "SM CARRELAGE", "contact": "", "agent": "Coryne", "adresse": "489 Chem. des Hirondelles", "code_postal": "13330", "ville": "Pelissanne", "telephone": "0490551216", "email": "smattout@smcarrelage.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "OUTLET LES CARREAUX DE JEAN", "contact": "", "agent": "Coryne", "adresse": "113 Av. de Lattre de Tassigny", "code_postal": "13090", "ville": "Aix en provence", "telephone": "0413416464", "email": "commande@outlet-lescarreauxdejean.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "NUANCES PIERRES", "contact": "", "agent": "Coryne", "adresse": "1327 D7N", "code_postal": "13550", "ville": "Noves", "telephone": "0488610820", "email": "contact@nuancepierres.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "MY CARRELAGE", "contact": "", "agent": "Coryne", "adresse": "7 Av. du 8 Mai 1945", "code_postal": "13410", "ville": "Lambesc", "telephone": "0413910830", "email": "mycarrelage13@gmail.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "MASTERCERAM", "contact": "", "agent": "Coryne", "adresse": "1 Rue des Charpentiers", "code_postal": "13150", "ville": "Tarascon", "telephone": "0490914311", "email": "contact@masterceram.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "LES CARRELAGES DE MARSEILLE", "contact": "", "agent": "Coryne", "adresse": "83 Rte des Trois Lucs a la Valentine", "code_postal": "13012", "ville": "Marseille", "telephone": "0491873683", "email": "carrelagesdemarseille.cde@gmail.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "LES CARREAUX DE JEAN", "contact": "", "agent": "Coryne", "adresse": "666 Chem. de Calameau", "code_postal": "13140", "ville": "Miramas", "telephone": "0484849900", "email": "commande@lescarreauxdejean.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "LE PETIT VERSAILLE", "contact": "", "agent": "Coryne", "adresse": "310 Av. de Fontfrege", "code_postal": "13420", "ville": "Gemenos", "telephone": "0442327373", "email": "david.antherieu@le-petit-versailles.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "IN'D&CO", "contact": "", "agent": "Coryne", "adresse": "4 Rue de Courtine", "code_postal": "13290", "ville": "Saint Mitre les remparts", "telephone": "0980314211", "email": "indeco.carrelage@gmail.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "ID PROJECTT", "contact": "", "agent": "Coryne", "adresse": "670 Rte de Berre", "code_postal": "13510", "ville": "Eguilles", "telephone": "0442286002", "email": "alisson@idprojectt.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "ENERGIE CHAUFFAGE SANITAIRE", "contact": "", "agent": "Coryne", "adresse": "478 Av. Ernest Subilia", "code_postal": "13600", "ville": "La ciotat", "telephone": "0486368761", "email": "commande@ecspaca.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "EDEN CARRELAGES", "contact": "", "agent": "Coryne", "adresse": "15 Av. de Londres", "code_postal": "13127", "ville": "Vitrolles", "telephone": " 04 42 88 23 41", "email": "contact@eden-carrelages.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "DM HOME", "contact": "", "agent": "Coryne", "adresse": "Lotissement les Jardins du Toes", "code_postal": "13700", "ville": "Marignane", "telephone": " 06 11 69 71 18", "email": "dm.home13@gmail.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "DIRECT MATERIAUX", "contact": "", "agent": "Coryne", "adresse": "10 Avenue des Paluds", "code_postal": "13400", "ville": "Aubagne", "telephone": "04 42 70 27 57", "email": "directmateriauxfr@gmail.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "DESIGN AND DECO", "contact": "", "agent": "Coryne", "adresse": "Rue de Courtine", "code_postal": "13920", "ville": "Saint-Mitre-les-Remparts", "telephone": " 04 42 42 07 67", "email": "contact@designanddeco.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CARRELAGE LUPI", "contact": "", "agent": "Coryne", "adresse": "4 Bd Crespi", "code_postal": "13008", "ville": "Marseille", "telephone": "0491734251", "email": "contact@carrelageslupi.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "BLEU MARINE", "contact": "", "agent": "Coryne", "adresse": "71 Chem. Gilbert Charmasson", "code_postal": "13016", "ville": "Marseille", "telephone": "04 96 20 83 83", "email": "bleu-marine@bleu-marine.tm.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "AUBAGNE MATERIAUX", "contact": "", "agent": "Coryne", "adresse": "Route de Saint-Jean de Garguier", "code_postal": "13400", "ville": "Aubagne", "telephone": "0442322173", "email": "contact@aubagnemateriaux.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "ARLES CARRELAGES", "contact": "", "agent": "Coryne", "adresse": "5 Rue Gaston Tessier", "code_postal": "13200", "ville": "Arles", "telephone": "0490963055", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "ARTEMIS PRESTIGUE", "contact": "", "agent": "Coryne", "adresse": "Zone Industrielle", "code_postal": "13480", "ville": "Cabries", "telephone": "0442314140", "email": "artemis-prestige@orange.fr", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "AMBIANCE CARRELAGE Marignane", "contact": "", "agent": "Coryne", "adresse": "Rte de Martigues", "code_postal": "13700", "ville": "Marignane", "telephone": "0442303178", "email": "contact@ambiancecarrelages.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "AMBIANCE CARRELAGES arles", "contact": "", "agent": "Coryne", "adresse": "ZI Nord - 18 Rue Joseph Rainard", "code_postal": "13200", "ville": "Arles", "telephone": "09 77 02 00 47", "email": "ambiance13@gmx.com", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "AMBIANCE CARRELAGES avignon", "contact": "", "agent": "Coryne", "adresse": "33 route de montfavet", "code_postal": "84000", "ville": "Avignon", "telephone": "09 77 81 17 23", "email": "ambiance84@gmx.com", "autres_telephones": [], "departement": "FR-84", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "UR CERAM", "contact": "", "agent": "Coryne", "adresse": "336 Av. lou Gabian", "code_postal": "83600", "ville": "Frejus", "telephone": " 04 94 82 24 37", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "SOLS ET MURS DESIGN", "contact": "", "agent": "Coryne", "adresse": " Chem. du Puits de la Commune", "code_postal": "83250", "ville": "La Londe les Maures", "telephone": " 04 94 46 26 68", "email": "contact@solsetmursdesign.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "PARODI CARRELAGES", "contact": "", "agent": "Coryne", "adresse": "273 Rue d'Hyeres", "code_postal": "83140", "ville": "Six Fours les plages", "telephone": " 04 94 34 33 12", "email": "contact@parodi-carrelages.fr", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "PACA CERAM", "contact": "", "agent": "Coryne", "adresse": "90 Rue de l'Industrie", "code_postal": "83600", "ville": "Frejus", "telephone": "04 23 36 00 99", "email": "contact@pacaceram.fr", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "LA CERAMIQUE", "contact": "", "agent": "Coryne", "adresse": "Chemin du Drap", "code_postal": "83480", "ville": "Puget-sur-Argens", "telephone": "06 99 68 26 54", "email": "laceramique.sas@gmail.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "IDEAL CARRELAGE", "contact": "", "agent": "Coryne", "adresse": "793 RN 8", "code_postal": "83330", "ville": "Evenos", "telephone": " 06 66 18 10 00", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "CARRELAGE DE LA PAULINE", "contact": "", "agent": "Coryne", "adresse": "380 Av. Eugene Augias", "code_postal": "83130", "ville": "La garde", "telephone": " 04 94 66 46 24", "email": "", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CARO +", "contact": "", "agent": "Coryne", "adresse": "33 Chem. de Bassaquet", "code_postal": "83140", "ville": "Six Fours les plages", "telephone": " 04 94 71 05 87", "email": " 6fours@caro-plus.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "TDS CONCEPT", "contact": "", "agent": "Coryne", "adresse": " 5649 Avenue lou Mistraou Quartier de", "code_postal": "83230", "ville": "Bormes les mimosas", "telephone": " 04 94 64 96 61", "email": "bormes@tds-concept.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "SELECTION MEDITERRANEE", "contact": "", "agent": "Coryne", "adresse": " 300 Av. de Valensole", "code_postal": "83310", "ville": "Cogolin", "telephone": " 04 94 54 04 40", "email": "direction@selectionmediterranee.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "SABLE D'OR", "contact": "", "agent": "Coryne", "adresse": "110 Rue des Narcisses", "code_postal": "83310", "ville": "Cogolin", "telephone": " 04 94 56 11 01", "email": "florencebec@aol.fr", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "RICHARDSON six fours les plages", "contact": "", "agent": "Coryne", "adresse": " 430 Bd de Lery", "code_postal": "83140", "ville": "Six Fours les plages", "telephone": " 04 94 10 47 10", "email": "christelle.peltier@richardson.fr", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "RICHARDSON la garde", "contact": "", "agent": "Coryne", "adresse": " 805 Av. Marechal de Lattre de Tassigny", "code_postal": "83130", "ville": "La garde", "telephone": " 04 94 08 61 62", "email": "justine.knaepen@richardson.fr", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "RICHARDSON brignoles", "contact": "", "agent": "Coryne", "adresse": "1016 Bd Bernard Long", "code_postal": "83170", "ville": "Brignoles", "telephone": " 04 94 69 59 67", "email": "fabrice.roquebrun@richardson.fr", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "RG MATERIAUX", "contact": "", "agent": "Coryne", "adresse": "222 Rue Georges Besse", "code_postal": "83600", "ville": "Frejus", "telephone": " 04 94 52 52 22", "email": "serge@rg-materiaux.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "L'ART DU CARREAU", "contact": "", "agent": "Coryne", "adresse": "68 Av. de l'Europe", "code_postal": "83300", "ville": "Draguignan", "telephone": " 04 94 50 51 90", "email": "sandro.lartducarreau@gmail.com ", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "KRO CERAMIQUE", "contact": "", "agent": "Coryne", "adresse": "229 Av. Andre Citroen", "code_postal": "83600", "ville": "Frejus", "telephone": "04 94 51 52 01", "email": "k.roceramique@orange.fr", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "HOUSQUARE frejus", "contact": "", "agent": "Coryne", "adresse": "7 Boulevard Colonel Dessert", "code_postal": "83480", "ville": "Puget-sur-Argens", "telephone": " 04 94 82 02 54", "email": "guillaume.hubert@housquare.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "EURO CARREAUX MATERIAUX", "contact": "", "agent": "Coryne", "adresse": "128 chemin sainte barbe", "code_postal": "83170", "ville": "Brignoles", "telephone": "04 94 69 51 12", "email": "commande.ecm@free.fr ", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "Elements Carrelage", "contact": "", "agent": "Coryne", "adresse": "Route Departementale 562", "code_postal": "83440", "ville": "Montauroux", "telephone": "04 94 67 54 69", "email": "commercial@elements-carrelage.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "COTE CARRELAGE", "contact": "", "agent": "Coryne", "adresse": "2535 Av. President John Kennedy", "code_postal": "83140", "ville": "Six Fours les plages", "telephone": " 04 94 94 50 00", "email": "david.cotecarrelage@orange.fr ", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CARRELAGE DU MONDE", "contact": "", "agent": "Coryne", "adresse": "1523 Av. de Draguignan", "code_postal": "83130", "ville": "La garde", "telephone": " 04 94 66 56 34", "email": "direction@cdmstore.com ", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CARO'STYL la seyne", "contact": "", "agent": "Coryne", "adresse": "480 Rue de Lisbonne", "code_postal": "83500", "ville": "La Seyne sur mer", "telephone": " 04 94 10 27 27", "email": "info@carostyl.fr", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "BONIFAY flassant", "contact": "", "agent": "Coryne", "adresse": "201 impasse de Peyrouas", "code_postal": "83340", "ville": "Flassans sur issole", "telephone": "04 94 59 63 81", "email": "flassans@bonifay.fr", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "BONIFAY toulon saint jean", "contact": "", "agent": "Coryne", "adresse": "849 Avenue Colonel Picot", "code_postal": "83100", "ville": "Toulon", "telephone": "04 94 23 17 58", "email": "brunet@bonifay.fr", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "BONIFAY sanary", "contact": "", "agent": "Coryne", "adresse": "134 Ancien Chemin de Toulon", "code_postal": "83110", "ville": "Sanary sur mer", "telephone": "04 94 74 23 83", "email": "sanary@bonifay.fr", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "CARRELAGE ET BAIN ceramic house", "contact": "", "agent": "Coryne", "adresse": "2211 Rte de la Fenerie", "code_postal": "06580", "ville": "Pegomas", "telephone": " 04 93 48 00 00", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "CASALUX", "contact": "", "agent": "Coryne", "adresse": "2 Rue Colonna d'Istria", "code_postal": "06300", "ville": "Nice", "telephone": "09 50 97 30 38", "email": "info@casalux.fr", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "BAYLINE CARRELAGE", "contact": "", "agent": "Coryne", "adresse": " 95 Av. de Nice", "code_postal": "06800", "ville": "Cagnes sur Mer", "telephone": "04 93 14 62 78", "email": "contact@bayline.fr", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "AUTHENTIC DESIGN", "contact": "", "agent": "Coryne", "adresse": "1 Rue du 8 Mai 1945", "code_postal": "06310", "ville": "Beaulieu sur Mer", "telephone": "0493799820", "email": "contact@authentic-design.fr", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "PROVENCALE DE MATERIAUX tout faire cote d'azur", "contact": "", "agent": "Coryne", "adresse": "609 Rte de la Roquette", "code_postal": "06250", "ville": "Mougins", "telephone": "04 93 75 79 25", "email": "carrelage@toutfaire06.fr ", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "NEOPIO MOSAIQUE", "contact": "", "agent": "Coryne", "adresse": "616 Av. Saint-Martin", "code_postal": "06250", "ville": "Mougins", "telephone": "0493401234", "email": "info@neopio.com", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "MILLE COULEURS D'EAU", "contact": "", "agent": "Coryne", "adresse": "23 Av. Thiers", "code_postal": "06130", "ville": "Grasse", "telephone": "06 62 53 94 14", "email": "millecouleursdeau@gmail.com", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "LA MAISON MARMORINI", "contact": "", "agent": "Coryne", "adresse": "32 Bd du General de Gaulle", "code_postal": "06340", "ville": "La trinite", "telephone": "0493549171", "email": "gwenaelle@marmorini.com", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "LES CARRELAGES DU SOLEIL", "contact": "", "agent": "Coryne", "adresse": " 1230 Bd Pierre Sauvaigo", "code_postal": "06480", "ville": "La colle sur loup", "telephone": "04 93 32 66 46", "email": "comptoircds@groupe-octave.com", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "IDEA CASA", "contact": "", "agent": "Coryne", "adresse": "31 chemin des fades", "code_postal": "06110", "ville": "Le cannet", "telephone": "0489892374", "email": "contact@ideacasa.fr", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "HOUSQUARE mougins", "contact": "", "agent": "Coryne", "adresse": "785 Chemin des Campelieres", "code_postal": "06250", "ville": "Mougins", "telephone": "0493698044", "email": "stephane.garriou@housquare.com ", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "GILLES DELFINO", "contact": "", "agent": "Coryne", "adresse": " 1390 Av. du Campon", "code_postal": "06110", "ville": "Le cannet", "telephone": " 04 93 69 94 91", "email": "gilles@gillesdelfino.com", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "FLAUJAC CHARLES", "contact": "", "agent": "Coryne", "adresse": "6 Bd Rainier III", "code_postal": "98000", "ville": "Monaco", "telephone": "0793508787", "email": "info@flaujac.mc", "autres_telephones": [], "departement": "FR-98", "pays": "MC", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "COSTAMAGNA hyeres", "contact": "", "agent": "Coryne", "adresse": "508 Chem. de la Villette", "code_postal": "83400", "ville": "Hyeres", "telephone": "0494575251", "email": "v.bouget@costamagna.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "COSTAMAGNA la seyne", "contact": "", "agent": "Coryne", "adresse": "Camp Laurent", "code_postal": "83500", "ville": "La Seyne-sur-Mer", "telephone": "04 94 10 70 60", "email": "o.besnier@costamagna.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "COSTAMAGNA saint tropez", "contact": "", "agent": "Coryne", "adresse": "47 Avenue Marechal Leclerc", "code_postal": "83990", "ville": "Saint Tropez", "telephone": "04 94 97 93 74", "email": "p.delcroix@costamagna.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "COSTAMAGNA moutauroux", "contact": "", "agent": "Coryne", "adresse": "Route Departementale 562", "code_postal": "83440", "ville": "Montauroux", "telephone": "04 94 76 48 96", "email": "s.lillo@costamagna.com", "autres_telephones": [], "departement": "FR-83", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "COSTAMAGNA saint laurent du var", "contact": "", "agent": "Coryne", "adresse": "172 Av. France d'Outremer", "code_postal": "06700", "ville": "Saint Laurent du Var", "telephone": "04 89 97 75 55", "email": "g.fagot@costamagna.com", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "COSTAMAGNA carabacel", "contact": "", "agent": "Coryne", "adresse": "7 Bd Carabacel", "code_postal": "06000", "ville": "Nice", "telephone": "0493620551", "email": "l.coulanges@costamagna.com", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "COSTAMAGNA saint martin", "contact": "", "agent": "Coryne", "adresse": "RN 202", "code_postal": "06670", "ville": "Saint Martin du Var", "telephone": "0492082485", "email": "a.deville@costamagna.com", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "CLAIRAZUR SPA villeneuve loube", "contact": "", "agent": "Coryne", "adresse": "35 rte du bord de mer", "code_postal": "06270", "ville": "Villeneuve Loubet", "telephone": "0 800 33 32 33", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Prospect", "societe": "CLAIRAZUR SPA aix en provence", "contact": "", "agent": "Coryne", "adresse": "400 Av. du Camp de Menthe", "code_postal": "13900", "ville": "Aix en provence", "telephone": "04 42 20 54 60", "email": "", "autres_telephones": [], "departement": "FR-13", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CLAIRAZUR SPA antibes", "contact": "", "agent": "Coryne", "adresse": "100 rue des alisiers", "code_postal": "06600", "ville": "Antibes", "telephone": "0 800 33 32 33", "email": "", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CERAZUR CARRELAGE", "contact": "", "agent": "Coryne", "adresse": "514 Boulevard du Mercantour", "code_postal": "06200", "ville": "Nice", "telephone": "0493298803", "email": "contact@cerazur.com", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CERA STONE CARRELAGE", "contact": "", "agent": "Coryne", "adresse": "89 Boulevard Georges Pompidou", "code_postal": "06700", "ville": "Saint-Laurent-du-Var", "telephone": "04 93 89 26 61", "email": "cerastonecarrelage@orange.fr", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CARRELAGES DISCOUNT sarl carreau depot", "contact": "", "agent": "Coryne", "adresse": "33 Chemin des Fades", "code_postal": "06110", "ville": "Le Cannet", "telephone": "0493465901", "email": "carrelages.discount.06@gmail.com", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CAREMA", "contact": "", "agent": "Coryne", "adresse": "1 Av. Henry Dunant", "code_postal": "98000", "ville": "Monaco", "telephone": "0793503663", "email": "commercial@carema.mc", "autres_telephones": [], "departement": "FR-98", "pays": "MC", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "CARAT DIFFUSION", "contact": "", "agent": "Coryne", "adresse": "11 Av. des Papalins", "code_postal": "98000", "ville": "Monaco", "telephone": "06 14 79 17 08", "email": "jpm@carat-diffusion.com", "autres_telephones": [], "departement": "FR-98", "pays": "MC", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "AZZURRA CERAMICHE", "contact": "", "agent": "Coryne", "adresse": "5 Avenue des Alpes", "code_postal": "06800", "ville": "Cagnes-sur-Mer", "telephone": "0987040262", "email": "azzurra.ceramiche@gmail.com", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "AZM AZUREENNE", "contact": "", "agent": "Coryne", "adresse": "2344 Avenue Georges Clemenceau", "code_postal": "06360", "ville": "Eze", "telephone": "0493410739", "email": "n.loiseau@azm-carrelages.fr", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "ATELIER SAUZE CARRELAGE omnium", "contact": "", "agent": "Coryne", "adresse": "152 Rte du Cannet", "code_postal": "06250", "ville": "Mougins", "telephone": "0493753342", "email": "contact@atelier-sauze.com", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "ATELIER CONTEMPORAIN", "contact": "", "agent": "Coryne", "adresse": "840 route de la roquette", "code_postal": "06370", "ville": "Mouans Sartoux", "telephone": "0492288715", "email": "gerald@ateliercontemporain.fr", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []},
  {"type": "Client", "societe": "ANTOINE QUINTANE", "contact": "", "agent": "Coryne", "adresse": "5 Rte de Valbonne", "code_postal": "06130", "ville": "Grasse", "telephone": "0493601628", "email": "carrelage@quintane.fr", "autres_telephones": [], "departement": "FR-06", "pays": "FR", "documents": [], "comptes_rendus": []}
];

let clientsDatabase = [];
let tempDocuments = [];
let tempExtraPhones = [];
let tempComptesRendus = [];

let recognition = null;
let isRecording = false;

document.addEventListener("DOMContentLoaded", async () => {
  const isLoggedIn = localStorage.getItem("agentLoggedIn");
  if (!isLoggedIn) {
    window.location.href = "agent.html";
    return;
  }

  const agentName = localStorage.getItem("agentName") || "Jérôme";
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

  // CHARGEMENT DEPUIS FIREBASE FIRESTORE
  await loadClientsFromFirebase();

  const deptSelect = document.getElementById("filter-dept");
  const cpSelect = document.getElementById("filter-cp");
  const citySelect = document.getElementById("filter-city");

  function populateFilterDropdowns() {
    if (deptSelect) deptSelect.innerHTML = '<option value="">Tous les départements</option>';
    if (cpSelect) cpSelect.innerHTML = '<option value="">Tous les codes postaux</option>';
    if (citySelect) citySelect.innerHTML = '<option value="">Toutes les villes</option>';

    const departments = [...new Set(clientsDatabase.map(c => c.departement).filter(Boolean))].sort((a, b) => 
      a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' })
    );

    const postalCodes = [...new Set(clientsDatabase.map(c => String(c.code_postal)).filter(c => c && c !== 'null' && c !== '-'))].sort((a, b) => 
      a.localeCompare(b, 'fr', { numeric: true })
    );

    const cities = [...new Set(clientsDatabase.map(c => c.ville).filter(Boolean))].sort((a, b) => 
      a.localeCompare(b, 'fr', { sensitivity: 'base' })
    );

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
  }

  populateFilterDropdowns();

  const urlParams = new URLSearchParams(window.location.search);
  let currentFilter = urlParams.get("filter") || "all";
  const actionParam = urlParams.get("action");

  function updateKPIs() {
    const totalCountEl = document.getElementById("count-total");
    const clientsCountEl = document.getElementById("count-clients");
    const prospectsCountEl = document.getElementById("count-prospects");

    if (totalCountEl) totalCountEl.textContent = clientsDatabase.length;
    if (clientsCountEl) clientsCountEl.textContent = clientsDatabase.filter(c => c.type && c.type.toLowerCase() === 'client').length;
    if (prospectsCountEl) prospectsCountEl.textContent = clientsDatabase.filter(c => c.type && c.type.toLowerCase() === 'prospect').length;
  }
  updateKPIs();

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
      const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
      if (allBtn) allBtn.classList.add("active");
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
        (item.contact && item.contact.toLowerCase().includes(searchTerm)) ||
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
      const realIndex = clientsDatabase.indexOf(client);
      const tr = document.createElement("tr");
      const cType = client.type ? client.type.toLowerCase() : "";
      const badgeClass = cType === 'client' ? 'badge-client' : 'badge-prospect';
      
      const hasCR = client.comptes_rendus && client.comptes_rendus.length > 0;

      tr.innerHTML = `
        <td>
          <strong>${client.societe || 'Sans nom'}</strong> ${client.documents && client.documents.length ? '📎' : ''} ${hasCR ? '📝' : ''}
          ${client.contact ? `<br><small style="color:#777;">👤 ${client.contact}</small>` : ''}
        </td>
        <td><span class="badge ${badgeClass}">${client.type || 'Inconnu'}</span></td>
        <td>${client.adresse || '-'}</td>
        <td><strong>${client.code_postal || '-'}</strong> ${client.ville || ''}</td>
        <td><span class="badge" style="background:#f1f1f1; color:#333;">${client.departement || '-'}</span></td>
        <td>${client.telephone || '-'}</td>
      `;

      tr.addEventListener("click", () => openModal(realIndex));
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
  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  const clientEditForm = document.getElementById("client-edit-form");
  const btnAddClient = document.getElementById("btn-add-client");
  const documentInput = document.getElementById("document-input");
  const documentsList = document.getElementById("documents-list");

  const cpInput = document.getElementById("edit-code-postal");
  const villeSelect = document.getElementById("edit-ville");
  const deptInput = document.getElementById("edit-departement");
  const extraPhonesContainer = document.getElementById("extra-phones-container");
  const btnAddPhone = document.getElementById("btn-add-phone");

  if (cpInput) {
    cpInput.addEventListener("input", (e) => {
      const code = e.target.value.trim();
      if (code.length >= 2) {
        deptInput.value = `FR-${code.substring(0, 2)}`;
      } else {
        deptInput.value = "";
      }

      if (code.length === 5) {
        fetch(`https://geo.api.gouv.fr/communes?codePostal=${code}&fields=nom&format=json`)
          .then(res => res.json())
          .then(data => {
            if (villeSelect) {
              villeSelect.innerHTML = "";
              if (data && data.length > 0) {
                data.forEach(c => {
                  const opt = document.createElement("option");
                  opt.value = c.nom;
                  opt.textContent = c.nom;
                  villeSelect.appendChild(opt);
                });
              } else {
                const opt = document.createElement("option");
                opt.value = "";
                opt.textContent = "Aucun village trouvé";
                villeSelect.appendChild(opt);
              }
            }
          })
          .catch(() => {
            if (villeSelect) villeSelect.innerHTML = `<option value="">Ville introuvable</option>`;
          });
      }
    });
  }

  function renderExtraPhones() {
    if (!extraPhonesContainer) return;
    extraPhonesContainer.innerHTML = "";

    tempExtraPhones.forEach((phone, idx) => {
      const row = document.createElement("div");
      row.className = "phone-row";
      row.innerHTML = `
        <input type="text" value="${phone}" placeholder="06 00 00 00 00" data-phone-idx="${idx}">
        <button type="button" class="btn-remove-phone" data-phone-idx="${idx}">&times;</button>
      `;
      extraPhonesContainer.appendChild(row);
    });

    extraPhonesContainer.querySelectorAll("input").forEach(inp => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(e.target.getAttribute("data-phone-idx"), 10);
        tempExtraPhones[idx] = e.target.value;
      });
    });

    extraPhonesContainer.querySelectorAll(".btn-remove-phone").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.getAttribute("data-phone-idx"), 10);
        tempExtraPhones.splice(idx, 1);
        renderExtraPhones();
      });
    });
  }

  if (btnAddPhone) {
    btnAddPhone.addEventListener("click", () => {
      tempExtraPhones.push("");
      renderExtraPhones();
    });
  }

  function renderDocumentsList() {
    if (!documentsList) return;
    documentsList.innerHTML = "";

    if (tempDocuments.length === 0) {
      documentsList.innerHTML = `<li style="font-size: 0.85rem; color: #888;">Aucun document joint pour le moment.</li>`;
      return;
    }

    tempDocuments.forEach((doc, idx) => {
      const li = document.createElement("li");
      li.className = "document-item";
      li.innerHTML = `
        <a href="${doc.data}" target="_blank" download="${doc.name}">📄 ${doc.name}</a>
        <button type="button" class="btn-delete-doc" data-idx="${idx}">&times;</button>
      `;
      documentsList.appendChild(li);
    });

    document.querySelectorAll(".btn-delete-doc").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const docIdx = parseInt(e.target.getAttribute("data-idx"), 10);
        tempDocuments.splice(docIdx, 1);
        renderDocumentsList();
      });
    });
  }

  if (documentInput) {
    documentInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          tempDocuments.push({
            name: file.name,
            data: event.target.result
          });
          renderDocumentsList();
        };
        reader.readAsDataURL(file);
      });
      documentInput.value = "";
    });
  }

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const textArea = document.getElementById("cr-text-input");
      if (textArea) {
        textArea.value = transcript;
      }
    };

    recognition.onerror = (event) => {
      console.error("Erreur de reconnaissance vocale :", event.error);
      stopRecording();
    };

    recognition.onend = () => {
      if (isRecording) stopRecording();
    };
  }

  function startRecording() {
    if (!recognition) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur. Utilisez Google Chrome ou Safari.");
      return;
    }
    isRecording = true;
    recognition.start();
    const btn = document.getElementById("btn-voice-dictation");
    const icon = document.getElementById("voice-icon");
    const text = document.getElementById("voice-status-text");
    if (btn) btn.style.background = "#DC2626";
    if (icon) icon.textContent = "🔴";
    if (text) text.textContent = "Écoute en cours...";
  }

  function stopRecording() {
    if (recognition && isRecording) {
      recognition.stop();
    }
    isRecording = false;
    const btn = document.getElementById("btn-voice-dictation");
    const icon = document.getElementById("voice-icon");
    const text = document.getElementById("voice-status-text");
    if (btn) btn.style.background = "#111";
    if (icon) icon.textContent = "🎙️";
    if (text) text.textContent = "Dictée vocale";
  }

  document.getElementById("btn-voice-dictation")?.addEventListener("click", () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  function renderComptesRendus() {
    const container = document.getElementById("cr-history-list");
    if (!container) return;
    container.innerHTML = "";

    if (tempComptesRendus.length === 0) {
      container.innerHTML = `<p style="font-size: 0.85rem; color: #888; font-style: italic;">Aucun compte-rendu enregistré pour ce client.</p>`;
      return;
    }

    tempComptesRendus.sort((a, b) => new Date(b.date) - new Date(a.date));

    tempComptesRendus.forEach((cr, idx) => {
      const card = document.createElement("div");
      card.style.cssText = "background: #FFF; border: 1px solid #E5E7EB; border-left: 4px solid #D4AF37; padding: 0.85rem 1rem; border-radius: 6px; position: relative;";
      
      const formattedDate = new Date(cr.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
          <strong style="font-size: 0.85rem; color: #1A2530;">📅 Visite du ${formattedDate} — par ${cr.author}</strong>
          <button type="button" class="btn-delete-cr" data-cr-idx="${idx}" style="background: none; border: none; color: #DC2626; cursor: pointer; font-weight: bold;">&times;</button>
        </div>
        <p style="font-size: 0.9rem; color: #444; margin: 0; white-space: pre-wrap;">${cr.text}</p>
      `;

      container.appendChild(card);
    });

    container.querySelectorAll(".btn-delete-cr").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.getAttribute("data-cr-idx"), 10);
        tempComptesRendus.splice(idx, 1);
        renderComptesRendus();
      });
    });
  }

  document.getElementById("btn-add-cr")?.addEventListener("click", () => {
    const dateVal = document.getElementById("cr-date-input").value;
    const authorVal = document.getElementById("cr-author-input").value;
    const textVal = document.getElementById("cr-text-input").value.trim();

    if (!textVal) {
      alert("Veuillez saisir ou dicter un texte pour le compte-rendu.");
      return;
    }

    tempComptesRendus.push({
      date: dateVal || new Date().toISOString().split('T')[0],
      author: authorVal || "Jérôme",
      text: textVal
    });

    document.getElementById("cr-text-input").value = "";
    if (isRecording) stopRecording();
    renderComptesRendus();
  });

  function openModal(index = -1, defaultType = "Client") {
    if (!modal) return;

    document.getElementById("edit-client-index").value = index;
    const badgeEl = document.getElementById("modal-status-badge");

    const currentAgent = localStorage.getItem("agentName") || "Jérôme Hugol";
    const agentFirstName = currentAgent.split(" ")[0];
    document.getElementById("cr-author-input").value = agentFirstName;
    document.getElementById("cr-date-input").value = new Date().toISOString().split('T')[0];

    if (index === -1) {
      document.getElementById("modal-societe-title").textContent = `Fiche Vierge — Nouveau ${defaultType}`;
      badgeEl.textContent = "Nouveau";
      badgeEl.className = defaultType === "Client" ? "badge badge-client" : "badge badge-prospect";

      document.getElementById("edit-societe").value = "";
      document.getElementById("edit-contact").value = "";
      document.getElementById("edit-type").value = defaultType;
      document.getElementById("edit-agent").value = agentFirstName;
      document.getElementById("edit-telephone").value = "";
      document.getElementById("edit-email").value = "";
      document.getElementById("edit-adresse").value = "";
      document.getElementById("edit-code-postal").value = "";
      
      if (villeSelect) {
        villeSelect.innerHTML = `<option value="">-- Entrez un Code Postal --</option>`;
      }
      document.getElementById("edit-departement").value = "";
      
      tempDocuments = [];
      tempExtraPhones = [];
      tempComptesRendus = [];
    } else {
      const client = clientsDatabase[index];
      if (!client) return;

      document.getElementById("modal-societe-title").textContent = client.societe || 'Fiche Client';
      const isClient = (client.type || '').toLowerCase() === 'client';
      badgeEl.textContent = client.type || 'Prospect';
      badgeEl.className = `badge ${isClient ? 'badge-client' : 'badge-prospect'}`;

      document.getElementById("edit-societe").value = client.societe || '';
      document.getElementById("edit-contact").value = client.contact || '';
      document.getElementById("edit-type").value = isClient ? 'Client' : 'Prospect';
      document.getElementById("edit-agent").value = client.agent || 'Jérôme';
      document.getElementById("edit-telephone").value = client.telephone || '';
      document.getElementById("edit-email").value = client.email || '';
      document.getElementById("edit-adresse").value = client.adresse || '';
      document.getElementById("edit-code-postal").value = client.code_postal || '';
      
      if (villeSelect) {
        villeSelect.innerHTML = `<option value="${client.ville || ''}">${client.ville || 'Sélectionner une ville'}</option>`;
      }

      document.getElementById("edit-departement").value = client.departement || '';
      
      tempDocuments = client.documents ? [...client.documents] : [];
      tempExtraPhones = client.autres_telephones ? [...client.autres_telephones] : (client.autre_telephone ? [client.autre_telephone] : []);
      tempComptesRendus = client.comptes_rendus ? [...client.comptes_rendus] : [];
    }

    renderExtraPhones();
    renderDocumentsList();
    renderComptesRendus();
    modal.style.display = "flex";
  }

  if (actionParam === "new-client") {
    openModal(-1, "Client");
  } else if (actionParam === "new-prospect") {
    openModal(-1, "Prospect");
  }

  if (btnAddClient) {
    btnAddClient.addEventListener("click", () => openModal(-1, "Client"));
  }

  if (clientEditForm) {
    clientEditForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const index = parseInt(document.getElementById("edit-client-index").value, 10);

      const societeName = document.getElementById("edit-societe").value.trim();
      // On crée un identifiant unique basé sur le nom de la société pour Firestore
      const docId = societeName.replace(/[^a-zA-Z0-9]/g, "_");

      const clientData = {
        societe: societeName,
        contact: document.getElementById("edit-contact").value.trim(),
        type: document.getElementById("edit-type").value,
        agent: document.getElementById("edit-agent").value,
        telephone: document.getElementById("edit-telephone").value.trim(),
        email: document.getElementById("edit-email").value.trim(),
        autres_telephones: tempExtraPhones.filter(Boolean),
        adresse: document.getElementById("edit-adresse").value.trim(),
        code_postal: document.getElementById("edit-code-postal").value.trim(),
        ville: villeSelect ? villeSelect.value : "",
        departement: document.getElementById("edit-departement").value.trim(),
        documents: tempDocuments,
        comptes_rendus: tempComptesRendus
      };

      try {
        // Enregistrement dans Firebase Firestore
        await setDoc(doc(db, "clients", docId), clientData);

        if (index === -1) {
          clientsDatabase.unshift(clientData);
        } else if (clientsDatabase[index]) {
          clientsDatabase[index] = clientData;
        }

        updateKPIs();
        populateFilterDropdowns();
        renderTable();

        modal.style.display = "none";
        alert("✅ Fiche enregistrée et synchronisée sur le cloud Firebase !");
      } catch (error) {
        console.error("Erreur lors de l'enregistrement Firebase :", error);
        alert("Erreur lors de la synchronisation cloud.");
      }
    });
  }

  if (modalClose) {
    modalClose.addEventListener("click", () => modal.style.display = "none");
  }

  if (btnCancelEdit) {
    btnCancelEdit.addEventListener("click", () => modal.style.display = "none");
  }

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
});

// FONCTION DE CHARGEMENT DEPUIS FIREBASE
async function loadClientsFromFirebase() {
  try {
    const querySnapshot = await getDocs(collection(db, "clients"));
    let remoteClients = [];
    querySnapshot.forEach((documentSnap) => {
      remoteClients.push(documentSnap.data());
    });

    if (remoteClients.length > 0) {
      clientsDatabase = remoteClients;
    } else {
      // Si la base cloud est vide, on y injecte la base initiale par défaut
      for (let client of initialClientsDatabase) {
        const docId = (client.societe || "client").replace(/[^a-zA-Z0-9]/g, "_");
        await setDoc(doc(db, "clients", docId), client);
      }
      clientsDatabase = initialClientsDatabase;
    }
  } catch (error) {
    console.error("Erreur de chargement Firebase, utilisation du cache local :", error);
    clientsDatabase = initialClientsDatabase;
  }
}
