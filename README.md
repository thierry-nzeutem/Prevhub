# PrevHub - Système de gestion pour Prévéris

PrevHub est un système ERP complet spécialisé en prévention incendie et accessibilité, développé pour Prévéris.

## 🔥 Fonctionnalités

### 🏢 Gestion d'entreprises
- Gestion complète des clients et prospects
- Suivi des établissements et leurs caractéristiques
- Gestion des contacts et relations

### 📋 Gestion de projets
- Suivi des missions ERP, IGH et accessibilité
- Gestion des dossiers AT (Assistance Technique)
- Planification et suivi des prestations

### 📄 Gestion documentaire
- Stockage et organisation des documents
- Analyse automatique avec IA
- Système de versioning et validation

### 👥 Gestion utilisateurs
- Système de rôles et permissions
- Groupes de droits configurables
- Authentification sécurisée

### 💰 Gestion commerciale
- Génération de devis automatisés
- Suivi des bons de commande
- Facturation et historique des paiements

### 🤖 Intelligence Artificielle
- Analyse automatique des documents
- Assistance à la rédaction
- Détection d'anomalies

## 🏗️ Architecture technique

### Frontend
- **React 18** avec hooks modernes
- **Vite** pour le build et développement
- **Tailwind CSS** pour le styling
- Interface responsive et moderne

### Backend
- **Node.js** avec Express
- **API RESTful** complète
- **Authentification JWT**
- **Middleware de sécurité**

### Base de données
- **PostgreSQL 15** pour les données principales
- **Redis** pour le cache et sessions
- **Migrations** automatisées

### Infrastructure
- **Docker** et Docker Compose
- **Nginx** reverse proxy avec HTTPS
- **SSL/TLS** automatique
- Architecture scalable

## 🚀 Installation

### Prérequis
- Docker et Docker Compose
- Node.js 18+ (pour le développement)
- PostgreSQL 15+ (si installation locale)

### Installation rapide avec Docker

```bash
# Cloner le repository
git clone https://github.com/thierry-nzeutem/Prevhub.git
cd Prevhub

# Lancer l'application complète
docker-compose -f docker-compose.full.yml up -d

# Vérifier le statut
docker-compose -f docker-compose.full.yml ps
```

### Installation de développement

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (nouveau terminal)
cd frontend
npm install
npm run dev
```

## 🔧 Configuration

### Variables d'environnement

Créer un fichier `.env` à la racine :

```env
# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prevhub
DB_USER=prevhub_user
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Application
NODE_ENV=production
PORT=3000
```

### Ports utilisés
- **80/443** : Nginx (HTTP/HTTPS)
- **3000** : Backend API
- **3001** : Frontend React
- **5432** : PostgreSQL
- **6379** : Redis

## 📊 Base de données

### Structure principale
- **66 tables** avec relations complètes
- **Données migrées** depuis Supabase
- **1375+ enregistrements** d'entreprises et établissements
- **Contraintes d'intégrité** préservées

### Tables principales
- `users` - Utilisateurs et authentification
- `companies` - Entreprises clientes
- `etablissements` - Établissements et sites
- `projects` - Projets et missions
- `at_dossiers` - Dossiers d'assistance technique
- `documents` - Gestion documentaire

## 🔐 Sécurité

- **Authentification JWT** avec refresh tokens
- **Chiffrement HTTPS** obligatoire
- **Validation des données** côté serveur
- **Protection CORS** configurée
- **Rate limiting** sur les API

## 🧪 Tests

```bash
# Tests backend
cd backend
npm test

# Tests frontend
cd frontend
npm test
```

## 📈 Monitoring

- **Logs structurés** avec Winston
- **Health checks** pour tous les services
- **Métriques** de performance
- **Alertes** automatiques

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Changelog

### Version 1.0.0 (2025-06-29)
- ✅ Version initiale complète
- ✅ Migration des données Supabase
- ✅ Interface React fonctionnelle
- ✅ API backend complète
- ✅ Déploiement Docker

## 📄 Licence

Ce projet est sous licence propriétaire - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👨‍💻 Équipe

- **Développement** : Manus AI
- **Client** : Prévéris
- **Maintenance** : Thierry Nzeutem

## 📞 Support

Pour toute question ou support :
- 📧 Email : support@preveris.fr
- 🌐 Site web : [preveris.fr](https://preveris.fr)

---

**PrevHub** - Révolutionner la gestion de la prévention incendie 🔥

