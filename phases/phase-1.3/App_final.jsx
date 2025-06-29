import React, { useState, useEffect, createContext, useContext } from 'react';

// Context d'authentification
const AuthContext = createContext();

// Hook pour utiliser le contexte d'authentification
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Composant de connexion amélioré
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setError(data.error || 'Erreur de connexion');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-full p-3">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ERP PrevHub</h1>
          <p className="text-gray-600">Système de gestion Prévéris</p>
          <p className="text-sm text-gray-500 mt-2">Prévention incendie et accessibilité</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-4">Comptes de démonstration :</p>
          <div className="space-y-2">
            <button
              onClick={() => handleDemoLogin('admin@preveris.fr')}
              className="w-full bg-green-50 text-green-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors border border-green-200"
            >
              👨‍💼 Connexion Admin
            </button>
            <button
              onClick={() => handleDemoLogin('test@preveris.fr')}
              className="w-full bg-blue-50 text-blue-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
            >
              👤 Connexion Utilisateur
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-3">
            Mot de passe : password123
          </p>
        </div>
      </div>
    </div>
  );
};

// Composant de navigation amélioré
const Navigation = ({ currentPage, onPageChange, user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: '📊', description: 'Vue d\'ensemble' },
    { id: 'projects', label: 'Projets', icon: '📋', description: 'Gestion des projets', badge: 'Nouveau' },
    { id: 'clients', label: 'Clients', icon: '🏢', description: 'Entreprises et établissements' },
    { id: 'documents', label: 'Documents', icon: '📄', description: 'Gestion documentaire' },
    { id: 'tasks', label: 'Tâches', icon: '✅', description: 'Suivi des tâches' },
    { id: 'reports', label: 'Rapports', icon: '📈', description: 'Analytics et rapports' },
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo et titre */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-lg p-2">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ERP PrevHub</h1>
              <p className="text-xs text-gray-500">Prévéris - Phase 1.3</p>
            </div>
          </div>

          {/* Menu de navigation desktop */}
          <div className="hidden lg:flex items-center space-x-1">
            {menuItems.map((item) => (
              <div key={item.id} className="relative">
                <button
                  onClick={() => onPageChange(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                    currentPage === item.id
                      ? 'bg-blue-100 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Profil utilisateur et menu mobile */}
          <div className="flex items-center space-x-4">
            {/* Bouton menu mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Profil utilisateur */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-2">
                <span className="text-blue-600 text-sm">👤</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-200"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onPageChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    currentPage === item.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-3">{item.icon}</span>
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-gray-500">{item.description}</div>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// Composant tableau de bord amélioré avec animations
const Dashboard = () => {
  const [stats, setStats] = useState({
    total_projects: 0,
    active_projects: 0,
    total_companies: 0,
    total_etablissements: 0,
    completed_projects: 0,
    high_priority_projects: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Projets Total',
      value: stats.total_projects,
      icon: '📋',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      trend: '+12%'
    },
    {
      title: 'Projets Actifs',
      value: stats.active_projects,
      icon: '🔥',
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      trend: '+8%'
    },
    {
      title: 'Entreprises',
      value: stats.total_companies,
      icon: '🏢',
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      trend: '+5%'
    },
    {
      title: 'Établissements',
      value: stats.total_etablissements,
      icon: '🏪',
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      trend: '+15%'
    },
    {
      title: 'Projets Terminés',
      value: stats.completed_projects,
      icon: '✅',
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      trend: '+20%'
    },
    {
      title: 'Priorité Haute',
      value: stats.high_priority_projects,
      icon: '⚡',
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      trend: '-3%'
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* En-tête avec badge Phase 1.3 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord</h1>
              <p className="text-gray-600">Vue d'ensemble de votre activité ERP PrevHub</p>
            </div>
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              ✅ Phase 1.3 - Interface intégrée
            </div>
          </div>
        </div>

        {/* Cartes de statistiques avec animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div 
              key={index} 
              className={`${card.bgColor} rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className={`text-sm font-medium ${card.textColor} mb-1`}>{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`${card.color} rounded-full p-3 text-white text-2xl`}>
                  {card.icon}
                </div>
              </div>
              <div className="flex items-center">
                <span className={`text-sm font-medium ${card.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {card.trend}
                </span>
                <span className="text-sm text-gray-500 ml-2">vs mois dernier</span>
              </div>
            </div>
          ))}
        </div>

        {/* Section Phase 1.3 - Nouveautés */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6 mb-8">
          <div className="flex items-center mb-4">
            <div className="bg-blue-500 rounded-full p-2 mr-3">
              <span className="text-white text-lg">🚀</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Nouveautés Phase 1.3</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h3 className="font-medium text-gray-900 mb-2">📋 Gestion des Projets</h3>
              <p className="text-sm text-gray-600">Interface complète avec filtrage avancé, pagination et CRUD complet</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h3 className="font-medium text-gray-900 mb-2">🎨 Interface Moderne</h3>
              <p className="text-sm text-gray-600">Design responsive avec navigation intuitive et animations fluides</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h3 className="font-medium text-gray-900 mb-2">🔐 Authentification</h3>
              <p className="text-sm text-gray-600">Système JWT sécurisé avec gestion des sessions utilisateur</p>
            </div>
          </div>
        </div>

        {/* Actions rapides améliorées */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all duration-200 border border-blue-200 hover:shadow-md">
              <span className="mr-2">➕</span>
              Nouveau Projet
            </button>
            <button className="flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all duration-200 border border-green-200 hover:shadow-md">
              <span className="mr-2">👥</span>
              Ajouter Client
            </button>
            <button className="flex items-center justify-center p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all duration-200 border border-purple-200 hover:shadow-md">
              <span className="mr-2">📄</span>
              Nouveau Document
            </button>
            <button className="flex items-center justify-center p-4 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-all duration-200 border border-orange-200 hover:shadow-md">
              <span className="mr-2">📊</span>
              Générer Rapport
            </button>
          </div>
        </div>

        {/* Activité récente avec plus de détails */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Activité récente</h2>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Voir tout
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="bg-blue-500 rounded-full p-2 mr-4">
                <span className="text-white text-sm">📋</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Nouveau projet créé</p>
                <p className="text-xs text-gray-500">Audit Sécurité Incendie - Centre Commercial ABC</p>
                <p className="text-xs text-blue-600 mt-1">Budget: 25 000€ • Priorité: Haute</p>
              </div>
              <span className="text-xs text-gray-400">Il y a 2h</span>
            </div>
            <div className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="bg-green-500 rounded-full p-2 mr-4">
                <span className="text-white text-sm">✅</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Projet terminé</p>
                <p className="text-xs text-gray-500">Formation Sécurité - Entreprise Industrielle</p>
                <p className="text-xs text-green-600 mt-1">150 personnes formées • 100% de réussite</p>
              </div>
              <span className="text-xs text-gray-400">Hier</span>
            </div>
            <div className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="bg-purple-500 rounded-full p-2 mr-4">
                <span className="text-white text-sm">📄</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Document ajouté</p>
                <p className="text-xs text-gray-500">Rapport d'audit - Hôtel 4 étoiles</p>
                <p className="text-xs text-purple-600 mt-1">PDF • 2.3 MB • Confidentiel</p>
              </div>
              <span className="text-xs text-gray-400">Il y a 3h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Import et intégration du composant ProjectsManager complet
const ProjectsManager = () => {
  const [projects, setProjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [etablissements, setEtablissements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // États pour les filtres et la pagination
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    client_id: '',
    page: 1,
    limit: 10,
    sort_by: 'created_at',
    sort_order: 'DESC'
  });
  
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    per_page: 10
  });
  
  // État pour le modal de création/édition
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    etablissement_id: '',
    status: 'draft',
    priority: 'medium',
    start_date: '',
    end_date: '',
    budget: '',
    estimated_hours: '',
    project_type: '',
    tags: '',
    notes: ''
  });

  // Charger les données initiales
  useEffect(() => {
    loadProjects();
    loadCompanies();
    loadEtablissements();
  }, [filters]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`/api/projects?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies?limit=100');
      const data = await response.json();
      if (data.success) {
        setCompanies(data.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des entreprises:', err);
    }
  };

  const loadEtablissements = async () => {
    try {
      const response = await fetch('/api/etablissements?limit=100');
      const data = await response.json();
      if (data.success) {
        setEtablissements(data.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des établissements:', err);
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

  const handleCreateProject = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      client_id: '',
      etablissement_id: '',
      status: 'draft',
      priority: 'medium',
      start_date: '',
      end_date: '',
      budget: '',
      estimated_hours: '',
      project_type: '',
      tags: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      client_id: project.client_id || '',
      etablissement_id: project.etablissement_id || '',
      status: project.status || 'draft',
      priority: project.priority || 'medium',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      budget: project.budget || '',
      estimated_hours: project.estimated_hours || '',
      project_type: project.project_type || '',
      tags: Array.isArray(project.tags) ? project.tags.join(', ') : '',
      notes: project.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const projectData = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
      };

      const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects';
      const method = editingProject ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(projectData)
      });

      const data = await response.json();
      
      if (data.success) {
        setShowModal(false);
        loadProjects();
        alert(editingProject ? 'Projet mis à jour avec succès' : 'Projet créé avec succès');
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (err) {
      alert('Erreur lors de la sauvegarde du projet');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        loadProjects();
        alert('Projet supprimé avec succès');
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (err) {
      alert('Erreur lors de la suppression du projet');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-blue-100 text-blue-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    const statusLabels = {
      draft: 'Brouillon',
      active: 'Actif',
      on_hold: 'En pause',
      completed: 'Terminé',
      cancelled: 'Annulé'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.draft}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityColors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };

    const priorityLabels = {
      low: 'Faible',
      medium: 'Moyenne',
      high: 'Élevée',
      urgent: 'Urgente'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[priority] || priorityColors.medium}`}>
        {priorityLabels[priority] || priority}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* En-tête avec badge Phase 1.3 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Projets</h1>
              <p className="text-gray-600">Gérez vos projets de prévention incendie et accessibilité</p>
            </div>
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              ✅ Phase 1.3 - Interface intégrée
            </div>
          </div>
        </div>

        {/* Filtres et actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Recherche */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
              <input
                type="text"
                placeholder="Nom ou description..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Statut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="active">Actif</option>
                <option value="on_hold">En pause</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>

            {/* Priorité */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes les priorités</option>
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Élevée</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            {/* Client */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select
                value={filters.client_id}
                onChange={(e) => handleFilterChange('client_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les clients</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {pagination.total_count} projet(s) trouvé(s)
            </div>
            <button
              onClick={handleCreateProject}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              + Nouveau Projet
            </button>
          </div>
        </div>

        {/* Liste des projets */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priorité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Échéance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{project.name}</div>
                        <div className="text-sm text-gray-500">{project.description?.substring(0, 60)}...</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{project.client_name || 'Non assigné'}</div>
                      <div className="text-sm text-gray-500">{project.etablissement_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(project.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(project.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {project.budget ? `${parseFloat(project.budget).toLocaleString('fr-FR')} €` : 'Non défini'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString('fr-FR') : 'Non définie'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditProject(project)}
                        className="text-blue-600 hover:text-blue-900 mr-3 transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
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
                    {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((page) => (
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
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal de création/édition */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingProject ? 'Modifier le projet' : 'Créer un nouveau projet'}
                </h3>
                
                <form onSubmit={handleSubmitProject} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nom du projet */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom du projet *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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

                    {/* Client */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Client
                      </label>
                      <select
                        value={formData.client_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sélectionner un client</option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Établissement */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Établissement
                      </label>
                      <select
                        value={formData.etablissement_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, etablissement_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sélectionner un établissement</option>
                        {etablissements.map(etablissement => (
                          <option key={etablissement.id} value={etablissement.id}>{etablissement.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Statut */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Statut
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="draft">Brouillon</option>
                        <option value="active">Actif</option>
                        <option value="on_hold">En pause</option>
                        <option value="completed">Terminé</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                    </div>

                    {/* Priorité */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priorité
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Faible</option>
                        <option value="medium">Moyenne</option>
                        <option value="high">Élevée</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>

                    {/* Date de début */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date de début
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Date de fin */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date de fin
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Budget */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Budget (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.budget}
                        onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Heures estimées */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Heures estimées
                      </label>
                      <input
                        type="number"
                        value={formData.estimated_hours}
                        onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Type de projet */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type de projet
                      </label>
                      <input
                        type="text"
                        value={formData.project_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, project_type: e.target.value }))}
                        placeholder="Ex: Audit Sécurité, Accessibilité..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags (séparés par des virgules)
                      </label>
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="incendie, accessibilité, urgent..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Notes */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
                      {editingProject ? 'Mettre à jour' : 'Créer'}
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

// Composants placeholder améliorés pour les autres modules
const ClientsManager = () => (
  <div className="p-6 bg-gray-50 min-h-screen">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="mb-6">
          <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
            <span className="text-green-600 text-2xl">🏢</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestion des Clients</h2>
          <p className="text-gray-600 mb-6">Module de gestion des entreprises et établissements</p>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">📋 Phase 1.4 - En développement</h3>
          <p className="text-yellow-700 text-sm mb-4">
            Interface de gestion des {stats.total_companies} entreprises et {stats.total_etablissements} établissements
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left text-sm text-yellow-700">
            <div>• Interface de gestion des entreprises</div>
            <div>• Synchronisation données Supabase</div>
            <div>• Relations avec les projets</div>
            <div>• Recherche et filtrage avancés</div>
          </div>
        </div>

        <button className="bg-yellow-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-yellow-700 transition-colors">
          🚧 Développement en cours
        </button>
      </div>
    </div>
  </div>
);

const DocumentsManager = () => (
  <div className="p-6 bg-gray-50 min-h-screen">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="mb-6">
          <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
            <span className="text-purple-600 text-2xl">📄</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestion des Documents</h2>
          <p className="text-gray-600 mb-6">Module de gestion documentaire avancée</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">📋 Phase 2 - Planifié</h3>
          <p className="text-blue-700 text-sm mb-4">
            Gestion documentaire complète avec IA intégrée
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left text-sm text-blue-700">
            <div>• Upload et organisation</div>
            <div>• Prévisualisation intégrée</div>
            <div>• Analyse IA automatique</div>
            <div>• Système de versions</div>
          </div>
        </div>

        <button className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors">
          📅 Planifié pour Phase 2
        </button>
      </div>
    </div>
  </div>
);

const TasksManager = () => (
  <div className="p-6 bg-gray-50 min-h-screen">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="mb-6">
          <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
            <span className="text-orange-600 text-2xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestion des Tâches</h2>
          <p className="text-gray-600 mb-6">Module de suivi des tâches et workflow</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">📋 Phase 2 - Planifié</h3>
          <p className="text-blue-700 text-sm mb-4">
            Système de tâches avec workflow avancé
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left text-sm text-blue-700">
            <div>• Création et assignation</div>
            <div>• Workflow de validation</div>
            <div>• Notifications automatiques</div>
            <div>• Tableaux de bord personnalisés</div>
          </div>
        </div>

        <button className="bg-orange-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-700 transition-colors">
          📅 Planifié pour Phase 2
        </button>
      </div>
    </div>
  </div>
);

const ReportsManager = () => (
  <div className="p-6 bg-gray-50 min-h-screen">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="mb-6">
          <div className="bg-indigo-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
            <span className="text-indigo-600 text-2xl">📈</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Rapports et Analytics</h2>
          <p className="text-gray-600 mb-6">Module de génération de rapports et analyses</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">📋 Phase 2 - Planifié</h3>
          <p className="text-blue-700 text-sm mb-4">
            Analytics avancés et génération de rapports
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left text-sm text-blue-700">
            <div>• Tableaux de bord avancés</div>
            <div>• Exports personnalisés</div>
            <div>• KPIs métier</div>
            <div>• Alertes intelligentes</div>
          </div>
        </div>

        <button className="bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          📅 Planifié pour Phase 2
        </button>
      </div>
    </div>
  </div>
);

// Composant principal de l'application intégrée
const App = () => {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'projects':
        return <ProjectsManager />;
      case 'clients':
        return <ClientsManager />;
      case 'documents':
        return <DocumentsManager />;
      case 'tasks':
        return <TasksManager />;
      case 'reports':
        return <ReportsManager />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l'ERP PrevHub...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthContext.Provider value={{ user, login: handleLogin, logout: handleLogout }}>
        <LoginPage onLogin={handleLogin} />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login: handleLogin, logout: handleLogout }}>
      <div className="min-h-screen bg-gray-50">
        <Navigation 
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          user={user}
          onLogout={handleLogout}
        />
        <main className="transition-all duration-300">
          {renderPage()}
        </main>
      </div>
    </AuthContext.Provider>
  );
};

export default App;

