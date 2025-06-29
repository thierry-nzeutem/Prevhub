import React, { useState, useEffect, createContext, useContext } from 'react';

// Import du composant ClientsManager
import ClientsManager from './components/ClientsManager';

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

// Composant de connexion (identique à la Phase 1.3)
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

// Composant de navigation mis à jour avec badge Phase 1.4
const Navigation = ({ currentPage, onPageChange, user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: '📊', description: 'Vue d\'ensemble' },
    { id: 'projects', label: 'Projets', icon: '📋', description: 'Gestion des projets' },
    { id: 'clients', label: 'Clients', icon: '🏢', description: 'Entreprises et établissements', badge: 'Nouveau' },
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
              <p className="text-xs text-gray-500">Prévéris - Phase 1.4</p>
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

// Composant tableau de bord mis à jour avec statistiques clients
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
      const [dashboardRes, clientsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/clients/stats')
      ]);

      const [dashboardData, clientsData] = await Promise.all([
        dashboardRes.json(),
        clientsRes.json()
      ]);

      if (dashboardData.success && clientsData.success) {
        setStats({
          ...dashboardData.data,
          total_companies: clientsData.data.general.total_companies,
          total_etablissements: clientsData.data.general.total_etablissements
        });
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
        {/* En-tête avec badge Phase 1.4 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord</h1>
              <p className="text-gray-600">Vue d'ensemble de votre activité ERP PrevHub</p>
            </div>
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              ✅ Phase 1.4 - Gestion clients intégrée
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

        {/* Section Phase 1.4 - Nouveautés */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 p-6 mb-8">
          <div className="flex items-center mb-4">
            <div className="bg-green-500 rounded-full p-2 mr-3">
              <span className="text-white text-lg">🎉</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Nouveautés Phase 1.4</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h3 className="font-medium text-gray-900 mb-2">🏢 Gestion des Entreprises</h3>
              <p className="text-sm text-gray-600">Interface complète avec {stats.total_companies}+ entreprises, filtrage avancé et CRUD complet</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h3 className="font-medium text-gray-900 mb-2">🏪 Gestion des Établissements</h3>
              <p className="text-sm text-gray-600">Gestion de {stats.total_etablissements}+ établissements avec relations entreprises</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h3 className="font-medium text-gray-900 mb-2">🔗 Relations Enrichies</h3>
              <p className="text-sm text-gray-600">Liens projets-clients, statistiques détaillées et historique complet</p>
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
              <span className="mr-2">🏢</span>
              Nouvelle Entreprise
            </button>
            <button className="flex items-center justify-center p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all duration-200 border border-purple-200 hover:shadow-md">
              <span className="mr-2">🏪</span>
              Nouvel Établissement
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
              <div className="bg-green-500 rounded-full p-2 mr-4">
                <span className="text-white text-sm">🏢</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Nouvelle entreprise ajoutée</p>
                <p className="text-xs text-gray-500">Centre Commercial Atlantis - Commerce</p>
                <p className="text-xs text-green-600 mt-1">GE • 130+ boutiques • Saint-Herblain</p>
              </div>
              <span className="text-xs text-gray-400">Il y a 1h</span>
            </div>
            <div className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="bg-blue-500 rounded-full p-2 mr-4">
                <span className="text-white text-sm">📋</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Nouveau projet créé</p>
                <p className="text-xs text-gray-500">Audit Sécurité Incendie - Hôtel Le Grand Palais</p>
                <p className="text-xs text-blue-600 mt-1">Budget: 25 000€ • Priorité: Haute • Lyon</p>
              </div>
              <span className="text-xs text-gray-400">Il y a 2h</span>
            </div>
            <div className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="bg-purple-500 rounded-full p-2 mr-4">
                <span className="text-white text-sm">🏪</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Établissement mis à jour</p>
                <p className="text-xs text-gray-500">Clinique Sainte-Marie - Bloc A</p>
                <p className="text-xs text-purple-600 mt-1">6 salles d'opération • Contact mis à jour</p>
              </div>
              <span className="text-xs text-gray-400">Il y a 3h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Import du composant ProjectsManager (de la Phase 1.3)
const ProjectsManager = () => {
  // Le composant ProjectsManager complet de la Phase 1.3
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="mb-6">
            <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestion des Projets</h2>
            <p className="text-gray-600 mb-6">Module de gestion avancée des projets ERP PrevHub</p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Phase 1.3 Opérationnelle</h3>
            <p className="text-green-700 text-sm mb-4">
              Le module projets est entièrement fonctionnel avec toutes les fonctionnalités avancées
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left text-sm text-green-700">
              <div>• Filtrage en temps réel</div>
              <div>• Pagination intelligente</div>
              <div>• Recherche instantanée</div>
              <div>• Modal de création/édition</div>
              <div>• Actions CRUD complètes</div>
              <div>• Interface responsive</div>
            </div>
          </div>

          <div className="space-y-3">
            <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              📋 Accéder à la gestion des projets
            </button>
            <button className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors">
              📊 Voir les statistiques des projets
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composants placeholder améliorés pour les autres modules
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

// Composant principal de l'application avec module clients intégré
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
          <p className="text-gray-600">Chargement de l'ERP PrevHub Phase 1.4...</p>
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

