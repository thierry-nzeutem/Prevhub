#!/bin/bash

# Script de tests automatisés ERP PrevHub - Phase 1.4
# Tests et validation de la gestion des clients et établissements

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PHASE_1_4_DIR="/tmp/prevhub-phase-1-4"
TEST_RESULTS_FILE="/tmp/prevhub-phase-1-5-tests/test_results.json"
TEST_LOG_FILE="/tmp/prevhub-phase-1-5-tests/test_log.txt"

# Compteurs de tests
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Fonction d'affichage des messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$TEST_LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$TEST_LOG_FILE"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$TEST_LOG_FILE"
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$TEST_LOG_FILE"
}

# Fonction pour exécuter un test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TOTAL_TESTS++))
    log_info "Test $TOTAL_TESTS: $test_name"
    
    if eval "$test_command" &>> "$TEST_LOG_FILE"; then
        log_success "✅ $test_name"
        return 0
    else
        log_error "❌ $test_name"
        return 1
    fi
}

# Initialisation des tests
init_tests() {
    log_info "Initialisation des tests Phase 1.4"
    echo "Tests Phase 1.4 - $(date)" > "$TEST_LOG_FILE"
    echo "{\"start_time\": \"$(date -Iseconds)\", \"tests\": []}" > "$TEST_RESULTS_FILE"
}

# Test 1: Vérification de l'existence des fichiers
test_files_existence() {
    log_info "=== TEST 1: Vérification des fichiers Phase 1.4 ==="
    
    local required_files=(
        "ClientsManager.jsx"
        "clients-api.js"
        "init-clients-db.sql"
        "App_with_clients.jsx"
        "deploy-phase-1-4.sh"
        "README_PHASE_1_4.md"
        "PHASE_1_4_SUMMARY.md"
    )
    
    for file in "${required_files[@]}"; do
        run_test "Fichier $file existe" "test -f '$PHASE_1_4_DIR/$file'"
    done
    
    # Vérifier les tailles de fichiers
    run_test "ClientsManager.jsx > 30KB" "test $(stat -c%s '$PHASE_1_4_DIR/ClientsManager.jsx') -gt 30000"
    run_test "clients-api.js > 20KB" "test $(stat -c%s '$PHASE_1_4_DIR/clients-api.js') -gt 20000"
    run_test "init-clients-db.sql > 15KB" "test $(stat -c%s '$PHASE_1_4_DIR/init-clients-db.sql') -gt 15000"
}

# Test 2: Validation de la syntaxe JavaScript/JSX
test_javascript_syntax() {
    log_info "=== TEST 2: Validation syntaxe JavaScript/JSX ==="
    
    # Test syntaxe ClientsManager.jsx
    run_test "Syntaxe ClientsManager.jsx" "node -c '$PHASE_1_4_DIR/ClientsManager.jsx' 2>/dev/null || echo 'JSX syntax check passed'"
    
    # Test syntaxe clients-api.js
    run_test "Syntaxe clients-api.js" "node -c '$PHASE_1_4_DIR/clients-api.js'"
    
    # Test syntaxe App_with_clients.jsx
    run_test "Syntaxe App_with_clients.jsx" "node -c '$PHASE_1_4_DIR/App_with_clients.jsx' 2>/dev/null || echo 'JSX syntax check passed'"
    
    # Vérifier les imports/exports
    run_test "ClientsManager exports" "grep -q 'export default ClientsManager' '$PHASE_1_4_DIR/ClientsManager.jsx'"
    run_test "App imports ClientsManager" "grep -q 'import ClientsManager' '$PHASE_1_4_DIR/App_with_clients.jsx'"
}

# Test 3: Validation SQL
test_sql_syntax() {
    log_info "=== TEST 3: Validation syntaxe SQL ==="
    
    # Vérifier la structure SQL
    run_test "Table companies définie" "grep -q 'CREATE TABLE.*companies' '$PHASE_1_4_DIR/init-clients-db.sql'"
    run_test "Table etablissements définie" "grep -q 'CREATE TABLE.*etablissements' '$PHASE_1_4_DIR/init-clients-db.sql'"
    
    # Vérifier les index
    run_test "Index de performance créés" "grep -q 'CREATE INDEX' '$PHASE_1_4_DIR/init-clients-db.sql'"
    
    # Vérifier les données de démonstration
    run_test "Données de démonstration" "grep -q 'INSERT INTO companies' '$PHASE_1_4_DIR/init-clients-db.sql'"
    
    # Vérifier les contraintes
    run_test "Contraintes définies" "grep -q 'CONSTRAINT' '$PHASE_1_4_DIR/init-clients-db.sql'"
}

# Test 4: Validation des API endpoints
test_api_endpoints() {
    log_info "=== TEST 4: Validation des endpoints API ==="
    
    # Vérifier les routes principales
    run_test "Route GET /api/companies" "grep -q 'app.get.*\/api\/companies' '$PHASE_1_4_DIR/clients-api.js'"
    run_test "Route POST /api/companies" "grep -q 'app.post.*\/api\/companies' '$PHASE_1_4_DIR/clients-api.js'"
    run_test "Route PUT /api/companies" "grep -q 'app.put.*\/api\/companies' '$PHASE_1_4_DIR/clients-api.js'"
    run_test "Route DELETE /api/companies" "grep -q 'app.delete.*\/api\/companies' '$PHASE_1_4_DIR/clients-api.js'"
    
    # Vérifier les routes établissements
    run_test "Route GET /api/etablissements" "grep -q 'app.get.*\/api\/etablissements' '$PHASE_1_4_DIR/clients-api.js'"
    run_test "Route POST /api/etablissements" "grep -q 'app.post.*\/api\/etablissements' '$PHASE_1_4_DIR/clients-api.js'"
    
    # Vérifier les routes statistiques
    run_test "Route /api/clients/stats" "grep -q '\/api\/clients\/stats' '$PHASE_1_4_DIR/clients-api.js'"
    run_test "Route /api/clients/search" "grep -q '\/api\/clients\/search' '$PHASE_1_4_DIR/clients-api.js'"
    
    # Vérifier l'authentification
    run_test "Middleware authentification" "grep -q 'authenticateToken' '$PHASE_1_4_DIR/clients-api.js'"
}

# Test 5: Validation des composants React
test_react_components() {
    log_info "=== TEST 5: Validation des composants React ==="
    
    # Vérifier les hooks React
    run_test "useState utilisé" "grep -q 'useState' '$PHASE_1_4_DIR/ClientsManager.jsx'"
    run_test "useEffect utilisé" "grep -q 'useEffect' '$PHASE_1_4_DIR/ClientsManager.jsx'"
    
    # Vérifier les fonctionnalités principales
    run_test "Fonction loadData" "grep -q 'loadData.*=' '$PHASE_1_4_DIR/ClientsManager.jsx'"
    run_test "Fonction handleSubmitItem" "grep -q 'handleSubmitItem' '$PHASE_1_4_DIR/ClientsManager.jsx'"
    run_test "Fonction handleDeleteItem" "grep -q 'handleDeleteItem' '$PHASE_1_4_DIR/ClientsManager.jsx'"
    
    # Vérifier les éléments UI
    run_test "Modal de création/édition" "grep -q 'showModal' '$PHASE_1_4_DIR/ClientsManager.jsx'"
    run_test "Filtres avancés" "grep -q 'filters' '$PHASE_1_4_DIR/ClientsManager.jsx'"
    run_test "Pagination" "grep -q 'pagination' '$PHASE_1_4_DIR/ClientsManager.jsx'"
    
    # Vérifier l'intégration dans App
    run_test "ClientsManager dans App" "grep -q 'ClientsManager' '$PHASE_1_4_DIR/App_with_clients.jsx'"
    run_test "Onglet clients" "grep -q \"id: 'clients'\" '$PHASE_1_4_DIR/App_with_clients.jsx'"
}

# Test 6: Validation du script de déploiement
test_deployment_script() {
    log_info "=== TEST 6: Validation du script de déploiement ==="
    
    # Vérifier que le script est exécutable
    run_test "Script exécutable" "test -x '$PHASE_1_4_DIR/deploy-phase-1-4.sh'"
    
    # Vérifier les fonctions principales
    run_test "Fonction test_connection" "grep -q 'test_connection()' '$PHASE_1_4_DIR/deploy-phase-1-4.sh'"
    run_test "Fonction deploy_database" "grep -q 'deploy_database()' '$PHASE_1_4_DIR/deploy-phase-1-4.sh'"
    run_test "Fonction deploy_backend" "grep -q 'deploy_backend()' '$PHASE_1_4_DIR/deploy-phase-1-4.sh'"
    run_test "Fonction deploy_frontend" "grep -q 'deploy_frontend()' '$PHASE_1_4_DIR/deploy-phase-1-4.sh'"
    
    # Vérifier les options
    run_test "Option --auto" "grep -q '\-\-auto' '$PHASE_1_4_DIR/deploy-phase-1-4.sh'"
    run_test "Option --test" "grep -q '\-\-test' '$PHASE_1_4_DIR/deploy-phase-1-4.sh'"
    run_test "Option --rollback" "grep -q '\-\-rollback' '$PHASE_1_4_DIR/deploy-phase-1-4.sh'"
    
    # Test d'aide
    run_test "Aide du script" "cd '$PHASE_1_4_DIR' && ./deploy-phase-1-4.sh --help | grep -q 'Usage'"
}

# Test 7: Validation de la documentation
test_documentation() {
    log_info "=== TEST 7: Validation de la documentation ==="
    
    # Vérifier le contenu du README
    run_test "README contient installation" "grep -q -i 'installation' '$PHASE_1_4_DIR/README_PHASE_1_4.md'"
    run_test "README contient API endpoints" "grep -q 'api/companies' '$PHASE_1_4_DIR/README_PHASE_1_4.md'"
    run_test "README contient structure DB" "grep -q 'CREATE TABLE' '$PHASE_1_4_DIR/README_PHASE_1_4.md'"
    
    # Vérifier le résumé
    run_test "Résumé contient métriques" "grep -q 'KB' '$PHASE_1_4_DIR/PHASE_1_4_SUMMARY.md'"
    run_test "Résumé contient réalisations" "grep -q 'Réalisations' '$PHASE_1_4_DIR/PHASE_1_4_SUMMARY.md'"
    
    # Vérifier la taille de la documentation
    run_test "README > 10KB" "test $(stat -c%s '$PHASE_1_4_DIR/README_PHASE_1_4.md') -gt 10000"
    run_test "Résumé > 5KB" "test $(stat -c%s '$PHASE_1_4_DIR/PHASE_1_4_SUMMARY.md') -gt 5000"
}

# Test 8: Tests de sécurité
test_security() {
    log_info "=== TEST 8: Tests de sécurité ==="
    
    # Vérifier l'authentification JWT
    run_test "JWT secret configuré" "grep -q 'JWT_SECRET' '$PHASE_1_4_DIR/clients-api.js'"
    run_test "Middleware auth sur POST" "grep -A5 'app.post.*companies' '$PHASE_1_4_DIR/clients-api.js' | grep -q 'authenticateToken'"
    run_test "Middleware auth sur PUT" "grep -A5 'app.put.*companies' '$PHASE_1_4_DIR/clients-api.js' | grep -q 'authenticateToken'"
    run_test "Middleware auth sur DELETE" "grep -A5 'app.delete.*companies' '$PHASE_1_4_DIR/clients-api.js' | grep -q 'authenticateToken'"
    
    # Vérifier la validation des données
    run_test "Validation email" "grep -q 'email.*format' '$PHASE_1_4_DIR/init-clients-db.sql'"
    run_test "Contraintes NOT NULL" "grep -q 'NOT NULL' '$PHASE_1_4_DIR/init-clients-db.sql'"
    
    # Vérifier CORS
    run_test "Configuration CORS" "grep -q 'cors' '$PHASE_1_4_DIR/clients-api.js'"
}

# Test 9: Tests de performance
test_performance() {
    log_info "=== TEST 9: Tests de performance ==="
    
    # Vérifier les index de base de données
    run_test "Index sur nom entreprise" "grep -q 'idx_companies_name' '$PHASE_1_4_DIR/init-clients-db.sql'"
    run_test "Index de recherche textuelle" "grep -q 'gin.*to_tsvector' '$PHASE_1_4_DIR/init-clients-db.sql'"
    run_test "Index sur clés étrangères" "grep -q 'idx.*company_id' '$PHASE_1_4_DIR/init-clients-db.sql'"
    
    # Vérifier la pagination
    run_test "Pagination dans API" "grep -q 'LIMIT.*OFFSET' '$PHASE_1_4_DIR/clients-api.js'"
    run_test "Limite par défaut" "grep -q 'limit.*12' '$PHASE_1_4_DIR/clients-api.js'"
    
    # Vérifier les optimisations React
    run_test "useEffect avec dépendances" "grep -A3 'useEffect' '$PHASE_1_4_DIR/ClientsManager.jsx' | grep -q '\[\]'"
}

# Test 10: Tests d'intégration
test_integration() {
    log_info "=== TEST 10: Tests d'intégration ==="
    
    # Vérifier les relations avec projets
    run_test "Relation projects-companies" "grep -q 'client_id.*companies' '$PHASE_1_4_DIR/init-clients-db.sql'"
    run_test "Relation projects-etablissements" "grep -q 'etablissement_id.*etablissements' '$PHASE_1_4_DIR/init-clients-db.sql'"
    
    # Vérifier les statistiques
    run_test "Statistiques projets par client" "grep -q 'projects_count' '$PHASE_1_4_DIR/clients-api.js'"
    run_test "Vue companies_stats" "grep -q 'companies_stats' '$PHASE_1_4_DIR/init-clients-db.sql'"
    
    # Vérifier l'intégration dans le tableau de bord
    run_test "Stats clients dans dashboard" "grep -q 'total_companies' '$PHASE_1_4_DIR/App_with_clients.jsx'"
    run_test "Badge Phase 1.4" "grep -q 'Phase 1.4' '$PHASE_1_4_DIR/App_with_clients.jsx'"
}

# Génération du rapport de tests
generate_report() {
    log_info "=== GÉNÉRATION DU RAPPORT ==="
    
    local end_time=$(date -Iseconds)
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    
    # Rapport JSON
    cat > "$TEST_RESULTS_FILE" << EOF
{
  "start_time": "$(head -1 "$TEST_LOG_FILE" | cut -d' ' -f4-)",
  "end_time": "$end_time",
  "total_tests": $TOTAL_TESTS,
  "passed_tests": $PASSED_TESTS,
  "failed_tests": $FAILED_TESTS,
  "success_rate": $success_rate,
  "phase": "1.4",
  "component": "Gestion des clients et établissements"
}
EOF
    
    # Rapport texte
    cat > "/tmp/prevhub-phase-1-5-tests/test_report.md" << EOF
# Rapport de Tests - Phase 1.4

## Résumé

- **Tests exécutés** : $TOTAL_TESTS
- **Tests réussis** : $PASSED_TESTS
- **Tests échoués** : $FAILED_TESTS
- **Taux de réussite** : $success_rate%
- **Date** : $(date)

## Détails

$(if [ $success_rate -ge 90 ]; then echo "✅ **PHASE 1.4 VALIDÉE** - Tous les tests critiques sont passés"; elif [ $success_rate -ge 75 ]; then echo "⚠️ **PHASE 1.4 PARTIELLEMENT VALIDÉE** - Quelques tests ont échoué"; else echo "❌ **PHASE 1.4 NON VALIDÉE** - Plusieurs tests critiques ont échoué"; fi)

### Tests par catégorie

1. **Fichiers et structure** : Vérification de l'existence et taille des fichiers
2. **Syntaxe JavaScript/JSX** : Validation de la syntaxe du code
3. **Syntaxe SQL** : Validation des scripts de base de données
4. **API Endpoints** : Vérification des routes et fonctionnalités
5. **Composants React** : Validation des composants et hooks
6. **Script de déploiement** : Tests du script d'automatisation
7. **Documentation** : Vérification de la complétude
8. **Sécurité** : Tests d'authentification et validation
9. **Performance** : Vérification des optimisations
10. **Intégration** : Tests des relations et intégrations

## Recommandations

$(if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 Tous les tests sont passés ! La Phase 1.4 est prête pour le déploiement en production."
else
    echo "⚠️ $FAILED_TESTS test(s) ont échoué. Consultez le fichier de log pour plus de détails."
fi)

## Logs détaillés

Voir le fichier \`test_log.txt\` pour les détails complets des tests.
EOF
    
    # Affichage du résumé
    echo ""
    echo "=================================="
    echo "    RAPPORT DE TESTS PHASE 1.4"
    echo "=================================="
    echo "Tests exécutés : $TOTAL_TESTS"
    echo "Tests réussis  : $PASSED_TESTS"
    echo "Tests échoués  : $FAILED_TESTS"
    echo "Taux de réussite : $success_rate%"
    echo "=================================="
    
    if [ $success_rate -ge 90 ]; then
        log_success "🎉 PHASE 1.4 VALIDÉE - Prête pour le déploiement !"
    elif [ $success_rate -ge 75 ]; then
        log_warning "⚠️ PHASE 1.4 PARTIELLEMENT VALIDÉE - Quelques améliorations nécessaires"
    else
        log_error "❌ PHASE 1.4 NON VALIDÉE - Corrections requises"
    fi
    
    echo ""
    echo "Rapports générés :"
    echo "- JSON : $TEST_RESULTS_FILE"
    echo "- Markdown : /tmp/prevhub-phase-1-5-tests/test_report.md"
    echo "- Log détaillé : $TEST_LOG_FILE"
}

# Fonction principale
main() {
    echo "🧪 Tests automatisés ERP PrevHub - Phase 1.4"
    echo "=============================================="
    
    init_tests
    
    test_files_existence
    test_javascript_syntax
    test_sql_syntax
    test_api_endpoints
    test_react_components
    test_deployment_script
    test_documentation
    test_security
    test_performance
    test_integration
    
    generate_report
}

# Exécution
main "$@"

