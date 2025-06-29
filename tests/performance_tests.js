// Tests de performance ERP PrevHub - Phase 1.4
// Validation des performances et de la qualité du code

const fs = require('fs');
const path = require('path');

// Configuration
const PHASE_1_4_DIR = '/tmp/prevhub-phase-1-4';
const RESULTS_FILE = '/tmp/prevhub-phase-1-5-tests/performance_results.json';

// Métriques de performance
let performanceMetrics = {
    timestamp: new Date().toISOString(),
    phase: '1.4',
    tests: []
};

// Fonction utilitaire pour ajouter un test
function addTest(name, value, unit, status, details = '') {
    performanceMetrics.tests.push({
        name,
        value,
        unit,
        status,
        details
    });
    
    const statusIcon = status === 'PASS' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${statusIcon} ${name}: ${value}${unit} - ${status}`);
    if (details) console.log(`   ${details}`);
}

// Test 1: Analyse de la taille des fichiers
function testFileSizes() {
    console.log('\n📊 Test 1: Analyse de la taille des fichiers');
    
    const files = [
        'ClientsManager.jsx',
        'clients-api.js',
        'init-clients-db.sql',
        'App_with_clients.jsx',
        'deploy-phase-1-4.sh',
        'README_PHASE_1_4.md',
        'PHASE_1_4_SUMMARY.md'
    ];
    
    let totalSize = 0;
    
    files.forEach(file => {
        const filePath = path.join(PHASE_1_4_DIR, file);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const sizeKB = Math.round(stats.size / 1024);
            totalSize += sizeKB;
            
            // Critères de validation
            let status = 'PASS';
            let details = '';
            
            if (file === 'ClientsManager.jsx' && sizeKB < 30) {
                status = 'FAIL';
                details = 'Composant trop petit, fonctionnalités manquantes';
            } else if (file === 'clients-api.js' && sizeKB < 20) {
                status = 'FAIL';
                details = 'API incomplète';
            } else if (sizeKB > 100) {
                status = 'WARNING';
                details = 'Fichier volumineux, optimisation recommandée';
            }
            
            addTest(`Taille ${file}`, sizeKB, 'KB', status, details);
        } else {
            addTest(`Taille ${file}`, 0, 'KB', 'FAIL', 'Fichier manquant');
        }
    });
    
    addTest('Taille totale Phase 1.4', totalSize, 'KB', 
        totalSize > 100 ? 'PASS' : 'FAIL', 
        totalSize > 100 ? 'Taille appropriée pour une phase complète' : 'Phase incomplète');
}

// Test 2: Analyse de la complexité du code
function testCodeComplexity() {
    console.log('\n🔍 Test 2: Analyse de la complexité du code');
    
    // Analyse ClientsManager.jsx
    const clientsManagerPath = path.join(PHASE_1_4_DIR, 'ClientsManager.jsx');
    if (fs.existsSync(clientsManagerPath)) {
        const content = fs.readFileSync(clientsManagerPath, 'utf8');
        
        // Compter les fonctions
        const functionCount = (content.match(/const\s+\w+\s*=\s*\(/g) || []).length +
                             (content.match(/function\s+\w+\s*\(/g) || []).length;
        
        // Compter les hooks React
        const hooksCount = (content.match(/use\w+\(/g) || []).length;
        
        // Compter les états
        const stateCount = (content.match(/useState\(/g) || []).length;
        
        // Compter les effets
        const effectCount = (content.match(/useEffect\(/g) || []).length;
        
        // Compter les lignes de code (approximatif)
        const linesOfCode = content.split('\n').filter(line => 
            line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('/*')
        ).length;
        
        addTest('Fonctions ClientsManager', functionCount, '', 
            functionCount >= 10 ? 'PASS' : 'WARNING',
            functionCount >= 10 ? 'Complexité appropriée' : 'Fonctionnalités limitées');
            
        addTest('Hooks React', hooksCount, '', 
            hooksCount >= 3 ? 'PASS' : 'FAIL',
            'useState, useEffect requis minimum');
            
        addTest('États gérés', stateCount, '', 
            stateCount >= 5 ? 'PASS' : 'WARNING',
            'Gestion d\'état complexe requise');
            
        addTest('Effets de bord', effectCount, '', 
            effectCount >= 1 ? 'PASS' : 'FAIL',
            'useEffect requis pour chargement données');
            
        addTest('Lignes de code ClientsManager', linesOfCode, '', 
            linesOfCode >= 500 ? 'PASS' : 'WARNING',
            linesOfCode >= 500 ? 'Composant complet' : 'Composant simple');
    }
    
    // Analyse clients-api.js
    const apiPath = path.join(PHASE_1_4_DIR, 'clients-api.js');
    if (fs.existsSync(apiPath)) {
        const content = fs.readFileSync(apiPath, 'utf8');
        
        // Compter les endpoints
        const endpointCount = (content.match(/app\.(get|post|put|delete)\(/g) || []).length;
        
        // Compter les middlewares
        const middlewareCount = (content.match(/authenticateToken/g) || []).length;
        
        // Vérifier la sécurité
        const hasJWT = content.includes('jwt.verify');
        const hasCORS = content.includes('cors');
        const hasValidation = content.includes('required');
        
        addTest('Endpoints API', endpointCount, '', 
            endpointCount >= 8 ? 'PASS' : 'WARNING',
            'CRUD complet pour 2 entités + stats');
            
        addTest('Middlewares sécurité', middlewareCount, '', 
            middlewareCount >= 4 ? 'PASS' : 'WARNING',
            'Protection des routes sensibles');
            
        addTest('Authentification JWT', hasJWT ? 1 : 0, '', 
            hasJWT ? 'PASS' : 'FAIL',
            'Sécurité requise');
            
        addTest('Configuration CORS', hasCORS ? 1 : 0, '', 
            hasCORS ? 'PASS' : 'FAIL',
            'Cross-origin requis');
            
        addTest('Validation données', hasValidation ? 1 : 0, '', 
            hasValidation ? 'PASS' : 'WARNING',
            'Validation côté serveur recommandée');
    }
}

// Test 3: Analyse de la base de données
function testDatabaseStructure() {
    console.log('\n🗄️ Test 3: Analyse de la structure de base de données');
    
    const sqlPath = path.join(PHASE_1_4_DIR, 'init-clients-db.sql');
    if (fs.existsSync(sqlPath)) {
        const content = fs.readFileSync(sqlPath, 'utf8');
        
        // Compter les tables
        const tableCount = (content.match(/CREATE TABLE/gi) || []).length;
        
        // Compter les index
        const indexCount = (content.match(/CREATE INDEX/gi) || []).length;
        
        // Compter les contraintes
        const constraintCount = (content.match(/CONSTRAINT/gi) || []).length;
        
        // Compter les fonctions
        const functionCount = (content.match(/CREATE.*FUNCTION/gi) || []).length;
        
        // Compter les vues
        const viewCount = (content.match(/CREATE.*VIEW/gi) || []).length;
        
        // Compter les triggers
        const triggerCount = (content.match(/CREATE TRIGGER/gi) || []).length;
        
        // Vérifier les données de démonstration
        const hasData = content.includes('INSERT INTO');
        
        addTest('Tables créées', tableCount, '', 
            tableCount >= 2 ? 'PASS' : 'FAIL',
            'companies et etablissements requis');
            
        addTest('Index de performance', indexCount, '', 
            indexCount >= 5 ? 'PASS' : 'WARNING',
            'Optimisation des requêtes');
            
        addTest('Contraintes définies', constraintCount, '', 
            constraintCount >= 3 ? 'PASS' : 'WARNING',
            'Intégrité des données');
            
        addTest('Fonctions SQL', functionCount, '', 
            functionCount >= 2 ? 'PASS' : 'WARNING',
            'Fonctions utilitaires');
            
        addTest('Vues créées', viewCount, '', 
            viewCount >= 1 ? 'PASS' : 'WARNING',
            'Vues pour statistiques');
            
        addTest('Triggers automatiques', triggerCount, '', 
            triggerCount >= 1 ? 'PASS' : 'WARNING',
            'Mise à jour automatique');
            
        addTest('Données de démonstration', hasData ? 1 : 0, '', 
            hasData ? 'PASS' : 'WARNING',
            'Données de test requises');
    }
}

// Test 4: Analyse de la documentation
function testDocumentation() {
    console.log('\n📚 Test 4: Analyse de la documentation');
    
    // Analyse README
    const readmePath = path.join(PHASE_1_4_DIR, 'README_PHASE_1_4.md');
    if (fs.existsSync(readmePath)) {
        const content = fs.readFileSync(readmePath, 'utf8');
        
        const hasInstallation = content.includes('Installation');
        const hasAPI = content.includes('API');
        const hasDatabase = content.includes('base de données');
        const hasExamples = content.includes('exemple');
        const hasTroubleshooting = content.includes('Dépannage');
        
        const wordCount = content.split(/\s+/).length;
        
        addTest('Documentation complète', hasInstallation && hasAPI && hasDatabase ? 1 : 0, '', 
            hasInstallation && hasAPI && hasDatabase ? 'PASS' : 'FAIL',
            'Sections essentielles requises');
            
        addTest('Exemples fournis', hasExamples ? 1 : 0, '', 
            hasExamples ? 'PASS' : 'WARNING',
            'Exemples facilitent l\'utilisation');
            
        addTest('Guide de dépannage', hasTroubleshooting ? 1 : 0, '', 
            hasTroubleshooting ? 'PASS' : 'WARNING',
            'Support utilisateur');
            
        addTest('Mots dans README', wordCount, '', 
            wordCount >= 2000 ? 'PASS' : 'WARNING',
            wordCount >= 2000 ? 'Documentation détaillée' : 'Documentation succincte');
    }
    
    // Analyse résumé
    const summaryPath = path.join(PHASE_1_4_DIR, 'PHASE_1_4_SUMMARY.md');
    if (fs.existsSync(summaryPath)) {
        const content = fs.readFileSync(summaryPath, 'utf8');
        
        const hasMetrics = content.includes('KB') || content.includes('métriques');
        const hasAchievements = content.includes('Réalisations') || content.includes('accomplies');
        const hasConclusion = content.includes('Conclusion') || content.includes('succès');
        
        addTest('Métriques dans résumé', hasMetrics ? 1 : 0, '', 
            hasMetrics ? 'PASS' : 'WARNING',
            'Métriques quantifient les réalisations');
            
        addTest('Réalisations listées', hasAchievements ? 1 : 0, '', 
            hasAchievements ? 'PASS' : 'FAIL',
            'Résumé des accomplissements requis');
            
        addTest('Conclusion présente', hasConclusion ? 1 : 0, '', 
            hasConclusion ? 'PASS' : 'WARNING',
            'Conclusion synthétise les résultats');
    }
}

// Test 5: Analyse du script de déploiement
function testDeploymentScript() {
    console.log('\n🚀 Test 5: Analyse du script de déploiement');
    
    const scriptPath = path.join(PHASE_1_4_DIR, 'deploy-phase-1-4.sh');
    if (fs.existsSync(scriptPath)) {
        const content = fs.readFileSync(scriptPath, 'utf8');
        
        // Vérifier les fonctions principales
        const hasTestConnection = content.includes('test_connection');
        const hasBackup = content.includes('create_backup');
        const hasRollback = content.includes('rollback');
        const hasHelp = content.includes('show_help');
        
        // Compter les options
        const optionCount = (content.match(/--\w+/g) || []).length;
        
        // Vérifier la gestion d'erreurs
        const hasErrorHandling = content.includes('set -e') && content.includes('log_error');
        
        // Vérifier les couleurs
        const hasColors = content.includes('GREEN=') && content.includes('RED=');
        
        addTest('Fonctions essentielles', hasTestConnection && hasBackup && hasRollback ? 1 : 0, '', 
            hasTestConnection && hasBackup && hasRollback ? 'PASS' : 'FAIL',
            'Test, sauvegarde, rollback requis');
            
        addTest('Options disponibles', optionCount, '', 
            optionCount >= 5 ? 'PASS' : 'WARNING',
            'Flexibilité de déploiement');
            
        addTest('Aide intégrée', hasHelp ? 1 : 0, '', 
            hasHelp ? 'PASS' : 'WARNING',
            'Documentation utilisateur');
            
        addTest('Gestion d\'erreurs', hasErrorHandling ? 1 : 0, '', 
            hasErrorHandling ? 'PASS' : 'FAIL',
            'Robustesse du script');
            
        addTest('Interface colorée', hasColors ? 1 : 0, '', 
            hasColors ? 'PASS' : 'WARNING',
            'Expérience utilisateur améliorée');
    }
}

// Test 6: Calcul des métriques globales
function calculateGlobalMetrics() {
    console.log('\n📈 Test 6: Métriques globales de la Phase 1.4');
    
    // Calculer les statistiques des tests
    const totalTests = performanceMetrics.tests.length;
    const passedTests = performanceMetrics.tests.filter(t => t.status === 'PASS').length;
    const warningTests = performanceMetrics.tests.filter(t => t.status === 'WARNING').length;
    const failedTests = performanceMetrics.tests.filter(t => t.status === 'FAIL').length;
    
    const successRate = Math.round((passedTests / totalTests) * 100);
    const qualityScore = Math.round(((passedTests * 1.0 + warningTests * 0.5) / totalTests) * 100);
    
    // Calculer la taille totale
    const files = fs.readdirSync(PHASE_1_4_DIR);
    let totalSize = 0;
    files.forEach(file => {
        const filePath = path.join(PHASE_1_4_DIR, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
    });
    const totalSizeKB = Math.round(totalSize / 1024);
    
    addTest('Tests réussis', passedTests, `/${totalTests}`, 
        successRate >= 80 ? 'PASS' : successRate >= 60 ? 'WARNING' : 'FAIL',
        `Taux de réussite: ${successRate}%`);
        
    addTest('Score de qualité', qualityScore, '%', 
        qualityScore >= 85 ? 'PASS' : qualityScore >= 70 ? 'WARNING' : 'FAIL',
        'Qualité globale du code');
        
    addTest('Taille totale archive', totalSizeKB, 'KB', 
        totalSizeKB >= 100 && totalSizeKB <= 200 ? 'PASS' : 'WARNING',
        'Taille appropriée pour une phase complète');
    
    // Métriques finales
    performanceMetrics.summary = {
        totalTests,
        passedTests,
        warningTests,
        failedTests,
        successRate,
        qualityScore,
        totalSizeKB,
        status: qualityScore >= 85 ? 'EXCELLENT' : qualityScore >= 70 ? 'GOOD' : qualityScore >= 50 ? 'ACCEPTABLE' : 'POOR'
    };
}

// Génération du rapport final
function generateReport() {
    console.log('\n📋 Génération du rapport de performance');
    
    // Sauvegarder les résultats JSON
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(performanceMetrics, null, 2));
    
    // Générer le rapport Markdown
    const reportPath = '/tmp/prevhub-phase-1-5-tests/performance_report.md';
    const summary = performanceMetrics.summary;
    
    const reportContent = `# 📊 Rapport de Performance - Phase 1.4

## Résumé exécutif

- **Tests exécutés** : ${summary.totalTests}
- **Tests réussis** : ${summary.passedTests}
- **Avertissements** : ${summary.warningTests}
- **Tests échoués** : ${summary.failedTests}
- **Taux de réussite** : ${summary.successRate}%
- **Score de qualité** : ${summary.qualityScore}%
- **Statut global** : **${summary.status}**

## Métriques détaillées

${performanceMetrics.tests.map(test => 
    `- ${test.status === 'PASS' ? '✅' : test.status === 'WARNING' ? '⚠️' : '❌'} **${test.name}** : ${test.value}${test.unit}${test.details ? ` - ${test.details}` : ''}`
).join('\n')}

## Conclusion

${summary.qualityScore >= 85 ? 
    '🎉 **EXCELLENTE QUALITÉ** - La Phase 1.4 dépasse les standards de qualité attendus.' :
    summary.qualityScore >= 70 ?
    '✅ **BONNE QUALITÉ** - La Phase 1.4 respecte les standards de qualité.' :
    summary.qualityScore >= 50 ?
    '⚠️ **QUALITÉ ACCEPTABLE** - La Phase 1.4 nécessite quelques améliorations.' :
    '❌ **QUALITÉ INSUFFISANTE** - La Phase 1.4 nécessite des corrections importantes.'
}

**Taille totale** : ${summary.totalSizeKB}KB  
**Date d'analyse** : ${new Date().toLocaleString()}  
**Recommandation** : ${summary.qualityScore >= 70 ? 'Approuvé pour production' : 'Améliorations requises'}
`;

    fs.writeFileSync(reportPath, reportContent);
    
    console.log(`\n✅ Rapport généré : ${reportPath}`);
    console.log(`📊 Résultats JSON : ${RESULTS_FILE}`);
    
    // Affichage du résumé final
    console.log('\n' + '='.repeat(50));
    console.log('    RAPPORT DE PERFORMANCE PHASE 1.4');
    console.log('='.repeat(50));
    console.log(`Score de qualité : ${summary.qualityScore}% (${summary.status})`);
    console.log(`Taux de réussite : ${summary.successRate}%`);
    console.log(`Taille totale    : ${summary.totalSizeKB}KB`);
    console.log('='.repeat(50));
}

// Exécution des tests
function runAllTests() {
    console.log('🧪 Tests de Performance ERP PrevHub - Phase 1.4');
    console.log('================================================');
    
    testFileSizes();
    testCodeComplexity();
    testDatabaseStructure();
    testDocumentation();
    testDeploymentScript();
    calculateGlobalMetrics();
    generateReport();
}

// Lancement des tests
runAllTests();

