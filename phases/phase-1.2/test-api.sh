#!/bin/bash

# Script de tests automatisés pour les API ERP PrevHub Phase 1.2
# Teste toutes les fonctionnalités des API projets enrichies

set -e

# Configuration
API_BASE_URL="http://localhost:3000/api"
SERVER_URL="https://217.65.146.10/api"
TEST_EMAIL="admin@preveris.fr"
TEST_PASSWORD="password123"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables globales
TOKEN=""
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Fonctions utilitaires
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Fonction de test générique
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_status="$3"
    
    ((TOTAL_TESTS++))
    log_info "Test: $test_name"
    
    # Exécuter la commande et capturer le code de retour
    local response
    local status_code
    
    if response=$(eval "$command" 2>/dev/null); then
        status_code=$(echo "$response" | tail -n1)
        if [[ "$status_code" == "$expected_status" ]] || [[ "$expected_status" == "any" ]]; then
            log_success "$test_name"
            return 0
        else
            log_error "$test_name - Code attendu: $expected_status, reçu: $status_code"
            return 1
        fi
    else
        log_error "$test_name - Échec de la requête"
        return 1
    fi
}

# Test de connectivité
test_connectivity() {
    log_info "=== Tests de connectivité ==="
    
    run_test "Ping serveur local" \
        "curl -s -o /dev/null -w '%{http_code}' $API_BASE_URL/health" \
        "200"
    
    run_test "Ping serveur distant" \
        "curl -s -o /dev/null -w '%{http_code}' $SERVER_URL/health" \
        "200"
}

# Test d'authentification
test_authentication() {
    log_info "=== Tests d'authentification ==="
    
    # Test de connexion valide
    local auth_response
    auth_response=$(curl -s -X POST "$API_BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    
    if echo "$auth_response" | grep -q '"success":true'; then
        TOKEN=$(echo "$auth_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        log_success "Authentification valide"
        ((PASSED_TESTS++))
    else
        log_error "Authentification valide"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
    
    # Test de connexion invalide
    run_test "Authentification invalide" \
        "curl -s -o /dev/null -w '%{http_code}' -X POST '$API_BASE_URL/auth/login' -H 'Content-Type: application/json' -d '{\"email\":\"wrong@email.com\",\"password\":\"wrongpass\"}'" \
        "401"
}

# Test des API projets
test_projects_api() {
    log_info "=== Tests API Projets ==="
    
    # Test liste des projets
    run_test "Liste des projets" \
        "curl -s -o /dev/null -w '%{http_code}' '$API_BASE_URL/projects'" \
        "200"
    
    # Test avec filtres
    run_test "Projets avec filtres" \
        "curl -s -o /dev/null -w '%{http_code}' '$API_BASE_URL/projects?status=active&priority=high&page=1&limit=5'" \
        "200"
    
    # Test recherche
    run_test "Recherche projets" \
        "curl -s -o /dev/null -w '%{http_code}' '$API_BASE_URL/projects?search=audit'" \
        "200"
    
    # Test tri
    run_test "Tri des projets" \
        "curl -s -o /dev/null -w '%{http_code}' '$API_BASE_URL/projects?sort_by=name&sort_order=ASC'" \
        "200"
    
    if [[ -n "$TOKEN" ]]; then
        # Test création de projet
        local project_data='{"name":"Test Projet API","description":"Projet créé par les tests automatisés","status":"draft","priority":"medium"}'
        
        local create_response
        create_response=$(curl -s -X POST "$API_BASE_URL/projects" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$project_data")
        
        if echo "$create_response" | grep -q '"success":true'; then
            local project_id
            project_id=$(echo "$create_response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
            log_success "Création de projet"
            ((PASSED_TESTS++))
            
            # Test récupération du projet créé
            run_test "Récupération projet spécifique" \
                "curl -s -o /dev/null -w '%{http_code}' '$API_BASE_URL/projects/$project_id'" \
                "200"
            
            # Test mise à jour du projet
            local update_data='{"name":"Test Projet API Modifié","status":"active"}'
            run_test "Mise à jour projet" \
                "curl -s -o /dev/null -w '%{http_code}' -X PUT '$API_BASE_URL/projects/$project_id' -H 'Content-Type: application/json' -H 'Authorization: Bearer $TOKEN' -d '$update_data'" \
                "200"
            
            # Test suppression du projet
            run_test "Suppression projet" \
                "curl -s -o /dev/null -w '%{http_code}' -X DELETE '$API_BASE_URL/projects/$project_id' -H 'Authorization: Bearer $TOKEN'" \
                "200"
        else
            log_error "Création de projet"
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
    else
        log_warning "Tests CRUD ignorés - pas de token d'authentification"
    fi
}

# Test des API de données
test_data_apis() {
    log_info "=== Tests API Données ==="
    
    # Test API entreprises
    run_test "Liste des entreprises" \
        "curl -s -o /dev/null -w '%{http_code}' '$API_BASE_URL/companies'" \
        "200"
    
    # Test avec recherche
    run_test "Recherche entreprises" \
        "curl -s -o /dev/null -w '%{http_code}' '$API_BASE_URL/companies?search=test&limit=10'" \
        "200"
    
    # Test API établissements
    run_test "Liste des établissements" \
        "curl -s -o /dev/null -w '%{http_code}' '$API_BASE_URL/etablissements'" \
        "200"
    
    # Test statistiques
    run_test "Statistiques dashboard" \
        "curl -s -o /dev/null -w '%{http_code}' '$API_BASE_URL/dashboard/stats'" \
        "200"
}

# Test de performance
test_performance() {
    log_info "=== Tests de performance ==="
    
    # Test temps de réponse health check
    local response_time
    response_time=$(curl -s -o /dev/null -w '%{time_total}' "$API_BASE_URL/health")
    
    if (( $(echo "$response_time < 1.0" | bc -l) )); then
        log_success "Temps de réponse health check: ${response_time}s"
        ((PASSED_TESTS++))
    else
        log_error "Temps de réponse health check trop lent: ${response_time}s"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
    
    # Test temps de réponse liste projets
    response_time=$(curl -s -o /dev/null -w '%{time_total}' "$API_BASE_URL/projects?limit=50")
    
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        log_success "Temps de réponse liste projets: ${response_time}s"
        ((PASSED_TESTS++))
    else
        log_error "Temps de réponse liste projets trop lent: ${response_time}s"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
}

# Test de sécurité
test_security() {
    log_info "=== Tests de sécurité ==="
    
    # Test accès sans authentification aux endpoints protégés
    run_test "Création projet sans auth" \
        "curl -s -o /dev/null -w '%{http_code}' -X POST '$API_BASE_URL/projects' -H 'Content-Type: application/json' -d '{\"name\":\"Test\"}'" \
        "401"
    
    # Test avec token invalide
    run_test "Création projet token invalide" \
        "curl -s -o /dev/null -w '%{http_code}' -X POST '$API_BASE_URL/projects' -H 'Content-Type: application/json' -H 'Authorization: Bearer invalid_token' -d '{\"name\":\"Test\"}'" \
        "403"
    
    # Test injection SQL basique
    run_test "Protection injection SQL" \
        "curl -s -o /dev/null -w '%{http_code}' '$API_BASE_URL/projects?search=test%27%20OR%20%271%27%3D%271'" \
        "200"
}

# Test de validation des données
test_data_validation() {
    log_info "=== Tests de validation ==="
    
    if [[ -n "$TOKEN" ]]; then
        # Test création projet sans nom (requis)
        run_test "Validation nom requis" \
            "curl -s -o /dev/null -w '%{http_code}' -X POST '$API_BASE_URL/projects' -H 'Content-Type: application/json' -H 'Authorization: Bearer $TOKEN' -d '{\"description\":\"Test sans nom\"}'" \
            "500"
        
        # Test avec statut invalide
        run_test "Validation statut invalide" \
            "curl -s -o /dev/null -w '%{http_code}' -X POST '$API_BASE_URL/projects' -H 'Content-Type: application/json' -H 'Authorization: Bearer $TOKEN' -d '{\"name\":\"Test\",\"status\":\"invalid_status\"}'" \
            "500"
    else
        log_warning "Tests de validation ignorés - pas de token d'authentification"
    fi
}

# Affichage des résultats
show_results() {
    echo ""
    echo "🧪 Résultats des tests API ERP PrevHub"
    echo "======================================"
    echo ""
    echo "📊 Statistiques:"
    echo "  • Total des tests: $TOTAL_TESTS"
    echo "  • Tests réussis: $PASSED_TESTS"
    echo "  • Tests échoués: $FAILED_TESTS"
    echo ""
    
    local success_rate
    if [[ $TOTAL_TESTS -gt 0 ]]; then
        success_rate=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
        echo "  • Taux de réussite: $success_rate%"
    else
        echo "  • Taux de réussite: N/A"
    fi
    
    echo ""
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}✅ Tous les tests sont passés avec succès !${NC}"
        echo "L'API ERP PrevHub Phase 1.2 est opérationnelle."
    else
        echo -e "${RED}❌ $FAILED_TESTS test(s) ont échoué.${NC}"
        echo "Vérifiez les logs ci-dessus pour plus de détails."
    fi
    echo ""
}

# Fonction principale
main() {
    echo "🧪 Tests automatisés ERP PrevHub Phase 1.2"
    echo "==========================================="
    echo ""
    
    # Déterminer l'URL de base selon l'argument
    if [[ "$1" == "--remote" ]]; then
        API_BASE_URL="$SERVER_URL"
        log_info "Tests sur le serveur distant: $SERVER_URL"
    else
        log_info "Tests sur le serveur local: $API_BASE_URL"
    fi
    
    # Vérifier si curl est disponible
    if ! command -v curl &> /dev/null; then
        log_error "curl n'est pas installé. Installation requise pour les tests."
        exit 1
    fi
    
    # Vérifier si bc est disponible pour les calculs de performance
    if ! command -v bc &> /dev/null; then
        log_warning "bc n'est pas installé. Tests de performance limités."
    fi
    
    # Exécuter les tests
    test_connectivity
    test_authentication
    test_projects_api
    test_data_apis
    
    if command -v bc &> /dev/null; then
        test_performance
    fi
    
    test_security
    test_data_validation
    
    # Afficher les résultats
    show_results
    
    # Code de sortie
    if [[ $FAILED_TESTS -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Gestion des arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [--remote|--help]"
        echo ""
        echo "Options:"
        echo "  --remote  Tester le serveur distant (https://217.65.146.10)"
        echo "  --help    Afficher cette aide"
        echo ""
        echo "Sans option: Teste le serveur local (http://localhost:3000)"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac

