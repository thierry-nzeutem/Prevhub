import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  FolderOpen,
  CheckSquare,
  FileText,
  Building2,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

function StatCard({ title, value, description, icon: Icon, trend, color = "blue" }) {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-100",
    green: "text-green-600 bg-green-100",
    orange: "text-orange-600 bg-orange-100",
    red: "text-red-600 bg-red-100"
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className="flex items-center mt-2">
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            <span className="text-xs text-green-500">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecentProjectCard({ project }) {
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

  return (
    <div className="flex items-center space-x-4 p-4 border rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {project.name}
        </p>
        <p className="text-sm text-gray-500 truncate">
          {project.organization_name}
        </p>
        <div className="flex items-center space-x-2 mt-1">
          <Badge className={statusColors[project.status] || statusColors.DRAFT}>
            {project.status}
          </Badge>
          <Badge variant="outline" className={typeColors[project.type]}>
            {project.type}
          </Badge>
        </div>
      </div>
      <div className="text-sm text-gray-500">
        {new Date(project.created_at).toLocaleDateString('fr-FR')}
      </div>
    </div>
  )
}

function UrgentTaskCard({ task }) {
  const priorityColors = {
    'LOW': 'bg-gray-100 text-gray-800',
    'MEDIUM': 'bg-blue-100 text-blue-800',
    'HIGH': 'bg-orange-100 text-orange-800',
    'URGENT': 'bg-red-100 text-red-800'
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date()

  return (
    <div className="flex items-center space-x-4 p-4 border rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {task.title}
        </p>
        <p className="text-sm text-gray-500 truncate">
          {task.project_name}
        </p>
        <div className="flex items-center space-x-2 mt-1">
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
      <div className="text-sm text-gray-500">
        {task.due_date ? (
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {new Date(task.due_date).toLocaleDateString('fr-FR')}
          </div>
        ) : (
          'Pas d\'échéance'
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, apiRequest } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentProjects, setRecentProjects] = useState([])
  const [urgentTasks, setUrgentTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await apiRequest('/dashboard/stats')
        setStats(response.stats)
        setRecentProjects(response.recent_projects || [])
        setUrgentTasks(response.urgent_tasks || [])
      } catch (error) {
        console.error('Erreur lors du chargement du tableau de bord:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [apiRequest])

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Tableau de bord
        </h1>
        <p className="text-gray-600">
          Bienvenue {user?.first_name}, voici un aperçu de votre activité
        </p>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Projets actifs"
          value={stats?.projects?.active_projects || 0}
          description={`${stats?.projects?.total_projects || 0} projets au total`}
          icon={FolderOpen}
          color="blue"
        />
        <StatCard
          title="Tâches en cours"
          value={stats?.tasks?.active_tasks || 0}
          description={`${stats?.tasks?.pending_tasks || 0} en attente`}
          icon={CheckSquare}
          color="orange"
        />
        <StatCard
          title="Documents"
          value={stats?.documents?.total_documents || 0}
          description={`${stats?.documents?.pending_analysis || 0} en analyse`}
          icon={FileText}
          color="green"
        />
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <StatCard
            title="Organisations"
            value="--"
            description="Clients actifs"
            icon={Building2}
            color="blue"
          />
        )}
      </div>

      {/* Alertes et notifications */}
      {(stats?.projects?.overdue_projects > 0 || stats?.tasks?.overdue_tasks > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Attention requise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.projects.overdue_projects > 0 && (
                <p className="text-red-700">
                  {stats.projects.overdue_projects} projet(s) en retard
                </p>
              )}
              {stats.tasks.overdue_tasks > 0 && (
                <p className="text-red-700">
                  {stats.tasks.overdue_tasks} tâche(s) en retard
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projets récents */}
        <Card>
          <CardHeader>
            <CardTitle>Projets récents</CardTitle>
            <CardDescription>
              Derniers projets créés ou modifiés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <RecentProjectCard key={project.id} project={project} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Aucun projet récent
                </p>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4">
              Voir tous les projets
            </Button>
          </CardContent>
        </Card>

        {/* Tâches urgentes */}
        <Card>
          <CardHeader>
            <CardTitle>Tâches urgentes</CardTitle>
            <CardDescription>
              Tâches prioritaires et échéances proches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgentTasks.length > 0 ? (
                urgentTasks.map((task) => (
                  <UrgentTaskCard key={task.id} task={task} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Aucune tâche urgente
                </p>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4">
              Voir toutes les tâches
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Progression globale */}
      <Card>
        <CardHeader>
          <CardTitle>Progression globale</CardTitle>
          <CardDescription>
            Aperçu de l'avancement des projets en cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Projets terminés</span>
                <span>
                  {stats?.projects?.completed_projects || 0} / {stats?.projects?.total_projects || 0}
                </span>
              </div>
              <Progress 
                value={stats?.projects?.total_projects > 0 
                  ? (stats.projects.completed_projects / stats.projects.total_projects) * 100 
                  : 0
                } 
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Tâches terminées</span>
                <span>
                  {stats?.tasks?.completed_tasks || 0} / {stats?.tasks?.total_tasks || 0}
                </span>
              </div>
              <Progress 
                value={stats?.tasks?.total_tasks > 0 
                  ? (stats.tasks.completed_tasks / stats.tasks.total_tasks) * 100 
                  : 0
                } 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

