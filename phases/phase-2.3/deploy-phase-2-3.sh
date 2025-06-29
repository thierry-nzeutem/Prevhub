#!/bin/bash

# Script de déploiement ERP PrevHub - Phase 2.3 - Module Rapports et Analytics
# Version: 2.3.0
# Auteur: Manus AI - ERP PrevHub Team

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PHASE="2.3"
MODULE_NAME="Analytics & Rapports"
API_PORT=3003
DB_NAME="prevhub"
BACKUP_DIR="/var/backups/prevhub"
LOG_FILE="/var/log/prevhub/deploy-phase-2-3.log"

# Fonctions utilitaires
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

# Vérifier les prérequis
check_prerequisites() {
    log "🔍 Vérification des prérequis..."
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js n'est pas installé"
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    if [[ $(echo "$NODE_VERSION 16.0.0" | tr " " "\n" | sort -V | head -n1) != "16.0.0" ]]; then
        error "Node.js version 16+ requis (version actuelle: $NODE_VERSION)"
    fi
    
    # Vérifier PostgreSQL
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL n'est pas installé"
    fi
    
    # Vérifier npm
    if ! command -v npm &> /dev/null; then
        error "npm n'est pas installé"
    fi
    
    # Vérifier Docker (optionnel)
    if command -v docker &> /dev/null; then
        info "Docker détecté - déploiement containerisé disponible"
    fi
    
    success "Prérequis validés"
}

# Créer les répertoires nécessaires
create_directories() {
    log "📁 Création des répertoires..."
    
    sudo mkdir -p "$BACKUP_DIR"
    sudo mkdir -p "$(dirname "$LOG_FILE")"
    sudo mkdir -p "/opt/prevhub/analytics"
    sudo mkdir -p "/etc/prevhub"
    sudo mkdir -p "/var/lib/prevhub/uploads"
    
    # Permissions
    sudo chown -R $USER:$USER "/opt/prevhub"
    sudo chown -R $USER:$USER "/var/lib/prevhub"
    
    success "Répertoires créés"
}

# Sauvegarder la base de données
backup_database() {
    log "💾 Sauvegarde de la base de données..."
    
    BACKUP_FILE="$BACKUP_DIR/prevhub_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if pg_dump "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
        success "Sauvegarde créée: $BACKUP_FILE"
    else
        warning "Impossible de créer la sauvegarde (base peut ne pas exister)"
    fi
}

# Installer les dépendances
install_dependencies() {
    log "📦 Installation des dépendances..."
    
    # Installer les dépendances Node.js
    npm install --production
    
    # Vérifier les dépendances critiques
    REQUIRED_DEPS=("express" "pg" "jsonwebtoken" "cors" "helmet")
    for dep in "${REQUIRED_DEPS[@]}"; do
        if ! npm list "$dep" &> /dev/null; then
            error "Dépendance manquante: $dep"
        fi
    done
    
    success "Dépendances installées"
}

# Configurer la base de données
setup_database() {
    log "🗄️  Configuration de la base de données..."
    
    # Créer la base si elle n'existe pas
    if ! psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        createdb "$DB_NAME"
        info "Base de données '$DB_NAME' créée"
    fi
    
    # Exécuter les migrations (si le fichier existe)
    if [ -f "init-analytics-db.sql" ]; then
        psql "$DB_NAME" < init-analytics-db.sql
        success "Schéma de base de données mis à jour"
    else
        warning "Fichier de migration non trouvé"
    fi
    
    # Insérer des données de démonstration
    if [ -f "analytics-demo-data.sql" ]; then
        psql "$DB_NAME" < analytics-demo-data.sql
        info "Données de démonstration insérées"
    fi
}

# Configurer l'environnement
setup_environment() {
    log "⚙️  Configuration de l'environnement..."
    
    # Créer le fichier .env s'il n'existe pas
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# Configuration ERP PrevHub - Phase 2.3 Analytics
NODE_ENV=production
PORT=$API_PORT

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=prevhub_user
DB_PASSWORD=prevhub_password

# Sécurité
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRY=24h

# Rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=200

# Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/var/lib/prevhub/uploads

# Logs
LOG_LEVEL=info
LOG_FILE=$LOG_FILE

# Analytics
ANALYTICS_CACHE_TTL=300
PREDICTIONS_ENABLED=true
EXPORT_FORMATS=csv,json,xlsx

# Monitoring
HEALTH_CHECK_INTERVAL=30000
METRICS_ENABLED=true
EOF
        success "Fichier .env créé"
    else
        info "Fichier .env existant conservé"
    fi
}

# Déployer l'API
deploy_api() {
    log "🚀 Déploiement de l'API Analytics..."
    
    # Copier les fichiers
    cp analytics-api.js "/opt/prevhub/analytics/"
    cp package.json "/opt/prevhub/analytics/"
    cp .env "/opt/prevhub/analytics/"
    
    # Installer les dépendances en production
    cd "/opt/prevhub/analytics"
    npm install --production --silent
    
    success "API déployée"
}

# Configurer le service systemd
setup_service() {
    log "🔧 Configuration du service systemd..."
    
    sudo tee /etc/systemd/system/prevhub-analytics.service > /dev/null << EOF
[Unit]
Description=PrevHub Analytics API
Documentation=https://prevhub.com/docs/analytics
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/prevhub/analytics
Environment=NODE_ENV=production
ExecStart=/usr/bin/node analytics-api.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=prevhub-analytics

# Sécurité
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/prevhub /var/log/prevhub

# Limites de ressources
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable prevhub-analytics
    
    success "Service systemd configuré"
}

# Configurer Nginx (reverse proxy)
setup_nginx() {
    log "🌐 Configuration Nginx..."
    
    if command -v nginx &> /dev/null; then
        sudo tee /etc/nginx/sites-available/prevhub-analytics > /dev/null << EOF
server {
    listen 80;
    server_name analytics.prevhub.local;
    
    # Redirection HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name analytics.prevhub.local;
    
    # SSL Configuration (à adapter selon vos certificats)
    ssl_certificate /etc/ssl/certs/prevhub.crt;
    ssl_certificate_key /etc/ssl/private/prevhub.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Headers de sécurité
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Proxy vers l'API Analytics
    location /api/ {
        proxy_pass http://localhost:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Servir les fichiers statiques
    location / {
        root /var/www/prevhub/analytics;
        try_files \$uri \$uri/ /index.html;
        
        # Cache pour les assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Logs
    access_log /var/log/nginx/prevhub-analytics.access.log;
    error_log /var/log/nginx/prevhub-analytics.error.log;
}
EOF

        # Activer le site
        sudo ln -sf /etc/nginx/sites-available/prevhub-analytics /etc/nginx/sites-enabled/
        
        # Tester la configuration
        if sudo nginx -t; then
            sudo systemctl reload nginx
            success "Configuration Nginx mise à jour"
        else
            warning "Erreur dans la configuration Nginx"
        fi
    else
        warning "Nginx non installé - configuration manuelle requise"
    fi
}

# Tests de validation
run_tests() {
    log "🧪 Exécution des tests..."
    
    # Test de connexion à la base
    if psql "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        success "Connexion base de données OK"
    else
        error "Impossible de se connecter à la base de données"
    fi
    
    # Test de démarrage de l'API
    cd "/opt/prevhub/analytics"
    timeout 10s node analytics-api.js &
    API_PID=$!
    sleep 3
    
    if kill -0 $API_PID 2>/dev/null; then
        success "API démarre correctement"
        kill $API_PID
    else
        error "Impossible de démarrer l'API"
    fi
    
    # Test des endpoints
    if command -v curl &> /dev/null; then
        if curl -f "http://localhost:$API_PORT/api/health" &> /dev/null; then
            success "Endpoint health accessible"
        else
            warning "Endpoint health non accessible"
        fi
    fi
}

# Démarrer les services
start_services() {
    log "▶️  Démarrage des services..."
    
    # Démarrer l'API Analytics
    sudo systemctl start prevhub-analytics
    
    # Vérifier le statut
    if sudo systemctl is-active --quiet prevhub-analytics; then
        success "Service prevhub-analytics démarré"
    else
        error "Échec du démarrage du service"
    fi
    
    # Afficher les logs récents
    info "Logs récents:"
    sudo journalctl -u prevhub-analytics --no-pager -n 10
}

# Afficher le résumé
show_summary() {
    echo
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                    DÉPLOIEMENT TERMINÉ                      ║${NC}"
    echo -e "${PURPLE}║              Phase 2.3 - Module Analytics                   ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${GREEN}🎉 Module Rapports et Analytics déployé avec succès !${NC}"
    echo
    echo -e "${CYAN}📊 Informations de déploiement:${NC}"
    echo -e "   • Version: ${YELLOW}2.3.0${NC}"
    echo -e "   • API Port: ${YELLOW}$API_PORT${NC}"
    echo -e "   • Base de données: ${YELLOW}$DB_NAME${NC}"
    echo -e "   • Logs: ${YELLOW}$LOG_FILE${NC}"
    echo
    echo -e "${CYAN}🔗 URLs d'accès:${NC}"
    echo -e "   • API Health: ${YELLOW}http://localhost:$API_PORT/api/health${NC}"
    echo -e "   • Dashboard: ${YELLOW}http://localhost:$API_PORT/api/analytics/dashboard${NC}"
    echo -e "   • Documentation: ${YELLOW}https://prevhub.com/docs/analytics${NC}"
    echo
    echo -e "${CYAN}🛠️  Commandes utiles:${NC}"
    echo -e "   • Statut service: ${YELLOW}sudo systemctl status prevhub-analytics${NC}"
    echo -e "   • Logs en temps réel: ${YELLOW}sudo journalctl -u prevhub-analytics -f${NC}"
    echo -e "   • Redémarrer: ${YELLOW}sudo systemctl restart prevhub-analytics${NC}"
    echo -e "   • Tests API: ${YELLOW}curl http://localhost:$API_PORT/api/health${NC}"
    echo
    echo -e "${GREEN}✅ Le module Analytics est maintenant opérationnel !${NC}"
    echo
}

# Fonction principale
main() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║           DÉPLOIEMENT ERP PREVHUB - PHASE 2.3                ║${NC}"
    echo -e "${PURPLE}║              Module Rapports et Analytics                    ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    # Vérifier les arguments
    case "${1:-}" in
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --auto          Déploiement automatique sans confirmation"
            echo "  --test-only     Exécuter uniquement les tests"
            echo "  --backup-only   Créer uniquement une sauvegarde"
            echo "  --help          Afficher cette aide"
            exit 0
            ;;
        --test-only)
            run_tests
            exit 0
            ;;
        --backup-only)
            backup_database
            exit 0
            ;;
        --auto)
            AUTO_MODE=true
            ;;
        *)
            AUTO_MODE=false
            ;;
    esac
    
    # Confirmation utilisateur
    if [ "$AUTO_MODE" != "true" ]; then
        echo -e "${YELLOW}⚠️  Ce script va déployer le module Analytics de l'ERP PrevHub.${NC}"
        echo -e "${YELLOW}   Cela inclut la configuration de la base de données, de l'API et des services.${NC}"
        echo
        read -p "Continuer ? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Déploiement annulé."
            exit 0
        fi
    fi
    
    # Exécution des étapes
    log "🚀 Début du déploiement Phase 2.3 - Module Analytics"
    
    check_prerequisites
    create_directories
    backup_database
    install_dependencies
    setup_database
    setup_environment
    deploy_api
    setup_service
    setup_nginx
    run_tests
    start_services
    
    show_summary
    
    log "✅ Déploiement Phase 2.3 terminé avec succès"
}

# Gestion des erreurs
trap 'error "Erreur lors du déploiement à la ligne $LINENO"' ERR

# Exécution
main "$@"

