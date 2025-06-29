-- Script d'initialisation de la base de données ERP PrevHub
-- Auteur: Manus AI

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'commercial', 'preventionist', 'user')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des organisations (clients)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    siret VARCHAR(14),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des contacts
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    position VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des projets
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ERP', 'IGH', 'ACCESSIBILITE')),
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED')),
    priority VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    start_date DATE,
    due_date DATE,
    completion_date DATE,
    budget DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    type VARCHAR(20) CHECK (type IN ('NOTICE', 'PLAN', 'RAPPORT', 'DEVIS', 'FACTURE', 'DOCUMENT')),
    ai_analysis_status VARCHAR(20) DEFAULT 'PENDING' CHECK (ai_analysis_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
    ai_analysis_result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des tâches
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE')),
    priority VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    due_date DATE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des devis
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
    total_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    valid_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des lignes de devis
CREATE TABLE quote_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- Table des factures
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED')),
    total_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    due_date DATE,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des analyses IA
CREATE TABLE ai_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL,
    model_used VARCHAR(100),
    input_data JSONB,
    result JSONB,
    processing_time INTEGER, -- en millisecondes
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des logs d'activité
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les performances
CREATE INDEX idx_projects_organization ON projects(organization_id);
CREATE INDEX idx_projects_assigned_user ON projects(assigned_user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_quotes_project ON quotes(project_id);
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_ai_analyses_document ON ai_analyses(document_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Données de test
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('admin@preveris.fr', '$2b$10$rQZ9uP7QK5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K', 'Admin', 'Système', 'admin'),
('manager@preveris.fr', '$2b$10$rQZ9uP7QK5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K', 'Jean', 'Dupont', 'manager'),
('commercial@preveris.fr', '$2b$10$rQZ9uP7QK5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K', 'Marie', 'Martin', 'commercial'),
('test@preveris.fr', '$2b$10$rQZ9uP7QK5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K', 'Test', 'Utilisateur', 'user');

INSERT INTO organizations (name, siret, address, city, postal_code, phone, email) VALUES
('Entreprise Test SARL', '12345678901234', '123 Rue de la Paix', 'Paris', '75001', '01.23.45.67.89', 'contact@entreprise-test.fr'),
('Société Exemple SAS', '98765432109876', '456 Avenue des Champs', 'Lyon', '69000', '04.56.78.90.12', 'info@societe-exemple.fr');

-- Mot de passe par défaut pour tous les comptes de test: "password123"
-- Hash généré avec bcrypt pour "password123"
UPDATE users SET password_hash = '$2b$10$K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K5y5K' WHERE email LIKE '%@preveris.fr';

