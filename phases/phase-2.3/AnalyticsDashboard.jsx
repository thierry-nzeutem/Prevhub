import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, Scatter, ScatterChart, RadialBarChart, RadialBar,
    Treemap, FunnelChart, Funnel, LabelList
} from 'recharts';

// Composant principal AnalyticsDashboard pour l'ERP PrevHub - Phase 2.3
const AnalyticsDashboard = ({ user, apiBaseUrl = 'http://localhost:3003/api' }) => {
    // États principaux
    const [dashboardData, setDashboardData] = useState(null);
    const [projectsData, setProjectsData] = useState(null);
    const [tasksData, setTasksData] = useState(null);
    const [clientsData, setClientsData] = useState(null);
    const [documentsData, setDocumentsData] = useState(null);
    const [predictionsData, setPredictionsData] = useState(null);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('30d');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedMetrics, setSelectedMetrics] = useState(['project_count', 'task_count', 'total_budget']);
    
    // Configuration des couleurs pour les graphiques
    const colors = {
        primary: '#3B82F6',
        secondary: '#10B981',
        accent: '#F59E0B',
        danger: '#EF4444',
        warning: '#F97316',
        info: '#06B6D4',
        success: '#22C55E',
        purple: '#8B5CF6',
        pink: '#EC4899',
        indigo: '#6366F1'
    };
    
    const chartColors = [
        colors.primary, colors.secondary, colors.accent, colors.danger,
        colors.warning, colors.info, colors.success, colors.purple,
        colors.pink, colors.indigo
    ];
    
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
    
    // Charger les données du dashboard principal
    const loadDashboardData = useCallback(async () => {
        try {
            const response = await apiCall(`/analytics/dashboard?period=${selectedPeriod}`);
            if (response.success) {
                setDashboardData(response.data);
            }
        } catch (error) {
            console.error('Erreur dashboard:', error);
            setError('Erreur lors du chargement du dashboard');
        }
    }, [apiCall, selectedPeriod]);
    
    // Charger les données des projets
    const loadProjectsData = useCallback(async () => {
        try {
            const response = await apiCall(`/analytics/projects?period=${selectedPeriod}`);
            if (response.success) {
                setProjectsData(response.data);
            }
        } catch (error) {
            console.error('Erreur projets:', error);
        }
    }, [apiCall, selectedPeriod]);
    
    // Charger les données des tâches
    const loadTasksData = useCallback(async () => {
        try {
            const response = await apiCall(`/analytics/tasks?period=${selectedPeriod}`);
            if (response.success) {
                setTasksData(response.data);
            }
        } catch (error) {
            console.error('Erreur tâches:', error);
        }
    }, [apiCall, selectedPeriod]);
    
    // Charger les données des clients
    const loadClientsData = useCallback(async () => {
        try {
            const response = await apiCall(`/analytics/clients?period=${selectedPeriod}`);
            if (response.success) {
                setClientsData(response.data);
            }
        } catch (error) {
            console.error('Erreur clients:', error);
        }
    }, [apiCall, selectedPeriod]);
    
    // Charger les données des documents
    const loadDocumentsData = useCallback(async () => {
        try {
            const response = await apiCall(`/analytics/documents?period=${selectedPeriod}`);
            if (response.success) {
                setDocumentsData(response.data);
            }
        } catch (error) {
            console.error('Erreur documents:', error);
        }
    }, [apiCall, selectedPeriod]);
    
    // Charger les prédictions
    const loadPredictions = useCallback(async () => {
        try {
            const response = await apiCall(`/analytics/predictions?type=projects&horizon=${selectedPeriod}`);
            if (response.success) {
                setPredictionsData(response.data);
            }
        } catch (error) {
            console.error('Erreur prédictions:', error);
        }
    }, [apiCall, selectedPeriod]);
    
    // Charger toutes les données
    const loadAllData = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            await Promise.all([
                loadDashboardData(),
                loadProjectsData(),
                loadTasksData(),
                loadClientsData(),
                loadDocumentsData(),
                loadPredictions()
            ]);
        } catch (error) {
            setError('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    }, [loadDashboardData, loadProjectsData, loadTasksData, loadClientsData, loadDocumentsData, loadPredictions]);
    
    // Effet pour charger les données
    useEffect(() => {
        loadAllData();
    }, [loadAllData]);
    
    // Formater les nombres
    const formatNumber = (num) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num?.toString() || '0';
    };
    
    // Formater les devises
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount || 0);
    };
    
    // Formater les dates
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
    
    // Composant KPI Card
    const KPICard = ({ title, value, change, icon, color = colors.primary, format = 'number' }) => {
        const formattedValue = format === 'currency' ? formatCurrency(value) : 
                              format === 'percentage' ? `${value}%` : 
                              formatNumber(value);
        
        const changeColor = change > 0 ? colors.success : change < 0 ? colors.danger : colors.info;
        const changeIcon = change > 0 ? '↗️' : change < 0 ? '↘️' : '➡️';
        
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
                            style={{ backgroundColor: color }}
                        >
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
                            <p className="text-2xl font-bold text-gray-900">{formattedValue}</p>
                        </div>
                    </div>
                </div>
                {change !== undefined && (
                    <div className="flex items-center space-x-2">
                        <span 
                            className="text-sm font-medium"
                            style={{ color: changeColor }}
                        >
                            {changeIcon} {Math.abs(change).toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-500">vs période précédente</span>
                    </div>
                )}
            </div>
        );
    };
    
    // Composant Chart Container
    const ChartContainer = ({ title, children, actions }) => (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                {actions && <div className="flex space-x-2">{actions}</div>}
            </div>
            <div className="h-80">
                {children}
            </div>
        </div>
    );
    
    // Tooltip personnalisé
    const CustomTooltip = ({ active, payload, label, formatter }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <p className="font-medium text-gray-900 mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center space-x-2">
                            <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            ></div>
                            <span className="text-sm text-gray-600">{entry.name}:</span>
                            <span className="text-sm font-medium text-gray-900">
                                {formatter ? formatter(entry.value) : entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };
    
    // Préparer les données pour les graphiques
    const prepareEvolutionData = useMemo(() => {
        if (!dashboardData?.evolution) return [];
        
        return dashboardData.evolution.map(item => ({
            date: formatDate(item.date),
            projets: parseInt(item.projects) || 0,
            tâches: parseInt(item.tasks) || 0,
            documents: parseInt(item.documents) || 0
        }));
    }, [dashboardData]);
    
    const prepareProjectsStatusData = useMemo(() => {
        if (!projectsData?.stats) return [];
        
        const statusLabels = {
            'active': 'Actifs',
            'completed': 'Terminés',
            'on_hold': 'En attente',
            'cancelled': 'Annulés'
        };
        
        return projectsData.stats.map(item => ({
            name: statusLabels[item.status] || item.status,
            value: parseInt(item.count) || 0,
            budget: parseFloat(item.total_budget) || 0
        }));
    }, [projectsData]);
    
    const prepareSectorsData = useMemo(() => {
        if (!clientsData?.sectors) return [];
        
        return clientsData.sectors.map(item => ({
            secteur: item.sector || 'Non défini',
            entreprises: parseInt(item.company_count) || 0,
            projets: parseInt(item.project_count) || 0,
            revenus: parseFloat(item.total_revenue) || 0
        }));
    }, [clientsData]);
    
    const prepareTasksProductivityData = useMemo(() => {
        if (!tasksData?.productivity) return [];
        
        return tasksData.productivity.slice(0, 10).map(item => ({
            nom: item.name || 'Utilisateur',
            assignées: parseInt(item.tasks_assigned) || 0,
            terminées: parseInt(item.tasks_completed) || 0,
            taux: parseFloat(item.avg_completion) || 0,
            temps: parseInt(item.total_time_minutes) || 0
        }));
    }, [tasksData]);
    
    const prepareBurndownData = useMemo(() => {
        if (!tasksData?.burndown) return [];
        
        let cumulativeCompleted = 0;
        let cumulativeTotal = 0;
        
        return tasksData.burndown.map(item => {
            cumulativeCompleted += parseInt(item.completed_tasks) || 0;
            cumulativeTotal += parseInt(item.total_tasks) || 0;
            
            return {
                date: formatDate(item.date),
                terminées: cumulativeCompleted,
                total: cumulativeTotal,
                restantes: cumulativeTotal - cumulativeCompleted,
                heures_terminées: parseFloat(item.completed_hours) || 0,
                heures_totales: parseFloat(item.total_estimated_hours) || 0
            };
        });
    }, [tasksData]);
    
    // Rendu du dashboard principal
    const renderDashboard = () => (
        <div className="space-y-6">
            {/* KPIs principaux */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Projets Actifs"
                    value={dashboardData?.metrics?.active_projects || 0}
                    change={5.2}
                    icon="📊"
                    color={colors.primary}
                />
                <KPICard
                    title="Tâches Terminées"
                    value={dashboardData?.metrics?.completed_tasks || 0}
                    change={12.8}
                    icon="✅"
                    color={colors.success}
                />
                <KPICard
                    title="Budget Total"
                    value={dashboardData?.metrics?.total_budget || 0}
                    change={-2.1}
                    icon="💰"
                    color={colors.accent}
                    format="currency"
                />
                <KPICard
                    title="Clients Actifs"
                    value={dashboardData?.metrics?.total_companies || 0}
                    change={8.4}
                    icon="🏢"
                    color={colors.info}
                />
            </div>
            
            {/* Graphiques principaux */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Évolution temporelle */}
                <ChartContainer title="Évolution de l'activité">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={prepareEvolutionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12 }}
                                stroke="#666"
                            />
                            <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="projets" 
                                stroke={colors.primary} 
                                strokeWidth={3}
                                dot={{ fill: colors.primary, strokeWidth: 2, r: 4 }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="tâches" 
                                stroke={colors.secondary} 
                                strokeWidth={3}
                                dot={{ fill: colors.secondary, strokeWidth: 2, r: 4 }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="documents" 
                                stroke={colors.accent} 
                                strokeWidth={3}
                                dot={{ fill: colors.accent, strokeWidth: 2, r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
                
                {/* Répartition des projets */}
                <ChartContainer title="Statut des projets">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={prepareProjectsStatusData}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {prepareProjectsStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
            
            {/* Top performers */}
            <ChartContainer title="Top Performers">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prepareTasksProductivityData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="#666" />
                        <YAxis 
                            type="category" 
                            dataKey="nom" 
                            tick={{ fontSize: 12 }} 
                            stroke="#666"
                            width={100}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="terminées" fill={colors.success} name="Tâches terminées" />
                        <Bar dataKey="assignées" fill={colors.primary} name="Tâches assignées" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
            
            {/* Prédictions */}
            {predictionsData && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white">
                            🔮
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Prédictions IA</h3>
                            <p className="text-sm text-gray-600">Basées sur l'analyse des tendances historiques</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-4">
                            <div className="text-2xl font-bold text-purple-600">
                                {predictionsData.prediction}
                            </div>
                            <div className="text-sm text-gray-600">Projets prévus</div>
                            <div className="text-xs text-gray-500 mt-1">
                                Prochains {selectedPeriod}
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4">
                            <div className="text-2xl font-bold text-blue-600">
                                {predictionsData.trend === 'croissante' ? '📈' : 
                                 predictionsData.trend === 'décroissante' ? '📉' : '➡️'}
                                {predictionsData.trend}
                            </div>
                            <div className="text-sm text-gray-600">Tendance</div>
                            <div className="text-xs text-gray-500 mt-1">
                                Confiance: {predictionsData.confidence}%
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4">
                            <div className="text-2xl font-bold text-green-600">
                                {predictionsData.slope > 0 ? '+' : ''}{(predictionsData.slope * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">Croissance</div>
                            <div className="text-xs text-gray-500 mt-1">
                                Par semaine
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    
    // Rendu des analytics projets
    const renderProjectsAnalytics = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Répartition par secteur */}
                <ChartContainer title="Projets par secteur">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={prepareSectorsData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                                dataKey="secteur" 
                                tick={{ fontSize: 12 }}
                                stroke="#666"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                            <Tooltip content={<CustomTooltip formatter={formatNumber} />} />
                            <Legend />
                            <Bar dataKey="projets" fill={colors.primary} name="Projets" />
                            <Bar dataKey="entreprises" fill={colors.secondary} name="Entreprises" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
                
                {/* Timeline des projets */}
                <ChartContainer title="Timeline des projets">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projectsData?.timeline || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                                dataKey="week" 
                                tick={{ fontSize: 12 }}
                                stroke="#666"
                            />
                            <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Area 
                                type="monotone" 
                                dataKey="new_projects" 
                                stackId="1"
                                stroke={colors.primary} 
                                fill={colors.primary}
                                fillOpacity={0.6}
                                name="Nouveaux projets"
                            />
                            <Area 
                                type="monotone" 
                                dataKey="completed_projects" 
                                stackId="1"
                                stroke={colors.success} 
                                fill={colors.success}
                                fillOpacity={0.6}
                                name="Projets terminés"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
            
            {/* Budget par secteur */}
            <ChartContainer title="Budget par secteur">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={prepareSectorsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="secteur" 
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                        />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#666" />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#666" />
                        <Tooltip content={<CustomTooltip formatter={(value, name) => 
                            name === 'revenus' ? formatCurrency(value) : formatNumber(value)
                        } />} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="projets" fill={colors.primary} name="Projets" />
                        <Line 
                            yAxisId="right" 
                            type="monotone" 
                            dataKey="revenus" 
                            stroke={colors.accent} 
                            strokeWidth={3}
                            name="Revenus"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </ChartContainer>
        </div>
    );
    
    // Rendu des analytics tâches
    const renderTasksAnalytics = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Burndown chart */}
                <ChartContainer title="Burndown Chart">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={prepareBurndownData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12 }}
                                stroke="#666"
                            />
                            <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="total" 
                                stroke={colors.info} 
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                name="Total tâches"
                            />
                            <Line 
                                type="monotone" 
                                dataKey="terminées" 
                                stroke={colors.success} 
                                strokeWidth={3}
                                name="Tâches terminées"
                            />
                            <Line 
                                type="monotone" 
                                dataKey="restantes" 
                                stroke={colors.danger} 
                                strokeWidth={3}
                                name="Tâches restantes"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
                
                {/* Métriques par priorité */}
                <ChartContainer title="Tâches par priorité">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart 
                            cx="50%" 
                            cy="50%" 
                            innerRadius="20%" 
                            outerRadius="80%" 
                            data={tasksData?.metrics?.slice(0, 5) || []}
                        >
                            <RadialBar 
                                minAngle={15} 
                                label={{ position: 'insideStart', fill: '#fff' }} 
                                background 
                                clockWise 
                                dataKey="count"
                                fill={colors.primary}
                            />
                            <Legend 
                                iconSize={18} 
                                layout="vertical" 
                                verticalAlign="middle" 
                                align="right"
                            />
                            <Tooltip content={<CustomTooltip />} />
                        </RadialBarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
            
            {/* Productivité détaillée */}
            <ChartContainer title="Analyse de productivité">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={prepareTasksProductivityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                            type="number" 
                            dataKey="assignées" 
                            name="Tâches assignées"
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                        />
                        <YAxis 
                            type="number" 
                            dataKey="terminées" 
                            name="Tâches terminées"
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                        />
                        <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                                            <p className="font-medium text-gray-900 mb-2">{data.nom}</p>
                                            <p className="text-sm text-gray-600">Assignées: {data.assignées}</p>
                                            <p className="text-sm text-gray-600">Terminées: {data.terminées}</p>
                                            <p className="text-sm text-gray-600">Taux: {data.taux.toFixed(1)}%</p>
                                            <p className="text-sm text-gray-600">Temps: {(data.temps / 60).toFixed(1)}h</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Scatter 
                            name="Utilisateurs" 
                            dataKey="terminées" 
                            fill={colors.primary}
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </ChartContainer>
        </div>
    );
    
    // Rendu principal
    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* En-tête */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">
                        📊 Analytics & Rapports
                    </h1>
                    <div className="flex items-center space-x-3">
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="7d">7 derniers jours</option>
                            <option value="30d">30 derniers jours</option>
                            <option value="90d">90 derniers jours</option>
                            <option value="1y">1 an</option>
                        </select>
                        <button
                            onClick={loadAllData}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? '🔄' : '🔄'} Actualiser
                        </button>
                    </div>
                </div>
                
                {/* Navigation par onglets */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                            { id: 'projects', label: 'Projets', icon: '📋' },
                            { id: 'tasks', label: 'Tâches', icon: '✅' },
                            { id: 'clients', label: 'Clients', icon: '🏢' },
                            { id: 'documents', label: 'Documents', icon: '📄' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
            
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
                        <p className="text-gray-600">Chargement des analytics...</p>
                    </div>
                </div>
            ) : (
                <div>
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'projects' && renderProjectsAnalytics()}
                    {activeTab === 'tasks' && renderTasksAnalytics()}
                    {activeTab === 'clients' && (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🏢</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Analytics Clients
                            </h3>
                            <p className="text-gray-600">
                                Visualisations des données clients en cours de développement...
                            </p>
                        </div>
                    )}
                    {activeTab === 'documents' && (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📄</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Analytics Documents
                            </h3>
                            <p className="text-gray-600">
                                Visualisations des données documentaires en cours de développement...
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;

