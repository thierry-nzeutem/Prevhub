import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Search, Users as UsersIcon, Mail, Phone } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

function UserCard({ user }) {
  const roleColors = {
    'admin': 'bg-red-100 text-red-800',
    'manager': 'bg-blue-100 text-blue-800',
    'commercial': 'bg-green-100 text-green-800',
    'preventionist': 'bg-yellow-100 text-yellow-800',
    'user': 'bg-gray-100 text-gray-800'
  }

  const handleClick = () => {
    console.log('Utilisateur sélectionné:', user)
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">
              {user.first_name} {user.last_name}
            </CardTitle>
            <Badge className={roleColors[user.role] || roleColors.user}>
              {user.role}
            </Badge>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
              user.is_active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {user.is_active ? 'Actif' : 'Inactif'}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-4 w-4" />
            <span>{user.email}</span>
          </div>
          {user.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              <span>{user.phone}</span>
            </div>
          )}
          <div className="pt-2 text-sm text-gray-500">
            Créé le {new Date(user.created_at).toLocaleDateString('fr-FR')}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Users() {
  const { apiRequest } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiRequest('/users')
        setUsers(response.users || [])
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [apiRequest])

  const filteredUsers = users.filter(user =>
    user.first_name.toLowerCase().includes(search.toLowerCase()) ||
    user.last_name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreateUser = () => {
    console.log('Créer un nouvel utilisateur')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-600">Gérez les utilisateurs de l'application</p>
        </div>
        <Button onClick={handleCreateUser}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UsersIcon className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun utilisateur trouvé
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Commencez par ajouter des utilisateurs à l'application.
            </p>
            <Button onClick={handleCreateUser}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un utilisateur
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}