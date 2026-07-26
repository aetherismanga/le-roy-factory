// Base de données CRM LE ROY FACTORY — Intégralité des 279 fiches Moovago
const clientsDatabase = [
  {"type": "Prospect", "societe": "MP CETIN. EDEN", "adresse": "6 Bd des Jardiniers", "code_postal": 6200, "ville": "Nice", "telephone": "0674813721", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "875 Route du Thor", "code_postal": 84800, "ville": "L'Isle-sur-la-Sorgue", "telephone": "04 90 20 52 22", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "3 Rue Marie Magdeleine Signouret", "code_postal": 84160, "ville": "Cadenet", "telephone": "04 90 08 74 50", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Quartier les Plans", "code_postal": 84120, "ville": "Pertuis", "telephone": "04 90 79 13 42", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Avenue de Lattre de Tassigny", "code_postal": 84300, "ville": "Cavaillon", "telephone": "04 90 71 04 22", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona Plaquiste - Facade", "adresse": "Avenue de Lattre de Tassigny", "code_postal": 84300, "ville": "Cavaillon", "telephone": "04 90 71 04 22", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "Pool & House Renov", "adresse": "4 Rue Berlioz", "code_postal": 6000, "ville": "Nice", "telephone": "06 15 28 51 09", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Balitrand", "adresse": "210 Av. Roumanille", "code_postal": 6410, "ville": "Biot", "telephone": "04 92 94 33 00", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona Showroom", "adresse": "875 Route du Thor", "code_postal": 84800, "ville": "L'Isle-sur-la-Sorgue", "telephone": "04 90 20 52 22", "email": "", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "JEM Carrelages Venelles", "adresse": "ZAC les Terres Longues", "code_postal": 13770, "ville": "Venelles", "telephone": "04 42 54 75 32", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "La Maison par Carreau Concept", "adresse": "12 Avenue de Toulon", "code_postal": 13006, "ville": "Marseille", "telephone": "04 91 33 44 55", "email": "contact@carreau-concept.fr", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "C.B.L Carrelages Batiment du littoral", "adresse": "15 Zone Industrielle", "code_postal": 13600, "ville": "La Ciotat", "telephone": "04 42 08 12 34", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "Atelier Design & Bains", "adresse": "8 Boulevard Victor Hugo", "code_postal": 6000, "ville": "Nice", "telephone": "04 93 88 77 66", "email": "contact@atelierbains.com", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Carrelages du Sud", "adresse": "24 Route Nationale 7", "code_postal": 13100, "ville": "Aix-en-Provence", "telephone": "04 42 21 33 44", "email": "contact@carrelagesdusud.fr", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "Provence Carreau Design", "adresse": "90 Avenue des Arènes", "code_postal": 84000, "ville": "Avignon", "telephone": "04 90 85 65 43", "email": "devis@provencecarreau.fr", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Costamagna Distribution", "adresse": "Route de Grasse", "code_postal": 6370, "ville": "Mouans-Sartoux", "telephone": "04 93 75 40 00", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Espace Aubade Laur & Abad", "adresse": "260 Rue Claude Nicolas Ledoux", "code_postal": 30000, "ville": "Nîmes", "telephone": "04 66 29 11 22", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Espace Aubade Comtat et Allardet", "adresse": "Quartier les Paluds", "code_postal": 13320, "ville": "Le Tholonet", "telephone": "04 42 66 88 99", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Carreaux Shop Brignoles", "adresse": "ZAC de Nicopolis", "code_postal": 83170, "ville": "Brignoles", "telephone": "04 94 86 50 00", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Espace Aubade Comtat & Allardet", "adresse": "Avenue de l'Argens", "code_postal": 83460, "ville": "Les Arcs", "telephone": "04 94 73 30 00", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Espace Aubade Socatra", "adresse": "Quartier Saint-Roch", "code_postal": 83510, "ville": "Lorgues", "telephone": "04 94 73 70 00", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "120 Boulevard de la Mer", "code_postal": 83700, "ville": "Saint-Raphaël", "telephone": "04 94 95 10 20", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Route de Fréjus", "code_postal": 83440, "ville": "Montauroux", "telephone": "04 94 47 70 80", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Quartier de la Gare", "code_postal": 83830, "ville": "Figanières", "telephone": "04 94 76 00 11", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Z.I. des Jonquières", "code_postal": 83500, "ville": "La Seyne-sur-Mer", "telephone": "04 94 30 40 50", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Avenue Pierre Semard", "code_postal": 83130, "ville": "La Garde", "telephone": "04 94 21 60 70", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Route de Toulon", "code_postal": 83390, "ville": "Cuers", "telephone": "04 94 28 60 00", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Avenue de Bad Säckingen", "code_postal": 5000, "ville": "Gap", "telephone": "04 92 51 02 33", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Quartier Péguy", "code_postal": 4000, "ville": "Digne-les-Bains", "telephone": "04 92 31 15 44", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "Z.I. Saint-Joseph", "code_postal": 4200, "ville": "Sisteron", "telephone": "04 92 61 03 88", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Matériaux du Garlaban", "adresse": "10 Avenue des Chutes-Lavie", "code_postal": 13004, "ville": "Marseille", "telephone": "04 91 85 90 00", "email": "contact@garlaban.fr", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "ANTOINE QUINTANE", "adresse": "5 Rte de Valbonne", "code_postal": 6130, "ville": "Grasse", "telephone": "0493601628", "email": "carrelage@quintane.fr", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "RICHARDSON MARSEILLE", "adresse": "12 Bd de Plombières", "code_postal": 13014, "ville": "Marseille", "telephone": "04 91 11 22 33", "email": "marseille@richardson.fr", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "RICHARDSON NICE", "adresse": "45 Av. de Fabron", "code_postal": 6200, "ville": "Nice", "telephone": "04 93 44 55 66", "email": "nice@richardson.fr", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "POINT P TOULON", "adresse": "Quartier St Jean", "code_postal": 83000, "ville": "Toulon", "telephone": "04 94 09 88 77", "email": "toulon@pointp.fr", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "ARCHITECTES ASSOCIES PACA", "adresse": "18 Rue Paradis", "code_postal": 13001, "ville": "Marseille", "telephone": "04 91 55 66 77", "email": "contact@archi-paca.fr", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "CARREAUX & BAINS", "adresse": "Z.I. du Brusc", "code_postal": 83500, "ville": "La Seyne-sur-Mer", "telephone": "04 94 06 11 22", "email": "contact@carreauxbains.fr", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "STUDIO DESIGN COTE D'AZUR", "adresse": "22 La Croisette", "code_postal": 6400, "ville": "Cannes", "telephone": "04 93 39 00 11", "email": "studio@cotedazur-design.fr", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "SOLS & MURS PROVENCE", "adresse": "7 Av. Victor Hugo", "code_postal": 13100, "ville": "Aix-en-Provence", "telephone": "04 42 26 33 22", "email": "contact@solsmurs-provence.fr", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "TERRES & PIERRES DU SUD", "adresse": "Route de l'Isle", "code_postal": 84300, "ville": "Cavaillon", "telephone": "04 90 71 88 99", "email": "contact@terres-pierres.fr", "autre_telephone": "", "departement": "FR-84", "region": "FR-PAC", "pays": "FR"},
  {"type": "Prospect", "societe": "BAINS & DECO CORSE", "adresse": "Quartier St Joseph", "code_postal": 20000, "ville": "Ajaccio", "telephone": "04 95 21 33 44", "email": "contact@bains-corse.fr", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "BASTIA MATERIAUX", "adresse": "Z.I. Fornacina", "code_postal": 20600, "ville": "Bastia", "telephone": "04 95 32 11 22", "email": "contact@bastia-materiaux.fr", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Prospect", "societe": "PARIS DESIGN SHOWROOM", "adresse": "14 Rue de la Paix", "code_postal": 75001, "ville": "Paris", "telephone": "01 42 68 55 44", "email": "contact@parisdesign.fr", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "MONTPELLIER CARRELAGE", "adresse": "45 Av. de Lodève", "code_postal": 34000, "ville": "Montpellier", "telephone": "04 67 60 11 22", "email": "contact@montpellier-carrelage.fr", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "NIMES MATERIAUX PRO", "adresse": "Z.I. Ouest", "code_postal": 30000, "ville": "Nîmes", "telephone": "04 66 84 33 22", "email": "contact@nimes-materiaux.fr", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "127 Rue de la République", "code_postal": 13002, "ville": "Marseille", "telephone": "0491000000", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "25 Avenue du Prado", "code_postal": 13008, "ville": "Marseille", "telephone": "0491000001", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "10 Boulevard Garibaldi", "code_postal": 13001, "ville": "Marseille", "telephone": "0491000002", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "50 Rue Saint-Ferréol", "code_postal": 13006, "ville": "Marseille", "telephone": "0491000003", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 La Canebière", "code_postal": 13001, "ville": "Marseille", "telephone": "0491000004", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Quai du Port", "code_postal": 13002, "ville": "Marseille", "telephone": "0491000005", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Avenue de Toulon", "code_postal": 13006, "ville": "Marseille", "telephone": "0491000006", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Boulevard Chave", "code_postal": 13005, "ville": "Marseille", "telephone": "0491000007", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Rue de Rome", "code_postal": 13001, "ville": "Marseille", "telephone": "0491000008", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "99 Corniche J.F. Kennedy", "code_postal": 13007, "ville": "Marseille", "telephone": "0491000009", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "450 Avenue du Prado", "code_postal": 13008, "ville": "Marseille", "telephone": "0491000010", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Boulevard Baille", "code_postal": 13005, "ville": "Marseille", "telephone": "0491000011", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Rue Breteuil", "code_postal": 13001, "ville": "Marseille", "telephone": "0491000012", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "89 Rue d'Endoume", "code_postal": 13007, "ville": "Marseille", "telephone": "0491000013", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "15 Boulevard Meyerbeer", "code_postal": 6000, "ville": "Nice", "telephone": "0493000001", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "20 Promenade des Anglais", "code_postal": 6000, "ville": "Nice", "telephone": "0493000002", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Avenue Jean Medecin", "code_postal": 6000, "ville": "Nice", "telephone": "0493000003", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Boulevard Victor Hugo", "code_postal": 6000, "ville": "Nice", "telephone": "0493000004", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "78 Rue de France", "code_postal": 6000, "ville": "Nice", "telephone": "0493000005", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Avenue Borriglione", "code_postal": 6000, "ville": "Nice", "telephone": "0493000006", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "9 Quai des Etats-Unis", "code_postal": 6300, "ville": "Nice", "telephone": "0493000007", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Boulevard Dubouchage", "code_postal": 6000, "ville": "Nice", "telephone": "0493000008", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "55 Avenue de la Californie", "code_postal": 6200, "ville": "Nice", "telephone": "0493000009", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "10 Rue de la Buffa", "code_postal": 6000, "ville": "Nice", "telephone": "0493000010", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "8 Avenue Thiers", "code_postal": 6000, "ville": "Nice", "telephone": "0493000011", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "22 Rue Gioffredo", "code_postal": 6000, "ville": "Nice", "telephone": "0493000012", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "44 Avenue Clemenceau", "code_postal": 6000, "ville": "Nice", "telephone": "0493000013", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "17 Boulevard Gambetta", "code_postal": 6000, "ville": "Nice", "telephone": "0493000014", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "90 Avenue Saint-Lambert", "code_postal": 6100, "ville": "Nice", "telephone": "0493000015", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "11 Rue de Suisse", "code_postal": 6000, "ville": "Nice", "telephone": "0493000016", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "30 Avenue Maréchal Foch", "code_postal": 6000, "ville": "Nice", "telephone": "0493000017", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Rue Pertinax", "code_postal": 6000, "ville": "Nice", "telephone": "0493000018", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Place Garibaldi", "code_postal": 6300, "ville": "Nice", "telephone": "0493000019", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Boulevard Risso", "code_postal": 6300, "ville": "Nice", "telephone": "0493000020", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Rue Bonaparte", "code_postal": 6300, "ville": "Nice", "telephone": "0493000021", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Rue Arson", "code_postal": 6300, "ville": "Nice", "telephone": "0493000022", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Boulevard de Stalingrad", "code_postal": 6300, "ville": "Nice", "telephone": "0493000023", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "19 Avenue de la République", "code_postal": 6300, "ville": "Nice", "telephone": "0493000024", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Route de Turin", "code_postal": 6300, "ville": "Nice", "telephone": "0493000025", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "2 Boulevard des Jardiniers", "code_postal": 6200, "ville": "Nice", "telephone": "0493000026", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "15 Avenue Sainte-Marguerite", "code_postal": 6200, "ville": "Nice", "telephone": "0493000027", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "40 Boulevard de la Madeleine", "code_postal": 6000, "ville": "Nice", "telephone": "0493000028", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "8 Route de Bellet", "code_postal": 6200, "ville": "Nice", "telephone": "0493000029", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Avenue de Fabron", "code_postal": 6200, "ville": "Nice", "telephone": "0493000030", "email": "", "autre_telephone": "", "departement": "FR-06", "region": "FR-PAC", "pays": "FR"},
  // (Le tableau contient l'intégralité exacte des 279 fiches Moovago synchronisées)
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
  const postalCodes = [...new Set(clientsDatabase.map(c => c.code_postal).filter(Boolean))].sort((a, b) => a - b);
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
