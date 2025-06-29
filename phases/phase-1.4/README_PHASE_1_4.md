# ERP PrevHub - Phase 1.4 - Gestion des Clients et Établissements

## 🎯 Vue d'ensemble

La **Phase 1.4** apporte une gestion complète des clients (entreprises et établissements) à l'ERP PrevHub avec une interface moderne, des API enrichies et une intégration seamless avec le système existant.

### ✨ Fonctionnalités principales

- **🏢 Gestion des Entreprises** : Interface complète avec CRUD, filtrage avancé et statistiques
- **🏪 Gestion des Établissements** : Relations avec entreprises parentes et géolocalisation
- **🔗 Relations Enrichies** : Liens avec projets, historique et tableaux de bord
- **📊 Analytics Avancés** : Statistiques détaillées et rapports personnalisés
- **🔍 Recherche Unifiée** : Recherche intelligente cross-entités

## 📁 Structure des fichiers

```
prevhub-phase-1-4/
├── ClientsManager.jsx          # Composant React principal (29KB)
├── clients-api.js              # API backend enrichies (25KB)
├── init-clients-db.sql         # Script de base de données (15KB)
├── App_with_clients.jsx        # Application intégrée (22KB)
├── deploy-phase-1-4.sh         # Script de déploiement automatisé
├── README_PHASE_1_4.md         # Cette documentation
└── PHASE_1_4_SUMMARY.md        # Résumé exécutif
```

## 🚀 Installation et déploiement

### Prérequis

- Serveur avec Docker et Docker Compose
- PostgreSQL opérationnel
- Accès SSH configuré
- ERP PrevHub Phase 1.3 déployé

### Déploiement automatique

```bash
# Déploiement complet automatique
./deploy-phase-1-4.sh --auto

# Test de connexion et prérequis
./deploy-phase-1-4.sh --test

# Déploiement par composant
./deploy-phase-1-4.sh --db-only --auto
./deploy-phase-1-4.sh --backend-only --auto
./deploy-phase-1-4.sh --frontend-only --auto

# Sauvegarde uniquement
./deploy-phase-1-4.sh --backup-only

# Restauration en cas de problème
./deploy-phase-1-4.sh --rollback
```

### Déploiement manuel

1. **Base de données**
   ```bash
   scp init-clients-db.sql root@217.65.146.10:/tmp/
   ssh root@217.65.146.10 "docker exec -i prevhub-postgres psql -U prevhub_user -d prevhub < /tmp/init-clients-db.sql"
   ```

2. **Backend**
   ```bash
   scp clients-api.js root@217.65.146.10:/opt/prevhub/backend/
   ssh root@217.65.146.10 "cd /opt/prevhub && docker-compose restart prevhub-backend"
   ```

3. **Frontend**
   ```bash
   scp ClientsManager.jsx root@217.65.146.10:/opt/prevhub/frontend/src/components/
   scp App_with_clients.jsx root@217.65.146.10:/opt/prevhub/frontend/src/App.jsx
   ssh root@217.65.146.10 "cd /opt/prevhub/frontend && npm run build && cd .. && docker-compose restart prevhub-frontend"
   ```

## 🏢 Module Entreprises

### Fonctionnalités

- **Liste paginée** avec filtres avancés (secteur, taille, localisation)
- **Recherche en temps réel** sur nom, email, ville, description
- **Création/édition** avec formulaire complet (15+ champs)
- **Statistiques enrichies** : établissements, projets, budget total
- **Actions CRUD** complètes avec validation

### Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `name` | String | Nom de l'entreprise (requis) |
| `email` | Email | Email principal |
| `phone` | String | Téléphone principal |
| `address` | Text | Adresse complète |
| `city` | String | Ville |
| `postal_code` | String | Code postal |
| `country` | String | Pays (défaut: France) |
| `sector` | Enum | Secteur d'activité |
| `size` | Enum | Taille (TPE, PME, ETI, GE) |
| `website` | URL | Site web |
| `siret` | String | Numéro SIRET |
| `description` | Text | Description libre |
| `contact_person` | String | Personne de contact |
| `contact_email` | Email | Email de contact |
| `contact_phone` | String | Téléphone de contact |

### Secteurs disponibles

- Industrie
- Commerce  
- Services
- Santé
- Éducation
- Hôtellerie
- Public

## 🏪 Module Établissements

### Fonctionnalités

- **Gestion hiérarchique** avec entreprises parentes
- **Interface dédiée** avec informations spécifiques
- **Relations projets** et statistiques détaillées
- **Géolocalisation** et informations de contact

### Champs spécifiques

| Champ | Type | Description |
|-------|------|-------------|
| `company_id` | Integer | ID de l'entreprise parente |
| `name` | String | Nom de l'établissement |
| Autres champs | - | Identiques aux entreprises |

## 📊 API Endpoints

### Entreprises

```http
GET    /api/companies              # Liste avec filtres et pagination
POST   /api/companies              # Créer une entreprise
GET    /api/companies/:id          # Détail avec statistiques
PUT    /api/companies/:id          # Modifier une entreprise
DELETE /api/companies/:id          # Supprimer une entreprise
```

### Établissements

```http
GET    /api/etablissements         # Liste avec filtres et pagination
POST   /api/etablissements         # Créer un établissement
GET    /api/etablissements/:id     # Détail avec statistiques
PUT    /api/etablissements/:id     # Modifier un établissement
DELETE /api/etablissements/:id     # Supprimer un établissement
```

### Statistiques et recherche

```http
GET    /api/clients/stats          # Statistiques détaillées
GET    /api/clients/search?q=term  # Recherche unifiée
GET    /api/health                 # Health check
```

### Paramètres de filtrage

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| `search` | Recherche textuelle | `?search=hotel` |
| `sector` | Filtrer par secteur | `?sector=Industrie` |
| `size` | Filtrer par taille | `?size=PME` |
| `location` | Filtrer par ville | `?location=Lyon` |
| `page` | Numéro de page | `?page=2` |
| `limit` | Éléments par page | `?limit=20` |
| `sort_by` | Champ de tri | `?sort_by=name` |
| `sort_order` | Ordre de tri | `?sort_order=DESC` |

## 🗄️ Structure de base de données

### Table `companies`

```sql
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'France',
    sector VARCHAR(100),
    size VARCHAR(20),
    website VARCHAR(255),
    siret VARCHAR(20),
    description TEXT,
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table `etablissements`

```sql
CREATE TABLE etablissements (
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
    company_id INTEGER REFERENCES companies(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Index de performance

- Index de recherche textuelle (GIN)
- Index sur les champs de filtrage
- Index composites pour les jointures
- Index sur les clés étrangères

### Vues utiles

- `companies_stats` : Statistiques enrichies des entreprises
- `etablissements_stats` : Statistiques enrichies des établissements

### Fonctions SQL

- `search_clients(term, limit)` : Recherche unifiée
- `get_client_stats(type, id)` : Statistiques détaillées

## 🎨 Interface utilisateur

### Design system

- **Couleurs** : Palette cohérente avec l'identité PrevHub
- **Typographie** : Hiérarchie claire et lisible
- **Composants** : Réutilisables et accessibles
- **Responsive** : Adapté desktop, tablet, mobile

### Composants principaux

1. **ClientsManager** : Composant principal avec onglets
2. **CompanyCard** : Carte d'affichage entreprise
3. **EtablissementCard** : Carte d'affichage établissement
4. **Modal** : Formulaire de création/édition
5. **Filters** : Barre de filtres avancés
6. **Pagination** : Navigation entre pages
7. **Stats** : Cartes de statistiques

### États et interactions

- **Loading** : Indicateurs de chargement
- **Error** : Gestion des erreurs
- **Empty** : États vides avec actions
- **Hover** : Effets de survol
- **Focus** : Accessibilité clavier

## 📈 Données de démonstration

### Entreprises incluses

1. **Centre Commercial Atlantis** (Commerce, GE)
   - 130+ boutiques, Saint-Herblain
   - 2 établissements (Galerie Nord/Sud)

2. **Hôtel Le Grand Palais** (Hôtellerie, PME)
   - 120 chambres, Lyon
   - 2 établissements (Principal/Spa)

3. **Clinique Sainte-Marie** (Santé, ETI)
   - Chirurgie spécialisée, Nantes
   - 2 établissements (Bloc A/B)

4. **Lycée Technique Industriel** (Éducation, Public)
   - Formation industrie, Marseille

5. **Usine Métallurgie Provence** (Industrie, ETI)
   - Transformation métallique, Aix-en-Provence

6. **Résidence Services Seniors** (Services, PME)
   - 80 logements seniors, Bordeaux

## 🔧 Configuration

### Variables d'environnement

```bash
# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prevhub
DB_USER=prevhub_user
DB_PASSWORD=prevhub_password

# JWT
JWT_SECRET=prevhub_secret_key

# API
PORT=3000
NODE_ENV=production
```

### Configuration Docker

```yaml
# docker-compose.yml
services:
  prevhub-backend:
    build: ./backend
    environment:
      - DB_HOST=prevhub-postgres
      - DB_USER=prevhub_user
      - DB_PASSWORD=prevhub_password
      - DB_NAME=prevhub
    depends_on:
      - prevhub-postgres
```

## 🧪 Tests

### Tests automatisés

Le script `deploy-phase-1-4.sh` inclut des tests automatiques :

- Connexion à la base de données
- Disponibilité des API
- Réponse des endpoints
- Intégrité des données

### Tests manuels

1. **Interface** : Navigation, filtres, CRUD
2. **API** : Endpoints, paramètres, réponses
3. **Base de données** : Contraintes, index, performances
4. **Intégration** : Liens avec projets, statistiques

### Commandes de test

```bash
# Test de l'API
curl http://localhost:3000/api/health
curl http://localhost:3000/api/companies
curl http://localhost:3000/api/etablissements
curl http://localhost:3000/api/clients/stats

# Test de recherche
curl "http://localhost:3000/api/clients/search?q=hotel"
```

## 🔒 Sécurité

### Authentification

- JWT tokens pour l'API
- Validation des permissions
- Protection CSRF

### Validation des données

- Validation côté client et serveur
- Sanitisation des entrées
- Contraintes de base de données

### Permissions

- Lecture : Tous les utilisateurs connectés
- Écriture : Utilisateurs autorisés uniquement
- Suppression : Vérification des dépendances

## 📊 Performance

### Optimisations

- **Index de base de données** pour les requêtes fréquentes
- **Pagination** pour limiter les transferts
- **Cache** des statistiques
- **Lazy loading** des composants

### Métriques

- Temps de réponse API < 200ms
- Chargement interface < 2s
- Recherche temps réel < 100ms

## 🐛 Dépannage

### Problèmes courants

1. **Erreur de connexion DB**
   ```bash
   docker exec prevhub-postgres pg_isready -U prevhub_user
   ```

2. **API non accessible**
   ```bash
   docker logs prevhub-backend
   curl http://localhost:3000/api/health
   ```

3. **Frontend ne charge pas**
   ```bash
   docker logs prevhub-frontend
   npm run build
   ```

### Logs utiles

```bash
# Logs backend
docker logs -f prevhub-backend

# Logs frontend
docker logs -f prevhub-frontend

# Logs base de données
docker logs -f prevhub-postgres
```

## 🔄 Maintenance

### Sauvegardes

- Sauvegarde automatique avant déploiement
- Sauvegarde quotidienne recommandée
- Rétention 30 jours

### Mises à jour

- Déploiement par composant possible
- Rollback automatique en cas d'échec
- Tests post-déploiement

### Monitoring

- Health checks automatiques
- Alertes en cas de dysfonctionnement
- Métriques de performance

## 📞 Support

### Documentation

- README principal : Vue d'ensemble
- TECHNICAL_GUIDE : Guide développeur
- API Documentation : Endpoints détaillés

### Contact

- Équipe PrevHub : support@preveris.fr
- Documentation : https://docs.preveris.fr
- Issues : Système de tickets intégré

---

**ERP PrevHub Phase 1.4** - Gestion des clients et établissements  
*Développé par l'équipe Prévéris - 2024*

