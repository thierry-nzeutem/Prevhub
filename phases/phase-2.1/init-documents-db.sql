-- Script de base de données ERP PrevHub - Phase 2.1
-- Module Documents avec IA

-- Extension pour la recherche textuelle avancée
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Table principale des documents
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 pour déduplication
    
    -- Métadonnées
    category VARCHAR(100),
    tags TEXT[], -- Array de tags
    status VARCHAR(50) DEFAULT 'draft', -- draft, review, approved, archived
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    confidentiality VARCHAR(20) DEFAULT 'internal', -- public, internal, confidential, secret
    
    -- Relations ERP
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    etablissement_id INTEGER REFERENCES etablissements(id) ON DELETE SET NULL,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    parent_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    is_latest_version BOOLEAN DEFAULT true,
    
    -- IA et contenu
    extracted_text TEXT, -- Contenu extrait par OCR/parsing
    ai_summary TEXT, -- Résumé généré par IA
    ai_keywords TEXT[], -- Mots-clés extraits par IA
    ai_category VARCHAR(100), -- Catégorie suggérée par IA
    ai_confidence DECIMAL(3,2), -- Score de confiance IA (0.00-1.00)
    ai_processed_at TIMESTAMP,
    
    -- Métadonnées système
    created_by INTEGER NOT NULL, -- ID utilisateur
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Métadonnées de fichier
    last_accessed_at TIMESTAMP,
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0
);

-- Table des catégories de documents
CREATE TABLE document_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_category_id INTEGER REFERENCES document_categories(id) ON DELETE SET NULL,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Couleur hex pour l'UI
    icon VARCHAR(50) DEFAULT 'FileText', -- Nom de l'icône
    auto_classification_rules JSONB, -- Règles d'auto-classification
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des templates de documents
CREATE TABLE document_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES document_categories(id) ON DELETE SET NULL,
    template_content TEXT, -- Contenu du template (Markdown/HTML)
    template_fields JSONB, -- Champs dynamiques du template
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des commentaires et annotations
CREATE TABLE document_comments (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    parent_comment_id INTEGER REFERENCES document_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'comment', -- comment, annotation, review, approval
    position_data JSONB, -- Position dans le document (page, coordonnées)
    status VARCHAR(20) DEFAULT 'active', -- active, resolved, deleted
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des partages et permissions
CREATE TABLE document_shares (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    shared_with_user INTEGER, -- ID utilisateur
    shared_with_role VARCHAR(50), -- Rôle/groupe
    permission_level VARCHAR(20) NOT NULL, -- read, write, admin
    expires_at TIMESTAMP,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table de l'historique des actions
CREATE TABLE document_history (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- created, updated, viewed, downloaded, shared, deleted
    action_details JSONB, -- Détails de l'action
    user_id INTEGER NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table des workflows de validation
CREATE TABLE document_workflows (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    workflow_name VARCHAR(100) NOT NULL,
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, approved, rejected, cancelled
    assigned_to INTEGER, -- Utilisateur assigné à l'étape actuelle
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des étapes de workflow
CREATE TABLE workflow_steps (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES document_workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- review, approval, notification, auto_action
    assigned_to INTEGER, -- Utilisateur assigné
    required_role VARCHAR(50), -- Rôle requis
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, skipped
    comments TEXT,
    completed_by INTEGER,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table des métriques et analytics
CREATE TABLE document_analytics (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    metric_name VARCHAR(50) NOT NULL, -- views, downloads, shares, time_spent
    metric_value DECIMAL(10,2) NOT NULL,
    metric_date DATE NOT NULL,
    user_id INTEGER,
    additional_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX idx_documents_title ON documents USING gin(to_tsvector('french', title));
CREATE INDEX idx_documents_content ON documents USING gin(to_tsvector('french', extracted_text));
CREATE INDEX idx_documents_tags ON documents USING gin(tags);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_etablissement ON documents(etablissement_id);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_file_hash ON documents(file_hash);

-- Index pour la recherche textuelle avancée
CREATE INDEX idx_documents_search ON documents USING gin(
    (to_tsvector('french', coalesce(title, '')) || 
     to_tsvector('french', coalesce(description, '')) ||
     to_tsvector('french', coalesce(extracted_text, '')) ||
     to_tsvector('french', coalesce(ai_summary, '')))
);

-- Index pour les commentaires
CREATE INDEX idx_comments_document ON document_comments(document_id);
CREATE INDEX idx_comments_parent ON document_comments(parent_comment_id);

-- Index pour l'historique
CREATE INDEX idx_history_document ON document_history(document_id);
CREATE INDEX idx_history_user ON document_history(user_id);
CREATE INDEX idx_history_action ON document_history(action);
CREATE INDEX idx_history_date ON document_history(created_at);

-- Index pour les workflows
CREATE INDEX idx_workflows_document ON document_workflows(document_id);
CREATE INDEX idx_workflows_status ON document_workflows(status);
CREATE INDEX idx_workflows_assigned ON document_workflows(assigned_to);

-- Index pour les analytics
CREATE INDEX idx_analytics_document ON document_analytics(document_id);
CREATE INDEX idx_analytics_date ON document_analytics(metric_date);
CREATE INDEX idx_analytics_metric ON document_analytics(metric_name);

-- Triggers pour la mise à jour automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_categories_updated_at BEFORE UPDATE ON document_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_comments_updated_at BEFORE UPDATE ON document_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_workflows_updated_at BEFORE UPDATE ON document_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour la recherche textuelle avancée
CREATE OR REPLACE FUNCTION search_documents(
    search_term TEXT,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    id INTEGER,
    title VARCHAR(255),
    description TEXT,
    category VARCHAR(100),
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.description,
        d.category,
        ts_rank(
            to_tsvector('french', coalesce(d.title, '') || ' ' || 
                                 coalesce(d.description, '') || ' ' ||
                                 coalesce(d.extracted_text, '') || ' ' ||
                                 coalesce(d.ai_summary, '')),
            plainto_tsquery('french', search_term)
        ) as relevance
    FROM documents d
    WHERE to_tsvector('french', coalesce(d.title, '') || ' ' || 
                                coalesce(d.description, '') || ' ' ||
                                coalesce(d.extracted_text, '') || ' ' ||
                                coalesce(d.ai_summary, ''))
          @@ plainto_tsquery('french', search_term)
    ORDER BY relevance DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques des documents
CREATE OR REPLACE FUNCTION get_document_stats()
RETURNS TABLE(
    total_documents BIGINT,
    total_size_mb DECIMAL(10,2),
    documents_by_category JSONB,
    documents_by_status JSONB,
    recent_activity JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM documents WHERE is_latest_version = true) as total_documents,
        (SELECT ROUND(SUM(file_size)::DECIMAL / 1024 / 1024, 2) FROM documents WHERE is_latest_version = true) as total_size_mb,
        (SELECT jsonb_object_agg(category, count) 
         FROM (SELECT category, COUNT(*) as count 
               FROM documents 
               WHERE is_latest_version = true 
               GROUP BY category) cat_stats) as documents_by_category,
        (SELECT jsonb_object_agg(status, count) 
         FROM (SELECT status, COUNT(*) as count 
               FROM documents 
               WHERE is_latest_version = true 
               GROUP BY status) status_stats) as documents_by_status,
        (SELECT jsonb_agg(jsonb_build_object(
            'action', action,
            'document_title', d.title,
            'user_id', dh.user_id,
            'created_at', dh.created_at
        ))
         FROM document_history dh
         JOIN documents d ON dh.document_id = d.id
         ORDER BY dh.created_at DESC
         LIMIT 10) as recent_activity;
END;
$$ LANGUAGE plpgsql;

-- Vue pour les documents avec informations enrichies
CREATE VIEW documents_enriched AS
SELECT 
    d.*,
    dc.name as category_name,
    dc.color as category_color,
    dc.icon as category_icon,
    p.name as project_name,
    c.name as company_name,
    e.name as etablissement_name,
    (SELECT COUNT(*) FROM document_comments WHERE document_id = d.id AND status = 'active') as comments_count,
    (SELECT COUNT(*) FROM document_shares WHERE document_id = d.id) as shares_count,
    CASE 
        WHEN d.updated_at > NOW() - INTERVAL '1 day' THEN 'new'
        WHEN d.updated_at > NOW() - INTERVAL '7 days' THEN 'recent'
        ELSE 'normal'
    END as freshness
FROM documents d
LEFT JOIN document_categories dc ON d.category = dc.name
LEFT JOIN projects p ON d.project_id = p.id
LEFT JOIN companies c ON d.company_id = c.id
LEFT JOIN etablissements e ON d.etablissement_id = e.id
WHERE d.is_latest_version = true;

-- Insertion des catégories par défaut
INSERT INTO document_categories (name, description, color, icon) VALUES
('Contrats', 'Contrats clients, fournisseurs et partenaires', '#10B981', 'FileContract'),
('Factures', 'Factures émises et reçues', '#F59E0B', 'Receipt'),
('Rapports', 'Rapports d''activité et d''analyse', '#3B82F6', 'FileBarChart'),
('Procédures', 'Procédures internes et modes opératoires', '#8B5CF6', 'FileCheck'),
('Correspondance', 'Emails, courriers et communications', '#06B6D4', 'Mail'),
('Juridique', 'Documents légaux et réglementaires', '#DC2626', 'Scale'),
('Technique', 'Documentation technique et spécifications', '#059669', 'FileCode'),
('RH', 'Documents ressources humaines', '#D97706', 'Users'),
('Marketing', 'Supports marketing et communication', '#EC4899', 'Megaphone'),
('Qualité', 'Documents qualité et certifications', '#7C3AED', 'Award');

-- Insertion des templates par défaut
INSERT INTO document_templates (name, description, category_id, template_content, template_fields, created_by) VALUES
(
    'Rapport d''intervention',
    'Template pour les rapports d''intervention sur site',
    (SELECT id FROM document_categories WHERE name = 'Rapports'),
    '# Rapport d''intervention

## Informations générales
- **Date** : {{date}}
- **Site** : {{site_name}}
- **Intervenant** : {{intervenant}}
- **Durée** : {{duree}}

## Description de l''intervention
{{description}}

## Travaux réalisés
{{travaux_realises}}

## Observations
{{observations}}

## Recommandations
{{recommandations}}

## Signature
{{signature}}',
    '{"fields": [
        {"name": "date", "type": "date", "required": true},
        {"name": "site_name", "type": "text", "required": true},
        {"name": "intervenant", "type": "text", "required": true},
        {"name": "duree", "type": "text", "required": false},
        {"name": "description", "type": "textarea", "required": true},
        {"name": "travaux_realises", "type": "textarea", "required": true},
        {"name": "observations", "type": "textarea", "required": false},
        {"name": "recommandations", "type": "textarea", "required": false},
        {"name": "signature", "type": "text", "required": true}
    ]}',
    1
),
(
    'Procédure qualité',
    'Template pour les procédures qualité',
    (SELECT id FROM document_categories WHERE name = 'Procédures'),
    '# Procédure : {{titre}}

## 1. Objectif
{{objectif}}

## 2. Domaine d''application
{{domaine_application}}

## 3. Responsabilités
{{responsabilites}}

## 4. Procédure détaillée
{{procedure_detaillee}}

## 5. Documents associés
{{documents_associes}}

## 6. Enregistrements
{{enregistrements}}

---
**Version** : {{version}}  
**Date de création** : {{date_creation}}  
**Validé par** : {{validateur}}',
    '{"fields": [
        {"name": "titre", "type": "text", "required": true},
        {"name": "objectif", "type": "textarea", "required": true},
        {"name": "domaine_application", "type": "textarea", "required": true},
        {"name": "responsabilites", "type": "textarea", "required": true},
        {"name": "procedure_detaillee", "type": "textarea", "required": true},
        {"name": "documents_associes", "type": "textarea", "required": false},
        {"name": "enregistrements", "type": "textarea", "required": false},
        {"name": "version", "type": "text", "required": true},
        {"name": "date_creation", "type": "date", "required": true},
        {"name": "validateur", "type": "text", "required": true}
    ]}',
    1
);

-- Données de démonstration
INSERT INTO documents (
    title, description, file_name, file_path, file_size, mime_type, file_hash,
    category, tags, status, priority, project_id, company_id,
    extracted_text, ai_summary, ai_keywords, ai_category, ai_confidence,
    created_by
) VALUES
(
    'Contrat de maintenance - Centre Commercial Atlantis',
    'Contrat annuel de maintenance préventive et curative pour le centre commercial',
    'contrat_maintenance_atlantis_2024.pdf',
    '/documents/contracts/contrat_maintenance_atlantis_2024.pdf',
    2048576,
    'application/pdf',
    'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    'Contrats',
    ARRAY['maintenance', 'centre commercial', 'atlantis', '2024'],
    'approved',
    'high',
    1,
    1,
    'Contrat de maintenance préventive et curative pour les équipements du centre commercial Atlantis. Durée : 12 mois. Interventions mensuelles programmées. Astreinte 24h/7j.',
    'Contrat de maintenance annuel pour le centre commercial Atlantis incluant maintenance préventive mensuelle et curative avec astreinte 24h/7j.',
    ARRAY['maintenance', 'préventive', 'curative', 'astreinte', 'équipements'],
    'Contrats',
    0.95,
    1
),
(
    'Rapport d''audit qualité - Hôtel Le Grand Palais',
    'Rapport d''audit qualité ISO 9001 réalisé sur site',
    'audit_qualite_grand_palais_2024.pdf',
    '/documents/reports/audit_qualite_grand_palais_2024.pdf',
    1536000,
    'application/pdf',
    'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123457',
    'Rapports',
    ARRAY['audit', 'qualité', 'ISO 9001', 'hôtel'],
    'approved',
    'normal',
    2,
    2,
    'Audit qualité ISO 9001 réalisé le 15 mars 2024. Conformité générale satisfaisante. 3 non-conformités mineures identifiées. Plan d''action proposé.',
    'Audit qualité ISO 9001 satisfaisant avec 3 non-conformités mineures et plan d''action défini.',
    ARRAY['audit', 'ISO 9001', 'conformité', 'non-conformités', 'plan d''action'],
    'Rapports',
    0.92,
    1
),
(
    'Procédure de sécurité incendie - Clinique Sainte-Marie',
    'Procédure d''évacuation et de sécurité incendie mise à jour',
    'procedure_securite_incendie_clinique.pdf',
    '/documents/procedures/procedure_securite_incendie_clinique.pdf',
    1024000,
    'application/pdf',
    'c3d4e5f6789012345678901234567890abcdef1234567890abcdef123458',
    'Procédures',
    ARRAY['sécurité', 'incendie', 'évacuation', 'clinique'],
    'approved',
    'urgent',
    3,
    3,
    'Procédure d''évacuation en cas d''incendie. Points de rassemblement définis. Responsables d''évacuation désignés. Exercices trimestriels obligatoires.',
    'Procédure d''évacuation incendie avec points de rassemblement et exercices trimestriels.',
    ARRAY['évacuation', 'incendie', 'rassemblement', 'exercices', 'responsables'],
    'Procédures',
    0.98,
    1
),
(
    'Facture équipements - Lycée Technique Industriel',
    'Facture pour l''installation d''équipements pédagogiques',
    'facture_equipements_lycee_2024.pdf',
    '/documents/invoices/facture_equipements_lycee_2024.pdf',
    512000,
    'application/pdf',
    'd4e5f6789012345678901234567890abcdef1234567890abcdef123459',
    'Factures',
    ARRAY['facture', 'équipements', 'lycée', 'pédagogique'],
    'approved',
    'normal',
    4,
    4,
    'Facture n°2024-0156 du 20 février 2024. Montant : 45 680 € HT. Installation d''équipements pédagogiques en atelier mécanique.',
    'Facture de 45 680 € HT pour installation d''équipements pédagogiques en atelier mécanique.',
    ARRAY['facture', 'équipements', 'pédagogique', 'atelier', 'mécanique'],
    'Factures',
    0.96,
    1
),
(
    'Étude technique - Usine Métallurgie Provence',
    'Étude de faisabilité pour l''extension de l''usine',
    'etude_technique_extension_usine.pdf',
    '/documents/technical/etude_technique_extension_usine.pdf',
    3072000,
    'application/pdf',
    'e5f6789012345678901234567890abcdef1234567890abcdef12345a',
    'Technique',
    ARRAY['étude', 'faisabilité', 'extension', 'usine'],
    'review',
    'high',
    5,
    5,
    'Étude de faisabilité technique et économique pour l''extension de 2000 m² de l''usine. Analyse des contraintes structurelles et environnementales.',
    'Étude de faisabilité pour extension de 2000 m² avec analyse des contraintes techniques et environnementales.',
    ARRAY['faisabilité', 'extension', 'contraintes', 'structurelles', 'environnementales'],
    'Technique',
    0.94,
    1
);

-- Insertion de commentaires de démonstration
INSERT INTO document_comments (document_id, content, comment_type, created_by) VALUES
(1, 'Contrat validé par le service juridique. Aucune modification nécessaire.', 'approval', 1),
(2, 'Les non-conformités mineures ont été corrigées. Audit de suivi prévu en juin.', 'comment', 1),
(3, 'Procédure mise à jour suite aux nouvelles réglementations. Formation du personnel programmée.', 'comment', 1),
(4, 'Facture conforme au devis. Paiement autorisé.', 'approval', 1),
(5, 'Étude très complète. Quelques points à clarifier sur les aspects environnementaux.', 'review', 1);

-- Insertion d'historique de démonstration
INSERT INTO document_history (document_id, action, action_details, user_id, ip_address) VALUES
(1, 'created', '{"version": 1}', 1, '192.168.1.100'),
(1, 'viewed', '{"duration_seconds": 120}', 1, '192.168.1.100'),
(2, 'created', '{"version": 1}', 1, '192.168.1.101'),
(2, 'downloaded', '{"format": "pdf"}', 1, '192.168.1.101'),
(3, 'created', '{"version": 1}', 1, '192.168.1.102'),
(3, 'shared', '{"shared_with": "team_security"}', 1, '192.168.1.102'),
(4, 'created', '{"version": 1}', 1, '192.168.1.103'),
(5, 'created', '{"version": 1}', 1, '192.168.1.104'),
(5, 'updated', '{"changes": ["status"]}', 1, '192.168.1.104');

-- Insertion de workflows de démonstration
INSERT INTO document_workflows (document_id, workflow_name, total_steps, status, assigned_to, created_by) VALUES
(5, 'Validation étude technique', 3, 'in_progress', 1, 1);

INSERT INTO workflow_steps (workflow_id, step_number, step_name, step_type, assigned_to, status) VALUES
(1, 1, 'Révision technique', 'review', 1, 'completed'),
(1, 2, 'Validation budgétaire', 'approval', 1, 'in_progress'),
(1, 3, 'Approbation finale', 'approval', 1, 'pending');

-- Insertion d'analytics de démonstration
INSERT INTO document_analytics (document_id, metric_name, metric_value, metric_date, user_id) VALUES
(1, 'views', 15, CURRENT_DATE, 1),
(1, 'downloads', 3, CURRENT_DATE, 1),
(2, 'views', 8, CURRENT_DATE, 1),
(2, 'downloads', 2, CURRENT_DATE, 1),
(3, 'views', 12, CURRENT_DATE, 1),
(3, 'shares', 1, CURRENT_DATE, 1),
(4, 'views', 5, CURRENT_DATE, 1),
(5, 'views', 20, CURRENT_DATE, 1),
(5, 'downloads', 4, CURRENT_DATE, 1);

COMMIT;

