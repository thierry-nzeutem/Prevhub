import React, { useState } from 'react';

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      onLogin({ email, firstName: 'Utilisateur', lastName: 'Test' });
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            color: '#2c3e50', 
            marginBottom: '10px',
            fontSize: '28px'
          }}>
            🔥 ERP PrevHub
          </h1>
          <h2 style={{ 
            color: '#7f8c8d', 
            fontWeight: 'normal',
            fontSize: '18px',
            margin: 0
          }}>
            Prévéris - Connexion
          </h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#555' }}>
              Email :
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="votre@email.com"
              required
            />
          </div>
          
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#555' }}>
              Mot de passe :
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Se connecter
          </button>
        </form>
        
        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center', 
          fontSize: '14px', 
          color: '#7f8c8d' 
        }}>
          <p>Comptes de test :</p>
          <p><strong>admin@preveris.fr</strong> / password123</p>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #ddd',
        paddingBottom: '10px',
        marginBottom: '20px'
      }}>
        <h1 style={{ color: '#2c3e50', margin: 0 }}>🔥 ERP PrevHub - Prévéris</h1>
        <div>
          <span style={{ marginRight: '15px' }}>
            Bonjour, {user.firstName} {user.lastName}
          </span>
          <button 
            onClick={onLogout}
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>
      
      <main>
        <div style={{
          background: '#f8f9fa',
          padding: '30px',
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <h2 style={{ color: '#27ae60', marginBottom: '15px' }}>
            ✅ Application déployée avec succès !
          </h2>
          <p style={{ fontSize: '18px', color: '#555' }}>
            Bienvenue dans votre ERP PrevHub. L'application est opérationnelle.
          </p>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#3498db' }}>📋 Projets</h3>
            <p>Gestion des missions ERP, IGH et accessibilité</p>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#9b59b6' }}>🏢 Organisations</h3>
            <p>Gestion des clients et partenaires</p>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#e67e22' }}>📄 Documents</h3>
            <p>Analyse automatique des documents</p>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#1abc9c' }}>🤖 IA OLLAMA</h3>
            <p>Analyse automatique avec intelligence artificielle</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;

