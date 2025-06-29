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

// Composant de connexion
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

// Composant de navigation
const Navigation = ({ currentPage, onPageChange, user, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: '📊' },
    { id: 'projects', label: 'Projets', icon: '📋' },
    { id: 'clients', label: 'Clients', icon: '🏢' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'tasks', label: 'Tâches', icon: '✅' },
    { id: 'reports', label: 'Rapports', icon: '📈' },
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
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
              <p className="text-xs text-gray-500">Prévéris</p>
            </div>
          </div>

          {/* Menu de navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === item.id
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Profil utilisateur */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.role}</p>
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
        <div className="md:hidden border-t border-gray-200 py-2">
          <div className="flex overflow-x-auto space-x-1 pb-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentPage === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

// Composant tableau de bord amélioré
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
      textColor: 'text-blue-700'
    },
    {
      title: 'Projets Actifs',
      value: stats.active_projects,
      icon: '🔥',
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    {
      title: 'Entreprises',
      value: stats.total_companies,
      icon: '🏢',
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'Établissements',
      value: stats.total_etablissements,
      icon: '🏪',
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'Projets Terminés',
      value: stats.completed_projects,
      icon: '✅',
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700'
    },
    {
      title: 'Priorité Haute',
      value: stats.high_priority_projects,
      icon: '⚡',
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
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
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord</h1>
          <p className="text-gray-600">Vue d'ensemble de votre activité ERP PrevHub</p>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div key={index} className={`${card.bgColor} rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${card.textColor} mb-1`}>{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`${card.color} rounded-full p-3 text-white text-2xl`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions rapides */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200">
              <span className="mr-2">➕</span>
              Nouveau Projet
            </button>
            <button className="flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200">
              <span className="mr-2">👥</span>
              Ajouter Client
            </button>
            <button className="flex items-center justify-center p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200">
              <span className="mr-2">📄</span>
              Nouveau Document
            </button>
            <button className="flex items-center justify-center p-4 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200">
              <span className="mr-2">📊</span>
              Générer Rapport
            </button>
          </div>
        </div>

        {/* Activité récente */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Activité récente</h2>
          <div className="space-y-4">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="bg-blue-500 rounded-full p-2 mr-3">
                <span className="text-white text-sm">📋</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Nouveau projet créé</p>
                <p className="text-xs text-gray-500">Audit Sécurité Incendie - Centre Commercial</p>
              </div>
              <span className="text-xs text-gray-400">Il y a 2h</span>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="bg-green-500 rounded-full p-2 mr-3">
                <span className="text-white text-sm">✅</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Projet terminé</p>
                <p className="text-xs text-gray-500">Formation Sécurité - Entreprise Industrielle</p>
              </div>
              <span className="text-xs text-gray-400">Hier</span>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="bg-purple-500 rounded-full p-2 mr-3">
                <span className="text-white text-sm">📄</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Document ajouté</p>
                <p className="text-xs text-gray-500">Rapport d'audit - Hôtel 4 étoiles</p>
              </div>
              <span className="text-xs text-gray-400">Il y a 3h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Import du composant ProjectsManager (créé dans la Phase 1.2)
const ProjectsManager = () => {
  // Le composant ProjectsManager complet sera importé ici
  // Pour l'instant, on affiche un placeholder avec un lien vers le composant complet
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
            <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Phase 1.2 Terminée</h3>
            <p className="text-green-700 text-sm mb-4">
              Le composant ProjectsManager complet a été développé avec toutes les fonctionnalités avancées :
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">🚀 Phase 1.3 En Cours</h3>
            <p className="text-blue-700 text-sm">
              Intégration du composant ProjectsManager dans l'application principale et optimisation de l'expérience utilisateur.
            </p>
          </div>

          <div className="space-y-3">
            <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              🔄 Intégrer le composant ProjectsManager
            </button>
            <button className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors">
              📊 Voir les statistiques des projets
            </button>
            <button className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors">
              📋 Accéder à la documentation technique
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composants placeholder pour les autres modules
const ClientsManager = () => (
  <div className="p-6 bg-gray-50 min-h-screen">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Gestion des Clients</h2>
        <p className="text-gray-600 mb-6">Module de gestion des entreprises et établissements</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">📋 Phase 1.4 - En développement</p>
        </div>
      </div>
    </div>
  </div>
);

const DocumentsManager = () => (
  <div className="p-6 bg-gray-50 min-h-screen">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Gestion des Documents</h2>
        <p className="text-gray-600 mb-6">Module de gestion documentaire avancée</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">📋 Phase 2 - Planifié</p>
        </div>
      </div>
    </div>
  </div>
);

const TasksManager = () => (
  <div className="p-6 bg-gray-50 min-h-screen">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Gestion des Tâches</h2>
        <p className="text-gray-600 mb-6">Module de suivi des tâches et workflow</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">📋 Phase 2 - Planifié</p>
        </div>
      </div>
    </div>
  </div>
);

const ReportsManager = () => (
  <div className="p-6 bg-gray-50 min-h-screen">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Rapports et Analytics</h2>
        <p className="text-gray-600 mb-6">Module de génération de rapports et analyses</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">📋 Phase 2 - Planifié</p>
        </div>
      </div>
    </div>
  </div>
);

// Composant principal de l'application
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <main>
          {renderPage()}
        </main>
      </div>
    </AuthContext.Provider>
  );
};

export default App;

