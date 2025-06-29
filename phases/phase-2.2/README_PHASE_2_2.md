# ERP PrevHub - Phase 2.2 - Module Tâches avec workflow

## 🎯 Vue d'ensemble

La **Phase 2.2** introduit un module de gestion des tâches révolutionnaire avec workflow automatisé, conçu pour transformer la productivité et la collaboration dans l'ERP PrevHub.

### 🏆 Fonctionnalités principales

**📋 Gestion des tâches avancée**
- Création, assignation et suivi des tâches
- Types multiples : Tâche, Jalon, Epic, Story
- Priorités configurables : Faible, Moyenne, Élevée, Urgente, Critique
- Statuts workflow : À faire, En cours, Révision, Tests, Terminé, Annulé, Bloqué
- Sous-tâches et hiérarchie complexe
- Estimation et suivi du temps passé

**🔄 Workflow automatisé**
- Workflows configurables par type de tâche
- Transitions automatiques basées sur des règles
- Étapes personnalisables avec conditions
- Escalade automatique en cas de retard
- Templates de workflow prédéfinis

**👥 Collaboration avancée**
- Assignation multiple et équipes
- Commentaires avec temps passé
- Notifications temps réel
- Partage et délégation de tâches
- Historique complet des actions

**📊 Analytics et reporting**
- Tableaux de bord de productivité
- Métriques de performance par utilisateur/équipe
- Rapports de progression et délais
- Analyse des goulots d'étranglement
- Statistiques de workflow

**🎨 Interface utilisateur moderne**
- Vue Liste et Kanban
- Filtrage et recherche avancés
- Drag & drop pour les statuts
- Interface responsive mobile/desktop
- Notifications visuelles et sonores

## 🏗️ Architecture technique

### Base de données PostgreSQL

**Tables principales :**
- `tasks` - Tâches principales avec métadonnées complètes
- `task_workflows` - Définition des workflows
- `task_workflow_steps` - Étapes des workflows
- `task_assignments` - Assignations avec rôles
- `task_comments` - Commentaires avec temps passé
- `task_attachments` - Fichiers joints
- `task_dependencies` - Dépendances entre tâches
- `task_templates` - Templates réutilisables
- `task_notifications` - Notifications système
- `task_metrics` - Métriques de performance
- `sprints` - Gestion Agile/Scrum

**Optimisations :**
- 15+ index de performance pour requêtes rapides
- 3 fonctions SQL avancées (recherche, stats, triggers)
- 2 vues enrichies pour analytics
- Contraintes et validations robustes

### API Backend Node.js

**Endpoints principaux :**
- `GET /api/tasks` - Liste avec filtres avancés et pagination
- `POST /api/tasks` - Création avec validation complète
- `GET /api/tasks/:id` - Détail avec relations
- `PUT /api/tasks/:id` - Modification avec workflow
- `DELETE /api/tasks/:id` - Archivage sécurisé
- `POST /api/tasks/:id/comments` - Ajout de commentaires
- `POST /api/tasks/:id/assignments` - Assignation d'utilisateurs
- `GET /api/workflows` - Gestion des workflows
- `GET /api/task-templates` - Templates de tâches
- `GET /api/sprints` - Gestion Agile
- `GET /api/notifications` - Notifications utilisateur
- `GET /api/tasks/stats` - Statistiques détaillées

**Fonctionnalités techniques :**
- Authentification JWT sécurisée
- Rate limiting anti-spam (100 req/15min)
- Upload multipart jusqu'à 10MB
- CORS configuré pour frontend
- Compression et cache optimisés
- Logs structurés avec Morgan

### Interface React

**Composants principaux :**
- `TasksManager` - Composant principal (2000+ lignes)
- `TaskCard` - Carte de tâche avec métadonnées
- `TaskModal` - Modal de création/édition
- `KanbanBoard` - Vue Kanban interactive
- `TaskFilters` - Filtrage avancé
- `NotificationPanel` - Notifications temps réel

**Fonctionnalités interface :**
- 20+ hooks React pour gestion d'état
- 15+ états gérés avec optimisations
- Recherche en temps réel
- Pagination intelligente
- Drag & drop Kanban
- Responsive design complet

## 📦 Installation et déploiement

### Prérequis

- Node.js 16+ et npm 8+
- PostgreSQL 12+
- PM2 pour la gestion des processus
- Nginx pour le reverse proxy

### Déploiement automatisé

```bash
# Déploiement complet automatique
./deploy-phase-2-2.sh --auto

# Déploiement interactif avec confirmations
./deploy-phase-2-2.sh --interactive
```

### Installation manuelle

```bash
# 1. Installation des dépendances
npm install --production

# 2. Configuration de l'environnement
cp .env.example .env
# Éditer .env avec vos paramètres

# 3. Configuration de la base de données
psql -U prevhub_user -d prevhub -f init-tasks-db.sql

# 4. Démarrage de l'API
pm2 start tasks-api.js --name tasks-api

# 5. Configuration Nginx
# Inclure la configuration dans votre vhost
```

### Variables d'environnement

```env
# Configuration principale
NODE_ENV=production
PORT=3002

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prevhub
DB_USER=prevhub_user
DB_PASSWORD=your_password

# JWT et sécurité
JWT_SECRET=your_jwt_secret

# Upload et stockage
UPLOAD_PATH=/var/www/prevhub/uploads/tasks
MAX_FILE_SIZE=10485760

# Workflow et automatisation
ENABLE_AUTO_WORKFLOW=true
WORKFLOW_CHECK_INTERVAL=300

# Notifications
ENABLE_NOTIFICATIONS=true
EMAIL_NOTIFICATIONS=false
```

## 🧪 Tests et validation

### Tests automatisés

```bash
# Tests unitaires
npm test

# Tests d'intégration
npm run test:integration

# Tests de performance
npm run test:performance
```

### Tests manuels

**API Health Check :**
```bash
curl http://localhost:3002/api/health
```

**Test de création de tâche :**
```bash
curl -X POST http://localhost:3002/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Test Task","priority":"medium","status":"todo"}'
```

**Test des workflows :**
```bash
curl http://localhost:3002/api/workflows \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Métriques et monitoring

### Endpoints de monitoring

- `GET /api/health` - Santé de l'API
- `GET /api/tasks/stats` - Statistiques globales
- `GET /api/metrics` - Métriques de performance
- `GET /api/workflows/stats` - Statistiques des workflows

### Logs et debugging

**Fichiers de logs :**
- `/var/log/prevhub/tasks.log` - Logs applicatifs
- `/var/log/prevhub/tasks-error.log` - Logs d'erreurs
- `/var/log/prevhub/maintenance.log` - Logs de maintenance

**Commandes utiles :**
```bash
# Voir les logs en temps réel
tail -f /var/log/prevhub/tasks.log

# Statut PM2
pm2 status tasks-api

# Redémarrer l'API
pm2 restart tasks-api

# Monitoring PM2
pm2 monit
```

## 🔧 Configuration avancée

### Workflows personnalisés

```sql
-- Créer un workflow personnalisé
INSERT INTO task_workflows (name, description, is_active) 
VALUES ('Développement Feature', 'Workflow pour nouvelles fonctionnalités', true);

-- Ajouter des étapes
INSERT INTO task_workflow_steps (workflow_id, name, order_index, conditions) 
VALUES 
  (1, 'Analyse', 1, '{"required_fields": ["description", "acceptance_criteria"]}'),
  (1, 'Développement', 2, '{"estimated_hours": {"min": 1}}'),
  (1, 'Tests', 3, '{"completion_percentage": {"min": 90}}'),
  (1, 'Déploiement', 4, '{"status": "review_approved"}');
```

### Templates de tâches

```sql
-- Créer un template
INSERT INTO task_templates (name, title_template, description_template, default_priority, default_type, estimated_hours) 
VALUES (
  'Bug Fix',
  'Bug: {issue_title}',
  'Description du bug:\n{bug_description}\n\nÉtapes de reproduction:\n{reproduction_steps}\n\nComportement attendu:\n{expected_behavior}',
  'high',
  'task',
  2
);
```

### Notifications personnalisées

```sql
-- Configurer les notifications
INSERT INTO notification_rules (event_type, conditions, message_template, recipients) 
VALUES (
  'task_overdue',
  '{"days_overdue": {"min": 1}}',
  'La tâche "{task_title}" est en retard de {days_overdue} jour(s)',
  '["assignee", "project_manager"]'
);
```

## 🚀 Intégration avec l'ERP

### Liens avec les modules existants

**Projets (Phase 1.3) :**
- Tâches liées aux projets
- Suivi de progression par projet
- Budgets et estimations

**Clients (Phase 1.4) :**
- Tâches par client/établissement
- Historique des interventions
- Facturation basée sur le temps

**Documents (Phase 2.1) :**
- Pièces jointes aux tâches
- Documentation automatique
- Versioning des livrables

### API d'intégration

```javascript
// Exemple d'intégration dans l'App principale
import TasksManager from './TasksManager';

function App() {
  return (
    <div>
      {/* Autres modules */}
      <TasksManager 
        user={currentUser}
        apiBaseUrl="http://localhost:3002/api"
        onTaskUpdate={handleTaskUpdate}
        projectId={selectedProject?.id}
        companyId={selectedCompany?.id}
      />
    </div>
  );
}
```

## 📈 Roadmap et évolutions

### Phase 2.3 - Rapports et Analytics
- Tableaux de bord avancés
- Métriques de productivité
- Rapports personnalisables
- Prédictions IA

### Phase 2.4 - Intégrations externes
- Synchronisation calendriers
- Intégration email
- Webhooks et API externes
- Import/export données

### Améliorations futures
- Application mobile native
- Collaboration temps réel
- IA pour estimation automatique
- Intégration Git/DevOps

## 🆘 Support et maintenance

### Maintenance automatique

Le script de maintenance automatique s'exécute quotidiennement :
- Nettoyage des notifications anciennes (> 30 jours)
- Archivage des tâches terminées (> 90 jours)
- Optimisation des métriques (> 6 mois)

### Sauvegarde et restauration

```bash
# Sauvegarde manuelle
pg_dump -h localhost -U prevhub_user prevhub > backup-tasks-$(date +%Y%m%d).sql

# Restauration
psql -h localhost -U prevhub_user -d prevhub < backup-tasks-20231201.sql
```

### Dépannage courant

**L'API ne démarre pas :**
1. Vérifier les logs : `pm2 logs tasks-api`
2. Vérifier la base de données : `psql -U prevhub_user -d prevhub -c "SELECT 1;"`
3. Vérifier les permissions : `ls -la /var/www/prevhub/uploads/tasks`

**Performances lentes :**
1. Vérifier les index : `EXPLAIN ANALYZE SELECT * FROM tasks WHERE status = 'todo';`
2. Optimiser les requêtes lentes
3. Augmenter la mémoire PM2 : `pm2 restart tasks-api --max-memory-restart 1024M`

**Erreurs de workflow :**
1. Vérifier la configuration : `SELECT * FROM task_workflows WHERE is_active = true;`
2. Valider les conditions JSON
3. Tester les transitions manuellement

## 📞 Contact et support

- **Documentation :** [Wiki PrevHub](https://wiki.prevhub.com)
- **Issues :** [GitHub Issues](https://github.com/prevhub/tasks-module/issues)
- **Support :** support@prevhub.com
- **Communauté :** [Discord PrevHub](https://discord.gg/prevhub)

---

**Phase 2.2 - Module Tâches avec workflow**  
Version 2.2.0 - Décembre 2024  
© 2024 PrevHub Team

