-- Script d'amélioration de la base de données pour la gestion des clients - Phase 1.4
-- Création et amélioration des tables companies et etablissements

-- ==================== TABLE COMPANIES ====================

-- Créer la table companies si elle n'existe pas
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'France',
    sector VARCHAR(100),
    size VARCHAR(20), -- TPE, PME, ETI, GE
    website VARCHAR(255),
    siret VARCHAR(20),
    description TEXT,
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ajouter les colonnes manquantes si elles n'existent pas
DO $$ 
BEGIN
    -- Vérifier et ajouter les colonnes une par une
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'sector') THEN
        ALTER TABLE companies ADD COLUMN sector VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'size') THEN
        ALTER TABLE companies ADD COLUMN size VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'website') THEN
        ALTER TABLE companies ADD COLUMN website VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'siret') THEN
        ALTER TABLE companies ADD COLUMN siret VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'description') THEN
        ALTER TABLE companies ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'contact_person') THEN
        ALTER TABLE companies ADD COLUMN contact_person VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'contact_email') THEN
        ALTER TABLE companies ADD COLUMN contact_email VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'contact_phone') THEN
        ALTER TABLE companies ADD COLUMN contact_phone VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'country') THEN
        ALTER TABLE companies ADD COLUMN country VARCHAR(100) DEFAULT 'France';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'postal_code') THEN
        ALTER TABLE companies ADD COLUMN postal_code VARCHAR(20);
    END IF;
END $$;

-- ==================== TABLE ETABLISSEMENTS ====================

-- Créer la table etablissements si elle n'existe pas
CREATE TABLE IF NOT EXISTS etablissements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'France',
    website VARCHAR(255),
    siret VARCHAR(20),
    description TEXT,
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ajouter les colonnes manquantes pour etablissements
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etablissements' AND column_name = 'website') THEN
        ALTER TABLE etablissements ADD COLUMN website VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etablissements' AND column_name = 'siret') THEN
        ALTER TABLE etablissements ADD COLUMN siret VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etablissements' AND column_name = 'description') THEN
        ALTER TABLE etablissements ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etablissements' AND column_name = 'contact_person') THEN
        ALTER TABLE etablissements ADD COLUMN contact_person VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etablissements' AND column_name = 'contact_email') THEN
        ALTER TABLE etablissements ADD COLUMN contact_email VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etablissements' AND column_name = 'contact_phone') THEN
        ALTER TABLE etablissements ADD COLUMN contact_phone VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etablissements' AND column_name = 'country') THEN
        ALTER TABLE etablissements ADD COLUMN country VARCHAR(100) DEFAULT 'France';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etablissements' AND column_name = 'postal_code') THEN
        ALTER TABLE etablissements ADD COLUMN postal_code VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'etablissements' AND column_name = 'company_id') THEN
        ALTER TABLE etablissements ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ==================== INDEX DE PERFORMANCE ====================

-- Index pour les recherches sur companies
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);
CREATE INDEX IF NOT EXISTS idx_companies_size ON companies(size);
CREATE INDEX IF NOT EXISTS idx_companies_search ON companies USING gin(to_tsvector('french', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(city, '')));

-- Index pour les recherches sur etablissements
CREATE INDEX IF NOT EXISTS idx_etablissements_name ON etablissements(name);
CREATE INDEX IF NOT EXISTS idx_etablissements_email ON etablissements(email);
CREATE INDEX IF NOT EXISTS idx_etablissements_city ON etablissements(city);
CREATE INDEX IF NOT EXISTS idx_etablissements_company_id ON etablissements(company_id);
CREATE INDEX IF NOT EXISTS idx_etablissements_search ON etablissements USING gin(to_tsvector('french', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(city, '')));

-- Index composites pour les jointures
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_etablissement_id ON projects(etablissement_id) WHERE etablissement_id IS NOT NULL;

-- ==================== TRIGGERS POUR UPDATED_AT ====================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour companies
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour etablissements
DROP TRIGGER IF EXISTS update_etablissements_updated_at ON etablissements;
CREATE TRIGGER update_etablissements_updated_at
    BEFORE UPDATE ON etablissements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==================== CONTRAINTES ET VALIDATIONS ====================

-- Contraintes pour companies
ALTER TABLE companies ADD CONSTRAINT IF NOT EXISTS chk_companies_size 
    CHECK (size IN ('TPE', 'PME', 'ETI', 'GE') OR size IS NULL);

ALTER TABLE companies ADD CONSTRAINT IF NOT EXISTS chk_companies_email_format 
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Contraintes pour etablissements
ALTER TABLE etablissements ADD CONSTRAINT IF NOT EXISTS chk_etablissements_email_format 
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- ==================== VUES UTILES ====================

-- Vue pour les statistiques des entreprises
CREATE OR REPLACE VIEW companies_stats AS
SELECT 
    c.*,
    COUNT(DISTINCT e.id) as etablissements_count,
    COUNT(DISTINCT p.id) as projects_count,
    COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects_count,
    SUM(CASE WHEN p.budget IS NOT NULL THEN p.budget ELSE 0 END) as total_budget,
    MAX(p.created_at) as last_project_date
FROM companies c
LEFT JOIN etablissements e ON e.company_id = c.id
LEFT JOIN projects p ON p.client_id = c.id
GROUP BY c.id;

-- Vue pour les statistiques des établissements
CREATE OR REPLACE VIEW etablissements_stats AS
SELECT 
    e.*,
    c.name as company_name,
    c.sector as company_sector,
    COUNT(DISTINCT p.id) as projects_count,
    COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects_count,
    SUM(CASE WHEN p.budget IS NOT NULL THEN p.budget ELSE 0 END) as total_budget,
    MAX(p.created_at) as last_project_date
FROM etablissements e
LEFT JOIN companies c ON c.id = e.company_id
LEFT JOIN projects p ON p.etablissement_id = e.id
GROUP BY e.id, c.name, c.sector;

-- ==================== DONNÉES DE DÉMONSTRATION ====================

-- Insérer des entreprises de démonstration si elles n'existent pas
INSERT INTO companies (name, email, phone, address, city, postal_code, sector, size, website, description, contact_person, contact_email, contact_phone)
SELECT * FROM (VALUES
    ('Centre Commercial Atlantis', 'contact@atlantis-mall.fr', '01.23.45.67.89', '2 Place Atlantis', 'Saint-Herblain', '44800', 'Commerce', 'GE', 'https://www.atlantis-mall.fr', 'Grand centre commercial avec plus de 130 boutiques et restaurants', 'Marie Dubois', 'marie.dubois@atlantis-mall.fr', '01.23.45.67.90'),
    ('Hôtel Le Grand Palais', 'reservation@grandpalais-hotel.fr', '04.56.78.90.12', '15 Avenue de la République', 'Lyon', '69002', 'Hôtellerie', 'PME', 'https://www.grandpalais-hotel.fr', 'Hôtel 4 étoiles au cœur de Lyon avec 120 chambres', 'Pierre Martin', 'pierre.martin@grandpalais-hotel.fr', '04.56.78.90.13'),
    ('Clinique Sainte-Marie', 'accueil@clinique-saintemarie.fr', '02.34.56.78.90', '45 Rue de la Santé', 'Nantes', '44000', 'Santé', 'ETI', 'https://www.clinique-saintemarie.fr', 'Établissement de santé privé spécialisé en chirurgie', 'Dr. Sophie Leroy', 'sophie.leroy@clinique-saintemarie.fr', '02.34.56.78.91'),
    ('Lycée Technique Industriel', 'secretariat@lti-marseille.edu', '04.91.23.45.67', '78 Boulevard Industriel', 'Marseille', '13015', 'Éducation', 'Public', 'https://www.lti-marseille.edu', 'Lycée technique formant aux métiers de l\'industrie', 'Jean-Claude Moreau', 'jc.moreau@lti-marseille.edu', '04.91.23.45.68'),
    ('Usine Métallurgie Provence', 'direction@metallurgie-provence.fr', '04.42.56.78.90', 'Zone Industrielle Nord', 'Aix-en-Provence', '13100', 'Industrie', 'ETI', 'https://www.metallurgie-provence.fr', 'Spécialiste de la transformation métallique depuis 1985', 'Michel Rousseau', 'michel.rousseau@metallurgie-provence.fr', '04.42.56.78.91'),
    ('Résidence Services Seniors', 'contact@residence-seniors-bordeaux.fr', '05.67.89.01.23', '12 Allée des Tilleuls', 'Bordeaux', '33000', 'Services', 'PME', 'https://www.residence-seniors-bordeaux.fr', 'Résidence services pour seniors autonomes avec 80 logements', 'Catherine Blanc', 'catherine.blanc@residence-seniors-bordeaux.fr', '05.67.89.01.24')
) AS new_companies(name, email, phone, address, city, postal_code, sector, size, website, description, contact_person, contact_email, contact_phone)
WHERE NOT EXISTS (
    SELECT 1 FROM companies WHERE name = new_companies.name
);

-- Insérer des établissements de démonstration
INSERT INTO etablissements (name, email, phone, address, city, postal_code, website, description, contact_person, contact_email, contact_phone, company_id)
SELECT * FROM (VALUES
    ('Atlantis - Galerie Nord', 'galerie-nord@atlantis-mall.fr', '01.23.45.67.95', '2 Place Atlantis - Galerie Nord', 'Saint-Herblain', '44800', 'https://www.atlantis-mall.fr/galerie-nord', 'Galerie commerciale nord avec 45 boutiques', 'Sylvie Moreau', 'sylvie.moreau@atlantis-mall.fr', '01.23.45.67.96', (SELECT id FROM companies WHERE name = 'Centre Commercial Atlantis' LIMIT 1)),
    ('Atlantis - Galerie Sud', 'galerie-sud@atlantis-mall.fr', '01.23.45.67.97', '2 Place Atlantis - Galerie Sud', 'Saint-Herblain', '44800', 'https://www.atlantis-mall.fr/galerie-sud', 'Galerie commerciale sud avec restaurants et cinéma', 'Laurent Petit', 'laurent.petit@atlantis-mall.fr', '01.23.45.67.98', (SELECT id FROM companies WHERE name = 'Centre Commercial Atlantis' LIMIT 1)),
    ('Grand Palais - Bâtiment Principal', 'principal@grandpalais-hotel.fr', '04.56.78.90.15', '15 Avenue de la République', 'Lyon', '69002', 'https://www.grandpalais-hotel.fr', 'Bâtiment principal avec réception et 80 chambres', 'Anne Durand', 'anne.durand@grandpalais-hotel.fr', '04.56.78.90.16', (SELECT id FROM companies WHERE name = 'Hôtel Le Grand Palais' LIMIT 1)),
    ('Grand Palais - Annexe Spa', 'spa@grandpalais-hotel.fr', '04.56.78.90.17', '17 Avenue de la République', 'Lyon', '69002', 'https://www.grandpalais-hotel.fr/spa', 'Annexe avec spa, piscine et 40 chambres', 'Thomas Bernard', 'thomas.bernard@grandpalais-hotel.fr', '04.56.78.90.18', (SELECT id FROM companies WHERE name = 'Hôtel Le Grand Palais' LIMIT 1)),
    ('Clinique Sainte-Marie - Bloc A', 'bloc-a@clinique-saintemarie.fr', '02.34.56.78.92', '45 Rue de la Santé - Bloc A', 'Nantes', '44000', 'https://www.clinique-saintemarie.fr', 'Bloc chirurgical avec 6 salles d\'opération', 'Dr. Marc Lefebvre', 'marc.lefebvre@clinique-saintemarie.fr', '02.34.56.78.93', (SELECT id FROM companies WHERE name = 'Clinique Sainte-Marie' LIMIT 1)),
    ('Clinique Sainte-Marie - Bloc B', 'bloc-b@clinique-saintemarie.fr', '02.34.56.78.94', '45 Rue de la Santé - Bloc B', 'Nantes', '44000', 'https://www.clinique-saintemarie.fr', 'Bloc d\'hospitalisation avec 60 lits', 'Dr. Isabelle Garnier', 'isabelle.garnier@clinique-saintemarie.fr', '02.34.56.78.95', (SELECT id FROM companies WHERE name = 'Clinique Sainte-Marie' LIMIT 1))
) AS new_etablissements(name, email, phone, address, city, postal_code, website, description, contact_person, contact_email, contact_phone, company_id)
WHERE NOT EXISTS (
    SELECT 1 FROM etablissements WHERE name = new_etablissements.name
);

-- ==================== FONCTIONS UTILES ====================

-- Fonction pour rechercher des clients (entreprises + établissements)
CREATE OR REPLACE FUNCTION search_clients(search_term TEXT, result_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    type TEXT,
    id INTEGER,
    name TEXT,
    email TEXT,
    city TEXT,
    description TEXT,
    company_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    (
        SELECT 
            'company'::TEXT as type,
            c.id,
            c.name,
            c.email,
            c.city,
            c.description,
            NULL::TEXT as company_name
        FROM companies c
        WHERE 
            c.name ILIKE '%' || search_term || '%' OR
            c.email ILIKE '%' || search_term || '%' OR
            c.city ILIKE '%' || search_term || '%' OR
            c.description ILIKE '%' || search_term || '%'
        ORDER BY 
            CASE 
                WHEN c.name ILIKE '%' || search_term || '%' THEN 1
                WHEN c.email ILIKE '%' || search_term || '%' THEN 2
                ELSE 3
            END,
            c.name
        LIMIT result_limit / 2
    )
    UNION ALL
    (
        SELECT 
            'etablissement'::TEXT as type,
            e.id,
            e.name,
            e.email,
            e.city,
            e.description,
            c.name as company_name
        FROM etablissements e
        LEFT JOIN companies c ON c.id = e.company_id
        WHERE 
            e.name ILIKE '%' || search_term || '%' OR
            e.email ILIKE '%' || search_term || '%' OR
            e.city ILIKE '%' || search_term || '%' OR
            e.description ILIKE '%' || search_term || '%' OR
            c.name ILIKE '%' || search_term || '%'
        ORDER BY 
            CASE 
                WHEN e.name ILIKE '%' || search_term || '%' THEN 1
                WHEN e.email ILIKE '%' || search_term || '%' THEN 2
                ELSE 3
            END,
            e.name
        LIMIT result_limit / 2
    );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques détaillées d'un client
CREATE OR REPLACE FUNCTION get_client_stats(client_type TEXT, client_id INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    IF client_type = 'company' THEN
        SELECT json_build_object(
            'type', 'company',
            'id', c.id,
            'name', c.name,
            'etablissements_count', COUNT(DISTINCT e.id),
            'projects_count', COUNT(DISTINCT p.id),
            'active_projects_count', COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END),
            'total_budget', COALESCE(SUM(p.budget), 0),
            'last_project_date', MAX(p.created_at)
        ) INTO result
        FROM companies c
        LEFT JOIN etablissements e ON e.company_id = c.id
        LEFT JOIN projects p ON p.client_id = c.id
        WHERE c.id = client_id
        GROUP BY c.id, c.name;
    ELSE
        SELECT json_build_object(
            'type', 'etablissement',
            'id', e.id,
            'name', e.name,
            'company_name', c.name,
            'projects_count', COUNT(DISTINCT p.id),
            'active_projects_count', COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END),
            'total_budget', COALESCE(SUM(p.budget), 0),
            'last_project_date', MAX(p.created_at)
        ) INTO result
        FROM etablissements e
        LEFT JOIN companies c ON c.id = e.company_id
        LEFT JOIN projects p ON p.etablissement_id = e.id
        WHERE e.id = client_id
        GROUP BY e.id, e.name, c.name;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ==================== PERMISSIONS ====================

-- Accorder les permissions à l'utilisateur prevhub_user
GRANT ALL PRIVILEGES ON companies TO prevhub_user;
GRANT ALL PRIVILEGES ON etablissements TO prevhub_user;
GRANT USAGE, SELECT ON SEQUENCE companies_id_seq TO prevhub_user;
GRANT USAGE, SELECT ON SEQUENCE etablissements_id_seq TO prevhub_user;

-- Permissions sur les vues
GRANT SELECT ON companies_stats TO prevhub_user;
GRANT SELECT ON etablissements_stats TO prevhub_user;

-- Permissions sur les fonctions
GRANT EXECUTE ON FUNCTION search_clients(TEXT, INTEGER) TO prevhub_user;
GRANT EXECUTE ON FUNCTION get_client_stats(TEXT, INTEGER) TO prevhub_user;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO prevhub_user;

-- ==================== VÉRIFICATIONS FINALES ====================

-- Vérifier que les tables existent
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        RAISE EXCEPTION 'Table companies non créée';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'etablissements') THEN
        RAISE EXCEPTION 'Table etablissements non créée';
    END IF;
    
    RAISE NOTICE 'Base de données clients Phase 1.4 initialisée avec succès';
    RAISE NOTICE 'Entreprises: % enregistrements', (SELECT COUNT(*) FROM companies);
    RAISE NOTICE 'Établissements: % enregistrements', (SELECT COUNT(*) FROM etablissements);
END $$;

