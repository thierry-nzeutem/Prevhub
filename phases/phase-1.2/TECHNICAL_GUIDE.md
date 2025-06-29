# Guide Technique ERP PrevHub - Phase 1.2

## 🏗️ Architecture technique

### Stack technologique
- **Backend**: Node.js 18 + Express.js
- **Base de données**: PostgreSQL 15 avec extensions
- **Frontend**: React 18 + Tailwind CSS
- **Conteneurisation**: Docker + Docker Compose
- **Reverse Proxy**: Nginx avec SSL
- **Authentification**: JWT (JSON Web Tokens)

### Structure du projet
```
/opt/prevhub/
├── backend/                 # API Node.js
│   ├── app.js              # Application principale
│   ├── package.json        # Dépendances
│   ├── Dockerfile          # Image Docker
│   └── .env                # Variables d'environnement
├── frontend/               # Interface React
│   ├── src/
│   │   ├── components/     # Composants React
│   │   │   └── ProjectsManager.jsx
│   │   ├── App.jsx         # Application principale
│   │   └── index.js        # Point d'entrée
│   ├── package.json
│   └── Dockerfile
├── database/               # Scripts SQL
│   ├── init-projects.sql   # Structure projets enrichie
│   └── migrations/         # Migrations futures
├── nginx/                  # Configuration proxy
│   └── nginx.conf
└── docker-compose.full.yml # Orchestration complète
```

## 🔧 API Backend enrichie

### Endpoints disponibles

#### Authentification
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@preveris.fr",
  "password": "password123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "admin@preveris.fr",
    "name": "Admin Prévéris",
    "role": "admin"
  }
}
```

#### Projets avec filtrage avancé
```http
GET /api/projects?search=audit&status=active&priority=high&page=1&limit=10&sort_by=created_at&sort_order=DESC

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Audit Sécurité Incendie",
      "description": "Audit complet...",
      "status": "active",
      "priority": "high",
      "client_name": "Centre Commercial ABC",
      "etablissement_name": "Site Principal",
      "budget": 25000.00,
      "start_date": "2024-01-15",
      "end_date": "2024-03-15",
      "progress_percentage": 35,
      "tags": ["incendie", "commercial", "urgent"],
      "created_at": "2024-01-10T10:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_count": 25,
    "per_page": 10
  }
}
```

#### CRUD Projets (authentification requise)
```http
# Création
POST /api/projects
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Nouveau Projet",
  "description": "Description détaillée",
  "client_id": 123,
  "etablissement_id": 456,
  "status": "draft",
  "priority": "medium",
  "start_date": "2024-02-01",
  "end_date": "2024-04-30",
  "budget": 15000.00,
  "estimated_hours": 80,
  "project_type": "Audit Sécurité",
  "tags": ["incendie", "audit"],
  "notes": "Notes importantes"
}

# Mise à jour
PUT /api/projects/{id}
Authorization: Bearer {token}

# Suppression
DELETE /api/projects/{id}
Authorization: Bearer {token}
```

### Paramètres de filtrage

| Paramètre | Type | Description | Valeurs possibles |
|-----------|------|-------------|-------------------|
| `search` | string | Recherche dans nom/description | Texte libre |
| `status` | string | Filtrage par statut | draft, active, on_hold, completed, cancelled |
| `priority` | string | Filtrage par priorité | low, medium, high, urgent |
| `client_id` | integer | Filtrage par client | ID du client |
| `page` | integer | Numéro de page | >= 1 (défaut: 1) |
| `limit` | integer | Éléments par page | 1-100 (défaut: 10) |
| `sort_by` | string | Champ de tri | created_at, name, status, priority, start_date, end_date |
| `sort_order` | string | Ordre de tri | ASC, DESC (défaut: DESC) |

### Gestion des erreurs

```javascript
// Réponse d'erreur standard
{
  "success": false,
  "error": "Message d'erreur descriptif",
  "code": "ERROR_CODE", // Optionnel
  "details": {} // Optionnel, pour les erreurs de validation
}
```

Codes d'erreur HTTP utilisés :
- `200` : Succès
- `201` : Création réussie
- `400` : Requête invalide
- `401` : Non authentifié
- `403` : Non autorisé
- `404` : Ressource non trouvée
- `500` : Erreur serveur

## 🗄️ Base de données

### Schéma de la table projects enrichie

```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_id INTEGER REFERENCES companies(id),
    etablissement_id INTEGER REFERENCES etablissements(id),
    status VARCHAR(50) DEFAULT 'draft' 
        CHECK (status IN ('draft', 'active', 'on_hold', 'completed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' 
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12,2),
    assigned_to INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    progress_percentage INTEGER DEFAULT 0 
        CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_hours INTEGER,
    actual_hours INTEGER DEFAULT 0,
    project_type VARCHAR(100),
    tags TEXT[],
    notes TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP,
    archived_by INTEGER
);
```

### Index de performance

```sql
-- Index principaux pour les requêtes fréquentes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_etablissement_id ON projects(etablissement_id);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_end_date ON projects(end_date);

-- Index composé pour les filtres multiples
CREATE INDEX idx_projects_status_priority ON projects(status, priority);
CREATE INDEX idx_projects_client_dates ON projects(client_id, start_date, end_date);
```

### Vues et fonctions utiles

```sql
-- Vue pour les statistiques
CREATE VIEW project_stats AS
SELECT 
    status,
    priority,
    COUNT(*) as count,
    AVG(progress_percentage) as avg_progress,
    SUM(budget) as total_budget
FROM projects 
WHERE is_archived = FALSE
GROUP BY status, priority;

-- Fonction pour le taux de completion
CREATE FUNCTION get_project_completion_rate()
RETURNS DECIMAL AS $$
DECLARE
    total_projects INTEGER;
    completed_projects INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_projects FROM projects WHERE is_archived = FALSE;
    SELECT COUNT(*) INTO completed_projects FROM projects WHERE status = 'completed';
    
    IF total_projects = 0 THEN RETURN 0; END IF;
    
    RETURN ROUND((completed_projects::DECIMAL / total_projects::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;
```

## ⚛️ Composant React ProjectsManager

### Structure du composant

```jsx
const ProjectsManager = () => {
  // États principaux
  const [projects, setProjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [etablissements, setEtablissements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États pour les filtres
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    client_id: '',
    page: 1,
    limit: 10,
    sort_by: 'created_at',
    sort_order: 'DESC'
  });
  
  // États pour le modal
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({...});
  
  // Fonctions principales
  const loadProjects = async () => { /* ... */ };
  const handleCreateProject = () => { /* ... */ };
  const handleEditProject = (project) => { /* ... */ };
  const handleSubmitProject = async (e) => { /* ... */ };
  const handleDeleteProject = async (projectId) => { /* ... */ };
  
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Interface utilisateur */}
    </div>
  );
};
```

### Fonctionnalités implémentées

1. **Liste paginée** avec navigation
2. **Filtres en temps réel** par statut, priorité, client
3. **Recherche instantanée** dans nom et description
4. **Tri personnalisable** par colonnes
5. **Modal de création/édition** avec validation
6. **Actions CRUD** complètes
7. **Badges visuels** pour statuts et priorités
8. **Interface responsive** mobile/desktop

### Intégration dans l'application

```jsx
// Dans App.jsx
import ProjectsManager from './components/ProjectsManager';

const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  const renderPage = () => {
    switch(currentPage) {
      case 'projects':
        return <ProjectsManager />;
      case 'dashboard':
        return <Dashboard />;
      default:
        return <Dashboard />;
    }
  };
  
  return (
    <div className="app">
      <Navigation onPageChange={setCurrentPage} />
      {renderPage()}
    </div>
  );
};
```

## 🔒 Sécurité

### Authentification JWT

```javascript
// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};
```

### Protection CORS

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Validation des données

```javascript
// Exemple de validation pour la création de projet
const validateProjectData = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Le nom du projet est requis');
  }
  
  if (data.status && !['draft', 'active', 'on_hold', 'completed', 'cancelled'].includes(data.status)) {
    errors.push('Statut invalide');
  }
  
  if (data.priority && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
    errors.push('Priorité invalide');
  }
  
  return errors;
};
```

## 🚀 Déploiement

### Prérequis
- Docker et Docker Compose installés
- Accès SSH au serveur
- PostgreSQL avec données Supabase migrées

### Étapes de déploiement

1. **Sauvegarde préventive**
```bash
./deploy.sh
# Choisir option 1 pour déploiement complet
```

2. **Mise à jour manuelle**
```bash
# Base de données
docker exec -i prevhub_postgres psql -U prevhub_user -d prevhub < init-projects.sql

# Backend
docker-compose -f docker-compose.full.yml build backend
docker-compose -f docker-compose.full.yml up -d backend

# Frontend (si nécessaire)
docker-compose -f docker-compose.full.yml build frontend
docker-compose -f docker-compose.full.yml up -d frontend
```

3. **Vérification**
```bash
# Tests automatisés
./test-api.sh

# Vérification manuelle
curl https://217.65.146.10/api/health
curl https://217.65.146.10/api/projects
```

## 🧪 Tests

### Tests automatisés
```bash
# Tests locaux
./test-api.sh

# Tests sur serveur distant
./test-api.sh --remote
```

### Tests manuels
1. **Interface utilisateur**
   - Connexion avec admin@preveris.fr / password123
   - Navigation vers la section Projets
   - Test des filtres et recherche
   - Création/modification/suppression de projets

2. **API directe**
   - Health check : `GET /api/health`
   - Authentification : `POST /api/auth/login`
   - Liste projets : `GET /api/projects`
   - CRUD projets avec authentification

## 📊 Monitoring et logs

### Logs applicatifs
```bash
# Backend
docker logs prevhub_backend

# Frontend
docker logs prevhub_frontend

# Base de données
docker logs prevhub_postgres

# Nginx
docker logs prevhub_nginx
```

### Métriques de performance
- Temps de réponse API < 1s pour health check
- Temps de réponse API < 2s pour liste projets
- Utilisation mémoire backend < 512MB
- Utilisation CPU < 50% en charge normale

## 🔄 Prochaines étapes

### Phase 1.3 - Interface complète
- Intégration du composant ProjectsManager dans l'application
- Tests utilisateur et ajustements UX
- Optimisation des performances frontend

### Phase 1.4 - Gestion clients/établissements
- Interface de gestion des entreprises
- Synchronisation avancée avec données Supabase
- Relations enrichies entre entités

### Améliorations futures
- Cache Redis pour les performances
- Notifications en temps réel
- Export/import de données
- API GraphQL pour les requêtes complexes
- Tests unitaires et d'intégration
- CI/CD automatisé

## 🆘 Dépannage

### Problèmes courants

1. **Backend ne démarre pas**
   - Vérifier les variables d'environnement
   - Contrôler la connectivité PostgreSQL
   - Examiner les logs : `docker logs prevhub_backend`

2. **API retourne 500**
   - Vérifier la structure de la base de données
   - Contrôler les permissions utilisateur PostgreSQL
   - Valider les données d'entrée

3. **Authentification échoue**
   - Vérifier JWT_SECRET dans .env
   - Contrôler les comptes de test
   - Examiner les headers Authorization

4. **Performance dégradée**
   - Vérifier les index de base de données
   - Analyser les requêtes lentes
   - Optimiser les filtres et la pagination

### Commandes de diagnostic
```bash
# État des services
docker-compose -f docker-compose.full.yml ps

# Santé de l'API
curl http://localhost:3000/api/health

# Connectivité base de données
docker exec prevhub_postgres psql -U prevhub_user -d prevhub -c "SELECT COUNT(*) FROM projects;"

# Redémarrage complet
docker-compose -f docker-compose.full.yml down
docker-compose -f docker-compose.full.yml up -d
```

