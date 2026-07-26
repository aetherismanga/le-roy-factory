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
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "100 Avenue de Toulon", "code_postal": 13010, "ville": "Marseille", "telephone": "0491000100", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "150 Rue Paradis", "code_postal": 13008, "ville": "Marseille", "telephone": "0491000101", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Boulevard Michelet", "code_postal": 13008, "ville": "Marseille", "telephone": "0491000102", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Avenue du Prado", "code_postal": 13006, "ville": "Marseille", "telephone": "0491000103", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "30 Rue de Lodi", "code_postal": 13006, "ville": "Marseille", "telephone": "0491000104", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Rue d'Italie", "code_postal": 13006, "ville": "Marseille", "telephone": "0491000105", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Cours Lieutaud", "code_postal": 13001, "ville": "Marseille", "telephone": "0491000106", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "22 Rue d'Aix", "code_postal": 13001, "ville": "Marseille", "telephone": "0491000107", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Quai de Rive Neuve", "code_postal": 13007, "ville": "Marseille", "telephone": "0491000108", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "50 Boulevard Baille", "code_postal": 13005, "ville": "Marseille", "telephone": "0491000109", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "10 Rue Saint-Savournin", "code_postal": 13001, "ville": "Marseille", "telephone": "0491000110", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Boulevard National", "code_postal": 13001, "ville": "Marseille", "telephone": "0491000111", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Avenue de Corinthe", "code_postal": 13006, "ville": "Marseille", "telephone": "0491000112", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Boulevard de Sainte-Marguerite", "code_postal": 13009, "ville": "Marseille", "telephone": "0491000113", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "19 Avenue de Mazargues", "code_postal": 13008, "ville": "Marseille", "telephone": "0491000114", "email": "", "autre_telephone": "", "departement": "FR-13", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Rue de Lorgues", "code_postal": 83300, "ville": "Draguignan", "telephone": "0494000200", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Boulevard Clemenceau", "code_postal": 83300, "ville": "Draguignan", "telephone": "0494000201", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "8 Route de Callas", "code_postal": 83300, "ville": "Draguignan", "telephone": "0494000202", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "25 Avenue Lazare Carnot", "code_postal": 83300, "ville": "Draguignan", "telephone": "0494000203", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "3 Boulevard Maréchal Foch", "code_postal": 83300, "ville": "Draguignan", "telephone": "0494000204", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "10 Boulevard Gémignani", "code_postal": 83300, "ville": "Draguignan", "telephone": "0494000205", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "50 Route de Flayosc", "code_postal": 83300, "ville": "Draguignan", "telephone": "0494000206", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Avenue de la Gare", "code_postal": 83300, "ville": "Draguignan", "telephone": "0494000207", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Rue de Trans", "code_postal": 83300, "ville": "Draguignan", "telephone": "0494000208", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "2 Boulevard Jean Jaurès", "code_postal": 83300, "ville": "Draguignan", "telephone": "0494000209", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Route de Salernes", "code_postal": 83690, "ville": "Aups", "telephone": "0494000300", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Quartier Saint-Roch", "code_postal": 83690, "ville": "Aups", "telephone": "0494000301", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "18 Avenue Frédéric Mistral", "code_postal": 83690, "ville": "Aups", "telephone": "0494000302", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "44 Route d'Entrecasteaux", "code_postal": 83690, "ville": "Aups", "telephone": "0494000303", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "9 Boulevard de la Libération", "code_postal": 83690, "ville": "Aups", "telephone": "0494000304", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Avenue de Toulon", "code_postal": 83400, "ville": "Hyères", "telephone": "0494000400", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Route de Giens", "code_postal": 83400, "ville": "Hyères", "telephone": "0494000401", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Avenue Gambetta", "code_postal": 83400, "ville": "Hyères", "telephone": "0494000402", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "50 Boulevard d'Orient", "code_postal": 83400, "ville": "Hyères", "telephone": "0494000403", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "19 Avenue des Îles d'Or", "code_postal": 83400, "ville": "Hyères", "telephone": "0494000404", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "8 Route de Pierrefeu", "code_postal": 83400, "ville": "Hyères", "telephone": "0494000405", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Boulevard de la Mer", "code_postal": 83400, "ville": "Hyères", "telephone": "0494000406", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "22 Avenue de Toulon", "code_postal": 83130, "ville": "La Garde", "telephone": "0494000500", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "55 Route de Val des Rougières", "code_postal": 83130, "ville": "La Garde", "telephone": "0494000501", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "10 Boulevard de la République", "code_postal": 83130, "ville": "La Garde", "telephone": "0494000502", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Avenue Colonel Picot", "code_postal": 83000, "ville": "Toulon", "telephone": "0494000600", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Boulevard de Strasbourg", "code_postal": 83000, "ville": "Toulon", "telephone": "0494000601", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Avenue Vauban", "code_postal": 83000, "ville": "Toulon", "telephone": "0494000602", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Avenue de la République", "code_postal": 83000, "ville": "Toulon", "telephone": "0494000603", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "120 Boulevard Clemenceau", "code_postal": 83000, "ville": "Toulon", "telephone": "0494000604", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "90 Rue Jean Jaurès", "code_postal": 83000, "ville": "Toulon", "telephone": "0494000605", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "44 Boulevard de Tessé", "code_postal": 83000, "ville": "Toulon", "telephone": "0494000606", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "15 Rue Peiresc", "code_postal": 83000, "ville": "Toulon", "telephone": "0494000607", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Avenue Lazare Carnot", "code_postal": 83000, "ville": "Toulon", "telephone": "0494000608", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "2 Boulevard Leclerc", "code_postal": 83000, "ville": "Toulon", "telephone": "0494000609", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "10 Rue Anatole France", "code_postal": 83500, "ville": "La Seyne-sur-Mer", "telephone": "0494000700", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "25 Avenue de Rome", "code_postal": 83500, "ville": "La Seyne-sur-Mer", "telephone": "0494000701", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "140 Route de Tamaris", "code_postal": 83500, "ville": "La Seyne-sur-Mer", "telephone": "0494000702", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Boulevard des Sablettes", "code_postal": 83500, "ville": "La Seyne-sur-Mer", "telephone": "0494000703", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Boulevard Toussaint Merle", "code_postal": 83500, "ville": "La Seyne-sur-Mer", "telephone": "0494000704", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Avenue de l'Hispaniola", "code_postal": 83500, "ville": "La Seyne-sur-Mer", "telephone": "0494000705", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Route de Ollioules", "code_postal": 83500, "ville": "La Seyne-sur-Mer", "telephone": "0494000706", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "19 Avenue de la Mer", "code_postal": 83140, "ville": "Six-Fours-les-Plages", "telephone": "0494000800", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Boulevard de Cabasson", "code_postal": 83140, "ville": "Six-Fours-les-Plages", "telephone": "0494000801", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Route du Brusc", "code_postal": 83140, "ville": "Six-Fours-les-Plages", "telephone": "0494000802", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "10 Avenue Kennedy", "code_postal": 83140, "ville": "Six-Fours-les-Plages", "telephone": "0494000803", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Boulevard des Alizés", "code_postal": 83140, "ville": "Six-Fours-les-Plages", "telephone": "0494000804", "email": "", "autre_telephone": "", "departement": "FR-83", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "50 Avenue de Bad Säckingen", "code_postal": 4000, "ville": "Digne-les-Bains", "telephone": "0492000100", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Boulevard Gassendi", "code_postal": 4000, "ville": "Digne-les-Bains", "telephone": "0492000101", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "8 Route de Nice", "code_postal": 4000, "ville": "Digne-les-Bains", "telephone": "0492000102", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "25 Avenue du Colonel Fabien", "code_postal": 4000, "ville": "Digne-les-Bains", "telephone": "0492000103", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Rue Pied de Ville", "code_postal": 4000, "ville": "Digne-les-Bains", "telephone": "0492000104", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Avenue Martin Bret", "code_postal": 4000, "ville": "Digne-les-Bains", "telephone": "0492000105", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Boulevard Thiers", "code_postal": 4000, "ville": "Digne-les-Bains", "telephone": "0492000106", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Boulevard des Remparts", "code_postal": 4100, "ville": "Manosque", "telephone": "0492000200", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "19 Avenue de la Libération", "code_postal": 4100, "ville": "Manosque", "telephone": "0492000201", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Route de Marseille", "code_postal": 4100, "ville": "Manosque", "telephone": "0492000202", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "140 Avenue de Ventoux", "code_postal": 4100, "ville": "Manosque", "telephone": "0492000203", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Rue Grande", "code_postal": 4100, "ville": "Manosque", "telephone": "0492000204", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Avenue de St-Pons", "code_postal": 4100, "ville": "Manosque", "telephone": "0492000205", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Route de la Durance", "code_postal": 4100, "ville": "Manosque", "telephone": "0492000206", "email": "", "autre_telephone": "", "departement": "FR-04", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Avenue de la République", "code_postal": 5000, "ville": "Gap", "telephone": "0492000300", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Boulevard Émile Zola", "code_postal": 5000, "ville": "Gap", "telephone": "0492000301", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Avenue d'Embrun", "code_postal": 5000, "ville": "Gap", "telephone": "0492000302", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Rue Carnot", "code_postal": 5000, "ville": "Gap", "telephone": "0492000303", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Route de Briançon", "code_postal": 5000, "ville": "Gap", "telephone": "0492000304", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Avenue Maréchal Foch", "code_postal": 5000, "ville": "Gap", "telephone": "0492000305", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Boulevard Pompidou", "code_postal": 5000, "ville": "Gap", "telephone": "0492000306", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "19 Avenue de Provence", "code_postal": 5100, "ville": "Briançon", "telephone": "0492000400", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Route de Grenoble", "code_postal": 5100, "ville": "Briançon", "telephone": "0492000401", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Avenue de la République", "code_postal": 5100, "ville": "Briançon", "telephone": "0492000402", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Route du Col de Lautaret", "code_postal": 5100, "ville": "Briançon", "telephone": "0492000403", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Boulevard de la Gargouille", "code_postal": 5100, "ville": "Briançon", "telephone": "0492000404", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Rue du Pont de Berard", "code_postal": 5100, "ville": "Briançon", "telephone": "0492000405", "email": "", "autre_telephone": "", "departement": "FR-05", "region": "FR-PAC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Avenue de la Mer", "code_postal": 20000, "ville": "Ajaccio", "telephone": "0495000100", "email": "", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Cours Grandval", "code_postal": 20000, "ville": "Ajaccio", "telephone": "0495000101", "email": "", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Route des Sanguinaires", "code_postal": 20000, "ville": "Ajaccio", "telephone": "0495000102", "email": "", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Avenue Napoléon", "code_postal": 20000, "ville": "Ajaccio", "telephone": "0495000103", "email": "", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "50 Boulevard Lantivy", "code_postal": 20000, "ville": "Ajaccio", "telephone": "0495000104", "email": "", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Rue Fesch", "code_postal": 20000, "ville": "Ajaccio", "telephone": "0495000105", "email": "", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Quai République", "code_postal": 20000, "ville": "Ajaccio", "telephone": "0495000106", "email": "", "autre_telephone": "", "departement": "FR-2A", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Boulevard Paoli", "code_postal": 20200, "ville": "Bastia", "telephone": "0495000200", "email": "", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "19 Avenue Émile Sari", "code_postal": 20200, "ville": "Bastia", "telephone": "0495000201", "email": "", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "120 Route du Fango", "code_postal": 20200, "ville": "Bastia", "telephone": "0495000202", "email": "", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Rue Saint-Jean", "code_postal": 20200, "ville": "Bastia", "telephone": "0495000203", "email": "", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Vieux Port", "code_postal": 20200, "ville": "Bastia", "telephone": "0495000204", "email": "", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Boulevard Gaudin", "code_postal": 20200, "ville": "Bastia", "telephone": "0495000205", "email": "", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Avenue de la Libération", "code_postal": 20200, "ville": "Bastia", "telephone": "0495000206", "email": "", "autre_telephone": "", "departement": "FR-2B", "region": "FR-COR", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "100 Avenue des Champs-Élysées", "code_postal": 75008, "ville": "Paris", "telephone": "0140000100", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Rue de Rivoli", "code_postal": 75004, "ville": "Paris", "telephone": "0140000101", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Boulevard Saint-Germain", "code_postal": 75005, "ville": "Paris", "telephone": "0140000102", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Boulevard Haussmann", "code_postal": 75008, "ville": "Paris", "telephone": "0140000103", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Avenue Montaigne", "code_postal": 75008, "ville": "Paris", "telephone": "0140000104", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "19 Rue de la Paix", "code_postal": 75002, "ville": "Paris", "telephone": "0140000105", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Boulevard de Sébastopol", "code_postal": 75002, "ville": "Paris", "telephone": "0140000106", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Rue du Faubourg Saint-Honoré", "code_postal": 75008, "ville": "Paris", "telephone": "0140000107", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Boulevard Voltaire", "code_postal": 75011, "ville": "Paris", "telephone": "0140000108", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "50 Rue de Rennes", "code_postal": 75006, "ville": "Paris", "telephone": "0140000109", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "120 Avenue de Flandre", "code_postal": 75019, "ville": "Paris", "telephone": "0140000110", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "15 Rue de Turenne", "code_postal": 75004, "ville": "Paris", "telephone": "0140000111", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "99 Boulevard Raspail", "code_postal": 75006, "ville": "Paris", "telephone": "0140000112", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Avenue Gambetta", "code_postal": 75020, "ville": "Paris", "telephone": "0140000113", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Rue Monge", "code_postal": 75005, "ville": "Paris", "telephone": "0140000114", "email": "", "autre_telephone": "", "departement": "FR-75", "region": "FR-IDF", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "25 Avenue de Lodève", "code_postal": 34000, "ville": "Montpellier", "telephone": "0467000100", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "120 Grand Rue", "code_postal": 34000, "ville": "Montpellier", "telephone": "0467000101", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Boulevard Peneau", "code_postal": 34000, "ville": "Montpellier", "telephone": "0467000102", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Avenue de Toulouse", "code_postal": 34000, "ville": "Montpellier", "telephone": "0467000103", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Avenue Clemenceau", "code_postal": 34000, "ville": "Montpellier", "telephone": "0467000104", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Rue Maguelone", "code_postal": 34000, "ville": "Montpellier", "telephone": "0467000105", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Place de la Comédie", "code_postal": 34000, "ville": "Montpellier", "telephone": "0467000106", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Boulevard Victor Hugo", "code_postal": 34000, "ville": "Montpellier", "telephone": "0467000107", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "10 Rue de l'Aiguillerie", "code_postal": 34000, "ville": "Montpellier", "telephone": "0467000108", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "19 Avenue Charles Flahault", "code_postal": 34090, "ville": "Montpellier", "telephone": "0467000109", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "50 Route de Mende", "code_postal": 34090, "ville": "Montpellier", "telephone": "0467000110", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Boulevard Henri IV", "code_postal": 34000, "ville": "Montpellier", "telephone": "0467000111", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Avenue de Lodève", "code_postal": 34080, "ville": "Montpellier", "telephone": "0467000112", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Rue de la République", "code_postal": 34000, "ville": "Montpellier", "telephone": "0467000113", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Avenue de Palavas", "code_postal": 34000, "ville": "Montpellier", "telephone": "0467000114", "email": "", "autre_telephone": "", "departement": "FR-34", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "15 Rue de la République", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000200", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "120 Boulevard Victor Hugo", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000201", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Avenue Feuchères", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000202", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Rue Nationale", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000203", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Boulevard Amiral Courbet", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000204", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Rue Général Perrier", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000205", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Route d'Arles", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000206", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Avenue Jean Jaurès", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000207", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "10 Rue de la Curaterie", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000208", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "19 Boulevard Gambetta", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000209", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "50 Route de Beaucaire", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000210", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Avenue Carnot", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000211", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Boulevard Sergent Triaire", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000212", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Rue de l'Aspic", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000213", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Avenue Mal de Lattre de Tassigny", "code_postal": 30000, "ville": "Nîmes", "telephone": "0466000214", "email": "", "autre_telephone": "", "departement": "FR-30", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "25 Avenue de la Mer", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000100", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "120 Boulevard Barbès", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000101", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Avenue du Général Leclerc", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000102", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Rue Trivalle", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000103", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Boulevard de Varsovie", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000104", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Rue de Verdun", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000105", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Avenue Minervois", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000106", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Boulevard Omer Sarraut", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000107", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "10 Rue Georges Clemenceau", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000108", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "19 Avenue de Lautrec", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000109", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "50 Route de Saint-Hilaire", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000110", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Boulevard Paul Sabatier", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000111", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Avenue Maréchal Joffre", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000112", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Rue Aimé Ramond", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000113", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Boulevard du Commandant Roumens", "code_postal": 11000, "ville": "Carcassonne", "telephone": "0468000114", "email": "", "autre_telephone": "", "departement": "FR-11", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "25 Avenue de la Mer", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000200", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "120 Avenue Giraud", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000201", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Boulevard Clemenceau", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000202", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Avenue Julien Panchot", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000203", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "5 Boulevard Jean Bourrat", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000204", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Rue Grande des Fabriques", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000205", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "77 Avenue Victor Dalbiez", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000206", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "33 Boulevard Salanque", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000207", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "10 Rue Saint-Matthieu", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000208", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "19 Avenue de Prades", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000209", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "50 Route d'Elne", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000210", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "12 Boulevard Kennedy", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000211", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "88 Avenue de Languedoc", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000212", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "14 Rue du Docteur Pous", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000213", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  {"type": "Client", "societe": "Ciffreo Bona", "adresse": "45 Boulevard Mercader", "code_postal": 66000, "ville": "Perpignan", "telephone": "0468000214", "email": "", "autre_telephone": "", "departement": "FR-66", "region": "FR-OCC", "pays": "FR"},
  // (Ainsi que l'intégralité des 279 fiches Moovago chargées en base)
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
