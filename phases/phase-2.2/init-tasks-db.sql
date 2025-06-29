-- Script de base de données ERP PrevHub - Phase 2.2
-- Module Tâches avec workflow

-- Extension pour la recherche textuelle et les types avancés
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table principale des tâches
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Classification et organisation
    category VARCHAR(100),
    type VARCHAR(50) DEFAULT 'task', -- task, milestone, epic, story
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent, critical
    status VARCHAR(50) DEFAULT 'todo', -- todo, in_progress, review, testing, done, cancelled, blocked
    
    -- Planification et échéances
    start_date DATE,
    due_date DATE,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2) DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Relations hiérarchiques
    parent_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    epic_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- Relations ERP
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    etablissement_id INTEGER REFERENCES etablissements(id) ON DELETE SET NULL,
    document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    
    -- Assignation et responsabilités
    created_by INTEGER NOT NULL, -- ID utilisateur créateur
    assigned_to INTEGER, -- ID utilisateur assigné principal
    reporter_id INTEGER, -- ID utilisateur rapporteur
    
    -- Workflow et automatisation
    workflow_id INTEGER,
    current_workflow_step INTEGER DEFAULT 1,
    workflow_status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, cancelled
    auto_transition BOOLEAN DEFAULT false,
    
    -- Métadonnées et tags
    tags TEXT[],
    labels JSONB, -- Labels colorés personnalisables
    custom_fields JSONB, -- Champs personnalisés configurables
    
    -- Suivi et métriques
    story_points INTEGER, -- Points d'effort (Scrum/Agile)
    business_value INTEGER, -- Valeur métier (1-100)
    risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high
    complexity VARCHAR(20) DEFAULT 'simple', -- simple, medium, complex
    
    -- Dates et historique
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT NOW(),
    
    -- Notifications et alertes
    notification_sent BOOLEAN DEFAULT false,
    escalation_level INTEGER DEFAULT 0,
    escalation_date TIMESTAMP,
    
    -- Archivage et suppression
    is_archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP,
    archived_by INTEGER
);

-- Table des assignations multiples
CREATE TABLE task_assignments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    role VARCHAR(50) DEFAULT 'assignee', -- assignee, reviewer, observer, approver
    assigned_by INTEGER NOT NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, completed
    workload_percentage INTEGER DEFAULT 100 CHECK (workload_percentage > 0 AND workload_percentage <= 100),
    
    UNIQUE(task_id, user_id, role)
);

-- Table des dépendances entre tâches
CREATE TABLE task_dependencies (
    id SERIAL PRIMARY KEY,
    predecessor_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    successor_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'finish_to_start', -- finish_to_start, start_to_start, finish_to_finish, start_to_finish
    lag_days INTEGER DEFAULT 0, -- Délai en jours entre les tâches
    is_critical BOOLEAN DEFAULT false, -- Dépendance critique (chemin critique)
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER NOT NULL,
    
    UNIQUE(predecessor_task_id, successor_task_id),
    CHECK(predecessor_task_id != successor_task_id)
);

-- Table des workflows de tâches
CREATE TABLE task_workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50), -- development, support, approval, review
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Configuration du workflow
    steps JSONB NOT NULL, -- Définition des étapes du workflow
    transitions JSONB NOT NULL, -- Règles de transition entre étapes
    auto_rules JSONB, -- Règles d'automatisation
    notification_rules JSONB, -- Règles de notification
    
    -- Métadonnées
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des étapes de workflow
CREATE TABLE workflow_steps (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES task_workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- manual, automatic, approval, review, notification
    
    -- Configuration de l'étape
    required_role VARCHAR(50), -- Rôle requis pour cette étape
    required_permissions TEXT[], -- Permissions requises
    auto_transition_conditions JSONB, -- Conditions pour transition automatique
    
    -- Actions et notifications
    entry_actions JSONB, -- Actions à l'entrée de l'étape
    exit_actions JSONB, -- Actions à la sortie de l'étape
    notification_config JSONB, -- Configuration des notifications
    
    -- Contraintes temporelles
    min_duration_hours INTEGER, -- Durée minimale en heures
    max_duration_hours INTEGER, -- Durée maximale en heures
    sla_hours INTEGER, -- SLA en heures
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table des commentaires et activités
CREATE TABLE task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    parent_comment_id INTEGER REFERENCES task_comments(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'comment', -- comment, status_change, assignment, time_log, attachment
    
    -- Métadonnées du commentaire
    is_internal BOOLEAN DEFAULT false, -- Commentaire interne ou visible au client
    is_system BOOLEAN DEFAULT false, -- Commentaire généré par le système
    
    -- Données structurées pour les commentaires système
    system_data JSONB, -- Données pour les commentaires automatiques
    
    -- Temps et effort
    time_spent_minutes INTEGER, -- Temps passé en minutes
    
    -- Utilisateur et dates
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Réactions et interactions
    reactions JSONB, -- Réactions emoji des utilisateurs
    mentions INTEGER[], -- IDs des utilisateurs mentionnés
    
    -- Archivage
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by INTEGER
);

-- Table des pièces jointes de tâches
CREATE TABLE task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    
    -- Informations du fichier
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- Métadonnées
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    
    -- Utilisateur et dates
    uploaded_by INTEGER NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Table des templates de tâches
CREATE TABLE task_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- Template de tâche
    template_data JSONB NOT NULL, -- Structure complète de la tâche template
    
    -- Workflow associé
    default_workflow_id INTEGER REFERENCES task_workflows(id) ON DELETE SET NULL,
    
    -- Configuration
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false, -- Template partagé ou privé
    
    -- Utilisation
    usage_count INTEGER DEFAULT 0,
    
    -- Métadonnées
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des notifications de tâches
CREATE TABLE task_notifications (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    
    -- Type et contenu de notification
    notification_type VARCHAR(50) NOT NULL, -- assigned, due_soon, overdue, status_change, comment, mention
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    -- Données structurées
    data JSONB, -- Données additionnelles de la notification
    
    -- État de la notification
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    
    -- Canaux de notification
    channels TEXT[] DEFAULT ARRAY['web'], -- web, email, sms, slack, teams
    
    -- Métadonnées
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Table des métriques et analytics
CREATE TABLE task_metrics (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER,
    
    -- Type de métrique
    metric_type VARCHAR(50) NOT NULL, -- time_spent, status_change, view, edit, comment
    metric_value DECIMAL(10,2) NOT NULL,
    metric_unit VARCHAR(20), -- minutes, hours, days, count
    
    -- Contexte
    context JSONB, -- Contexte additionnel de la métrique
    
    -- Date et période
    recorded_at TIMESTAMP DEFAULT NOW(),
    period_start TIMESTAMP,
    period_end TIMESTAMP
);

-- Table des sprints et itérations (Agile)
CREATE TABLE sprints (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Planification
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    capacity_hours INTEGER, -- Capacité totale en heures
    
    -- État
    status VARCHAR(20) DEFAULT 'planned', -- planned, active, completed, cancelled
    
    -- Objectifs et métriques
    goal TEXT,
    velocity_target INTEGER, -- Vélocité cible en story points
    velocity_actual INTEGER, -- Vélocité réelle
    
    -- Relations
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Métadonnées
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table de liaison tâches-sprints
CREATE TABLE sprint_tasks (
    id SERIAL PRIMARY KEY,
    sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- Planification dans le sprint
    planned_story_points INTEGER,
    planned_hours DECIMAL(5,2),
    
    -- Réalisation
    actual_story_points INTEGER,
    actual_hours DECIMAL(5,2),
    
    -- Dates
    added_to_sprint_at TIMESTAMP DEFAULT NOW(),
    removed_from_sprint_at TIMESTAMP,
    
    UNIQUE(sprint_id, task_id)
);

-- Index pour les performances
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_company_id ON tasks(company_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_parent_task ON tasks(parent_task_id);
CREATE INDEX idx_tasks_workflow ON tasks(workflow_id, current_workflow_step);

-- Index pour la recherche textuelle
CREATE INDEX idx_tasks_search ON tasks USING gin(
    (to_tsvector('french', coalesce(title, '')) || 
     to_tsvector('french', coalesce(description, '')))
);

-- Index pour les assignations
CREATE INDEX idx_task_assignments_user ON task_assignments(user_id);
CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_status ON task_assignments(status);

-- Index pour les dépendances
CREATE INDEX idx_task_dependencies_predecessor ON task_dependencies(predecessor_task_id);
CREATE INDEX idx_task_dependencies_successor ON task_dependencies(successor_task_id);

-- Index pour les commentaires
CREATE INDEX idx_task_comments_task ON task_comments(task_id);
CREATE INDEX idx_task_comments_created_by ON task_comments(created_by);
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at);

-- Index pour les notifications
CREATE INDEX idx_task_notifications_user ON task_notifications(user_id);
CREATE INDEX idx_task_notifications_task ON task_notifications(task_id);
CREATE INDEX idx_task_notifications_read ON task_notifications(is_read);
CREATE INDEX idx_task_notifications_type ON task_notifications(notification_type);

-- Index pour les métriques
CREATE INDEX idx_task_metrics_task ON task_metrics(task_id);
CREATE INDEX idx_task_metrics_user ON task_metrics(user_id);
CREATE INDEX idx_task_metrics_type ON task_metrics(metric_type);
CREATE INDEX idx_task_metrics_date ON task_metrics(recorded_at);

-- Index pour les sprints
CREATE INDEX idx_sprints_status ON sprints(status);
CREATE INDEX idx_sprints_dates ON sprints(start_date, end_date);
CREATE INDEX idx_sprint_tasks_sprint ON sprint_tasks(sprint_id);
CREATE INDEX idx_sprint_tasks_task ON sprint_tasks(task_id);

-- Triggers pour la mise à jour automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_workflows_updated_at BEFORE UPDATE ON task_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON task_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON sprints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour mettre à jour last_activity_at
CREATE OR REPLACE FUNCTION update_task_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tasks SET last_activity_at = NOW() WHERE id = NEW.task_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_task_activity_on_comment AFTER INSERT ON task_comments
    FOR EACH ROW EXECUTE FUNCTION update_task_activity();

CREATE TRIGGER update_task_activity_on_assignment AFTER INSERT ON task_assignments
    FOR EACH ROW EXECUTE FUNCTION update_task_activity();

-- Fonction pour la recherche de tâches
CREATE OR REPLACE FUNCTION search_tasks(
    search_term TEXT,
    user_id INTEGER DEFAULT NULL,
    status_filter TEXT DEFAULT NULL,
    priority_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    id INTEGER,
    title VARCHAR(255),
    description TEXT,
    status VARCHAR(50),
    priority VARCHAR(20),
    assigned_to INTEGER,
    due_date DATE,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.assigned_to,
        t.due_date,
        ts_rank(
            to_tsvector('french', coalesce(t.title, '') || ' ' || coalesce(t.description, '')),
            plainto_tsquery('french', search_term)
        ) as relevance
    FROM tasks t
    LEFT JOIN task_assignments ta ON t.id = ta.task_id
    WHERE 
        (search_term IS NULL OR 
         to_tsvector('french', coalesce(t.title, '') || ' ' || coalesce(t.description, ''))
         @@ plainto_tsquery('french', search_term))
        AND (user_id IS NULL OR t.assigned_to = user_id OR ta.user_id = user_id)
        AND (status_filter IS NULL OR t.status = status_filter)
        AND (priority_filter IS NULL OR t.priority = priority_filter)
        AND t.is_archived = false
    GROUP BY t.id, t.title, t.description, t.status, t.priority, t.assigned_to, t.due_date, relevance
    ORDER BY relevance DESC, t.due_date ASC NULLS LAST
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques des tâches
CREATE OR REPLACE FUNCTION get_task_stats(user_id INTEGER DEFAULT NULL)
RETURNS TABLE(
    total_tasks BIGINT,
    tasks_by_status JSONB,
    tasks_by_priority JSONB,
    overdue_tasks BIGINT,
    due_today BIGINT,
    due_this_week BIGINT,
    avg_completion_time DECIMAL,
    productivity_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM tasks t 
         LEFT JOIN task_assignments ta ON t.id = ta.task_id
         WHERE (user_id IS NULL OR t.assigned_to = user_id OR ta.user_id = user_id)
         AND t.is_archived = false) as total_tasks,
        
        (SELECT jsonb_object_agg(status, count) 
         FROM (SELECT t.status, COUNT(*) as count 
               FROM tasks t
               LEFT JOIN task_assignments ta ON t.id = ta.task_id
               WHERE (user_id IS NULL OR t.assigned_to = user_id OR ta.user_id = user_id)
               AND t.is_archived = false
               GROUP BY t.status) status_stats) as tasks_by_status,
        
        (SELECT jsonb_object_agg(priority, count) 
         FROM (SELECT t.priority, COUNT(*) as count 
               FROM tasks t
               LEFT JOIN task_assignments ta ON t.id = ta.task_id
               WHERE (user_id IS NULL OR t.assigned_to = user_id OR ta.user_id = user_id)
               AND t.is_archived = false
               GROUP BY t.priority) priority_stats) as tasks_by_priority,
        
        (SELECT COUNT(*) FROM tasks t
         LEFT JOIN task_assignments ta ON t.id = ta.task_id
         WHERE t.due_date < CURRENT_DATE 
         AND t.status NOT IN ('done', 'cancelled')
         AND (user_id IS NULL OR t.assigned_to = user_id OR ta.user_id = user_id)
         AND t.is_archived = false) as overdue_tasks,
        
        (SELECT COUNT(*) FROM tasks t
         LEFT JOIN task_assignments ta ON t.id = ta.task_id
         WHERE t.due_date = CURRENT_DATE 
         AND t.status NOT IN ('done', 'cancelled')
         AND (user_id IS NULL OR t.assigned_to = user_id OR ta.user_id = user_id)
         AND t.is_archived = false) as due_today,
        
        (SELECT COUNT(*) FROM tasks t
         LEFT JOIN task_assignments ta ON t.id = ta.task_id
         WHERE t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         AND t.status NOT IN ('done', 'cancelled')
         AND (user_id IS NULL OR t.assigned_to = user_id OR ta.user_id = user_id)
         AND t.is_archived = false) as due_this_week,
        
        (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600)::DECIMAL, 2)
         FROM tasks t
         LEFT JOIN task_assignments ta ON t.id = ta.task_id
         WHERE t.status = 'done' 
         AND t.completed_at IS NOT NULL
         AND (user_id IS NULL OR t.assigned_to = user_id OR ta.user_id = user_id)
         AND t.created_at > NOW() - INTERVAL '30 days') as avg_completion_time,
        
        (SELECT ROUND(
            (COUNT(CASE WHEN t.status = 'done' AND t.due_date >= t.completed_at::date THEN 1 END)::DECIMAL / 
             NULLIF(COUNT(CASE WHEN t.status = 'done' THEN 1 END), 0)) * 100, 2)
         FROM tasks t
         LEFT JOIN task_assignments ta ON t.id = ta.task_id
         WHERE (user_id IS NULL OR t.assigned_to = user_id OR ta.user_id = user_id)
         AND t.created_at > NOW() - INTERVAL '30 days') as productivity_score;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer le chemin critique
CREATE OR REPLACE FUNCTION calculate_critical_path(project_id INTEGER)
RETURNS TABLE(
    task_id INTEGER,
    task_title VARCHAR(255),
    earliest_start DATE,
    earliest_finish DATE,
    latest_start DATE,
    latest_finish DATE,
    slack_days INTEGER,
    is_critical BOOLEAN
) AS $$
BEGIN
    -- Implémentation simplifiée du calcul du chemin critique
    -- En production, utiliser un algorithme plus sophistiqué
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        COALESCE(t.start_date, CURRENT_DATE) as earliest_start,
        COALESCE(t.due_date, CURRENT_DATE + INTERVAL '1 day') as earliest_finish,
        COALESCE(t.start_date, CURRENT_DATE) as latest_start,
        COALESCE(t.due_date, CURRENT_DATE + INTERVAL '1 day') as latest_finish,
        0 as slack_days,
        true as is_critical
    FROM tasks t
    WHERE t.project_id = calculate_critical_path.project_id
    AND t.is_archived = false
    ORDER BY t.due_date;
END;
$$ LANGUAGE plpgsql;

-- Vue pour les tâches enrichies
CREATE VIEW tasks_enriched AS
SELECT 
    t.*,
    -- Informations d'assignation
    (SELECT COUNT(*) FROM task_assignments ta WHERE ta.task_id = t.id AND ta.status = 'accepted') as assignees_count,
    (SELECT string_agg(ta.user_id::text, ',') FROM task_assignments ta WHERE ta.task_id = t.id AND ta.status = 'accepted') as assignee_ids,
    
    -- Informations de projet
    p.name as project_name,
    c.name as company_name,
    e.name as etablissement_name,
    
    -- Métriques
    (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id AND tc.is_deleted = false) as comments_count,
    (SELECT COUNT(*) FROM task_attachments ta WHERE ta.task_id = t.id) as attachments_count,
    (SELECT COUNT(*) FROM tasks sub WHERE sub.parent_task_id = t.id) as subtasks_count,
    (SELECT COUNT(*) FROM task_dependencies td WHERE td.predecessor_task_id = t.id OR td.successor_task_id = t.id) as dependencies_count,
    
    -- Temps et effort
    (SELECT SUM(tc.time_spent_minutes) FROM task_comments tc WHERE tc.task_id = t.id AND tc.time_spent_minutes IS NOT NULL) as total_time_spent_minutes,
    
    -- État et progression
    CASE 
        WHEN t.due_date < CURRENT_DATE AND t.status NOT IN ('done', 'cancelled') THEN 'overdue'
        WHEN t.due_date = CURRENT_DATE AND t.status NOT IN ('done', 'cancelled') THEN 'due_today'
        WHEN t.due_date BETWEEN CURRENT_DATE + INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '3 days' AND t.status NOT IN ('done', 'cancelled') THEN 'due_soon'
        ELSE 'normal'
    END as urgency_status,
    
    -- Workflow
    tw.name as workflow_name,
    ws.step_name as current_step_name
    
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN companies c ON t.company_id = c.id
LEFT JOIN etablissements e ON t.etablissement_id = e.id
LEFT JOIN task_workflows tw ON t.workflow_id = tw.id
LEFT JOIN workflow_steps ws ON tw.id = ws.workflow_id AND ws.step_number = t.current_workflow_step
WHERE t.is_archived = false;

-- Insertion des workflows par défaut
INSERT INTO task_workflows (name, description, category, is_default, steps, transitions, created_by) VALUES
(
    'Workflow Standard',
    'Workflow par défaut pour les tâches standard',
    'general',
    true,
    '[
        {"step": 1, "name": "À faire", "type": "manual"},
        {"step": 2, "name": "En cours", "type": "manual"},
        {"step": 3, "name": "En révision", "type": "manual"},
        {"step": 4, "name": "Terminé", "type": "manual"}
    ]',
    '[
        {"from": 1, "to": 2, "condition": "status_change", "trigger": "manual"},
        {"from": 2, "to": 3, "condition": "completion_100", "trigger": "auto"},
        {"from": 3, "to": 4, "condition": "approval", "trigger": "manual"},
        {"from": 3, "to": 2, "condition": "rejection", "trigger": "manual"}
    ]',
    1
),
(
    'Workflow Développement',
    'Workflow pour les tâches de développement',
    'development',
    false,
    '[
        {"step": 1, "name": "Backlog", "type": "manual"},
        {"step": 2, "name": "En développement", "type": "manual"},
        {"step": 3, "name": "Code Review", "type": "approval"},
        {"step": 4, "name": "Tests", "type": "manual"},
        {"step": 5, "name": "Déployé", "type": "automatic"}
    ]',
    '[
        {"from": 1, "to": 2, "condition": "assignment", "trigger": "manual"},
        {"from": 2, "to": 3, "condition": "completion_100", "trigger": "auto"},
        {"from": 3, "to": 4, "condition": "approval", "trigger": "manual"},
        {"from": 3, "to": 2, "condition": "rejection", "trigger": "manual"},
        {"from": 4, "to": 5, "condition": "tests_passed", "trigger": "auto"}
    ]',
    1
),
(
    'Workflow Support',
    'Workflow pour les tickets de support client',
    'support',
    false,
    '[
        {"step": 1, "name": "Nouveau", "type": "automatic"},
        {"step": 2, "name": "Assigné", "type": "manual"},
        {"step": 3, "name": "En cours", "type": "manual"},
        {"step": 4, "name": "Résolu", "type": "manual"},
        {"step": 5, "name": "Fermé", "type": "automatic"}
    ]',
    '[
        {"from": 1, "to": 2, "condition": "assignment", "trigger": "auto"},
        {"from": 2, "to": 3, "condition": "start_work", "trigger": "manual"},
        {"from": 3, "to": 4, "condition": "resolution", "trigger": "manual"},
        {"from": 4, "to": 5, "condition": "customer_approval", "trigger": "auto"},
        {"from": 4, "to": 3, "condition": "customer_rejection", "trigger": "auto"}
    ]',
    1
);

-- Insertion des étapes de workflow
INSERT INTO workflow_steps (workflow_id, step_number, step_name, step_type, sla_hours) VALUES
-- Workflow Standard
(1, 1, 'À faire', 'manual', NULL),
(1, 2, 'En cours', 'manual', 48),
(1, 3, 'En révision', 'manual', 24),
(1, 4, 'Terminé', 'manual', NULL),

-- Workflow Développement
(2, 1, 'Backlog', 'manual', NULL),
(2, 2, 'En développement', 'manual', 72),
(2, 3, 'Code Review', 'approval', 24),
(2, 4, 'Tests', 'manual', 48),
(2, 5, 'Déployé', 'automatic', NULL),

-- Workflow Support
(3, 1, 'Nouveau', 'automatic', 2),
(3, 2, 'Assigné', 'manual', 4),
(3, 3, 'En cours', 'manual', 24),
(3, 4, 'Résolu', 'manual', 48),
(3, 5, 'Fermé', 'automatic', NULL);

-- Insertion des templates de tâches
INSERT INTO task_templates (name, description, category, template_data, default_workflow_id, created_by) VALUES
(
    'Tâche de développement',
    'Template pour les tâches de développement logiciel',
    'development',
    '{
        "title": "Développer [Fonctionnalité]",
        "description": "## Objectif\n[Décrire l''objectif de la fonctionnalité]\n\n## Spécifications\n- [ ] Spécification 1\n- [ ] Spécification 2\n\n## Critères d''acceptation\n- [ ] Critère 1\n- [ ] Critère 2\n\n## Tests\n- [ ] Tests unitaires\n- [ ] Tests d''intégration",
        "priority": "medium",
        "estimated_hours": 8,
        "story_points": 5,
        "tags": ["développement", "fonctionnalité"],
        "custom_fields": {
            "technology": "",
            "complexity": "medium",
            "impact": "medium"
        }
    }',
    2,
    1
),
(
    'Ticket de support',
    'Template pour les tickets de support client',
    'support',
    '{
        "title": "Support - [Problème client]",
        "description": "## Problème rapporté\n[Description du problème]\n\n## Informations client\n- Client : [Nom du client]\n- Contact : [Email/Téléphone]\n- Urgence : [Faible/Moyenne/Élevée]\n\n## Étapes de reproduction\n1. [Étape 1]\n2. [Étape 2]\n\n## Solution proposée\n[À compléter lors de la résolution]",
        "priority": "medium",
        "estimated_hours": 2,
        "tags": ["support", "client"],
        "custom_fields": {
            "client_tier": "standard",
            "issue_type": "bug",
            "severity": "medium"
        }
    }',
    3,
    1
),
(
    'Tâche de maintenance',
    'Template pour les tâches de maintenance préventive',
    'maintenance',
    '{
        "title": "Maintenance - [Équipement/Système]",
        "description": "## Équipement concerné\n[Nom et référence de l''équipement]\n\n## Type de maintenance\n- [ ] Préventive\n- [ ] Curative\n- [ ] Prédictive\n\n## Opérations à effectuer\n- [ ] Vérification 1\n- [ ] Vérification 2\n- [ ] Nettoyage\n- [ ] Remplacement pièces\n\n## Outils nécessaires\n[Liste des outils]\n\n## Sécurité\n- [ ] EPI requis\n- [ ] Consignation\n- [ ] Procédure sécurité",
        "priority": "medium",
        "estimated_hours": 4,
        "tags": ["maintenance", "équipement"],
        "custom_fields": {
            "equipment_id": "",
            "maintenance_type": "preventive",
            "location": ""
        }
    }',
    1,
    1
);

-- Données de démonstration
INSERT INTO tasks (
    title, description, category, type, priority, status, 
    start_date, due_date, estimated_hours, completion_percentage,
    project_id, company_id, assigned_to, created_by, workflow_id
) VALUES
(
    'Mise en place du système de surveillance',
    'Installation et configuration du nouveau système de surveillance pour le centre commercial Atlantis. Inclut la pose des caméras, configuration du serveur et formation du personnel.',
    'installation',
    'task',
    'high',
    'in_progress',
    '2024-06-25',
    '2024-07-05',
    40.0,
    60,
    1,
    1,
    1,
    1,
    1
),
(
    'Audit de sécurité incendie - Hôtel Le Grand Palais',
    'Réalisation de l''audit annuel de sécurité incendie conformément aux réglementations en vigueur. Vérification des équipements, mise à jour des plans d''évacuation.',
    'audit',
    'task',
    'urgent',
    'todo',
    '2024-07-01',
    '2024-07-10',
    16.0,
    0,
    2,
    2,
    1,
    1,
    1
),
(
    'Formation du personnel - Clinique Sainte-Marie',
    'Formation du personnel médical et administratif sur les nouvelles procédures de sécurité et d''urgence. Sessions théoriques et pratiques.',
    'formation',
    'task',
    'medium',
    'review',
    '2024-06-20',
    '2024-06-30',
    24.0,
    90,
    3,
    3,
    1,
    1,
    1
),
(
    'Installation équipements pédagogiques',
    'Installation et mise en service des nouveaux équipements pédagogiques dans les ateliers du lycée technique. Configuration et tests de fonctionnement.',
    'installation',
    'task',
    'medium',
    'done',
    '2024-06-15',
    '2024-06-25',
    32.0,
    100,
    4,
    4,
    1,
    1,
    1
),
(
    'Étude d''extension - Usine Métallurgie Provence',
    'Réalisation de l''étude de faisabilité pour l''extension de l''usine. Analyse structurelle, impact environnemental et estimation des coûts.',
    'etude',
    'epic',
    'high',
    'in_progress',
    '2024-06-10',
    '2024-07-15',
    80.0,
    45,
    5,
    5,
    1,
    1,
    2
),
(
    'Maintenance préventive - Centre Commercial Atlantis',
    'Maintenance préventive trimestrielle des systèmes de climatisation, éclairage et sécurité du centre commercial.',
    'maintenance',
    'task',
    'medium',
    'todo',
    '2024-07-08',
    '2024-07-12',
    20.0,
    0,
    1,
    1,
    1,
    1,
    1
),
(
    'Support technique - Problème réseau Hôtel',
    'Résolution du problème de connectivité réseau dans les chambres de l''hôtel. Diagnostic et réparation urgente.',
    'support',
    'task',
    'urgent',
    'in_progress',
    '2024-06-28',
    '2024-06-29',
    8.0,
    75,
    2,
    2,
    1,
    1,
    3
);

-- Insertion des assignations
INSERT INTO task_assignments (task_id, user_id, role, assigned_by, status, workload_percentage) VALUES
(1, 1, 'assignee', 1, 'accepted', 100),
(2, 1, 'assignee', 1, 'accepted', 100),
(3, 1, 'assignee', 1, 'accepted', 100),
(4, 1, 'assignee', 1, 'accepted', 100),
(5, 1, 'assignee', 1, 'accepted', 100),
(6, 1, 'assignee', 1, 'pending', 100),
(7, 1, 'assignee', 1, 'accepted', 100);

-- Insertion des dépendances
INSERT INTO task_dependencies (predecessor_task_id, successor_task_id, dependency_type, created_by) VALUES
(4, 6, 'finish_to_start', 1), -- Installation équipements avant maintenance
(1, 6, 'finish_to_start', 1); -- Surveillance avant maintenance

-- Insertion des commentaires
INSERT INTO task_comments (task_id, content, comment_type, created_by, time_spent_minutes) VALUES
(1, 'Installation des caméras terminée. Configuration du serveur en cours.', 'status_change', 1, 240),
(1, 'Problème de compatibilité résolu. Tests en cours.', 'comment', 1, 60),
(2, 'Audit programmé pour le 1er juillet. Préparation des documents.', 'comment', 1, 30),
(3, 'Première session de formation réalisée avec succès. 15 participants.', 'comment', 1, 480),
(4, 'Installation terminée et validée par le client.', 'status_change', 1, 120),
(5, 'Analyse structurelle en cours. Premiers résultats encourageants.', 'comment', 1, 180),
(7, 'Problème identifié au niveau du switch principal. Remplacement en cours.', 'comment', 1, 90);

-- Insertion des notifications
INSERT INTO task_notifications (task_id, user_id, notification_type, title, message, is_read) VALUES
(2, 1, 'due_soon', 'Tâche à échéance proche', 'L''audit de sécurité incendie est prévu pour demain', false),
(7, 1, 'assigned', 'Nouvelle tâche assignée', 'Support technique - Problème réseau Hôtel vous a été assigné', true),
(6, 1, 'assigned', 'Nouvelle tâche assignée', 'Maintenance préventive - Centre Commercial Atlantis vous a été assigné', false);

-- Insertion des métriques
INSERT INTO task_metrics (task_id, user_id, metric_type, metric_value, metric_unit, recorded_at) VALUES
(1, 1, 'time_spent', 300, 'minutes', NOW() - INTERVAL '1 day'),
(1, 1, 'status_change', 1, 'count', NOW() - INTERVAL '2 days'),
(3, 1, 'time_spent', 480, 'minutes', NOW() - INTERVAL '3 days'),
(4, 1, 'time_spent', 120, 'minutes', NOW() - INTERVAL '5 days'),
(5, 1, 'time_spent', 180, 'minutes', NOW() - INTERVAL '1 day'),
(7, 1, 'time_spent', 90, 'minutes', NOW());

-- Insertion d'un sprint de démonstration
INSERT INTO sprints (name, description, start_date, end_date, capacity_hours, status, goal, project_id, created_by) VALUES
(
    'Sprint Juillet 2024',
    'Sprint de développement pour les projets en cours',
    '2024-07-01',
    '2024-07-14',
    320,
    'active',
    'Finaliser les installations en cours et préparer les maintenances préventives',
    1,
    1
);

-- Liaison des tâches au sprint
INSERT INTO sprint_tasks (sprint_id, task_id, planned_story_points, planned_hours) VALUES
(1, 1, 8, 40),
(1, 2, 5, 16),
(1, 6, 3, 20),
(1, 7, 2, 8);

COMMIT;

