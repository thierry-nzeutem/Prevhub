# Documentation API PrevHub

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Authentification](#authentification)
- [Codes de réponse](#codes-de-réponse)
- [Endpoints](#endpoints)
  - [Authentification](#auth-endpoints)
  - [Utilisateurs](#users-endpoints)
  - [Projets](#projects-endpoints)
  - [Organisations](#organizations-endpoints)
  - [Documents](#documents-endpoints)
  - [Tâches](#tasks-endpoints)
  - [Devis](#quotes-endpoints)
  - [Factures](#invoices-endpoints)
  - [Tableau de bord](#dashboard-endpoints)
  - [Intelligence Artificielle](#ai-endpoints)
- [Modèles de données](#modèles-de-données)
- [Exemples d'utilisation](#exemples-dutilisation)

## Vue d'ensemble

L'API PrevHub est une API RESTful qui permet de gérer un système ERP spécialisé en prévention incendie et accessibilité.

**URL de base :** `http://localhost:3000/api`

**Format de données :** JSON

**Authentification :** JWT Bearer Token

## Authentification

Toutes les routes (sauf `/auth/login`) nécessitent un token JWT dans l'en-tête Authorization :

```http
Authorization: Bearer <token>
```

### Obtenir un token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@preveris.fr",
  "password": "admin123"
}
```

## Codes de réponse

| Code | Description |
|------|-------------|
| 200  | Succès |
| 201  | Créé avec succès |
| 400  | Requête invalide |
| 401  | Non authentifié |
| 403  | Accès interdit |
| 404  | Ressource non trouvée |
| 409  | Conflit (ressource existe déjà) |
| 422  | Erreur de validation |
| 500  | Erreur serveur |

## Endpoints

### <a id="auth-endpoints"></a>🔐 Authentification

#### Connexion
```http
POST /api/auth/login
```

**Corps de la requête :**
```json
{
  "email": "string",
  "password": "string"
}
```

**Réponse :**
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "string",
    "first_name": "string",
    "last_name": "string",
    "role": "admin|manager|commercial|preventionist|user"
  }
}
```

#### Déconnexion
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

#### Informations utilisateur connecté
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Changement de mot de passe
```http
POST /api/auth/change-password
Authorization: Bearer <token>
```

**Corps de la requête :**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

#### Rafraîchissement du token
```http
POST /api/auth/refresh
Authorization: Bearer <token>
```

### <a id="users-endpoints"></a>👥 Utilisateurs

#### Liste des utilisateurs
```http
GET /api/users
Authorization: Bearer <token>
```

**Paramètres de requête :**
- `page` (integer, optionnel) : Numéro de page (défaut: 1)
- `limit` (integer, optionnel) : Éléments par page (défaut: 20, max: 100)
- `search` (string, optionnel) : Recherche par nom ou email
- `role` (string, optionnel) : Filtrer par rôle
- `active` (boolean, optionnel) : Filtrer par statut actif

**Réponse :**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "string",
      "first_name": "string",
      "last_name": "string",
      "phone": "string",
      "role": "string",
      "is_active": true,
      "last_login": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### Détails d'un utilisateur
```http
GET /api/users/{id}
Authorization: Bearer <token>
```

#### Créer un utilisateur
```http
POST /api/users
Authorization: Bearer <token>
```

**Corps de la requête :**
```json
{
  "email": "string",
  "password": "string",
  "first_name": "string",
  "last_name": "string",
  "phone": "string",
  "role": "admin|manager|commercial|preventionist|user"
}
```

#### Modifier un utilisateur
```http
PUT /api/users/{id}
Authorization: Bearer <token>
```

#### Supprimer un utilisateur
```http
DELETE /api/users/{id}
Authorization: Bearer <token>
```

#### Réinitialiser le mot de passe
```http
POST /api/users/{id}/reset-password
Authorization: Bearer <token>
```

**Corps de la requête :**
```json
{
  "newPassword": "string"
}
```

### <a id="projects-endpoints"></a>📋 Projets

#### Liste des projets
```http
GET /api/projects
Authorization: Bearer <token>
```

**Paramètres de requête :**
- `page` (integer, optionnel)
- `limit` (integer, optionnel)
- `search` (string, optionnel)
- `status` (string, optionnel) : DRAFT|IN_PROGRESS|REVIEW|COMPLETED|CANCELLED
- `type` (string, optionnel) : ERP|IGH|ACCESSIBILITE
- `assigned_to` (uuid, optionnel)
- `organization_id` (uuid, optionnel)

**Réponse :**
```json
{
  "projects": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "contact_id": "uuid",
      "assigned_user_id": "uuid",
      "name": "string",
      "description": "string",
      "type": "ERP|IGH|ACCESSIBILITE",
      "status": "DRAFT|IN_PROGRESS|REVIEW|COMPLETED|CANCELLED",
      "priority": "LOW|MEDIUM|HIGH|URGENT",
      "start_date": "2024-01-01",
      "due_date": "2024-01-01",
      "completion_date": "2024-01-01",
      "budget": 1000.00,
      "organization_name": "string",
      "contact_first_name": "string",
      "contact_last_name": "string",
      "assigned_user_first_name": "string",
      "assigned_user_last_name": "string",
      "documents_count": 5,
      "tasks_count": 10,
      "pending_tasks_count": 3,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

#### Détails d'un projet
```http
GET /api/projects/{id}
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "name": "string",
  "description": "string",
  "type": "ERP",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "start_date": "2024-01-01",
  "due_date": "2024-12-31",
  "budget": 15000.00,
  "organization_name": "Entreprise ABC",
  "organization_address": "123 Rue de la Paix",
  "organization_city": "Paris",
  "organization_postal_code": "75001",
  "contact_first_name": "Jean",
  "contact_last_name": "Dupont",
  "contact_email": "jean.dupont@abc.fr",
  "contact_phone": "01.23.45.67.89",
  "assigned_user_first_name": "Marie",
  "assigned_user_last_name": "Martin",
  "assigned_user_email": "marie.martin@preveris.fr",
  "documents": [
    {
      "id": "uuid",
      "name": "notice_securite.pdf",
      "original_name": "Notice de sécurité.pdf",
      "file_size": 2048576,
      "mime_type": "application/pdf",
      "type": "NOTICE",
      "uploaded_by_first_name": "Marie",
      "uploaded_by_last_name": "Martin",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "tasks": [
    {
      "id": "uuid",
      "title": "Analyse des plans",
      "description": "Analyser les plans d'évacuation",
      "status": "TODO",
      "priority": "HIGH",
      "due_date": "2024-02-01",
      "assigned_to_first_name": "Pierre",
      "assigned_to_last_name": "Durand",
      "created_by_first_name": "Marie",
      "created_by_last_name": "Martin",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "quotes": [
    {
      "id": "uuid",
      "quote_number": "DEV-2024-001",
      "status": "SENT",
      "total_amount": 15000.00,
      "tax_amount": 3000.00,
      "valid_until": "2024-02-01",
      "lines_count": 5,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### Créer un projet
```http
POST /api/projects
Authorization: Bearer <token>
```

**Corps de la requête :**
```json
{
  "name": "string",
  "description": "string",
  "organization_id": "uuid",
  "contact_id": "uuid",
  "assigned_user_id": "uuid",
  "type": "ERP|IGH|ACCESSIBILITE",
  "priority": "LOW|MEDIUM|HIGH|URGENT",
  "start_date": "2024-01-01",
  "due_date": "2024-12-31",
  "budget": 15000.00
}
```

#### Modifier un projet
```http
PUT /api/projects/{id}
Authorization: Bearer <token>
```

#### Supprimer un projet
```http
DELETE /api/projects/{id}
Authorization: Bearer <token>
```

### <a id="organizations-endpoints"></a>🏢 Organisations

#### Liste des organisations
```http
GET /api/organizations
Authorization: Bearer <token>
```

**Paramètres de requête :**
- `page` (integer, optionnel)
- `limit` (integer, optionnel)
- `search` (string, optionnel) : Recherche par nom, SIRET ou ville
- `active` (boolean, optionnel)

**Réponse :**
```json
{
  "organizations": [
    {
      "id": "uuid",
      "name": "string",
      "siret": "12345678901234",
      "address": "string",
      "city": "string",
      "postal_code": "75001",
      "country": "France",
      "phone": "string",
      "email": "string",
      "website": "string",
      "is_active": true,
      "primary_contact_first_name": "string",
      "primary_contact_last_name": "string",
      "primary_contact_email": "string",
      "primary_contact_phone": "string",
      "projects_count": 5,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### Détails d'une organisation
```http
GET /api/organizations/{id}
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "id": "uuid",
  "name": "Entreprise ABC",
  "siret": "12345678901234",
  "address": "123 Rue de la Paix",
  "city": "Paris",
  "postal_code": "75001",
  "country": "France",
  "phone": "01.23.45.67.89",
  "email": "contact@abc.fr",
  "website": "https://www.abc.fr",
  "is_active": true,
  "contacts": [
    {
      "id": "uuid",
      "first_name": "Jean",
      "last_name": "Dupont",
      "email": "jean.dupont@abc.fr",
      "phone": "01.23.45.67.89",
      "position": "Directeur",
      "is_primary": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "stats": {
    "projects_count": 5,
    "completed_projects": 3,
    "active_projects": 2,
    "total_quotes_amount": 50000.00,
    "quotes_count": 8
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### Créer une organisation
```http
POST /api/organizations
Authorization: Bearer <token>
```

**Corps de la requête :**
```json
{
  "name": "string",
  "siret": "12345678901234",
  "address": "string",
  "city": "string",
  "postal_code": "75001",
  "country": "France",
  "phone": "string",
  "email": "string",
  "website": "string",
  "primary_contact": {
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone": "string",
    "position": "string"
  }
}
```

#### Modifier une organisation
```http
PUT /api/organizations/{id}
Authorization: Bearer <token>
```

#### Ajouter un contact
```http
POST /api/organizations/{id}/contacts
Authorization: Bearer <token>
```

**Corps de la requête :**
```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string",
  "position": "string",
  "is_primary": false
}
```

#### Modifier un contact
```http
PUT /api/organizations/{id}/contacts/{contactId}
Authorization: Bearer <token>
```

#### Supprimer un contact
```http
DELETE /api/organizations/{id}/contacts/{contactId}
Authorization: Bearer <token>
```

### <a id="documents-endpoints"></a>📄 Documents

#### Liste des documents
```http
GET /api/documents
Authorization: Bearer <token>
```

**Paramètres de requête :**
- `project_id` (uuid, optionnel)
- `type` (string, optionnel) : NOTICE|PLAN|RAPPORT|DEVIS|FACTURE

**Réponse :**
```json
{
  "documents": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "uploaded_by": "uuid",
      "name": "document_123.pdf",
      "original_name": "Notice de sécurité.pdf",
      "file_path": "/uploads/document_123.pdf",
      "file_size": 2048576,
      "mime_type": "application/pdf",
      "type": "NOTICE",
      "ai_analysis_status": "COMPLETED",
      "ai_analysis_result": {
        "analysis": "Document conforme aux normes..."
      },
      "project_name": "Projet ABC",
      "uploaded_by_first_name": "Marie",
      "uploaded_by_last_name": "Martin",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Upload de documents
```http
POST /api/documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Corps de la requête :**
```
files: File[]
project_id: uuid
type: NOTICE|PLAN|RAPPORT|DEVIS|FACTURE (optionnel)
```

**Réponse :**
```json
{
  "message": "Documents uploadés avec succès",
  "documents": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "uploaded_by": "uuid",
      "name": "document_123.pdf",
      "original_name": "Notice de sécurité.pdf",
      "file_path": "/uploads/document_123.pdf",
      "file_size": 2048576,
      "mime_type": "application/pdf",
      "type": "NOTICE",
      "ai_analysis_status": "PENDING",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Télécharger un document
```http
GET /api/documents/{id}/download
Authorization: Bearer <token>
```

#### Supprimer un document
```http
DELETE /api/documents/{id}
Authorization: Bearer <token>
```

### <a id="tasks-endpoints"></a>✅ Tâches

#### Liste des tâches
```http
GET /api/tasks
Authorization: Bearer <token>
```

**Paramètres de requête :**
- `project_id` (uuid, optionnel)
- `assigned_to` (uuid, optionnel)
- `status` (string, optionnel) : TODO|IN_PROGRESS|REVIEW|DONE

**Réponse :**
```json
{
  "tasks": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "assigned_to": "uuid",
      "created_by": "uuid",
      "title": "string",
      "description": "string",
      "status": "TODO|IN_PROGRESS|REVIEW|DONE",
      "priority": "LOW|MEDIUM|HIGH|URGENT",
      "due_date": "2024-01-01",
      "completed_at": "2024-01-01T00:00:00Z",
      "project_name": "string",
      "assigned_to_first_name": "string",
      "assigned_to_last_name": "string",
      "created_by_first_name": "string",
      "created_by_last_name": "string",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Créer une tâche
```http
POST /api/tasks
Authorization: Bearer <token>
```

**Corps de la requête :**
```json
{
  "title": "string",
  "description": "string",
  "project_id": "uuid",
  "assigned_to": "uuid",
  "priority": "LOW|MEDIUM|HIGH|URGENT",
  "due_date": "2024-01-01"
}
```

#### Modifier une tâche
```http
PUT /api/tasks/{id}
Authorization: Bearer <token>
```

**Corps de la requête :**
```json
{
  "title": "string",
  "description": "string",
  "status": "TODO|IN_PROGRESS|REVIEW|DONE",
  "priority": "LOW|MEDIUM|HIGH|URGENT",
  "due_date": "2024-01-01",
  "assigned_to": "uuid"
}
```

### <a id="quotes-endpoints"></a>💰 Devis

#### Liste des devis
```http
GET /api/quotes
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "quotes": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "organization_id": "uuid",
      "quote_number": "DEV-2024-001",
      "status": "DRAFT|SENT|ACCEPTED|REJECTED|EXPIRED",
      "total_amount": 15000.00,
      "tax_amount": 3000.00,
      "valid_until": "2024-02-01",
      "project_name": "string",
      "organization_name": "string",
      "lines_count": 5,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Détails d'un devis
```http
GET /api/quotes/{id}
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "organization_id": "uuid",
  "quote_number": "DEV-2024-001",
  "status": "SENT",
  "total_amount": 15000.00,
  "tax_amount": 3000.00,
  "valid_until": "2024-02-01",
  "project_name": "Projet ABC",
  "organization_name": "Entreprise ABC",
  "address": "123 Rue de la Paix",
  "city": "Paris",
  "postal_code": "75001",
  "lines": [
    {
      "id": "uuid",
      "quote_id": "uuid",
      "description": "Analyse de sécurité incendie",
      "quantity": 1.00,
      "unit_price": 1500.00,
      "total_price": 1500.00,
      "sort_order": 0
    }
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### Créer un devis
```http
POST /api/quotes
Authorization: Bearer <token>
```

**Corps de la requête :**
```json
{
  "project_id": "uuid",
  "organization_id": "uuid",
  "valid_until": "2024-02-01",
  "lines": [
    {
      "description": "string",
      "quantity": 1.00,
      "unit_price": 1500.00
    }
  ]
}
```

### <a id="invoices-endpoints"></a>🧾 Factures

#### Liste des factures
```http
GET /api/invoices
Authorization: Bearer <token>
```

#### Créer une facture depuis un devis
```http
POST /api/invoices/from-quote/{quoteId}
Authorization: Bearer <token>
```

#### Marquer une facture comme payée
```http
PATCH /api/invoices/{id}/paid
Authorization: Bearer <token>
```

### <a id="dashboard-endpoints"></a>📊 Tableau de bord

#### Statistiques du tableau de bord
```http
GET /api/dashboard/stats
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "stats": {
    "projects": {
      "total_projects": 50,
      "active_projects": 15,
      "completed_projects": 30,
      "review_projects": 3,
      "overdue_projects": 2
    },
    "tasks": {
      "total_tasks": 200,
      "pending_tasks": 50,
      "active_tasks": 30,
      "completed_tasks": 120,
      "overdue_tasks": 5
    },
    "documents": {
      "total_documents": 300,
      "pending_analysis": 10,
      "analyzed_documents": 280,
      "notices_count": 150
    },
    "financial": {
      "pending_quotes": 25000.00,
      "accepted_quotes": 75000.00,
      "pending_invoices": 15000.00,
      "paid_invoices": 60000.00,
      "overdue_invoices": 2
    }
  },
  "recent_projects": [
    {
      "id": "uuid",
      "name": "string",
      "status": "IN_PROGRESS",
      "type": "ERP",
      "organization_name": "string",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "urgent_tasks": [
    {
      "id": "uuid",
      "title": "string",
      "status": "TODO",
      "priority": "URGENT",
      "due_date": "2024-01-01",
      "project_name": "string"
    }
  ],
  "recent_activity": [
    {
      "entity_type": "project",
      "entity_id": "uuid",
      "action": "created",
      "details": {},
      "first_name": "string",
      "last_name": "string",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Graphiques du tableau de bord
```http
GET /api/dashboard/charts
Authorization: Bearer <token>
```

**Paramètres de requête :**
- `period` (integer, optionnel) : Période en jours (défaut: 30)

### <a id="ai-endpoints"></a>🤖 Intelligence Artificielle

#### Analyser un document avec IA
```http
POST /api/ai/analyze-document
Authorization: Bearer <token>
```

**Corps de la requête :**
```json
{
  "document_id": "uuid",
  "analysis_type": "NOTICE_REVIEW|DOCUMENT_CLASSIFICATION|CONTENT_EXTRACTION"
}
```

**Réponse :**
```json
{
  "message": "Analyse IA terminée avec succès",
  "analysis": {
    "id": "uuid",
    "document_id": "uuid",
    "analysis_type": "NOTICE_REVIEW",
    "model_used": "llama3.1:70b",
    "input_data": {
      "prompt": "Analysez cette notice..."
    },
    "result": {
      "analysis": "Le document présente les points suivants..."
    },
    "processing_time": 15000,
    "status": "COMPLETED",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "result": "Le document présente les points suivants..."
}
```

#### Chat avec l'IA
```http
POST /api/ai/chat
Authorization: Bearer <token>
```

**Corps de la requête :**
```json
{
  "message": "string",
  "context": "string"
}
```

**Réponse :**
```json
{
  "response": "string",
  "model": "mistral:7b"
}
```

#### Statut des modèles IA
```http
GET /api/ai/models
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "models": [
    {
      "name": "mistral:7b",
      "size": 4109733632,
      "digest": "abc123...",
      "modified_at": "2024-01-01T00:00:00Z"
    }
  ],
  "status": "available"
}
```

## Modèles de données

### User
```json
{
  "id": "uuid",
  "email": "string",
  "password_hash": "string",
  "first_name": "string",
  "last_name": "string",
  "phone": "string",
  "role": "admin|manager|commercial|preventionist|user",
  "is_active": true,
  "last_login": "2024-01-01T00:00:00Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Organization
```json
{
  "id": "uuid",
  "name": "string",
  "siret": "string",
  "address": "string",
  "city": "string",
  "postal_code": "string",
  "country": "string",
  "phone": "string",
  "email": "string",
  "website": "string",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Project
```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "contact_id": "uuid",
  "assigned_user_id": "uuid",
  "name": "string",
  "description": "string",
  "type": "ERP|IGH|ACCESSIBILITE",
  "status": "DRAFT|IN_PROGRESS|REVIEW|COMPLETED|CANCELLED",
  "priority": "LOW|MEDIUM|HIGH|URGENT",
  "start_date": "2024-01-01",
  "due_date": "2024-01-01",
  "completion_date": "2024-01-01",
  "budget": 1000.00,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Document
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "uploaded_by": "uuid",
  "name": "string",
  "original_name": "string",
  "file_path": "string",
  "file_size": 1024,
  "mime_type": "string",
  "type": "NOTICE|PLAN|RAPPORT|DEVIS|FACTURE|DOCUMENT",
  "ai_analysis_status": "PENDING|IN_PROGRESS|COMPLETED|FAILED",
  "ai_analysis_result": {},
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Task
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "assigned_to": "uuid",
  "created_by": "uuid",
  "title": "string",
  "description": "string",
  "status": "TODO|IN_PROGRESS|REVIEW|DONE",
  "priority": "LOW|MEDIUM|HIGH|URGENT",
  "due_date": "2024-01-01",
  "completed_at": "2024-01-01T00:00:00Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## Exemples d'utilisation

### Authentification et création d'un projet

```javascript
// 1. Connexion
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@preveris.fr',
    password: 'admin123'
  })
});

const { token } = await loginResponse.json();

// 2. Créer une organisation
const orgResponse = await fetch('/api/organizations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Nouvelle Entreprise',
    siret: '12345678901234',
    address: '123 Rue Example',
    city: 'Paris',
    postal_code: '75001',
    email: 'contact@nouvelle-entreprise.fr',
    primary_contact: {
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'jean.dupont@nouvelle-entreprise.fr',
      position: 'Directeur'
    }
  })
});

const { organization } = await orgResponse.json();

// 3. Créer un projet
const projectResponse = await fetch('/api/projects', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Audit ERP Nouvelle Entreprise',
    description: 'Audit complet de sécurité incendie',
    organization_id: organization.id,
    type: 'ERP',
    priority: 'HIGH',
    start_date: '2024-01-15',
    due_date: '2024-03-15',
    budget: 15000.00
  })
});

const { project } = await projectResponse.json();
```

### Upload et analyse de document

```javascript
// 1. Upload d'un document
const formData = new FormData();
formData.append('files', fileInput.files[0]);
formData.append('project_id', project.id);
formData.append('type', 'NOTICE');

const uploadResponse = await fetch('/api/documents/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { documents } = await uploadResponse.json();

// 2. Lancer l'analyse IA
const analysisResponse = await fetch('/api/ai/analyze-document', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    document_id: documents[0].id,
    analysis_type: 'NOTICE_REVIEW'
  })
});

const { analysis, result } = await analysisResponse.json();
console.log('Résultat de l\'analyse:', result);
```

### Gestion des erreurs

```javascript
const apiRequest = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`/api${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erreur ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur API:', error);
    throw error;
  }
};

// Utilisation
try {
  const projects = await apiRequest('/projects');
  console.log('Projets:', projects);
} catch (error) {
  console.error('Impossible de charger les projets:', error.message);
}
```

---

**Documentation générée pour PrevHub v1.0.0**  
**Dernière mise à jour :** 2024-01-01  
**Contact :** support@preveris.fr