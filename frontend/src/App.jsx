import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Organizations from './pages/Organizations'
import Documents from './pages/Documents'
import Tasks from './pages/Tasks'
import Users from './pages/Users'
import LoadingSpinner from './components/LoadingSpinner'

// Composant pour protéger les routes
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Composant pour rediriger si déjà connecté
function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// Routes de l'application
function AppRoutes() {
  return (
    <Routes>
      {/* Route publique - Login */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />

      {/* Routes protégées */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Redirection par défaut vers le dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Pages principales */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="documents" element={<Documents />} />
        <Route path="tasks" element={<Tasks />} />
        
        {/* Pages d'administration */}
        <Route path="users" element={<Users />} />
      </Route>

      {/* Route par défaut - redirection vers login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <AppRoutes />
          <Toaster />
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App