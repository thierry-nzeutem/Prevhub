import React, { useState, useEffect } from 'react';

const ClientsManager = () => {
  // États pour les entreprises
  const [companies, setCompanies] = useState([]);
  const [etablissements, setEtablissements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // États pour les filtres et la pagination
  const [activeTab, setActiveTab] = useState('companies'); // 'companies' ou 'etablissements'
  const [filters, setFilters] = useState({
    search: '',
    sector: '',
    size: '',
    location: '',
    page: 1,
    limit: 12,
    sort_by: 'name',
    sort_order: 'ASC'
  });
  
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    per_page: 12
  });
  
  // État pour le modal de création/édition
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState('company'); // 'company' ou 'etablissement'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    sector: '',
    size: '',
    website: '',
    siret: '',
    description: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    parent_company_id: ''
  });

  // États pour les statistiques
  const [stats, setStats] = useState({
    total_companies: 0,
    total_etablissements: 0,
    active_projects: 0,
    recent_clients: 0
  });

  // Charger les données initiales
  useEffect(() => {
    loadData();
    loadStats();
  }, [activeTab, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const endpoint = activeTab === 'companies' ? '/api/companies' : '/api/etablissements';
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`${endpoint}?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        if (activeTab === 'companies') {
          setCompanies(data.data);
        } else {
          setEtablissements(data.data);
        }
        setPagination(data.pagination || {
          current_page: 1,
          total_pages: Math.ceil(data.data.length / filters.limit),
          total_count: data.data.length,
          per_page: filters.limit
        });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [companiesRes, etablissementsRes, statsRes] = await Promise.all([
        fetch('/api/companies?limit=1'),
        fetch('/api/etablissements?limit=1'),
        fetch('/api/dashboard/stats')
      ]);

      const [companiesData, etablissementsData, statsData] = await Promise.all([
        companiesRes.json(),
        etablissementsRes.json(),
        statsRes.json()
      ]);

      setStats({
        total_companies: companiesData.pagination?.total_count || companiesData.data?.length || 0,
        total_etablissements: etablissementsData.pagination?.total_count || etablissementsData.data?.length || 0,
        active_projects: statsData.data?.active_projects || 0,
        recent_clients: 15 // Placeholder
      });
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset à la première page lors d'un changement de filtre
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleCreateItem = (type) => {
    setModalType(type);
    setEditingItem(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postal_code: '',
      country: 'France',
      sector: '',
      size: '',
      website: '',
      siret: '',
      description: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      parent_company_id: ''
    });
    setShowModal(true);
  };

  const handleEditItem = (item, type) => {
    setModalType(type);
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      email: item.email || '',
      phone: item.phone || '',
      address: item.address || '',
      city: item.city || '',
      postal_code: item.postal_code || '',
      country: item.country || 'France',
      sector: item.sector || '',
      size: item.size || '',
      website: item.website || '',
      siret: item.siret || '',
      description: item.description || '',
      contact_person: item.contact_person || '',
      contact_email: item.contact_email || '',
      contact_phone: item.contact_phone || '',
      parent_company_id: item.parent_company_id || ''
    });
    setShowModal(true);
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const endpoint = modalType === 'company' ? '/api/companies' : '/api/etablissements';
      const url = editingItem ? `${endpoint}/${editingItem.id}` : endpoint;
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setShowModal(false);
        loadData();
        loadStats();
        alert(`${modalType === 'company' ? 'Entreprise' : 'Établissement'} ${editingItem ? 'mis à jour' : 'créé'} avec succès`);
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (err) {
      alert(`Erreur lors de la sauvegarde ${modalType === 'company' ? 'de l\'entreprise' : 'de l\'établissement'}`);
    }
  };

  const handleDeleteItem = async (itemId, type) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${type === 'company' ? 'cette entreprise' : 'cet établissement'} ?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'company' ? '/api/companies' : '/api/etablissements';
      const response = await fetch(`${endpoint}/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        loadData();
        loadStats();
        alert(`${type === 'company' ? 'Entreprise' : 'Établissement'} supprimé avec succès`);
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (err) {
      alert(`Erreur lors de la suppression ${type === 'company' ? 'de l\'entreprise' : 'de l\'établissement'}`);
    }
  };

  const getSectorBadge = (sector) => {
    const sectorColors = {
      'Industrie': 'bg-blue-100 text-blue-800',
      'Commerce': 'bg-green-100 text-green-800',
      'Services': 'bg-purple-100 text-purple-800',
      'Santé': 'bg-red-100 text-red-800',
      'Éducation': 'bg-yellow-100 text-yellow-800',
      'Hôtellerie': 'bg-orange-100 text-orange-800',
      'Public': 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${sectorColors[sector] || 'bg-gray-100 text-gray-800'}`}>
        {sector || 'Non défini'}
      </span>
    );
  };

  const getSizeBadge = (size) => {
    const sizeColors = {
      'TPE': 'bg-green-100 text-green-800',
      'PME': 'bg-blue-100 text-blue-800',
      'ETI': 'bg-orange-100 text-orange-800',
      'GE': 'bg-red-100 text-red-800'
    };

    const sizeLabels = {
      'TPE': 'TPE (< 10)',
      'PME': 'PME (10-250)',
      'ETI': 'ETI (250-5000)',
      'GE': 'GE (> 5000)'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${sizeColors[size] || 'bg-gray-100 text-gray-800'}`}>
        {sizeLabels[size] || size || 'Non défini'}
      </span>
    );
  };

  const renderCompanyCard = (company) => (
    <div key={company.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{company.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{company.description?.substring(0, 100)}...</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {getSectorBadge(company.sector)}
            {getSizeBadge(company.size)}
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditItem(company, 'company')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            ✏️
          </button>
          <button
            onClick={() => handleDeleteItem(company.id, 'company')}
            className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        {company.email && (
          <div className="flex items-center">
            <span className="mr-2">📧</span>
            <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">
              {company.email}
            </a>
          </div>
        )}
        {company.phone && (
          <div className="flex items-center">
            <span className="mr-2">📞</span>
            <a href={`tel:${company.phone}`} className="text-blue-600 hover:underline">
              {company.phone}
            </a>
          </div>
        )}
        {company.address && (
          <div className="flex items-center">
            <span className="mr-2">📍</span>
            <span>{company.address}, {company.city}</span>
          </div>
        )}
        {company.website && (
          <div className="flex items-center">
            <span className="mr-2">🌐</span>
            <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {company.website}
            </a>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {company.etablissements_count || 0} établissement(s)
          </span>
          <span className="text-gray-500">
            {company.projects_count || 0} projet(s)
          </span>
        </div>
      </div>
    </div>
  );

  const renderEtablissementCard = (etablissement) => (
    <div key={etablissement.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{etablissement.name}</h3>
          <p className="text-sm text-blue-600 mb-2">{etablissement.company_name}</p>
          <p className="text-sm text-gray-600 mb-3">{etablissement.description?.substring(0, 100)}...</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditItem(etablissement, 'etablissement')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            ✏️
          </button>
          <button
            onClick={() => handleDeleteItem(etablissement.id, 'etablissement')}
            className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        {etablissement.email && (
          <div className="flex items-center">
            <span className="mr-2">📧</span>
            <a href={`mailto:${etablissement.email}`} className="text-blue-600 hover:underline">
              {etablissement.email}
            </a>
          </div>
        )}
        {etablissement.phone && (
          <div className="flex items-center">
            <span className="mr-2">📞</span>
            <a href={`tel:${etablissement.phone}`} className="text-blue-600 hover:underline">
              {etablissement.phone}
            </a>
          </div>
        )}
        {etablissement.address && (
          <div className="flex items-center">
            <span className="mr-2">📍</span>
            <span>{etablissement.address}, {etablissement.city}</span>
          </div>
        )}
        {etablissement.contact_person && (
          <div className="flex items-center">
            <span className="mr-2">👤</span>
            <span>{etablissement.contact_person}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            SIRET: {etablissement.siret || 'Non renseigné'}
          </span>
          <span className="text-gray-500">
            {etablissement.projects_count || 0} projet(s)
          </span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentData = activeTab === 'companies' ? companies : etablissements;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* En-tête avec badge Phase 1.4 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Clients</h1>
              <p className="text-gray-600">Gérez vos entreprises et établissements clients</p>
            </div>
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              ✅ Phase 1.4 - Gestion clients
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 mb-1">Entreprises</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_companies}</p>
              </div>
              <div className="bg-blue-500 rounded-full p-3 text-white text-2xl">
                🏢
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">Établissements</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_etablissements}</p>
              </div>
              <div className="bg-green-500 rounded-full p-3 text-white text-2xl">
                🏪
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 mb-1">Projets Actifs</p>
                <p className="text-3xl font-bold text-gray-900">{stats.active_projects}</p>
              </div>
              <div className="bg-orange-500 rounded-full p-3 text-white text-2xl">
                🔥
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 mb-1">Nouveaux Clients</p>
                <p className="text-3xl font-bold text-gray-900">{stats.recent_clients}</p>
              </div>
              <div className="bg-purple-500 rounded-full p-3 text-white text-2xl">
                ⭐
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('companies')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'companies'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏢 Entreprises ({stats.total_companies})
              </button>
              <button
                onClick={() => setActiveTab('etablissements')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'etablissements'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏪 Établissements ({stats.total_etablissements})
              </button>
            </nav>
          </div>

          {/* Filtres et actions */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Recherche */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
                <input
                  type="text"
                  placeholder="Nom, email, ville..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Secteur */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
                <select
                  value={filters.sector}
                  onChange={(e) => handleFilterChange('sector', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous les secteurs</option>
                  <option value="Industrie">Industrie</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Services">Services</option>
                  <option value="Santé">Santé</option>
                  <option value="Éducation">Éducation</option>
                  <option value="Hôtellerie">Hôtellerie</option>
                  <option value="Public">Public</option>
                </select>
              </div>

              {/* Taille */}
              {activeTab === 'companies' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taille</label>
                  <select
                    value={filters.size}
                    onChange={(e) => handleFilterChange('size', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Toutes les tailles</option>
                    <option value="TPE">TPE (< 10 salariés)</option>
                    <option value="PME">PME (10-250 salariés)</option>
                    <option value="ETI">ETI (250-5000 salariés)</option>
                    <option value="GE">GE (> 5000 salariés)</option>
                  </select>
                </div>
              )}

              {/* Localisation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input
                  type="text"
                  placeholder="Paris, Lyon, Marseille..."
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {pagination.total_count} {activeTab === 'companies' ? 'entreprise(s)' : 'établissement(s)'} trouvé(s)
              </div>
              <button
                onClick={() => handleCreateItem(activeTab === 'companies' ? 'company' : 'etablissement')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                + Nouveau {activeTab === 'companies' ? 'Entreprise' : 'Établissement'}
              </button>
            </div>
          </div>
        </div>

        {/* Grille des cartes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {currentData.map(item => 
            activeTab === 'companies' ? renderCompanyCard(item) : renderEtablissementCard(item)
          )}
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Précédent
              </button>
              <button
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.total_pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Affichage de{' '}
                  <span className="font-medium">{(pagination.current_page - 1) * pagination.per_page + 1}</span>
                  {' '}à{' '}
                  <span className="font-medium">
                    {Math.min(pagination.current_page * pagination.per_page, pagination.total_count)}
                  </span>
                  {' '}sur{' '}
                  <span className="font-medium">{pagination.total_count}</span>
                  {' '}résultats
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: Math.min(pagination.total_pages, 5) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                          page === pagination.current_page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Modal de création/édition */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingItem ? 'Modifier' : 'Créer'} {modalType === 'company' ? 'l\'entreprise' : 'l\'établissement'}
                </h3>
                
                <form onSubmit={handleSubmitItem} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nom */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom {modalType === 'company' ? 'de l\'entreprise' : 'de l\'établissement'} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Téléphone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Adresse */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adresse
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Ville */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Code postal */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code postal
                      </label>
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Secteur */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Secteur d'activité
                      </label>
                      <select
                        value={formData.sector}
                        onChange={(e) => setFormData(prev => ({ ...prev, sector: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sélectionner un secteur</option>
                        <option value="Industrie">Industrie</option>
                        <option value="Commerce">Commerce</option>
                        <option value="Services">Services</option>
                        <option value="Santé">Santé</option>
                        <option value="Éducation">Éducation</option>
                        <option value="Hôtellerie">Hôtellerie</option>
                        <option value="Public">Public</option>
                      </select>
                    </div>

                    {/* Taille (uniquement pour les entreprises) */}
                    {modalType === 'company' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Taille de l'entreprise
                        </label>
                        <select
                          value={formData.size}
                          onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Sélectionner une taille</option>
                          <option value="TPE">TPE (< 10 salariés)</option>
                          <option value="PME">PME (10-250 salariés)</option>
                          <option value="ETI">ETI (250-5000 salariés)</option>
                          <option value="GE">GE (> 5000 salariés)</option>
                        </select>
                      </div>
                    )}

                    {/* Entreprise parente (uniquement pour les établissements) */}
                    {modalType === 'etablissement' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Entreprise parente
                        </label>
                        <select
                          value={formData.parent_company_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, parent_company_id: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Sélectionner une entreprise</option>
                          {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Site web */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Site web
                      </label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* SIRET */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SIRET
                      </label>
                      <input
                        type="text"
                        value={formData.siret}
                        onChange={(e) => setFormData(prev => ({ ...prev, siret: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Personne de contact */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Personne de contact
                      </label>
                      <input
                        type="text"
                        value={formData.contact_person}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Email de contact */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email de contact
                      </label>
                      <input
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Téléphone de contact */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone de contact
                      </label>
                      <input
                        type="tel"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      {editingItem ? 'Mettre à jour' : 'Créer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsManager;

