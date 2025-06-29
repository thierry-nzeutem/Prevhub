import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Search, FileText, Download, Eye } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

function DocumentCard({ document }) {
  const typeColors = {
    'NOTICE': 'bg-red-100 text-red-800',
    'PLAN': 'bg-blue-100 text-blue-800',
    'RAPPORT': 'bg-green-100 text-green-800',
    'DEVIS': 'bg-yellow-100 text-yellow-800',
    'FACTURE': 'bg-purple-100 text-purple-800'
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {document.original_name}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {document.project_name}
            </p>
          </div>
          {document.type && (
            <Badge className={typeColors[document.type] || 'bg-gray-100 text-gray-800'}>
              {document.type}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{formatFileSize(document.file_size || 0)}</span>
            <span>{new Date(document.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
          <p className="text-sm text-gray-600">
            Uploadé par: {document.uploaded_by_first_name} {document.uploaded_by_last_name}
          </p>
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4 mr-1" />
              Voir
            </Button>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-1" />
              Télécharger
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Documents() {
  const { apiRequest } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const params = new URLSearchParams()
        if (typeFilter !== 'all') params.append('type', typeFilter)

        const response = await apiRequest(`/documents?${params.toString()}`)
        setDocuments(response.documents || [])
      } catch (error) {
        console.error('Erreur lors du chargement des documents:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [apiRequest, typeFilter])

  const filteredDocuments = documents.filter(doc =>
    doc.original_name.toLowerCase().includes(search.toLowerCase()) ||
    doc.project_name?.toLowerCase().includes(search.toLowerCase())
  )

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
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Gérez vos documents et fichiers</p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Uploader des documents
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher un document..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="NOTICE">Notice</SelectItem>
                <SelectItem value="PLAN">Plan</SelectItem>
                <SelectItem value="RAPPORT">Rapport</SelectItem>
                <SelectItem value="DEVIS">Devis</SelectItem>
                <SelectItem value="FACTURE">Facture</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun document trouvé
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Commencez par uploader vos premiers documents.
            </p>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Uploader des documents
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

