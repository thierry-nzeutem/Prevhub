# ERP PrevHub - Phase 1.2 - API Projets Enrichies

## 🚀 Améliorations apportées

### Backend Node.js enrichi

#### Nouvelles fonctionnalités API
- **Filtrage avancé** : Recherche par nom, description, statut, priorité, client
- **Pagination intelligente** : Navigation par pages avec compteurs
- **Tri personnalisable** : Tri par date, nom, priorité, statut
- **Relations enrichies** : Jointures avec clients et établissements
- **Authentification JWT** : Sécurisation des endpoints sensibles
- **Validation des données** : Contrôles d'intégrité et de cohérence

#### Endpoints API disponibles

```
GET /api/health                    - Health check avec statut base de données
POST /api/auth/login               - Authentification utilisateur
GET /api/projects                  - Liste paginée avec filtres
POST /api/projects                 - Création de projet (auth requise)
GET /api/projects/:id              - Détail d'un projet avec relations
PUT /api/projects/:id              - Mise à jour (auth requise)
DELETE /api/projects/:id           - Suppression (auth requise)
GET /api/companies                 - Liste des entreprises (données Supabase)
GET /api/etablissements           - Liste des établissements
GET /api/dashboard/stats          - Statistiques pour le tableau de bord
```

#### Paramètres de filtrage disponibles
- `search` : Recherche textuelle dans nom et description
- `status` : Filtrage par statut (draft, active, on_hold, completed, cancelled)
- `priority` : Filtrage par priorité (low, medium, high, urgent)
- `client_id` : Filtrage par client spécifique
- `page` : Numéro de page (défaut: 1)
- `limit` : Nombre d'éléments par page (défaut: 10)
- `sort_by` : Champ de tri (défaut: created_at)
- `sort_order` : Ordre de tri ASC/DESC (défaut: DESC)

### Base de données enrichie

#### Table projects améliorée
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR(255) NOT NULL)
- description (TEXT)
- client_id (INTEGER REFERENCES companies)
- etablissement_id (INTEGER REFERENCES etablissements)
- status (VARCHAR(50) avec contraintes)
- priority (VARCHAR(20) avec contraintes)
- start_date, end_date (DATE)
- budget (DECIMAL(12,2))
- assigned_to, created_by (INTEGER)
- created_at, updated_at (TIMESTAMP)
- progress_percentage (INTEGER 0-100)
- estimated_hours, actual_hours (INTEGER)
- project_type (VARCHAR(100))
- tags (TEXT[] - Array de tags)
- notes (TEXT)
- is_archived, archived_at, archived_by
```

#### Index de performance
- Index sur status, priority, client_id, dates
- Trigger automatique pour updated_at
- Vue project_stats pour les statistiques
- Fonction get_project_completion_rate()

#### Données de démonstration
4 projets d'exemple avec différents statuts et priorités :
- Audit Sécurité Incendie - Centre Commercial (actif, priorité haute)
- Mise en Conformité Accessibilité - École (actif, priorité moyenne)
- Diagnostic ERP - Hôtel 4 étoiles (brouillon, priorité moyenne)
- Formation Sécurité - Entreprise Industrielle (terminé, priorité faible)

### Interface React moderne

#### Composant ProjectsManager
- **Liste paginée** avec filtres en temps réel
- **Recherche instantanée** dans nom et description
- **Filtres multiples** : statut, priorité, client
- **Tri personnalisable** par colonnes
- **Modal de création/édition** avec formulaire complet
- **Actions CRUD** : Créer, Lire, Modifier, Supprimer
- **Badges visuels** pour statuts et priorités
- **Interface responsive** adaptée mobile/desktop

#### Fonctionnalités utilisateur
- Création de projets avec tous les champs
- Édition en place avec pré-remplissage
- Suppression avec confirmation
- Pagination avec navigation
- Recherche en temps réel
- Filtrage par critères multiples
- Affichage des relations (client, établissement)

## 📦 Déploiement

### 1. Mise à jour de la base de données
```bash
# Se connecter au serveur
ssh root@217.65.146.10

# Accéder au conteneur PostgreSQL
docker exec -i prevhub_postgres psql -U prevhub_user -d prevhub < init-projects.sql
```

### 2. Déploiement du backend enrichi
```bash
# Copier les fichiers sur le serveur
scp app.js package.json Dockerfile root@217.65.146.10:/opt/prevhub/backend/

# Reconstruire le conteneur backend
cd /opt/prevhub
docker-compose -f docker-compose.full.yml build backend
docker-compose -f docker-compose.full.yml up -d backend
```

### 3. Intégration du composant React
```bash
# Copier le composant dans le frontend
scp ProjectsManager.jsx root@217.65.146.10:/opt/prevhub/frontend/src/components/

# Modifier App.jsx pour inclure le nouveau composant
# Reconstruire le frontend
docker-compose -f docker-compose.full.yml build frontend
docker-compose -f docker-compose.full.yml up -d frontend
```

### 4. Vérification du déploiement
```bash
# Vérifier les services
docker-compose -f docker-compose.full.yml ps

# Tester les API
curl http://localhost:3000/api/health
curl http://localhost:3000/api/projects

# Vérifier l'interface
curl https://217.65.146.10
```

## 🧪 Tests

### Tests API
```bash
# Health check
curl -X GET http://localhost:3000/api/health

# Liste des projets avec filtres
curl -X GET "http://localhost:3000/api/projects?search=audit&status=active&page=1&limit=5"

# Authentification
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@preveris.fr","password":"password123"}'

# Création de projet (avec token)
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test Projet","description":"Description test","status":"draft"}'
```

### Tests Interface
1. Accéder à https://217.65.146.10
2. Se connecter avec admin@preveris.fr / password123
3. Naviguer vers la section Projets
4. Tester les filtres et la recherche
5. Créer un nouveau projet
6. Modifier un projet existant

## 📊 Métriques et monitoring

### Statistiques disponibles
- Nombre total de projets
- Projets actifs vs terminés
- Répartition par priorité
- Répartition par statut
- Budget total des projets
- Heures estimées vs réelles

### Logs et debugging
```bash
# Logs du backend
docker logs prevhub_backend

# Logs du frontend
docker logs prevhub_frontend

# Logs de la base de données
docker logs prevhub_postgres
```

## 🔄 Prochaines étapes

### Phase 1.3 - Interface de gestion des projets
- Intégration complète du composant ProjectsManager
- Tests utilisateur et ajustements UX
- Optimisation des performances

### Phase 1.4 - Gestion des clients et établissements
- Interface de gestion des entreprises
- Synchronisation avec les données Supabase
- Relations avancées entre entités

### Phase 1.5 - Tests et validation Phase 1
- Tests d'intégration complets
- Validation utilisateur
- Corrections et optimisations

## 🛠️ Support technique

En cas de problème :
1. Vérifier les logs des conteneurs
2. Tester les endpoints API individuellement
3. Vérifier la connectivité base de données
4. Redémarrer les services si nécessaire

```bash
# Redémarrage complet
docker-compose -f docker-compose.full.yml down
docker-compose -f docker-compose.full.yml up -d
```

