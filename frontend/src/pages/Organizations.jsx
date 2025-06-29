import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Building2, MapPin, Phone, Mail } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

function OrganizationCard({ organization }) {
  const handleClick = () => {
    console.log('Organisation sélectionnée:', organization)
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {organization.name}
        </CardTitle>
        {organization.siret && (
          <CardDescription>SIRET: {organization.siret}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {organization.address && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{organization.address}, {organization.city} {organization.postal_code}</span>
            </div>
          )}
          {organization.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              <span>{organization.phone}</span>
            </div>
          )}
          {organization.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4" />
              <span>{organization.email}</span>
            </div>
          )}
          <div className="pt-2 text-sm text-gray-500">
            {organization.projects_count || 0} projet(s)
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Organizations() {
  const { apiRequest } = useAuth()
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const params = new URLSearchParams()
        if (search) params.append('search', search)

        const response = await apiRequest(`/organizations?${params.toString()}`)
        setOrganizations(response.organizations || [])
      } catch (error) {
        console.error('Erreur lors du chargement des organisations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrganizations()
  }, [apiRequest, search])

  const handleCreateOrganization = () => {
    console.log('Créer une nouvelle organisation')
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
          <h1 className="text-3xl font-bold text-gray-900">Organisations</h1>
          <p className="text-gray-600">Gérez vos clients et partenaires</p>
        </div>
        <Button onClick={handleCreateOrganization}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle organisation
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher une organisation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {organizations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <OrganizationCard key={org.id} organization={org} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune organisation trouvée
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Commencez par ajouter vos clients et partenaires.
            </p>
            <Button onClick={handleCreateOrganization}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une organisation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}