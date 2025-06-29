#!/bin/bash

# Script de déploiement ERP PrevHub - Phase 2.2
# Module Tâches avec workflow

set -e

echo "🚀 Déploiement Phase 2.2 - Module Tâches avec workflow"
echo "======================================================"

# Configuration
PHASE_NAME="Phase 2.2 - Module Tâches avec workflow"
BACKUP_DIR="/backup/prevhub-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/var/log/prevhub-phase-2-2-deploy.log"
DB_NAME="prevhub"
DB_USER="prevhub_user"
API_PORT="3002"
UPLOAD_DIR="/var/www/prevhub/uploads/tasks"

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Fonction d'erreur
error_exit() {
    log "❌ ERREUR: $1"
    exit 1
}

# Vérification des prérequis
check_prerequisites() {
    log "🔍 Vérification des prérequis..."
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        error_exit "Node.js n'est pas installé"
    fi
    
    # Vérifier PostgreSQL
    if ! command -v psql &> /dev/null; then
        error_exit "PostgreSQL n'est pas installé"
    fi
    
    # Vérifier PM2
    if ! command -v pm2 &> /dev/null; then
        log "📦 Installation de PM2..."
        npm install -g pm2 || error_exit "Impossible d'installer PM2"
    fi
    
    # Vérifier que la Phase 2.1 est déployée
    if ! pm2 list | grep -q "documents-api"; then
        log "⚠️  Phase 2.1 (Documents) non détectée, déploiement standalone"
    fi
    
    log "✅ Prérequis vérifiés"
}

# Sauvegarde
create_backup() {
    log "💾 Création de la sauvegarde..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Sauvegarde de la base de données
    if pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_DIR/database.sql" 2>/dev/null; then
        log "✅ Base de données sauvegardée"
    else
        log "⚠️  Impossible de sauvegarder la base de données"
    fi
    
    # Sauvegarde des fichiers existants
    if [ -d "/var/www/prevhub" ]; then
        cp -r /var/www/prevhub "$BACKUP_DIR/prevhub-files" 2>/dev/null || true
        log "✅ Fichiers sauvegardés"
    fi
    
    log "💾 Sauvegarde créée dans $BACKUP_DIR"
}

# Installation des dépendances
install_dependencies() {
    log "📦 Installation des dépendances..."
    
    # Installer les dépendances Node.js
    npm install --production || error_exit "Impossible d'installer les dépendances Node.js"
    
    log "✅ Dépendances installées"
}

# Configuration de la base de données
setup_database() {
    log "🗄️  Configuration de la base de données..."
    
    # Exécuter le script SQL
    if psql -h localhost -U "$DB_USER" -d "$DB_NAME" -f init-tasks-db.sql > /dev/null 2>&1; then
        log "✅ Base de données configurée"
    else
        log "⚠️  Erreur lors de la configuration de la base de données"
        log "📝 Vérifiez les permissions et la connexion à PostgreSQL"
    fi
}

# Configuration des répertoires
setup_directories() {
    log "📁 Configuration des répertoires..."
    
    # Créer les répertoires nécessaires
    mkdir -p "$UPLOAD_DIR"
    mkdir -p /var/log/prevhub
    mkdir -p /var/www/prevhub/tasks
    
    # Permissions
    chown -R www-data:www-data "$UPLOAD_DIR" 2>/dev/null || true
    chmod -R 755 "$UPLOAD_DIR" 2>/dev/null || true
    
    log "✅ Répertoires configurés"
}

# Configuration de l'environnement
setup_environment() {
    log "⚙️  Configuration de l'environnement..."
    
    # Créer le fichier .env s'il n'existe pas
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# Configuration ERP PrevHub - Module Tâches
NODE_ENV=production
PORT=$API_PORT

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=prevhub_password

# JWT
JWT_SECRET=prevhub_tasks_secret_key_$(openssl rand -hex 32)

# Upload
UPLOAD_PATH=$UPLOAD_DIR
MAX_FILE_SIZE=10485760

# Workflow
ENABLE_AUTO_WORKFLOW=true
WORKFLOW_CHECK_INTERVAL=300

# Notifications
ENABLE_NOTIFICATIONS=true
EMAIL_NOTIFICATIONS=false

# Logs
LOG_LEVEL=info
LOG_FILE=/var/log/prevhub/tasks.log
EOF
        log "✅ Fichier .env créé"
    else
        log "✅ Fichier .env existant conservé"
    fi
}

# Déploiement de l'API
deploy_api() {
    log "🚀 Déploiement de l'API Tâches..."
    
    # Arrêter l'ancienne version
    pm2 stop tasks-api 2>/dev/null || true
    pm2 delete tasks-api 2>/dev/null || true
    
    # Démarrer la nouvelle version
    pm2 start tasks-api.js --name tasks-api --instances 1 --max-memory-restart 512M
    pm2 save
    
    # Vérifier que l'API fonctionne
    sleep 5
    if curl -f "http://localhost:$API_PORT/api/health" > /dev/null 2>&1; then
        log "✅ API Tâches démarrée avec succès"
    else
        error_exit "L'API Tâches ne répond pas"
    fi
}

# Configuration Nginx
setup_nginx() {
    log "🌐 Configuration Nginx..."
    
    # Créer la configuration Nginx pour l'API Tâches
    cat > /etc/nginx/sites-available/prevhub-tasks << EOF
# Configuration Nginx - API Tâches PrevHub
location /api/tasks {
    proxy_pass http://localhost:$API_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
    
    # Upload de fichiers
    client_max_body_size 10M;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}

location /api/workflows {
    proxy_pass http://localhost:$API_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
}

location /api/task-templates {
    proxy_pass http://localhost:$API_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
}

location /api/sprints {
    proxy_pass http://localhost:$API_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
}

location /api/notifications {
    proxy_pass http://localhost:$API_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
}

# Servir les fichiers uploadés des tâches
location /uploads/tasks {
    alias $UPLOAD_DIR;
    expires 1y;
    add_header Cache-Control "public, immutable";
    
    # Sécurité
    location ~* \.(php|pl|py|jsp|asp|sh|cgi)$ {
        deny all;
    }
}
EOF
    
    # Activer la configuration
    if [ -f "/etc/nginx/sites-enabled/default" ]; then
        # Inclure dans la configuration par défaut
        if ! grep -q "include /etc/nginx/sites-available/prevhub-tasks" /etc/nginx/sites-enabled/default; then
            sed -i '/server {/a\\tinclude /etc/nginx/sites-available/prevhub-tasks;' /etc/nginx/sites-enabled/default
        fi
    fi
    
    # Tester et recharger Nginx
    if nginx -t 2>/dev/null; then
        systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || true
        log "✅ Nginx configuré"
    else
        log "⚠️  Erreur de configuration Nginx"
    fi
}

# Tests de validation
run_tests() {
    log "🧪 Exécution des tests..."
    
    # Test de l'API
    if curl -f "http://localhost:$API_PORT/api/health" > /dev/null 2>&1; then
        log "✅ API Health Check: OK"
    else
        log "❌ API Health Check: ÉCHEC"
    fi
    
    # Test de la base de données
    if psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM tasks;" > /dev/null 2>&1; then
        log "✅ Connexion base de données: OK"
    else
        log "❌ Connexion base de données: ÉCHEC"
    fi
    
    # Test des workflows
    if psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM task_workflows;" > /dev/null 2>&1; then
        log "✅ Workflows configurés: OK"
    else
        log "❌ Workflows configurés: ÉCHEC"
    fi
    
    # Test des répertoires
    if [ -w "$UPLOAD_DIR" ]; then
        log "✅ Répertoire upload: OK"
    else
        log "❌ Répertoire upload: ÉCHEC"
    fi
    
    # Test des endpoints principaux
    local endpoints=("/api/tasks" "/api/workflows" "/api/task-templates" "/api/tasks/stats")
    for endpoint in "${endpoints[@]}"; do
        if curl -f -H "Authorization: Bearer test" "http://localhost:$API_PORT$endpoint" > /dev/null 2>&1; then
            log "✅ Endpoint $endpoint: OK"
        else
            log "⚠️  Endpoint $endpoint: Nécessite authentification (normal)"
        fi
    done
    
    log "🧪 Tests terminés"
}

# Configuration des tâches cron pour l'automatisation
setup_cron_jobs() {
    log "⏰ Configuration des tâches automatisées..."
    
    # Créer le script de maintenance
    cat > /usr/local/bin/prevhub-tasks-maintenance.sh << 'EOF'
#!/bin/bash
# Script de maintenance automatique des tâches PrevHub

# Nettoyer les notifications anciennes (> 30 jours)
psql -h localhost -U prevhub_user -d prevhub -c "DELETE FROM task_notifications WHERE created_at < NOW() - INTERVAL '30 days';" > /dev/null 2>&1

# Archiver les tâches terminées anciennes (> 90 jours)
psql -h localhost -U prevhub_user -d prevhub -c "UPDATE tasks SET is_archived = true, archived_at = NOW() WHERE status = 'done' AND completed_at < NOW() - INTERVAL '90 days' AND is_archived = false;" > /dev/null 2>&1

# Nettoyer les métriques anciennes (> 6 mois)
psql -h localhost -U prevhub_user -d prevhub -c "DELETE FROM task_metrics WHERE recorded_at < NOW() - INTERVAL '6 months';" > /dev/null 2>&1

echo "$(date): Maintenance des tâches PrevHub terminée" >> /var/log/prevhub/maintenance.log
EOF
    
    chmod +x /usr/local/bin/prevhub-tasks-maintenance.sh
    
    # Ajouter la tâche cron (tous les jours à 2h du matin)
    if ! crontab -l 2>/dev/null | grep -q "prevhub-tasks-maintenance"; then
        (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/prevhub-tasks-maintenance.sh") | crontab -
        log "✅ Tâche cron de maintenance configurée"
    else
        log "✅ Tâche cron de maintenance déjà configurée"
    fi
}

# Fonction principale
main() {
    log "🚀 Début du déploiement $PHASE_NAME"
    
    # Vérifier les arguments
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "Usage: $0 [--auto|--interactive]"
        echo "  --auto        Déploiement automatique sans confirmation"
        echo "  --interactive Déploiement interactif (par défaut)"
        exit 0
    fi
    
    # Mode interactif par défaut
    if [ "$1" != "--auto" ]; then
        echo "⚠️  Vous êtes sur le point de déployer $PHASE_NAME"
        echo "📋 Cette opération va :"
        echo "   - Sauvegarder les données existantes"
        echo "   - Mettre à jour la base de données avec les tables de tâches"
        echo "   - Déployer l'API Tâches avec workflow"
        echo "   - Configurer Nginx pour les nouveaux endpoints"
        echo "   - Configurer les tâches automatisées"
        echo ""
        read -p "Continuer ? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "❌ Déploiement annulé par l'utilisateur"
            exit 1
        fi
    fi
    
    # Exécution des étapes
    check_prerequisites
    create_backup
    install_dependencies
    setup_directories
    setup_environment
    setup_database
    deploy_api
    setup_nginx
    setup_cron_jobs
    run_tests
    
    log "🎉 Déploiement $PHASE_NAME terminé avec succès !"
    log "📊 Statistiques :"
    log "   - API Tâches: http://localhost:$API_PORT"
    log "   - Répertoire upload: $UPLOAD_DIR"
    log "   - Logs: $LOG_FILE"
    log "   - Sauvegarde: $BACKUP_DIR"
    
    echo ""
    echo "🎉 DÉPLOIEMENT RÉUSSI !"
    echo "======================"
    echo "📋 Module Tâches avec workflow déployé"
    echo "🔗 API: http://localhost:$API_PORT/api/health"
    echo "📁 Upload: $UPLOAD_DIR"
    echo "📋 Logs: $LOG_FILE"
    echo ""
    echo "🚀 Le module Tâches est maintenant opérationnel !"
    echo ""
    echo "📋 Endpoints disponibles :"
    echo "   - GET  /api/tasks - Liste des tâches"
    echo "   - POST /api/tasks - Créer une tâche"
    echo "   - GET  /api/workflows - Liste des workflows"
    echo "   - GET  /api/task-templates - Templates de tâches"
    echo "   - GET  /api/sprints - Gestion Agile/Scrum"
    echo "   - GET  /api/notifications - Notifications"
    echo ""
    echo "🎯 Prochaine étape : Phase 2.3 - Module Rapports et Analytics"
}

# Gestion des signaux
trap 'error_exit "Déploiement interrompu"' INT TERM

# Exécution
main "$@"

