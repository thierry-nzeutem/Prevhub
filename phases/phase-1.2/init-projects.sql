-- Script d'amélioration de la table projects pour l'ERP PrevHub

-- Supprimer la table existante si elle existe (pour recréer avec la nouvelle structure)
DROP TABLE IF EXISTS projects CASCADE;

-- Créer la table projects enrichie
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_id INTEGER REFERENCES companies(id),
    etablissement_id INTEGER REFERENCES etablissements(id),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold', 'completed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12,2),
    assigned_to INTEGER, -- Référence vers users (à créer si nécessaire)
    created_by INTEGER, -- Référence vers users
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Champs additionnels pour la gestion avancée
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_hours INTEGER,
    actual_hours INTEGER DEFAULT 0,
    project_type VARCHAR(100),
    tags TEXT[], -- Array de tags pour la catégorisation
    notes TEXT,
    
    -- Métadonnées
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP,
    archived_by INTEGER
);

-- Index pour améliorer les performances
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_etablissement_id ON projects(etablissement_id);
CREATE INDEX idx_projects_assigned_to ON projects(assigned_to);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_end_date ON projects(end_date);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insérer quelques projets de démonstration
INSERT INTO projects (
    name, 
    description, 
    status, 
    priority, 
    start_date, 
    end_date, 
    budget,
    progress_percentage,
    estimated_hours,
    project_type,
    tags,
    notes
) VALUES 
(
    'Audit Sécurité Incendie - Centre Commercial',
    'Audit complet de sécurité incendie pour un centre commercial de 15000m²',
    'active',
    'high',
    '2024-01-15',
    '2024-03-15',
    25000.00,
    35,
    120,
    'Audit Sécurité',
    ARRAY['incendie', 'commercial', 'urgent'],
    'Projet prioritaire avec deadline stricte'
),
(
    'Mise en Conformité Accessibilité - École',
    'Mise en conformité accessibilité PMR pour établissement scolaire',
    'active',
    'medium',
    '2024-02-01',
    '2024-05-30',
    18500.00,
    60,
    80,
    'Accessibilité',
    ARRAY['accessibilité', 'école', 'pmr'],
    'Travaux à réaliser pendant les vacances scolaires'
),
(
    'Diagnostic ERP - Hôtel 4 étoiles',
    'Diagnostic complet ERP pour hôtel 4 étoiles 150 chambres',
    'draft',
    'medium',
    '2024-03-01',
    '2024-04-15',
    12000.00,
    0,
    60,
    'Diagnostic ERP',
    ARRAY['erp', 'hôtellerie', 'diagnostic'],
    'En attente de validation client'
),
(
    'Formation Sécurité - Entreprise Industrielle',
    'Formation du personnel aux consignes de sécurité incendie',
    'completed',
    'low',
    '2023-11-01',
    '2023-12-15',
    8500.00,
    100,
    40,
    'Formation',
    ARRAY['formation', 'industrie', 'personnel'],
    'Formation réalisée avec succès - 150 personnes formées'
);

-- Créer une vue pour les statistiques des projets
CREATE OR REPLACE VIEW project_stats AS
SELECT 
    status,
    priority,
    COUNT(*) as count,
    AVG(progress_percentage) as avg_progress,
    SUM(budget) as total_budget,
    SUM(estimated_hours) as total_estimated_hours,
    SUM(actual_hours) as total_actual_hours
FROM projects 
WHERE is_archived = FALSE
GROUP BY status, priority;

-- Fonction pour calculer le taux de completion des projets
CREATE OR REPLACE FUNCTION get_project_completion_rate()
RETURNS DECIMAL AS $$
DECLARE
    total_projects INTEGER;
    completed_projects INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_projects FROM projects WHERE is_archived = FALSE;
    SELECT COUNT(*) INTO completed_projects FROM projects WHERE status = 'completed' AND is_archived = FALSE;
    
    IF total_projects = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND((completed_projects::DECIMAL / total_projects::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE projects IS 'Table des projets ERP PrevHub avec gestion avancée';
COMMENT ON COLUMN projects.status IS 'Statut du projet: draft, active, on_hold, completed, cancelled';
COMMENT ON COLUMN projects.priority IS 'Priorité du projet: low, medium, high, urgent';
COMMENT ON COLUMN projects.progress_percentage IS 'Pourcentage d''avancement du projet (0-100)';
COMMENT ON COLUMN projects.tags IS 'Tags pour la catégorisation et recherche';

