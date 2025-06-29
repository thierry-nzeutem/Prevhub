#!/bin/bash

# Script de déploiement ERP PrevHub - Phase 1.4
# Gestion des clients et établissements

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_HOST="217.65.146.10"
SERVER_USER="root"
REMOTE_DIR="/opt/prevhub"
BACKUP_DIR="/opt/prevhub/backups"
LOCAL_DIR="$(pwd)"

# Fonction d'affichage des messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction d'aide
show_help() {
    echo "Script de déploiement ERP PrevHub - Phase 1.4"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --auto          Déploiement automatique sans confirmation"
    echo "  --backup-only   Créer uniquement une sauvegarde"
    echo "  --db-only       Déployer uniquement les modifications de base de données"
    echo "  --frontend-only Déployer uniquement le frontend"
    echo "  --backend-only  Déployer uniquement le backend"
    echo "  --test          Tester la connexion et les prérequis"
    echo "  --rollback      Restaurer la dernière sauvegarde"
    echo "  --help          Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 --auto                    # Déploiement complet automatique"
    echo "  $0 --test                    # Tester la connexion"
    echo "  $0 --db-only --auto          # Déployer uniquement la DB"
    echo "  $0 --rollback                # Restaurer la dernière sauvegarde"
}

# Fonction de test de connexion
test_connection() {
    log_info "Test de connexion au serveur $SERVER_HOST..."
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$SERVER_HOST "echo 'Connexion réussie'" 2>/dev/null; then
        log_success "Connexion SSH établie avec succès"
        return 0
    else
        log_error "Impossible de se connecter au serveur"
        log_info "Vérifiez que la clé SSH est configurée correctement"
        return 1
    fi
}

# Fonction de vérification des prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Vérifier les fichiers locaux
    local required_files=(
        "ClientsManager.jsx"
        "clients-api.js"
        "init-clients-db.sql"
        "App_with_clients.jsx"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$LOCAL_DIR/$file" ]]; then
            log_error "Fichier manquant: $file"
            return 1
        fi
    done
    
    # Vérifier les services sur le serveur
    log_info "Vérification des services sur le serveur..."
    
    ssh $SERVER_USER@$SERVER_HOST "
        # Vérifier Docker
        if ! command -v docker &> /dev/null; then
            echo 'ERROR: Docker non installé'
            exit 1
        fi
        
        # Vérifier les conteneurs
        if ! docker ps | grep -q prevhub; then
            echo 'WARNING: Conteneurs PrevHub non démarrés'
        fi
        
        # Vérifier PostgreSQL
        if ! docker exec prevhub-postgres pg_isready -U prevhub_user -d prevhub &> /dev/null; then
            echo 'ERROR: PostgreSQL non accessible'
            exit 1
        fi
        
        echo 'SUCCESS: Prérequis vérifiés'
    "
    
    if [[ $? -eq 0 ]]; then
        log_success "Prérequis vérifiés avec succès"
        return 0
    else
        log_error "Échec de la vérification des prérequis"
        return 1
    fi
}

# Fonction de sauvegarde
create_backup() {
    log_info "Création d'une sauvegarde..."
    
    local backup_timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_name="prevhub_backup_${backup_timestamp}"
    
    ssh $SERVER_USER@$SERVER_HOST "
        # Créer le répertoire de sauvegarde
        mkdir -p $BACKUP_DIR
        
        # Sauvegarder la base de données
        docker exec prevhub-postgres pg_dump -U prevhub_user -d prevhub > $BACKUP_DIR/${backup_name}_db.sql
        
        # Sauvegarder les fichiers de l'application
        tar -czf $BACKUP_DIR/${backup_name}_files.tar.gz -C $REMOTE_DIR frontend backend
        
        # Créer un fichier de métadonnées
        cat > $BACKUP_DIR/${backup_name}_metadata.txt << EOF
Backup created: $(date)
Phase: 1.4 - Gestion des clients
Database: prevhub
Files: frontend, backend
EOF
        
        echo 'Sauvegarde créée: $backup_name'
    "
    
    if [[ $? -eq 0 ]]; then
        log_success "Sauvegarde créée avec succès: $backup_name"
        echo "$backup_name" > /tmp/last_backup_name
        return 0
    else
        log_error "Échec de la création de la sauvegarde"
        return 1
    fi
}

# Fonction de déploiement de la base de données
deploy_database() {
    log_info "Déploiement des modifications de base de données..."
    
    # Copier le script SQL
    scp "$LOCAL_DIR/init-clients-db.sql" $SERVER_USER@$SERVER_HOST:/tmp/
    
    # Exécuter le script SQL
    ssh $SERVER_USER@$SERVER_HOST "
        docker exec -i prevhub-postgres psql -U prevhub_user -d prevhub < /tmp/init-clients-db.sql
        rm /tmp/init-clients-db.sql
    "
    
    if [[ $? -eq 0 ]]; then
        log_success "Base de données mise à jour avec succès"
        return 0
    else
        log_error "Échec de la mise à jour de la base de données"
        return 1
    fi
}

# Fonction de déploiement du backend
deploy_backend() {
    log_info "Déploiement du backend..."
    
    # Copier les fichiers backend
    scp "$LOCAL_DIR/clients-api.js" $SERVER_USER@$SERVER_HOST:$REMOTE_DIR/backend/
    
    # Redémarrer le service backend
    ssh $SERVER_USER@$SERVER_HOST "
        cd $REMOTE_DIR
        
        # Arrêter le conteneur backend
        docker stop prevhub-backend || true
        
        # Reconstruire et redémarrer
        docker-compose up -d --build prevhub-backend
        
        # Attendre que le service soit prêt
        sleep 10
        
        # Vérifier que le service répond
        if curl -f http://localhost:3000/api/health &> /dev/null; then
            echo 'Backend démarré avec succès'
        else
            echo 'Erreur: Backend ne répond pas'
            exit 1
        fi
    "
    
    if [[ $? -eq 0 ]]; then
        log_success "Backend déployé avec succès"
        return 0
    else
        log_error "Échec du déploiement du backend"
        return 1
    fi
}

# Fonction de déploiement du frontend
deploy_frontend() {
    log_info "Déploiement du frontend..."
    
    # Copier les fichiers frontend
    scp "$LOCAL_DIR/ClientsManager.jsx" $SERVER_USER@$SERVER_HOST:$REMOTE_DIR/frontend/src/components/
    scp "$LOCAL_DIR/App_with_clients.jsx" $SERVER_USER@$SERVER_HOST:$REMOTE_DIR/frontend/src/App.jsx
    
    # Reconstruire le frontend
    ssh $SERVER_USER@$SERVER_HOST "
        cd $REMOTE_DIR/frontend
        
        # Installer les dépendances si nécessaire
        npm install
        
        # Construire l'application
        npm run build
        
        # Redémarrer le conteneur frontend
        cd $REMOTE_DIR
        docker-compose restart prevhub-frontend
        
        # Vérifier que le service répond
        sleep 5
        if curl -f http://localhost &> /dev/null; then
            echo 'Frontend démarré avec succès'
        else
            echo 'Erreur: Frontend ne répond pas'
            exit 1
        fi
    "
    
    if [[ $? -eq 0 ]]; then
        log_success "Frontend déployé avec succès"
        return 0
    else
        log_error "Échec du déploiement du frontend"
        return 1
    fi
}

# Fonction de test post-déploiement
test_deployment() {
    log_info "Test du déploiement..."
    
    ssh $SERVER_USER@$SERVER_HOST "
        # Tester l'API backend
        echo 'Test de l\'API backend...'
        if ! curl -f http://localhost:3000/api/health; then
            echo 'Erreur: API backend non accessible'
            exit 1
        fi
        
        # Tester les nouvelles API clients
        echo 'Test des API clients...'
        if ! curl -f http://localhost:3000/api/companies; then
            echo 'Erreur: API companies non accessible'
            exit 1
        fi
        
        if ! curl -f http://localhost:3000/api/etablissements; then
            echo 'Erreur: API etablissements non accessible'
            exit 1
        fi
        
        # Tester le frontend
        echo 'Test du frontend...'
        if ! curl -f http://localhost; then
            echo 'Erreur: Frontend non accessible'
            exit 1
        fi
        
        echo 'Tous les tests sont passés avec succès'
    "
    
    if [[ $? -eq 0 ]]; then
        log_success "Tests post-déploiement réussis"
        return 0
    else
        log_error "Échec des tests post-déploiement"
        return 1
    fi
}

# Fonction de rollback
rollback_deployment() {
    log_info "Restauration de la dernière sauvegarde..."
    
    if [[ ! -f /tmp/last_backup_name ]]; then
        log_error "Aucune sauvegarde récente trouvée"
        return 1
    fi
    
    local backup_name=$(cat /tmp/last_backup_name)
    
    ssh $SERVER_USER@$SERVER_HOST "
        if [[ ! -f $BACKUP_DIR/${backup_name}_db.sql ]]; then
            echo 'Erreur: Fichier de sauvegarde non trouvé'
            exit 1
        fi
        
        # Arrêter les services
        cd $REMOTE_DIR
        docker-compose stop
        
        # Restaurer la base de données
        docker-compose start prevhub-postgres
        sleep 5
        docker exec -i prevhub-postgres psql -U prevhub_user -d prevhub < $BACKUP_DIR/${backup_name}_db.sql
        
        # Restaurer les fichiers
        tar -xzf $BACKUP_DIR/${backup_name}_files.tar.gz -C $REMOTE_DIR
        
        # Redémarrer tous les services
        docker-compose up -d
        
        echo 'Restauration terminée'
    "
    
    if [[ $? -eq 0 ]]; then
        log_success "Restauration réussie"
        return 0
    else
        log_error "Échec de la restauration"
        return 1
    fi
}

# Fonction principale de déploiement
main_deployment() {
    local auto_mode=$1
    local db_only=$2
    local frontend_only=$3
    local backend_only=$4
    
    log_info "Début du déploiement ERP PrevHub Phase 1.4"
    
    # Test de connexion
    if ! test_connection; then
        exit 1
    fi
    
    # Vérification des prérequis
    if ! check_prerequisites; then
        exit 1
    fi
    
    # Confirmation utilisateur
    if [[ "$auto_mode" != "true" ]]; then
        echo ""
        log_warning "Vous êtes sur le point de déployer la Phase 1.4 - Gestion des clients"
        echo "Cela inclut :"
        echo "  - Nouvelles tables companies et etablissements"
        echo "  - API enrichies pour la gestion des clients"
        echo "  - Interface ClientsManager complète"
        echo "  - Intégration dans l'application principale"
        echo ""
        read -p "Continuer ? (y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Déploiement annulé"
            exit 0
        fi
    fi
    
    # Création de la sauvegarde
    if ! create_backup; then
        exit 1
    fi
    
    # Déploiement selon les options
    if [[ "$db_only" == "true" ]]; then
        deploy_database
    elif [[ "$frontend_only" == "true" ]]; then
        deploy_frontend
    elif [[ "$backend_only" == "true" ]]; then
        deploy_backend
    else
        # Déploiement complet
        deploy_database && deploy_backend && deploy_frontend
    fi
    
    if [[ $? -eq 0 ]]; then
        # Test du déploiement
        if test_deployment; then
            log_success "🎉 Déploiement Phase 1.4 terminé avec succès !"
            echo ""
            log_info "Nouvelles fonctionnalités disponibles :"
            echo "  🏢 Gestion des entreprises : https://prevhub.preveris.fr/#/clients"
            echo "  🏪 Gestion des établissements"
            echo "  📊 Statistiques clients enrichies"
            echo "  🔍 Recherche unifiée"
            echo ""
            log_info "API disponibles :"
            echo "  GET  /api/companies - Liste des entreprises"
            echo "  POST /api/companies - Créer une entreprise"
            echo "  GET  /api/etablissements - Liste des établissements"
            echo "  GET  /api/clients/stats - Statistiques clients"
            echo "  GET  /api/clients/search - Recherche unifiée"
        else
            log_error "Déploiement terminé mais les tests ont échoué"
            log_warning "Utilisez --rollback pour restaurer la version précédente"
            exit 1
        fi
    else
        log_error "Échec du déploiement"
        log_warning "Utilisez --rollback pour restaurer la version précédente"
        exit 1
    fi
}

# Traitement des arguments
AUTO_MODE=false
BACKUP_ONLY=false
DB_ONLY=false
FRONTEND_ONLY=false
BACKEND_ONLY=false
TEST_ONLY=false
ROLLBACK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --auto)
            AUTO_MODE=true
            shift
            ;;
        --backup-only)
            BACKUP_ONLY=true
            shift
            ;;
        --db-only)
            DB_ONLY=true
            shift
            ;;
        --frontend-only)
            FRONTEND_ONLY=true
            shift
            ;;
        --backend-only)
            BACKEND_ONLY=true
            shift
            ;;
        --test)
            TEST_ONLY=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

# Exécution selon les options
if [[ "$TEST_ONLY" == "true" ]]; then
    test_connection && check_prerequisites
elif [[ "$BACKUP_ONLY" == "true" ]]; then
    create_backup
elif [[ "$ROLLBACK" == "true" ]]; then
    rollback_deployment
else
    main_deployment "$AUTO_MODE" "$DB_ONLY" "$FRONTEND_ONLY" "$BACKEND_ONLY"
fi

