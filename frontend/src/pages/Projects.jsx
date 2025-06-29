import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, FolderOpen } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

function ProjectCard({ project }) {
  const navigate = useNavigate()
  
  const statusColors = {
    'DRAFT': 'bg-gray-100 text-gray-800',
    'IN_PROGRESS': 'bg-blue-100 text-blue-800',
    'REVIEW': 'bg-yellow-100 text-yellow-800',
    'COMPLETED': 'bg-green-100 text-green-800',
    'CANCELLED': 'bg-red-100 text-red-800'
  }

  const typeColors = {
    'ERP': 'bg-purple-100 text-purple-800',
    'IGH': 'bg-orange-100 text-orange-800',
    'ACCESSIBILITE': 'bg-cyan-100 text-cyan-800'
  }

  const handleClick = () => {
    // Pour l'instant, on peut juste afficher les détails ou naviguer vers une page de détail
    console.log('Projet sélectionné:', project)
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <CardDescription className="mt-1">
              {project.organization_name}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2">
            <Badge className={statusColors[project.status]}>
              {project.status}
            </Badge>
            <Badge variant="outline" className={typeColors[project.type]}>
              {project.type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {project.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {project.documents_count || 0} documents • {project.tasks_count || 0} tâches
            </span>
            <span>
              {new Date(project.created_at).toLocaleDateString('fr-FR')}
            </span>
          </div>
          {project.assigned_user_first_name && (
            <p className="text-sm text-gray-600">
              Assigné à: {project.assigned_user_first_name} {project.assigned_user_last_name}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function Projects() {
  const { apiRequest } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const params = new URLSearchParams()
        if (search) params.append('search', search)
        if (statusFilter !== 'all') params.append('status', statusFilter)
        if (typeFilter !== 'all') params.append('type', typeFilter)

        const response = await apiRequest(`/projects?${params.toString()}`)
        setProjects(response.projects || [])
      } catch (error) {
        console.error('Erreur lors du chargement des projets:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [apiRequest, search, statusFilter, typeFilter])

  const handleCreateProject = () => {
    // Pour l'instant, on peut juste afficher un message ou ouvrir un modal
    console.log('Créer un nouveau projet')
    // navigate('/projects/new') // Quand la page sera créée
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
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projets</h1>
          <p className="text-gray-600">
            Gérez vos projets de prévention incendie et accessibilité
          </p>
        </div>
        <Button onClick={handleCreateProject}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau projet
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher un projet..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="DRAFT">Brouillon</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="REVIEW">En révision</SelectItem>
                <SelectItem value="COMPLETED">Terminé</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="ERP">ERP</SelectItem>
                <SelectItem value="IGH">IGH</SelectItem>
                <SelectItem value="ACCESSIBILITE">Accessibilité</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des projets */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun projet trouvé
            </h3>
            <p className="text-gray-500 text-center mb-4">
              {search || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Aucun projet ne correspond à vos critères de recherche.'
                : 'Commencez par créer votre premier projet.'}
            </p>
            <Button onClick={handleCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un projet
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}