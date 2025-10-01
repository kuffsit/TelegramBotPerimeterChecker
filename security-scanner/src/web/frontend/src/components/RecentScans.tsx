import { useEffect, useState } from 'react'
import { Clock, CheckCircle, XCircle, Loader } from 'lucide-react'
import { api } from '../services/api'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Scan {
  id: number
  domain_id: number
  status: string
  started_at: string
  total_vulnerabilities: number
}

interface Domain {
  id: number
  name: string
}

export default function RecentScans() {
  const [scans, setScans] = useState<Scan[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentScans()
  }, [])

  const fetchRecentScans = async () => {
    try {
      const [scansResponse, domainsResponse] = await Promise.all([
        api.get('/api/scans?limit=5'),
        api.get('/api/domains')
      ])
      setScans(scansResponse.data)
      setDomains(domainsResponse.data)
    } catch (error) {
      console.error('Ошибка загрузки сканирований:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDomainName = (domainId: number) => {
    const domain = domains.find(d => d.id === domainId)
    return domain ? domain.name : `Domain ${domainId}`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'running':
        return <Loader className="w-4 h-4 text-yellow-400 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'badge-success'
      case 'failed':
        return 'badge-danger'
      case 'running':
        return 'badge-warning'
      default:
        return 'badge-info'
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Последние сканирования</h2>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Последние сканирования</h2>
      
      {scans.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Сканирования не найдены</p>
        </div>
      ) : (
        <div className="space-y-4">
          {scans.map((scan) => (
            <div key={scan.id} className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(scan.status)}
                <div>
                  <p className="text-white font-medium">{getDomainName(scan.domain_id)}</p>
                  <p className="text-gray-400 text-sm">
                    {formatDistanceToNow(new Date(scan.started_at), { 
                      addSuffix: true, 
                      locale: ru 
                    })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {scan.total_vulnerabilities > 0 && (
                  <span className="text-red-400 text-sm font-medium">
                    {scan.total_vulnerabilities} уязвимостей
                  </span>
                )}
                <span className={`badge ${getStatusBadge(scan.status)}`}>
                  {scan.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
