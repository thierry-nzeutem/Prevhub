import React, { useState, useEffect, useRef } from 'react';

const DocumentsManager = () => {
    // États principaux
    const [documents, setDocuments] = useState([]);
    const [categories, setCategories] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // États pour les filtres et recherche
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        status: '',
        priority: '',
        project_id: '',
        company_id: '',
        etablissement_id: ''
    });

    // États pour la pagination
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 12,
        total: 0,
        pages: 0
    });

    // États pour les modals et vues
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // grid, list, table

    // États pour l'upload
    const [uploadData, setUploadData] = useState({
        title: '',
        description: '',
        category: '',
        tags: '',
        status: 'draft',
        priority: 'normal',
        confidentiality: 'internal',
        project_id: '',
        company_id: '',
        etablissement_id: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [aiAnalysis, setAiAnalysis] = useState(null);

    // États pour les statistiques
    const [stats, setStats] = useState({
        total_documents: 0,
        total_size_mb: 0,
        documents_by_category: {},
        documents_by_status: {},
        recent_activity: []
    });

    // Référence pour l'input file
    const fileInputRef = useRef(null);

    // Charger les données initiales
    useEffect(() => {
        loadDocuments();
        loadCategories();
        loadTemplates();
        loadStats();
    }, [filters, pagination.page]);

    // Fonction pour charger les documents
    const loadDocuments = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...filters
            });

            const response = await fetch(`/api/documents?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des documents');
            }

            const data = await response.json();
            setDocuments(data.documents);
            setPagination(prev => ({
                ...prev,
                total: data.pagination.total,
                pages: data.pagination.pages
            }));

        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Fonction pour charger les catégories
    const loadCategories = async () => {
        try {
            const response = await fetch('/api/documents/categories', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des catégories:', error);
        }
    };

    // Fonction pour charger les templates
    const loadTemplates = async () => {
        try {
            const response = await fetch('/api/documents/templates', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des templates:', error);
        }
    };

    // Fonction pour charger les statistiques
    const loadStats = async () => {
        try {
            const response = await fetch('/api/documents/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        }
    };

    // Fonction pour gérer l'upload de fichier
    const handleFileUpload = async (e) => {
        e.preventDefault();
        
        if (!selectedFile || !uploadData.title) {
            setError('Fichier et titre requis');
            return;
        }

        setLoading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            Object.keys(uploadData).forEach(key => {
                if (uploadData[key]) {
                    formData.append(key, uploadData[key]);
                }
            });

            const response = await fetch('/api/documents', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de l\'upload');
            }

            const data = await response.json();
            setSuccess('Document uploadé avec succès');
            setAiAnalysis(data.ai_analysis);
            
            // Réinitialiser le formulaire
            setUploadData({
                title: '',
                description: '',
                category: '',
                tags: '',
                status: 'draft',
                priority: 'normal',
                confidentiality: 'internal',
                project_id: '',
                company_id: '',
                etablissement_id: ''
            });
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            // Recharger les documents
            loadDocuments();
            loadStats();

        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    // Fonction pour supprimer un document
    const handleDeleteDocument = async (documentId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
            return;
        }

        try {
            const response = await fetch(`/api/documents/${documentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la suppression');
            }

            setSuccess('Document supprimé avec succès');
            loadDocuments();
            loadStats();

        } catch (error) {
            setError(error.message);
        }
    };

    // Fonction pour télécharger un document
    const handleDownloadDocument = async (documentId, fileName) => {
        try {
            const response = await fetch(`/api/documents/${documentId}/download`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du téléchargement');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            setError(error.message);
        }
    };

    // Fonction pour voir les détails d'un document
    const handleViewDocument = async (documentId) => {
        try {
            const response = await fetch(`/api/documents/${documentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement du document');
            }

            const data = await response.json();
            setSelectedDocument(data);
            setShowDocumentModal(true);

        } catch (error) {
            setError(error.message);
        }
    };

    // Fonction pour filtrer les documents
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    // Fonction pour changer de page
    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    // Fonction pour formater la taille de fichier
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Fonction pour formater la date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Fonction pour obtenir l'icône selon le type de fichier
    const getFileIcon = (mimeType) => {
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('word')) return '📝';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
        if (mimeType.includes('image')) return '🖼️';
        if (mimeType.includes('text')) return '📃';
        return '📁';
    };

    // Fonction pour obtenir la couleur du statut
    const getStatusColor = (status) => {
        const colors = {
            'draft': 'bg-gray-100 text-gray-800',
            'review': 'bg-yellow-100 text-yellow-800',
            'approved': 'bg-green-100 text-green-800',
            'archived': 'bg-blue-100 text-blue-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    // Fonction pour obtenir la couleur de la priorité
    const getPriorityColor = (priority) => {
        const colors = {
            'low': 'bg-blue-100 text-blue-800',
            'normal': 'bg-gray-100 text-gray-800',
            'high': 'bg-orange-100 text-orange-800',
            'urgent': 'bg-red-100 text-red-800'
        };
        return colors[priority] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* En-tête */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">📄 Documents</h1>
                        <p className="text-gray-600 mt-1">Gestion documentaire avec IA</p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowTemplateModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            📋 Templates
                        </button>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            ⬆️ Nouveau Document
                        </button>
                    </div>
                </div>

                {/* Statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow border">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <span className="text-2xl">📄</span>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total_documents}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow border">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <span className="text-2xl">💾</span>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-600">Espace Utilisé</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total_size_mb} MB</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow border">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <span className="text-2xl">🏷️</span>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-600">Catégories</p>
                                <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow border">
                        <div className="flex items-center">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <span className="text-2xl">🤖</span>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-gray-600">IA Activée</p>
                                <p className="text-2xl font-bold text-gray-900">✅</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages d'erreur et de succès */}
            {error && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    {error}
                    <button 
                        onClick={() => setError('')}
                        className="float-right text-red-500 hover:text-red-700"
                    >
                        ✕
                    </button>
                </div>
            )}

            {success && (
                <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                    {success}
                    <button 
                        onClick={() => setSuccess('')}
                        className="float-right text-green-500 hover:text-green-700"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Filtres et recherche */}
            <div className="bg-white p-4 rounded-lg shadow border mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            🔍 Recherche
                        </label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            placeholder="Titre, description, contenu..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            🏷️ Catégorie
                        </label>
                        <select
                            value={filters.category}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Toutes les catégories</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.name}>
                                    {category.name} ({category.documents_count})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            📊 Statut
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Tous les statuts</option>
                            <option value="draft">Brouillon</option>
                            <option value="review">En révision</option>
                            <option value="approved">Approuvé</option>
                            <option value="archived">Archivé</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ⚡ Priorité
                        </label>
                        <select
                            value={filters.priority}
                            onChange={(e) => handleFilterChange('priority', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Toutes les priorités</option>
                            <option value="low">Faible</option>
                            <option value="normal">Normale</option>
                            <option value="high">Élevée</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                            🔲 Grille
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                            📋 Liste
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                            📊 Tableau
                        </button>
                    </div>

                    <div className="text-sm text-gray-600">
                        {documents.length} document(s) sur {pagination.total}
                    </div>
                </div>
            </div>

            {/* Liste des documents */}
            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {documents.map(document => (
                                <div key={document.id} className="bg-white rounded-lg shadow border hover:shadow-lg transition-shadow">
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center">
                                                <span className="text-2xl mr-2">
                                                    {getFileIcon(document.mime_type)}
                                                </span>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                                                        {document.title}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {formatFileSize(document.file_size)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex space-x-1">
                                                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(document.status)}`}>
                                                    {document.status}
                                                </span>
                                            </div>
                                        </div>

                                        {document.description && (
                                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                {document.description}
                                            </p>
                                        )}

                                        {document.ai_summary && (
                                            <div className="bg-blue-50 p-2 rounded mb-3">
                                                <p className="text-xs text-blue-800">
                                                    🤖 IA: {document.ai_summary.substring(0, 100)}...
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                                            <span>{formatDate(document.created_at)}</span>
                                            <div className="flex items-center space-x-2">
                                                <span>👁️ {document.view_count}</span>
                                                <span>⬇️ {document.download_count}</span>
                                                <span>💬 {document.comments_count}</span>
                                            </div>
                                        </div>

                                        {document.tags && document.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {document.tags.slice(0, 3).map((tag, index) => (
                                                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                        #{tag}
                                                    </span>
                                                ))}
                                                {document.tags.length > 3 && (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                        +{document.tags.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleViewDocument(document.id)}
                                                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                            >
                                                👁️ Voir
                                            </button>
                                            <button
                                                onClick={() => handleDownloadDocument(document.id, document.file_name)}
                                                className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                                            >
                                                ⬇️
                                            </button>
                                            <button
                                                onClick={() => handleDeleteDocument(document.id)}
                                                className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {viewMode === 'list' && (
                        <div className="bg-white rounded-lg shadow border">
                            {documents.map(document => (
                                <div key={document.id} className="p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-2xl">
                                                {getFileIcon(document.mime_type)}
                                            </span>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">
                                                    {document.title}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {document.description}
                                                </p>
                                                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                                    <span>{formatDate(document.created_at)}</span>
                                                    <span>{formatFileSize(document.file_size)}</span>
                                                    <span className={`px-2 py-1 rounded-full ${getStatusColor(document.status)}`}>
                                                        {document.status}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded-full ${getPriorityColor(document.priority)}`}>
                                                        {document.priority}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleViewDocument(document.id)}
                                                className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                            >
                                                👁️ Voir
                                            </button>
                                            <button
                                                onClick={() => handleDownloadDocument(document.id, document.file_name)}
                                                className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                                            >
                                                ⬇️ Télécharger
                                            </button>
                                            <button
                                                onClick={() => handleDeleteDocument(document.id)}
                                                className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                            >
                                                🗑️ Supprimer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {viewMode === 'table' && (
                        <div className="bg-white rounded-lg shadow border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Document
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Catégorie
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Statut
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Taille
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {documents.map(document => (
                                            <tr key={document.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <span className="text-2xl mr-3">
                                                            {getFileIcon(document.mime_type)}
                                                        </span>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {document.title}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {document.file_name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                        {document.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(document.status)}`}>
                                                        {document.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatFileSize(document.file_size)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(document.created_at)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleViewDocument(document.id)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            👁️
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadDocument(document.id, document.file_name)}
                                                            className="text-green-600 hover:text-green-900"
                                                        >
                                                            ⬇️
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteDocument(document.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex justify-center items-center space-x-2 mt-6">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                            >
                                ← Précédent
                            </button>
                            
                            {[...Array(pagination.pages)].map((_, index) => {
                                const page = index + 1;
                                if (
                                    page === 1 ||
                                    page === pagination.pages ||
                                    (page >= pagination.page - 2 && page <= pagination.page + 2)
                                ) {
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => handlePageChange(page)}
                                            className={`px-3 py-2 rounded ${
                                                page === pagination.page
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                } else if (
                                    page === pagination.page - 3 ||
                                    page === pagination.page + 3
                                ) {
                                    return <span key={page} className="px-2">...</span>;
                                }
                                return null;
                            })}
                            
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page === pagination.pages}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                            >
                                Suivant →
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Modal d'upload */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">⬆️ Nouveau Document</h2>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleFileUpload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    📁 Fichier *
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={(e) => setSelectedFile(e.target.files[0])}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                {selectedFile && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        {selectedFile.name} ({formatFileSize(selectedFile.size)})
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    📝 Titre *
                                </label>
                                <input
                                    type="text"
                                    value={uploadData.title}
                                    onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    📄 Description
                                </label>
                                <textarea
                                    value={uploadData.description}
                                    onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        🏷️ Catégorie
                                    </label>
                                    <select
                                        value={uploadData.category}
                                        onChange={(e) => setUploadData(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Sélectionner...</option>
                                        {categories.map(category => (
                                            <option key={category.id} value={category.name}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        📊 Statut
                                    </label>
                                    <select
                                        value={uploadData.status}
                                        onChange={(e) => setUploadData(prev => ({ ...prev, status: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="draft">Brouillon</option>
                                        <option value="review">En révision</option>
                                        <option value="approved">Approuvé</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ⚡ Priorité
                                    </label>
                                    <select
                                        value={uploadData.priority}
                                        onChange={(e) => setUploadData(prev => ({ ...prev, priority: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="low">Faible</option>
                                        <option value="normal">Normale</option>
                                        <option value="high">Élevée</option>
                                        <option value="urgent">Urgente</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        🔒 Confidentialité
                                    </label>
                                    <select
                                        value={uploadData.confidentiality}
                                        onChange={(e) => setUploadData(prev => ({ ...prev, confidentiality: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="public">Public</option>
                                        <option value="internal">Interne</option>
                                        <option value="confidential">Confidentiel</option>
                                        <option value="secret">Secret</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    🏷️ Tags (séparés par des virgules)
                                </label>
                                <input
                                    type="text"
                                    value={uploadData.tags}
                                    onChange={(e) => setUploadData(prev => ({ ...prev, tags: e.target.value }))}
                                    placeholder="maintenance, contrat, 2024"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {aiAnalysis && (
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-blue-900 mb-2">🤖 Analyse IA</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong>Résumé :</strong> {aiAnalysis.summary}</p>
                                        <p><strong>Catégorie suggérée :</strong> {aiAnalysis.category} (confiance: {Math.round(aiAnalysis.confidence * 100)}%)</p>
                                        <p><strong>Mots-clés :</strong> {aiAnalysis.keywords.join(', ')}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadModal(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !selectedFile || !uploadData.title}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {loading ? 'Upload en cours...' : '⬆️ Uploader'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de détail du document */}
            {showDocumentModal && selectedDocument && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">📄 {selectedDocument.title}</h2>
                            <button
                                onClick={() => setShowDocumentModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                                        <p className="text-gray-700">{selectedDocument.description || 'Aucune description'}</p>
                                    </div>

                                    {selectedDocument.ai_summary && (
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <h3 className="font-semibold text-blue-900 mb-2">🤖 Résumé IA</h3>
                                            <p className="text-blue-800">{selectedDocument.ai_summary}</p>
                                        </div>
                                    )}

                                    {selectedDocument.extracted_text && (
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h3 className="font-semibold text-gray-900 mb-2">📄 Contenu extrait</h3>
                                            <p className="text-gray-700 text-sm">{selectedDocument.extracted_text.substring(0, 500)}...</p>
                                        </div>
                                    )}

                                    {selectedDocument.ai_keywords && selectedDocument.ai_keywords.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-2">🏷️ Mots-clés IA</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedDocument.ai_keywords.map((keyword, index) => (
                                                    <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded">
                                                        {keyword}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-3">Informations</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Fichier :</span>
                                                <span className="font-medium">{selectedDocument.file_name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Taille :</span>
                                                <span className="font-medium">{formatFileSize(selectedDocument.file_size)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Type :</span>
                                                <span className="font-medium">{selectedDocument.mime_type}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Catégorie :</span>
                                                <span className={`px-2 py-1 rounded text-xs ${selectedDocument.category_color ? 'text-white' : 'bg-gray-100 text-gray-800'}`}
                                                      style={selectedDocument.category_color ? {backgroundColor: selectedDocument.category_color} : {}}>
                                                    {selectedDocument.category}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Statut :</span>
                                                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedDocument.status)}`}>
                                                    {selectedDocument.status}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Priorité :</span>
                                                <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(selectedDocument.priority)}`}>
                                                    {selectedDocument.priority}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Créé le :</span>
                                                <span className="font-medium">{formatDate(selectedDocument.created_at)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Modifié le :</span>
                                                <span className="font-medium">{formatDate(selectedDocument.updated_at)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-3">Statistiques</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">👁️ Vues :</span>
                                                <span className="font-medium">{selectedDocument.view_count}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">⬇️ Téléchargements :</span>
                                                <span className="font-medium">{selectedDocument.download_count}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">💬 Commentaires :</span>
                                                <span className="font-medium">{selectedDocument.comments_count}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">🔗 Partages :</span>
                                                <span className="font-medium">{selectedDocument.shares_count}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedDocument.ai_confidence && (
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <h3 className="font-semibold text-blue-900 mb-3">🤖 Analyse IA</h3>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-blue-700">Catégorie IA :</span>
                                                    <span className="font-medium text-blue-900">{selectedDocument.ai_category}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-blue-700">Confiance :</span>
                                                    <span className="font-medium text-blue-900">{Math.round(selectedDocument.ai_confidence * 100)}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-blue-700">Traité le :</span>
                                                    <span className="font-medium text-blue-900">{formatDate(selectedDocument.ai_processed_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <button
                                            onClick={() => handleDownloadDocument(selectedDocument.id, selectedDocument.file_name)}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            ⬇️ Télécharger
                                        </button>
                                        <button
                                            onClick={() => handleDeleteDocument(selectedDocument.id)}
                                            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                        >
                                            🗑️ Supprimer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal des templates */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">📋 Templates de Documents</h2>
                            <button
                                onClick={() => setShowTemplateModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {templates.map(template => (
                                <div key={template.id} className="bg-gray-50 p-4 rounded-lg border">
                                    <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500">
                                            Catégorie: {template.category_name}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setSelectedTemplate(template);
                                                setShowTemplateModal(false);
                                                setShowUploadModal(true);
                                                setUploadData(prev => ({
                                                    ...prev,
                                                    category: template.category_name,
                                                    title: template.name
                                                }));
                                            }}
                                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                        >
                                            Utiliser
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentsManager;

