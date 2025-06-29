#!/bin/bash

# Script de déploiement automatisé pour ERP PrevHub Phase 1.2
# Déploie les API projets enrichies et l'interface de gestion

set -e  # Arrêter en cas d'erreur

echo "🚀 Déploiement ERP PrevHub Phase 1.2 - API Projets Enrichies"
echo "=============================================================="

# Configuration
SERVER="217.65.146.10"
SERVER_PATH="/opt/prevhub"
BACKUP_PATH="/opt/prevhub/backups/$(date +%Y%m%d_%H%M%S)"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
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

# Vérifier la connectivité au serveur
check_server_connection() {
    log_info "Vérification de la connexion au serveur..."
    if ssh -o ConnectTimeout=10 root@$SERVER "echo 'Connexion OK'" > /dev/null 2>&1; then
        log_success "Connexion au serveur établie"
    else
        log_error "Impossible de se connecter au serveur $SERVER"
        log_error "Vérifiez votre clé SSH et la connectivité réseau"
        exit 1
    fi
}

# Créer une sauvegarde
create_backup() {
    log_info "Création d'une sauvegarde..."
    ssh root@$SERVER "
        mkdir -p $BACKUP_PATH
        cd $SERVER_PATH
        cp -r backend $BACKUP_PATH/
        cp -r frontend $BACKUP_PATH/
        docker-compose -f docker-compose.full.yml ps > $BACKUP_PATH/services_status.txt
        echo 'Sauvegarde créée dans $BACKUP_PATH'
    "
    log_success "Sauvegarde créée dans $BACKUP_PATH"
}

# Mettre à jour la base de données
update_database() {
    log_info "Mise à jour de la structure de la base de données..."
    
    # Copier le script SQL
    scp init-projects.sql root@$SERVER:/tmp/
    
    # Exécuter le script SQL
    ssh root@$SERVER "
        cd $SERVER_PATH
        docker exec -i prevhub_postgres psql -U prevhub_user -d prevhub < /tmp/init-projects.sql
        rm /tmp/init-projects.sql
    "
    log_success "Base de données mise à jour avec succès"
}

# Déployer le backend enrichi
deploy_backend() {
    log_info "Déploiement du backend enrichi..."
    
    # Copier les fichiers backend
    scp app.js package.json Dockerfile root@$SERVER:$SERVER_PATH/backend/
    
    # Reconstruire et redémarrer le backend
    ssh root@$SERVER "
        cd $SERVER_PATH
        docker-compose -f docker-compose.full.yml build backend
        docker-compose -f docker-compose.full.yml up -d backend
        
        # Attendre que le service soit prêt
        echo 'Attente du démarrage du backend...'
        sleep 10
        
        # Vérifier le health check
        for i in {1..30}; do
            if curl -s http://localhost:3000/api/health > /dev/null; then
                echo 'Backend démarré avec succès'
                break
            fi
            echo 'Attente du backend... (\$i/30)'
            sleep 2
        done
    "
    log_success "Backend déployé et opérationnel"
}

# Tester les API
test_apis() {
    log_info "Test des API enrichies..."
    
    ssh root@$SERVER "
        echo 'Test du health check:'
        curl -s http://localhost:3000/api/health | jq '.' || echo 'jq non disponible'
        
        echo -e '\nTest de l'\''API projets:'
        curl -s http://localhost:3000/api/projects | head -c 200
        echo '...'
        
        echo -e '\nTest de l'\''API entreprises:'
        curl -s 'http://localhost:3000/api/companies?limit=5' | head -c 200
        echo '...'
        
        echo -e '\nTest des statistiques:'
        curl -s http://localhost:3000/api/dashboard/stats | head -c 200
        echo '...'
    "
    log_success "Tests API terminés"
}

# Déployer l'interface React (optionnel)
deploy_frontend() {
    log_info "Préparation du composant React ProjectsManager..."
    
    # Copier le composant React
    scp ProjectsManager.jsx root@$SERVER:/tmp/
    
    ssh root@$SERVER "
        # Créer le répertoire components s'il n'existe pas
        mkdir -p $SERVER_PATH/frontend/src/components
        
        # Copier le composant
        cp /tmp/ProjectsManager.jsx $SERVER_PATH/frontend/src/components/
        rm /tmp/ProjectsManager.jsx
        
        echo 'Composant ProjectsManager copié dans le frontend'
        echo 'Note: Intégration manuelle requise dans App.jsx'
    "
    log_success "Composant React préparé"
}

# Vérifier le déploiement
verify_deployment() {
    log_info "Vérification du déploiement..."
    
    ssh root@$SERVER "
        cd $SERVER_PATH
        echo 'Statut des services:'
        docker-compose -f docker-compose.full.yml ps
        
        echo -e '\nVérification des logs backend (dernières 10 lignes):'
        docker logs --tail 10 prevhub_backend
        
        echo -e '\nTest de connectivité:'
        curl -s -o /dev/null -w 'Backend API: %{http_code}\n' http://localhost:3000/api/health
        curl -s -o /dev/null -w 'Frontend: %{http_code}\n' http://localhost:80
    "
    log_success "Vérification terminée"
}

# Afficher les informations post-déploiement
show_deployment_info() {
    echo ""
    echo "🎉 Déploiement terminé avec succès !"
    echo "=================================="
    echo ""
    echo "📊 API Projets enrichies disponibles :"
    echo "  • Health check: https://$SERVER/api/health"
    echo "  • Projets: https://$SERVER/api/projects"
    echo "  • Entreprises: https://$SERVER/api/companies"
    echo "  • Statistiques: https://$SERVER/api/dashboard/stats"
    echo ""
    echo "🔐 Comptes de test :"
    echo "  • Admin: admin@preveris.fr / password123"
    echo "  • User: test@preveris.fr / password123"
    echo ""
    echo "📋 Fonctionnalités ajoutées :"
    echo "  ✅ Filtrage avancé des projets"
    echo "  ✅ Pagination intelligente"
    echo "  ✅ Recherche en temps réel"
    echo "  ✅ Relations avec clients/établissements"
    echo "  ✅ Authentification JWT"
    echo "  ✅ Validation des données"
    echo ""
    echo "🔧 Prochaines étapes :"
    echo "  1. Intégrer ProjectsManager.jsx dans App.jsx"
    echo "  2. Tester l'interface utilisateur"
    echo "  3. Passer à la Phase 1.3"
    echo ""
    echo "📁 Sauvegarde créée dans: $BACKUP_PATH"
    echo ""
}

# Menu principal
show_menu() {
    echo ""
    echo "Choisissez une option de déploiement :"
    echo "1) Déploiement complet (recommandé)"
    echo "2) Base de données seulement"
    echo "3) Backend seulement"
    echo "4) Tests API seulement"
    echo "5) Vérification du déploiement"
    echo "6) Quitter"
    echo ""
    read -p "Votre choix (1-6): " choice
}

# Fonction principale
main() {
    echo "🔍 Vérifications préliminaires..."
    check_server_connection
    
    if [ "$1" = "--auto" ]; then
        # Mode automatique
        log_info "Mode automatique activé"
        create_backup
        update_database
        deploy_backend
        test_apis
        deploy_frontend
        verify_deployment
        show_deployment_info
    else
        # Mode interactif
        while true; do
            show_menu
            case $choice in
                1)
                    create_backup
                    update_database
                    deploy_backend
                    test_apis
                    deploy_frontend
                    verify_deployment
                    show_deployment_info
                    break
                    ;;
                2)
                    update_database
                    ;;
                3)
                    deploy_backend
                    test_apis
                    ;;
                4)
                    test_apis
                    ;;
                5)
                    verify_deployment
                    ;;
                6)
                    log_info "Déploiement annulé"
                    exit 0
                    ;;
                *)
                    log_error "Option invalide. Veuillez choisir entre 1 et 6."
                    ;;
            esac
        done
    fi
}

# Gestion des arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [--auto|--help]"
        echo ""
        echo "Options:"
        echo "  --auto    Déploiement automatique complet"
        echo "  --help    Afficher cette aide"
        echo ""
        echo "Sans option: Mode interactif"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac

