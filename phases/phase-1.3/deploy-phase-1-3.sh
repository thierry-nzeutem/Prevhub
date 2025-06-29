#!/bin/bash

# Script de déploiement Phase 1.3 - Interface de gestion des projets intégrée
# Intègre le composant ProjectsManager dans l'application ERP PrevHub

set -e  # Arrêter en cas d'erreur

echo "🚀 Déploiement ERP PrevHub Phase 1.3 - Interface Intégrée"
echo "=========================================================="

# Configuration
SERVER="217.65.146.10"
SERVER_PATH="/opt/prevhub"
BACKUP_PATH="/opt/prevhub/backups/phase-1-3-$(date +%Y%m%d_%H%M%S)"

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
    log_info "Création d'une sauvegarde avant déploiement Phase 1.3..."
    ssh root@$SERVER "
        mkdir -p $BACKUP_PATH
        cd $SERVER_PATH
        cp -r frontend $BACKUP_PATH/
        cp -r backend $BACKUP_PATH/ 2>/dev/null || true
        docker-compose -f docker-compose.full.yml ps > $BACKUP_PATH/services_status.txt
        echo 'Sauvegarde Phase 1.3 créée dans $BACKUP_PATH'
    "
    log_success "Sauvegarde créée dans $BACKUP_PATH"
}

# Déployer les améliorations Phase 1.2 (prérequis)
deploy_phase_1_2() {
    log_info "Vérification et déploiement des prérequis Phase 1.2..."
    
    # Vérifier si les fichiers Phase 1.2 existent
    if [ ! -f "../prevhub-enhanced/app.js" ]; then
        log_error "Fichiers Phase 1.2 non trouvés. Veuillez d'abord déployer la Phase 1.2"
        exit 1
    fi
    
    # Copier les fichiers backend Phase 1.2
    scp ../prevhub-enhanced/app.js root@$SERVER:$SERVER_PATH/backend/
    scp ../prevhub-enhanced/package.json root@$SERVER:$SERVER_PATH/backend/
    scp ../prevhub-enhanced/Dockerfile root@$SERVER:$SERVER_PATH/backend/
    
    # Mettre à jour la base de données
    scp ../prevhub-enhanced/init-projects.sql root@$SERVER:/tmp/
    
    ssh root@$SERVER "
        cd $SERVER_PATH
        
        # Mise à jour de la base de données
        docker exec -i prevhub_postgres psql -U prevhub_user -d prevhub < /tmp/init-projects.sql
        rm /tmp/init-projects.sql
        
        # Reconstruction du backend
        docker-compose -f docker-compose.full.yml build backend
        docker-compose -f docker-compose.full.yml up -d backend
        
        # Attendre que le backend soit prêt
        echo 'Attente du démarrage du backend...'
        sleep 15
        
        # Vérifier le health check
        for i in {1..30}; do
            if curl -s http://localhost:3000/api/health > /dev/null; then
                echo 'Backend Phase 1.2 opérationnel'
                break
            fi
            echo 'Attente du backend... (\$i/30)'
            sleep 2
        done
    "
    log_success "Phase 1.2 déployée avec succès"
}

# Déployer l'interface intégrée Phase 1.3
deploy_integrated_interface() {
    log_info "Déploiement de l'interface intégrée Phase 1.3..."
    
    # Copier les nouveaux fichiers React
    scp App_final.jsx root@$SERVER:$SERVER_PATH/frontend/src/App.jsx
    scp ProjectsManager.jsx root@$SERVER:$SERVER_PATH/frontend/src/components/
    
    # Créer un fichier index.js mis à jour si nécessaire
    ssh root@$SERVER "
        cd $SERVER_PATH/frontend/src
        
        # Créer le répertoire components s'il n'existe pas
        mkdir -p components
        
        # Vérifier que le fichier index.js existe et est correct
        if [ ! -f index.js ]; then
            cat > index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF
        fi
        
        echo 'Fichiers React Phase 1.3 copiés'
    "
    
    # Reconstruire le frontend
    ssh root@$SERVER "
        cd $SERVER_PATH
        
        # Reconstruction du frontend avec la nouvelle interface
        docker-compose -f docker-compose.full.yml build frontend
        docker-compose -f docker-compose.full.yml up -d frontend
        
        # Attendre que le frontend soit prêt
        echo 'Attente du démarrage du frontend...'
        sleep 10
        
        # Vérifier que le frontend répond
        for i in {1..20}; do
            if curl -s http://localhost:80 > /dev/null; then
                echo 'Frontend Phase 1.3 opérationnel'
                break
            fi
            echo 'Attente du frontend... (\$i/20)'
            sleep 3
        done
    "
    log_success "Interface intégrée Phase 1.3 déployée"
}

# Tester l'intégration complète
test_integration() {
    log_info "Tests d'intégration Phase 1.3..."
    
    ssh root@$SERVER "
        echo 'Test de l'\''API backend:'
        curl -s http://localhost:3000/api/health | head -c 100
        echo '...'
        
        echo -e '\nTest de l'\''interface frontend:'
        curl -s -o /dev/null -w 'Frontend: %{http_code}\n' http://localhost:80
        
        echo -e '\nTest de l'\''API projets:'
        curl -s http://localhost:3000/api/projects | head -c 100
        echo '...'
        
        echo -e '\nTest des statistiques:'
        curl -s http://localhost:3000/api/dashboard/stats | head -c 100
        echo '...'
        
        echo -e '\nTest HTTPS externe:'
        curl -s -o /dev/null -w 'HTTPS: %{http_code}\n' https://217.65.146.10
    "
    log_success "Tests d'intégration terminés"
}

# Vérifier le déploiement complet
verify_deployment() {
    log_info "Vérification du déploiement Phase 1.3..."
    
    ssh root@$SERVER "
        cd $SERVER_PATH
        echo 'Statut des services:'
        docker-compose -f docker-compose.full.yml ps
        
        echo -e '\nVérification des logs frontend (dernières 5 lignes):'
        docker logs --tail 5 prevhub_frontend
        
        echo -e '\nVérification des logs backend (dernières 5 lignes):'
        docker logs --tail 5 prevhub_backend
        
        echo -e '\nTest de connectivité complète:'
        curl -s -o /dev/null -w 'Backend API: %{http_code}\n' http://localhost:3000/api/health
        curl -s -o /dev/null -w 'Frontend: %{http_code}\n' http://localhost:80
        curl -s -o /dev/null -w 'HTTPS: %{http_code}\n' https://217.65.146.10
    "
    log_success "Vérification terminée"
}

# Afficher les informations post-déploiement
show_deployment_info() {
    echo ""
    echo "🎉 Déploiement Phase 1.3 terminé avec succès !"
    echo "=============================================="
    echo ""
    echo "🌐 Application ERP PrevHub accessible :"
    echo "  • URL principale: https://$SERVER"
    echo "  • Interface moderne avec navigation intégrée"
    echo "  • Module Projets entièrement fonctionnel"
    echo ""
    echo "📋 Fonctionnalités Phase 1.3 :"
    echo "  ✅ Interface utilisateur moderne et responsive"
    echo "  ✅ Navigation intuitive entre les modules"
    echo "  ✅ Gestion des projets complète et intégrée"
    echo "  ✅ Authentification JWT sécurisée"
    echo "  ✅ Tableau de bord avec statistiques en temps réel"
    echo "  ✅ Design cohérent avec animations fluides"
    echo ""
    echo "🔐 Comptes de test :"
    echo "  • Admin: admin@preveris.fr / password123"
    echo "  • User: test@preveris.fr / password123"
    echo ""
    echo "📊 Modules disponibles :"
    echo "  ✅ Tableau de bord - Opérationnel"
    echo "  ✅ Projets - Entièrement fonctionnel"
    echo "  🚧 Clients - Phase 1.4 (en développement)"
    echo "  📅 Documents - Phase 2 (planifié)"
    echo "  📅 Tâches - Phase 2 (planifié)"
    echo "  📅 Rapports - Phase 2 (planifié)"
    echo ""
    echo "🔧 Prochaines étapes :"
    echo "  1. Tester l'interface utilisateur complète"
    echo "  2. Valider les fonctionnalités de gestion des projets"
    echo "  3. Préparer la Phase 1.4 - Gestion des clients"
    echo ""
    echo "📁 Sauvegarde créée dans: $BACKUP_PATH"
    echo ""
    echo "🎯 L'ERP PrevHub Phase 1.3 est maintenant opérationnel !"
    echo ""
}

# Menu principal
show_menu() {
    echo ""
    echo "Choisissez une option de déploiement Phase 1.3 :"
    echo "1) Déploiement complet Phase 1.3 (recommandé)"
    echo "2) Phase 1.2 seulement (prérequis)"
    echo "3) Interface Phase 1.3 seulement"
    echo "4) Tests d'intégration seulement"
    echo "5) Vérification du déploiement"
    echo "6) Quitter"
    echo ""
    read -p "Votre choix (1-6): " choice
}

# Fonction principale
main() {
    echo "🔍 Vérifications préliminaires Phase 1.3..."
    check_server_connection
    
    if [ "$1" = "--auto" ]; then
        # Mode automatique
        log_info "Mode automatique Phase 1.3 activé"
        create_backup
        deploy_phase_1_2
        deploy_integrated_interface
        test_integration
        verify_deployment
        show_deployment_info
    else
        # Mode interactif
        while true; do
            show_menu
            case $choice in
                1)
                    create_backup
                    deploy_phase_1_2
                    deploy_integrated_interface
                    test_integration
                    verify_deployment
                    show_deployment_info
                    break
                    ;;
                2)
                    deploy_phase_1_2
                    ;;
                3)
                    deploy_integrated_interface
                    ;;
                4)
                    test_integration
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
        echo "  --auto    Déploiement automatique complet Phase 1.3"
        echo "  --help    Afficher cette aide"
        echo ""
        echo "Sans option: Mode interactif"
        echo ""
        echo "Prérequis:"
        echo "  - Fichiers Phase 1.2 dans ../prevhub-enhanced/"
        echo "  - Accès SSH au serveur $SERVER"
        echo "  - Docker et Docker Compose sur le serveur"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac

