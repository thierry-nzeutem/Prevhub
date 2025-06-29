# Guide d'utilisation de l'API PrevHub

## 🚀 Démarrage rapide

### 1. Installation et configuration

```bash
# Cloner le projet
git clone https://github.com/thierry-nzeutem/Prevhub.git
cd Prevhub

# Lancer avec Docker
docker-compose -f docker-compose.full.yml up -d

# Vérifier que l'API fonctionne
curl http://localhost:3000/api/health
```

### 2. Première connexion

```bash
# Obtenir un token JWT
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@preveris.fr",
    "password": "admin123"
  }'
```

**Réponse :**
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@preveris.fr",
    "first_name": "Admin",
    "last_name": "Système",
    "role": "admin"
  }
}
```

### 3. Utiliser le token

```bash
# Utiliser le token pour les requêtes suivantes
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Exemple : récupérer la liste des projets
curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## 📚 Exemples d'utilisation

### Workflow complet : Créer un projet avec documents

```bash
# 1. Créer une organisation
curl -X POST http://localhost:3000/api/organizations \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Entreprise ABC",
    "siret": "12345678901234",
    "address": "123 Rue de la Paix",
    "city": "Paris",
    "postal_code": "75001",
    "email": "contact@abc.fr",
    "primary_contact": {
      "first_name": "Jean",
      "last_name": "Dupont",
      "email": "jean.dupont@abc.fr",
      "position": "Directeur"
    }
  }'

# 2. Créer un projet
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Audit ERP Entreprise ABC",
    "description": "Audit complet de sécurité incendie",
    "organization_id": "uuid-de-lorganisation",
    "type": "ERP",
    "priority": "HIGH",
    "start_date": "2024-01-15",
    "due_date": "2024-03-15",
    "budget": 15000.00
  }'

# 3. Uploader un document
curl -X POST http://localhost:3000/api/documents/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "files=@notice_securite.pdf" \
  -F "project_id=uuid-du-projet" \
  -F "type=NOTICE"

# 4. Lancer l'analyse IA
curl -X POST http://localhost:3000/api/ai/analyze-document \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "uuid-du-document",
    "analysis_type": "NOTICE_REVIEW"
  }'
```

### Gestion des tâches

```bash
# Créer une tâche
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Analyser les plans d'\''évacuation",
    "description": "Vérifier la conformité des plans",
    "project_id": "uuid-du-projet",
    "priority": "HIGH",
    "due_date": "2024-02-01"
  }'

# Modifier le statut d'une tâche
curl -X PUT http://localhost:3000/api/tasks/uuid-de-la-tache \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS"
  }'

# Marquer comme terminée
curl -X PUT http://localhost:3000/api/tasks/uuid-de-la-tache \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "DONE"
  }'
```

### Génération de devis

```bash
# Créer un devis
curl -X POST http://localhost:3000/api/quotes \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "uuid-du-projet",
    "organization_id": "uuid-de-lorganisation",
    "valid_until": "2024-02-01",
    "lines": [
      {
        "description": "Audit de sécurité incendie complet",
        "quantity": 1,
        "unit_price": 2500.00
      },
      {
        "description": "Rapport de conformité",
        "quantity": 1,
        "unit_price": 500.00
      },
      {
        "description": "Plan d'\''évacuation personnalisé",
        "quantity": 3,
        "unit_price": 150.00
      }
    ]
  }'

# Récupérer les détails du devis
curl -X GET http://localhost:3000/api/quotes/uuid-du-devis \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## 🔧 Intégration avec des frameworks

### JavaScript/Node.js

```javascript
class PrevHubAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  // Authentification
  async login(email, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    this.token = data.token;
    return data;
  }

  // Projets
  async getProjects(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/projects?${query}`);
  }

  async createProject(projectData) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  }

  // Documents
  async uploadDocument(projectId, files, type) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('project_id', projectId);
    if (type) formData.append('type', type);

    return this.request('/documents/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
        // Ne pas définir Content-Type pour FormData
      },
      body: formData
    });
  }

  // IA
  async analyzeDocument(documentId, analysisType) {
    return this.request('/ai/analyze-document', {
      method: 'POST',
      body: JSON.stringify({
        document_id: documentId,
        analysis_type: analysisType
      })
    });
  }
}

// Utilisation
const api = new PrevHubAPI('http://localhost:3000/api');

async function example() {
  try {
    // Connexion
    await api.login('admin@preveris.fr', 'admin123');
    
    // Récupérer les projets
    const projects = await api.getProjects({ status: 'IN_PROGRESS' });
    console.log('Projets en cours:', projects);
    
    // Créer un nouveau projet
    const newProject = await api.createProject({
      name: 'Nouveau projet',
      organization_id: 'uuid-organisation',
      type: 'ERP',
      priority: 'HIGH'
    });
    
    console.log('Projet créé:', newProject);
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}
```

### Python

```python
import requests
import json

class PrevHubAPI:
    def __init__(self, base_url):
        self.base_url = base_url
        self.token = None
        self.session = requests.Session()
    
    def login(self, email, password):
        """Connexion et récupération du token"""
        response = self.session.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()
        
        data = response.json()
        self.token = data['token']
        self.session.headers.update({
            'Authorization': f'Bearer {self.token}'
        })
        return data
    
    def get_projects(self, **params):
        """Récupérer la liste des projets"""
        response = self.session.get(
            f"{self.base_url}/projects",
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def create_project(self, project_data):
        """Créer un nouveau projet"""
        response = self.session.post(
            f"{self.base_url}/projects",
            json=project_data
        )
        response.raise_for_status()
        return response.json()
    
    def upload_document(self, project_id, file_path, doc_type=None):
        """Uploader un document"""
        files = {'files': open(file_path, 'rb')}
        data = {'project_id': project_id}
        if doc_type:
            data['type'] = doc_type
        
        response = self.session.post(
            f"{self.base_url}/documents/upload",
            files=files,
            data=data
        )
        response.raise_for_status()
        return response.json()
    
    def analyze_document(self, document_id, analysis_type):
        """Analyser un document avec l'IA"""
        response = self.session.post(
            f"{self.base_url}/ai/analyze-document",
            json={
                'document_id': document_id,
                'analysis_type': analysis_type
            }
        )
        response.raise_for_status()
        return response.json()

# Utilisation
api = PrevHubAPI('http://localhost:3000/api')

try:
    # Connexion
    login_result = api.login('admin@preveris.fr', 'admin123')
    print(f"Connecté en tant que: {login_result['user']['first_name']}")
    
    # Récupérer les projets
    projects = api.get_projects(status='IN_PROGRESS')
    print(f"Projets en cours: {len(projects['projects'])}")
    
    # Créer un projet
    new_project = api.create_project({
        'name': 'Projet Python API',
        'organization_id': 'uuid-organisation',
        'type': 'ERP',
        'priority': 'MEDIUM'
    })
    print(f"Projet créé: {new_project['project']['id']}")
    
except requests.exceptions.RequestException as e:
    print(f"Erreur API: {e}")
```

### PHP

```php
<?php

class PrevHubAPI {
    private $baseURL;
    private $token;
    
    public function __construct($baseURL) {
        $this->baseURL = $baseURL;
    }
    
    private function request($endpoint, $method = 'GET', $data = null, $headers = []) {
        $url = $this->baseURL . $endpoint;
        
        $defaultHeaders = [
            'Content-Type: application/json'
        ];
        
        if ($this->token) {
            $defaultHeaders[] = 'Authorization: Bearer ' . $this->token;
        }
        
        $headers = array_merge($defaultHeaders, $headers);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 400) {
            throw new Exception("HTTP Error: $httpCode");
        }
        
        return json_decode($response, true);
    }
    
    public function login($email, $password) {
        $response = $this->request('/auth/login', 'POST', [
            'email' => $email,
            'password' => $password
        ]);
        
        $this->token = $response['token'];
        return $response;
    }
    
    public function getProjects($params = []) {
        $query = http_build_query($params);
        return $this->request('/projects?' . $query);
    }
    
    public function createProject($projectData) {
        return $this->request('/projects', 'POST', $projectData);
    }
}

// Utilisation
try {
    $api = new PrevHubAPI('http://localhost:3000/api');
    
    // Connexion
    $loginResult = $api->login('admin@preveris.fr', 'admin123');
    echo "Connecté: " . $loginResult['user']['first_name'] . "\n";
    
    // Récupérer les projets
    $projects = $api->getProjects(['status' => 'IN_PROGRESS']);
    echo "Projets en cours: " . count($projects['projects']) . "\n";
    
} catch (Exception $e) {
    echo "Erreur: " . $e->getMessage() . "\n";
}
?>
```

## 🔍 Tests et débogage

### Tests avec curl

```bash
# Test de santé de l'API
curl -v http://localhost:3000/api/health

# Test d'authentification
curl -v -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@preveris.fr","password":"admin123"}'

# Test avec token invalide
curl -v -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer invalid-token"
```

### Gestion des erreurs

L'API retourne des erreurs structurées :

```json
{
  "error": "Token d'authentification invalide",
  "code": "AUTH_TOKEN_INVALID",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Codes d'erreur courants :**
- `AUTH_TOKEN_MISSING` : Token manquant
- `AUTH_TOKEN_INVALID` : Token invalide ou expiré
- `AUTH_USER_NOT_FOUND` : Utilisateur non trouvé
- `VALIDATION_ERROR` : Erreur de validation des données
- `NOT_FOUND` : Ressource non trouvée
- `FORBIDDEN` : Accès interdit

## 📊 Monitoring et performance

### Métriques disponibles

```bash
# Statistiques du tableau de bord
curl -X GET http://localhost:3000/api/dashboard/stats \
  -H "Authorization: Bearer $JWT_TOKEN"

# Santé de l'API
curl -X GET http://localhost:3000/api/health
```

### Logs

Les logs sont disponibles dans le conteneur :

```bash
# Logs de l'API
docker logs prevhub-backend

# Logs en temps réel
docker logs -f prevhub-backend
```

## 🔒 Sécurité

### Bonnes pratiques

1. **Stockage sécurisé du token**
   ```javascript
   // ❌ Mauvais : stockage en localStorage
   localStorage.setItem('token', token);
   
   // ✅ Bon : stockage sécurisé côté serveur
   // ou utilisation de cookies httpOnly
   ```

2. **Gestion de l'expiration**
   ```javascript
   // Vérifier l'expiration du token
   const isTokenExpired = (token) => {
     const payload = JSON.parse(atob(token.split('.')[1]));
     return payload.exp * 1000 < Date.now();
   };
   ```

3. **Rate limiting**
   L'API limite les requêtes à 100 par fenêtre de 15 minutes par IP.

### Variables d'environnement sensibles

```bash
# Ne jamais exposer ces variables
JWT_SECRET=your_very_long_and_secure_secret_key
DB_PASSWORD=your_secure_database_password
REDIS_PASSWORD=your_redis_password
```

---

**Documentation API PrevHub v1.0.0**  
**Support :** support@preveris.fr  
**Dernière mise à jour :** 2024-01-01