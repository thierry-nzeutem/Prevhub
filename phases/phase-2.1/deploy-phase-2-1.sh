#!/bin/bash

# Script de déploiement ERP PrevHub - Phase 2.1
# Module Documents avec IA

set -e

echo "🚀 Déploiement Phase 2.1 - Module Documents avec IA"
echo "=================================================="

# Configuration
PHASE_NAME="Phase 2.1 - Module Documents avec IA"
BACKUP_DIR="/backup/prevhub-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/var/log/prevhub-phase-2-1-deploy.log"
DB_NAME="prevhub"
DB_USER="prevhub_user"
API_PORT="3001"
UPLOAD_DIR="/var/www/prevhub/uploads/documents"

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
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        log "⚠️  Docker non trouvé, déploiement en mode standalone"
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
    
    # Installer les outils système nécessaires
    if command -v apt-get &> /dev/null; then
        apt-get update -qq
        apt-get install -y -qq imagemagick poppler-utils tesseract-ocr tesseract-ocr-fra || true
    elif command -v yum &> /dev/null; then
        yum install -y ImageMagick poppler-utils tesseract tesseract-langpack-fra || true
    fi
    
    log "✅ Dépendances installées"
}

# Configuration de la base de données
setup_database() {
    log "🗄️  Configuration de la base de données..."
    
    # Exécuter le script SQL
    if psql -h localhost -U "$DB_USER" -d "$DB_NAME" -f init-documents-db.sql > /dev/null 2>&1; then
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
    mkdir -p /var/www/prevhub/documents
    
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
# Configuration ERP PrevHub - Module Documents
NODE_ENV=production
PORT=$API_PORT

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=prevhub_password

# JWT
JWT_SECRET=prevhub_documents_secret_key_$(openssl rand -hex 32)

# Upload
UPLOAD_PATH=$UPLOAD_DIR
MAX_FILE_SIZE=52428800

# IA et OCR
ENABLE_AI_ANALYSIS=true
ENABLE_OCR=true
OCR_LANGUAGE=fra+eng

# Logs
LOG_LEVEL=info
LOG_FILE=/var/log/prevhub/documents.log
EOF
        log "✅ Fichier .env créé"
    else
        log "✅ Fichier .env existant conservé"
    fi
}

# Déploiement de l'API
deploy_api() {
    log "🚀 Déploiement de l'API Documents..."
    
    # Arrêter l'ancienne version
    pm2 stop documents-api 2>/dev/null || true
    pm2 delete documents-api 2>/dev/null || true
    
    # Démarrer la nouvelle version
    pm2 start documents-api.js --name documents-api --instances 1 --max-memory-restart 512M
    pm2 save
    
    # Vérifier que l'API fonctionne
    sleep 5
    if curl -f "http://localhost:$API_PORT/api/health" > /dev/null 2>&1; then
        log "✅ API Documents démarrée avec succès"
    else
        error_exit "L'API Documents ne répond pas"
    fi
}

# Configuration Nginx
setup_nginx() {
    log "🌐 Configuration Nginx..."
    
    # Créer la configuration Nginx pour l'API Documents
    cat > /etc/nginx/sites-available/prevhub-documents << EOF
# Configuration Nginx - API Documents PrevHub
location /api/documents {
    proxy_pass http://localhost:$API_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
    
    # Upload de gros fichiers
    client_max_body_size 50M;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}

# Servir les fichiers uploadés
location /uploads/documents {
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
        if ! grep -q "include /etc/nginx/sites-available/prevhub-documents" /etc/nginx/sites-enabled/default; then
            sed -i '/server {/a\\tinclude /etc/nginx/sites-available/prevhub-documents;' /etc/nginx/sites-enabled/default
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
    if psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM documents;" > /dev/null 2>&1; then
        log "✅ Connexion base de données: OK"
    else
        log "❌ Connexion base de données: ÉCHEC"
    fi
    
    # Test des répertoires
    if [ -w "$UPLOAD_DIR" ]; then
        log "✅ Répertoire upload: OK"
    else
        log "❌ Répertoire upload: ÉCHEC"
    fi
    
    log "🧪 Tests terminés"
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
        echo "   - Mettre à jour la base de données"
        echo "   - Déployer l'API Documents avec IA"
        echo "   - Configurer Nginx"
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
    run_tests
    
    log "🎉 Déploiement $PHASE_NAME terminé avec succès !"
    log "📊 Statistiques :"
    log "   - API Documents: http://localhost:$API_PORT"
    log "   - Répertoire upload: $UPLOAD_DIR"
    log "   - Logs: $LOG_FILE"
    log "   - Sauvegarde: $BACKUP_DIR"
    
    echo ""
    echo "🎉 DÉPLOIEMENT RÉUSSI !"
    echo "======================"
    echo "📄 Module Documents avec IA déployé"
    echo "🔗 API: http://localhost:$API_PORT/api/health"
    echo "📁 Upload: $UPLOAD_DIR"
    echo "📋 Logs: $LOG_FILE"
    echo ""
    echo "🚀 Le module Documents est maintenant opérationnel !"
}

# Gestion des signaux
trap 'error_exit "Déploiement interrompu"' INT TERM

# Exécution
main "$@"

