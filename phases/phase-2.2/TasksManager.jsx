import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Composant principal TasksManager pour l'ERP PrevHub - Phase 2.2
const TasksManager = ({ user, apiBaseUrl = 'http://localhost:3002/api' }) => {
    // États principaux
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showWorkflowModal, setShowWorkflowModal] = useState(false);
    
    // États pour les filtres et recherche
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        assigned_to: '',
        project_id: '',
        search: ''
    });
    
    // États pour la pagination
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
    });
    
    // États pour les données de référence
    const [workflows, setWorkflows] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [projects, setProjects] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [stats, setStats] = useState({});
    const [notifications, setNotifications] = useState([]);
    
    // États pour l'interface
    const [viewMode, setViewMode] = useState('list'); // list, kanban, calendar
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('DESC');
    const [showFilters, setShowFilters] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    
    // Configuration des statuts et priorités
    const statusConfig = {
        'todo': { label: 'À faire', color: '#6B7280', bgColor: '#F3F4F6' },
        'in_progress': { label: 'En cours', color: '#3B82F6', bgColor: '#DBEAFE' },
        'review': { label: 'En révision', color: '#F59E0B', bgColor: '#FEF3C7' },
        'testing': { label: 'Tests', color: '#8B5CF6', bgColor: '#EDE9FE' },
        'done': { label: 'Terminé', color: '#10B981', bgColor: '#D1FAE5' },
        'cancelled': { label: 'Annulé', color: '#EF4444', bgColor: '#FEE2E2' },
        'blocked': { label: 'Bloqué', color: '#DC2626', bgColor: '#FEE2E2' }
    };
    
    const priorityConfig = {
        'low': { label: 'Faible', color: '#6B7280', icon: '⬇️' },
        'medium': { label: 'Moyenne', color: '#F59E0B', icon: '➡️' },
        'high': { label: 'Élevée', color: '#EF4444', icon: '⬆️' },
        'urgent': { label: 'Urgente', color: '#DC2626', icon: '🔥' },
        'critical': { label: 'Critique', color: '#7C2D12', icon: '🚨' }
    };
    
    const typeConfig = {
        'task': { label: 'Tâche', icon: '📋', color: '#3B82F6' },
        'milestone': { label: 'Jalon', icon: '🎯', color: '#10B981' },
        'epic': { label: 'Epic', icon: '🏔️', color: '#8B5CF6' },
        'story': { label: 'Story', icon: '📖', color: '#F59E0B' }
    };
    
    // Fonction utilitaire pour les appels API
    const apiCall = useCallback(async (endpoint, options = {}) => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${apiBaseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur API:', error);
            throw error;
        }
    }, [apiBaseUrl]);
    
    // Charger les tâches
    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const queryParams = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                sort_by: sortBy,
                sort_order: sortOrder,
                ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
            });
            
            const response = await apiCall(`/tasks?${queryParams}`);
            
            if (response.success) {
                setTasks(response.data);
                setPagination(prev => ({ ...prev, ...response.pagination }));
            }
        } catch (error) {
            setError('Erreur lors du chargement des tâches');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [apiCall, pagination.page, pagination.limit, sortBy, sortOrder, filters]);
    
    // Charger les données de référence
    const loadReferenceData = useCallback(async () => {
        try {
            const [workflowsRes, templatesRes, statsRes, notificationsRes] = await Promise.all([
                apiCall('/workflows'),
                apiCall('/task-templates'),
                apiCall('/tasks/stats'),
                apiCall('/notifications?limit=10')
            ]);
            
            if (workflowsRes.success) setWorkflows(workflowsRes.data);
            if (templatesRes.success) setTemplates(templatesRes.data);
            if (statsRes.success) setStats(statsRes.data);
            if (notificationsRes.success) setNotifications(notificationsRes.data);
        } catch (error) {
            console.error('Erreur lors du chargement des données de référence:', error);
        }
    }, [apiCall]);
    
    // Effet pour charger les données initiales
    useEffect(() => {
        loadTasks();
        loadReferenceData();
    }, [loadTasks, loadReferenceData]);
    
    // Créer ou mettre à jour une tâche
    const saveTask = async (taskData) => {
        try {
            const isUpdate = taskData.id;
            const endpoint = isUpdate ? `/tasks/${taskData.id}` : '/tasks';
            const method = isUpdate ? 'PUT' : 'POST';
            
            const response = await apiCall(endpoint, {
                method,
                body: JSON.stringify(taskData)
            });
            
            if (response.success) {
                await loadTasks();
                setShowCreateModal(false);
                setShowTaskModal(false);
                setSelectedTask(null);
                return response.data;
            }
        } catch (error) {
            setError(`Erreur lors de la ${taskData.id ? 'mise à jour' : 'création'} de la tâche`);
            throw error;
        }
    };
    
    // Supprimer une tâche
    const deleteTask = async (taskId) => {
        if (!confirm('Êtes-vous sûr de vouloir archiver cette tâche ?')) return;
        
        try {
            const response = await apiCall(`/tasks/${taskId}`, { method: 'DELETE' });
            
            if (response.success) {
                await loadTasks();
                setSelectedTask(null);
                setShowTaskModal(false);
            }
        } catch (error) {
            setError('Erreur lors de la suppression de la tâche');
        }
    };
    
    // Ajouter un commentaire
    const addComment = async (taskId, commentData) => {
        try {
            const response = await apiCall(`/tasks/${taskId}/comments`, {
                method: 'POST',
                body: JSON.stringify(commentData)
            });
            
            if (response.success) {
                // Recharger les détails de la tâche
                if (selectedTask && selectedTask.id === taskId) {
                    const taskResponse = await apiCall(`/tasks/${taskId}`);
                    if (taskResponse.success) {
                        setSelectedTask(taskResponse.data);
                    }
                }
                return response.data;
            }
        } catch (error) {
            setError('Erreur lors de l\'ajout du commentaire');
            throw error;
        }
    };
    
    // Assigner une tâche
    const assignTask = async (taskId, userId, role = 'assignee') => {
        try {
            const response = await apiCall(`/tasks/${taskId}/assignments`, {
                method: 'POST',
                body: JSON.stringify({ user_id: userId, role })
            });
            
            if (response.success) {
                await loadTasks();
                if (selectedTask && selectedTask.id === taskId) {
                    const taskResponse = await apiCall(`/tasks/${taskId}`);
                    if (taskResponse.success) {
                        setSelectedTask(taskResponse.data);
                    }
                }
            }
        } catch (error) {
            setError('Erreur lors de l\'assignation');
        }
    };
    
    // Marquer une notification comme lue
    const markNotificationAsRead = async (notificationId) => {
        try {
            await apiCall(`/notifications/${notificationId}/read`, { method: 'PUT' });
            setNotifications(prev => 
                prev.map(notif => 
                    notif.id === notificationId 
                        ? { ...notif, is_read: true, read_at: new Date().toISOString() }
                        : notif
                )
            );
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la notification:', error);
        }
    };
    
    // Filtrer et trier les tâches
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                if (!task.title.toLowerCase().includes(searchLower) && 
                    !task.description?.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }
            return true;
        });
    }, [tasks, filters.search]);
    
    // Grouper les tâches par statut pour la vue Kanban
    const tasksByStatus = useMemo(() => {
        const grouped = {};
        Object.keys(statusConfig).forEach(status => {
            grouped[status] = filteredTasks.filter(task => task.status === status);
        });
        return grouped;
    }, [filteredTasks]);
    
    // Calculer les métriques rapides
    const quickStats = useMemo(() => {
        return {
            total: filteredTasks.length,
            todo: filteredTasks.filter(t => t.status === 'todo').length,
            in_progress: filteredTasks.filter(t => t.status === 'in_progress').length,
            done: filteredTasks.filter(t => t.status === 'done').length,
            overdue: filteredTasks.filter(t => t.urgency_status === 'overdue').length,
            due_today: filteredTasks.filter(t => t.urgency_status === 'due_today').length
        };
    }, [filteredTasks]);
    
    // Composant TaskCard
    const TaskCard = ({ task, onClick, compact = false }) => {
        const status = statusConfig[task.status] || statusConfig.todo;
        const priority = priorityConfig[task.priority] || priorityConfig.medium;
        const type = typeConfig[task.type] || typeConfig.task;
        
        return (
            <div 
                className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    task.urgency_status === 'overdue' ? 'border-l-4 border-l-red-500' :
                    task.urgency_status === 'due_today' ? 'border-l-4 border-l-orange-500' :
                    task.urgency_status === 'due_soon' ? 'border-l-4 border-l-yellow-500' : ''
                }`}
                onClick={() => onClick(task)}
            >
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                        <span className="text-lg">{type.icon}</span>
                        <span 
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ 
                                color: status.color, 
                                backgroundColor: status.bgColor 
                            }}
                        >
                            {status.label}
                        </span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <span className="text-sm">{priority.icon}</span>
                        <span 
                            className="text-xs font-medium"
                            style={{ color: priority.color }}
                        >
                            {priority.label}
                        </span>
                    </div>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {task.title}
                </h3>
                
                {!compact && task.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {task.description}
                    </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-3">
                        {task.project_name && (
                            <span className="flex items-center">
                                📁 {task.project_name}
                            </span>
                        )}
                        {task.company_name && (
                            <span className="flex items-center">
                                🏢 {task.company_name}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        {task.comments_count > 0 && (
                            <span className="flex items-center">
                                💬 {task.comments_count}
                            </span>
                        )}
                        {task.attachments_count > 0 && (
                            <span className="flex items-center">
                                📎 {task.attachments_count}
                            </span>
                        )}
                        {task.subtasks_count > 0 && (
                            <span className="flex items-center">
                                📋 {task.subtasks_count}
                            </span>
                        )}
                    </div>
                </div>
                
                {task.due_date && (
                    <div className="mt-2 text-xs">
                        <span className={`
                            ${task.urgency_status === 'overdue' ? 'text-red-600 font-semibold' :
                              task.urgency_status === 'due_today' ? 'text-orange-600 font-semibold' :
                              task.urgency_status === 'due_soon' ? 'text-yellow-600 font-semibold' :
                              'text-gray-500'}
                        `}>
                            📅 Échéance: {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        </span>
                    </div>
                )}
                
                {task.completion_percentage > 0 && (
                    <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span>Progression</span>
                            <span>{task.completion_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${task.completion_percentage}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>
        );
    };
    
    // Composant TaskModal
    const TaskModal = ({ task, onClose, onSave, onDelete }) => {
        const [formData, setFormData] = useState(task || {
            title: '',
            description: '',
            priority: 'medium',
            status: 'todo',
            type: 'task',
            estimated_hours: '',
            due_date: '',
            project_id: '',
            company_id: '',
            assigned_to: '',
            tags: [],
            completion_percentage: 0
        });
        
        const [activeTab, setActiveTab] = useState('details');
        const [newComment, setNewComment] = useState('');
        const [timeSpent, setTimeSpent] = useState('');
        
        const handleSubmit = async (e) => {
            e.preventDefault();
            try {
                await onSave(formData);
            } catch (error) {
                console.error('Erreur lors de la sauvegarde:', error);
            }
        };
        
        const handleAddComment = async () => {
            if (!newComment.trim()) return;
            
            try {
                await addComment(task.id, {
                    content: newComment,
                    time_spent_minutes: timeSpent ? parseInt(timeSpent) : null
                });
                setNewComment('');
                setTimeSpent('');
            } catch (error) {
                console.error('Erreur lors de l\'ajout du commentaire:', error);
            }
        };
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b">
                        <h2 className="text-xl font-semibold">
                            {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
                        </h2>
                        <button 
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    </div>
                    
                    <div className="flex border-b">
                        <button
                            className={`px-4 py-2 font-medium ${
                                activeTab === 'details' 
                                    ? 'border-b-2 border-blue-500 text-blue-600' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                            onClick={() => setActiveTab('details')}
                        >
                            Détails
                        </button>
                        {task && (
                            <>
                                <button
                                    className={`px-4 py-2 font-medium ${
                                        activeTab === 'comments' 
                                            ? 'border-b-2 border-blue-500 text-blue-600' 
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                    onClick={() => setActiveTab('comments')}
                                >
                                    Commentaires ({task.comments?.length || 0})
                                </button>
                                <button
                                    className={`px-4 py-2 font-medium ${
                                        activeTab === 'workflow' 
                                            ? 'border-b-2 border-blue-500 text-blue-600' 
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                    onClick={() => setActiveTab('workflow')}
                                >
                                    Workflow
                                </button>
                            </>
                        )}
                    </div>
                    
                    <div className="p-6 overflow-y-auto max-h-[60vh]">
                        {activeTab === 'details' && (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Titre *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Type
                                        </label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {Object.entries(typeConfig).map(([value, config]) => (
                                                <option key={value} value={value}>
                                                    {config.icon} {config.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Priorité
                                        </label>
                                        <select
                                            value={formData.priority}
                                            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {Object.entries(priorityConfig).map(([value, config]) => (
                                                <option key={value} value={value}>
                                                    {config.icon} {config.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Statut
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {Object.entries(statusConfig).map(([value, config]) => (
                                                <option key={value} value={value}>
                                                    {config.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Échéance
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.due_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Estimation (heures)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={formData.estimated_hours}
                                            onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Progression (%)
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={formData.completion_percentage}
                                            onChange={(e) => setFormData(prev => ({ ...prev, completion_percentage: parseInt(e.target.value) }))}
                                            className="w-full"
                                        />
                                        <div className="text-center text-sm text-gray-600 mt-1">
                                            {formData.completion_percentage}%
                                        </div>
                                    </div>
                                </div>
                            </form>
                        )}
                        
                        {activeTab === 'comments' && task && (
                            <div className="space-y-4">
                                <div className="border-b pb-4">
                                    <h3 className="font-medium mb-3">Ajouter un commentaire</h3>
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Votre commentaire..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center space-x-2">
                                            <label className="text-sm text-gray-600">Temps passé (min):</label>
                                            <input
                                                type="number"
                                                value={timeSpent}
                                                onChange={(e) => setTimeSpent(e.target.value)}
                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                                placeholder="0"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddComment}
                                            disabled={!newComment.trim()}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Ajouter
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    {task.comments?.map(comment => (
                                        <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-medium text-sm">
                                                        Utilisateur {comment.created_by}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(comment.created_at).toLocaleString('fr-FR')}
                                                    </span>
                                                </div>
                                                {comment.time_spent_minutes && (
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                        ⏱️ {comment.time_spent_minutes}min
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-700">{comment.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'workflow' && task && (
                            <div className="space-y-4">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="font-medium mb-2">Workflow actuel</h3>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-600">
                                            {task.workflow_name || 'Aucun workflow'}
                                        </span>
                                        {task.current_step_name && (
                                            <>
                                                <span className="text-gray-400">→</span>
                                                <span className="text-sm font-medium text-blue-600">
                                                    {task.current_step_name}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                {workflows.length > 0 && (
                                    <div>
                                        <h3 className="font-medium mb-2">Workflows disponibles</h3>
                                        <div className="space-y-2">
                                            {workflows.map(workflow => (
                                                <div key={workflow.id} className="border rounded-lg p-3">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h4 className="font-medium">{workflow.name}</h4>
                                                            <p className="text-sm text-gray-600">{workflow.description}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setFormData(prev => ({ ...prev, workflow_id: workflow.id }));
                                                            }}
                                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                                        >
                                                            Appliquer
                                                        </button>
                                                    </div>
                                                    {workflow.steps && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {workflow.steps.map((step, index) => (
                                                                <span 
                                                                    key={index}
                                                                    className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                                                                >
                                                                    {step.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                        <div>
                            {task && onDelete && (
                                <button
                                    onClick={() => onDelete(task.id)}
                                    className="px-4 py-2 text-red-600 hover:text-red-800"
                                >
                                    Archiver
                                </button>
                            )}
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Annuler
                            </button>
                            {activeTab === 'details' && (
                                <button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    {task ? 'Mettre à jour' : 'Créer'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    
    // Composant principal de rendu
    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* En-tête avec statistiques */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">
                        📋 Gestion des Tâches
                    </h1>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2 text-gray-600 hover:text-gray-900"
                        >
                            🔔
                            {notifications.filter(n => !n.is_read).length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {notifications.filter(n => !n.is_read).length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            ➕ Nouvelle tâche
                        </button>
                    </div>
                </div>
                
                {/* Statistiques rapides */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                    <div className="bg-white rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">{quickStats.total}</div>
                        <div className="text-sm text-gray-600">Total</div>
                    </div>
                    <div className="bg-white rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-gray-600">{quickStats.todo}</div>
                        <div className="text-sm text-gray-600">À faire</div>
                    </div>
                    <div className="bg-white rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{quickStats.in_progress}</div>
                        <div className="text-sm text-gray-600">En cours</div>
                    </div>
                    <div className="bg-white rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{quickStats.done}</div>
                        <div className="text-sm text-gray-600">Terminées</div>
                    </div>
                    <div className="bg-white rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">{quickStats.overdue}</div>
                        <div className="text-sm text-gray-600">En retard</div>
                    </div>
                    <div className="bg-white rounded-lg border p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600">{quickStats.due_today}</div>
                        <div className="text-sm text-gray-600">Aujourd'hui</div>
                    </div>
                </div>
            </div>
            
            {/* Barre d'outils */}
            <div className="bg-white rounded-lg border p-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Rechercher des tâches..."
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                            />
                            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                        </div>
                        
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            🔽 Filtres
                        </button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Vue:</span>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            📋 Liste
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`px-3 py-1 rounded ${viewMode === 'kanban' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            📊 Kanban
                        </button>
                    </div>
                </div>
                
                {/* Filtres étendus */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Tous les statuts</option>
                            {Object.entries(statusConfig).map(([value, config]) => (
                                <option key={value} value={value}>{config.label}</option>
                            ))}
                        </select>
                        
                        <select
                            value={filters.priority}
                            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Toutes les priorités</option>
                            {Object.entries(priorityConfig).map(([value, config]) => (
                                <option key={value} value={value}>{config.label}</option>
                            ))}
                        </select>
                        
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="created_at">Date de création</option>
                            <option value="due_date">Échéance</option>
                            <option value="priority">Priorité</option>
                            <option value="status">Statut</option>
                            <option value="title">Titre</option>
                        </select>
                        
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="DESC">Décroissant</option>
                            <option value="ASC">Croissant</option>
                        </select>
                    </div>
                )}
            </div>
            
            {/* Notifications */}
            {showNotifications && (
                <div className="bg-white rounded-lg border p-4 mb-6">
                    <h3 className="font-medium mb-3">Notifications récentes</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="text-gray-500 text-sm">Aucune notification</p>
                        ) : (
                            notifications.map(notification => (
                                <div 
                                    key={notification.id}
                                    className={`p-3 rounded-lg border-l-4 ${
                                        notification.is_read 
                                            ? 'bg-gray-50 border-l-gray-300' 
                                            : 'bg-blue-50 border-l-blue-500'
                                    }`}
                                    onClick={() => !notification.is_read && markNotificationAsRead(notification.id)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-medium text-sm">{notification.title}</h4>
                                            <p className="text-sm text-gray-600">{notification.message}</p>
                                            <span className="text-xs text-gray-500">
                                                {new Date(notification.created_at).toLocaleString('fr-FR')}
                                            </span>
                                        </div>
                                        {!notification.is_read && (
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            
            {/* Contenu principal */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                        <span className="text-red-500 mr-2">⚠️</span>
                        <span className="text-red-700">{error}</span>
                        <button 
                            onClick={() => setError(null)}
                            className="ml-auto text-red-500 hover:text-red-700"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
            
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Chargement des tâches...</p>
                    </div>
                </div>
            ) : (
                <>
                    {viewMode === 'list' && (
                        <div className="space-y-4">
                            {filteredTasks.map(task => (
                                <TaskCard 
                                    key={task.id} 
                                    task={task} 
                                    onClick={(task) => {
                                        setSelectedTask(task);
                                        setShowTaskModal(true);
                                    }}
                                />
                            ))}
                            
                            {filteredTasks.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">📋</div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Aucune tâche trouvée
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        Commencez par créer votre première tâche ou ajustez vos filtres.
                                    </p>
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        Créer une tâche
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {viewMode === 'kanban' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                            {Object.entries(statusConfig).map(([status, config]) => (
                                <div key={status} className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-medium text-gray-900">{config.label}</h3>
                                        <span 
                                            className="px-2 py-1 rounded-full text-xs font-medium"
                                            style={{ 
                                                color: config.color, 
                                                backgroundColor: config.bgColor 
                                            }}
                                        >
                                            {tasksByStatus[status]?.length || 0}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {tasksByStatus[status]?.map(task => (
                                            <TaskCard 
                                                key={task.id} 
                                                task={task} 
                                                onClick={(task) => {
                                                    setSelectedTask(task);
                                                    setShowTaskModal(true);
                                                }}
                                                compact={true}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
            
            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-600">
                        Affichage de {((pagination.page - 1) * pagination.limit) + 1} à {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} tâches
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={pagination.page === 1}
                            className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Précédent
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-600">
                            Page {pagination.page} sur {pagination.pages}
                        </span>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
                            disabled={pagination.page === pagination.pages}
                            className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Suivant
                        </button>
                    </div>
                </div>
            )}
            
            {/* Modals */}
            {showCreateModal && (
                <TaskModal
                    onClose={() => setShowCreateModal(false)}
                    onSave={saveTask}
                />
            )}
            
            {showTaskModal && selectedTask && (
                <TaskModal
                    task={selectedTask}
                    onClose={() => {
                        setShowTaskModal(false);
                        setSelectedTask(null);
                    }}
                    onSave={saveTask}
                    onDelete={deleteTask}
                />
            )}
        </div>
    );
};

export default TasksManager;

