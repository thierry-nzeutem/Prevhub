import { createContext, useContext, useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  // Fonction pour faire des requêtes API avec gestion d'erreur
  const apiRequest = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token')
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expiré ou invalide
          logout()
          throw new Error('Session expirée, veuillez vous reconnecter')
        }
        
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erreur ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Erreur API:', error)
      throw error
    }
  }

  // Fonction de connexion
  const login = async (email, password) => {
    try {
      setLoading(true)
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })

      const { token, user: userData } = response
      
      localStorage.setItem('token', token)
      setUser(userData)
      
      toast({
        title: 'Connexion réussie',
        description: `Bienvenue ${userData.first_name} !`
      })
      
      return true
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur de connexion',
        description: error.message
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  // Fonction de déconnexion
  const logout = async () => {
    try {
      // Tentative de déconnexion côté serveur
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch (error) {
      console.warn('Erreur lors de la déconnexion côté serveur:', error)
    } finally {
      localStorage.removeItem('token')
      setUser(null)
      toast({
        title: 'Déconnexion',
        description: 'Vous avez été déconnecté avec succès'
      })
    }
  }

  // Fonction pour récupérer les informations utilisateur
  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await apiRequest('/auth/me')
      setUser(response.user)
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour changer le mot de passe
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      })
      
      toast({
        title: 'Mot de passe modifié',
        description: 'Votre mot de passe a été modifié avec succès'
      })
      
      return true
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message
      })
      return false
    }
  }

  // Vérification de l'authentification au chargement
  useEffect(() => {
    fetchUser()
  }, [])

  const value = {
    user,
    loading,
    login,
    logout,
    changePassword,
    apiRequest
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

