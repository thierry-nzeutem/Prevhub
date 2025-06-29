import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, CheckSquare, Clock, AlertTriangle } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

function TaskCard({ task }) {
  const statusColors = {
    'TODO': 'bg-gray-100 text-gray-800',
    'IN_PROGRESS': 'bg-blue-100 text-blue-800',
    'REVIEW': 'bg-yellow-100 text-yellow-800',
    'DONE': 'bg-green-100 text-green-800'
  }

  const priorityColors = {
    'LOW': 'bg-gray-100 text-gray-800',
    'MEDIUM': 'bg-blue-100 text-blue-800',
    'HIGH': 'bg-orange-100 text-orange-800',
    'URGENT': 'bg-red-100 text-red-800'
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'DONE'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {task.project_name}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Badge className={statusColors[task.status]}>
              {task.status}
            </Badge>
            <Badge className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                En retard
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Assigné à: {task.assigned_to_first_name} {task.assigned_to_last_name}
            </span>
            {task.due_date && (
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {new Date(task.due_date).toLocaleDateString('fr-FR')}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Tasks() {
  const { apiRequest } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const params = new URLSearchParams()
        if (statusFilter !== 'all') params.append('status', statusFilter)

        const response = await apiRequest(`/tasks?${params.toString()}`)
        setTasks(response.tasks || [])
      } catch (error) {
        console.error('Erreur lors du chargement des tâches:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [apiRequest, statusFilter])

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
                         task.project_name?.toLowerCase().includes(search.toLowerCase())
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
    return matchesSearch && matchesPriority
  })

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
          <h1 className="text-3xl font-bold text-gray-900">Tâches</h1>
          <p className="text-gray-600">Gérez vos tâches et suivez leur progression</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle tâche
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher une tâche..."
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
                <SelectItem value="TODO">À faire</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="REVIEW">En révision</SelectItem>
                <SelectItem value="DONE">Terminé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les priorités</SelectItem>
                <SelectItem value="LOW">Faible</SelectItem>
                <SelectItem value="MEDIUM">Moyenne</SelectItem>
                <SelectItem value="HIGH">Haute</SelectItem>
                <SelectItem value="URGENT">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckSquare className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune tâche trouvée
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Commencez par créer votre première tâche.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Créer une tâche
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

