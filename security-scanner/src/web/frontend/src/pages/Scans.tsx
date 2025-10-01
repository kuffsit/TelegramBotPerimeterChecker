import { useEffect, useState } from 'react'
import { Play, Eye, RefreshCw, Info, FileText, FileSpreadsheet, File, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import ScanProgress from '../components/ScanProgress'
import ReportViewer from '../components/ReportViewer'

interface Scan {
  id: number
  domain_id: number
  status: string
  started_at: string
  completed_at: string | null
  total_subdomains: number
  active_subdomains: number
  total_vulnerabilities: number
  critical_vulns: number
  high_vulns: number
  medium_vulns: number
  low_vulns: number
  error_message: string | null
}

interface Domain {
  id: number
  name: string
  is_active: boolean
}

export default function Scans() {
  const [scans, setScans] = useState<Scan[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDomains, setSelectedDomains] = useState<number[]>([])
  const [startingScan, setStartingScan] = useState(false)
  const [selectedScanId, setSelectedScanId] = useState<number | null>(null)
  const [viewingReportId, setViewingReportId] = useState<number | null>(null)
  
  // Получаем информацию о пользователе
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const userRole = user.role || 'auditor'

  useEffect(() => {
    fetchData()
    
    // Автообновление статуса сканирований каждые 5 секунд
    const interval = setInterval(() => {
      fetchData()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [scansResponse, domainsResponse] = await Promise.all([
        api.get('/api/scans?limit=50'),
        api.get('/api/domains')
      ])
      setScans(scansResponse.data)
      setDomains(domainsResponse.data.filter((d: Domain) => d.is_active))
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartScan = async () => {
    if (selectedDomains.length === 0) {
      alert('Выберите хотя бы один домен для сканирования')
      return
    }

    setStartingScan(true)
    try {
      // Сохраняем имена доменов до очистки selectedDomains
      const domainNames = domains.filter(d => selectedDomains.includes(d.id)).map(d => d.name).join(', ')
      
      await api.post('/api/scans/start', { domain_ids: selectedDomains })
      setSelectedDomains([])
      
      // Создаем красивое уведомление
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
      notification.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <div>
            <h4 class="font-semibold">Сканирование запущено!</h4>
            <p class="text-sm opacity-90">Домены: ${domainNames}</p>
            <p class="text-xs opacity-75 mt-1">Статус обновляется автоматически</p>
          </div>
        </div>
      `
      document.body.appendChild(notification)
      
      // Убираем уведомление через 5 секунд
      setTimeout(() => {
        notification.remove()
      }, 5000)
      
      // Сразу обновляем данные
      await fetchData()
    } catch (error) {
      console.error('Ошибка запуска сканирования:', error)
      alert('Ошибка запуска сканирования')
    } finally {
      setStartingScan(false)
    }
  }

  const handleViewReport = (scanId: number) => {
    setViewingReportId(scanId)
  }

  const handleCloseReport = () => {
    setViewingReportId(null)
  }

  const handleDeleteScan = async (scanId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить это сканирование?')) {
      return
    }

    try {
      await api.delete(`/api/scans/${scanId}`)
      fetchData()
      
      // Уведомление об успешном удалении
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md'
      notification.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <div>
            <h4 class="font-semibold">Сканирование удалено!</h4>
          </div>
        </div>
      `
      document.body.appendChild(notification)
      setTimeout(() => {
        notification.style.transition = 'opacity 0.5s'
        notification.style.opacity = '0'
        setTimeout(() => document.body.removeChild(notification), 500)
      }, 3000)
    } catch (error: any) {
      console.error('Ошибка удаления сканирования:', error)
      const errorMsg = error.response?.data?.detail || 'Не удалось удалить сканирование'
      alert(errorMsg)
    }
  }

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const response = await api.get(`/api/export/scans/${format}`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      link.download = `scans_report_${timestamp}.${format === 'excel' ? 'xlsx' : format}`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error(`Ошибка экспорта в ${format}:`, error)
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
      case 'pending':
        return 'badge-info'
      default:
        return 'badge-info'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Завершено'
      case 'failed':
        return 'Ошибка'
      case 'running':
        return 'Выполняется'
      case 'pending':
        return 'Ожидает'
      default:
        return status
    }
  }

  const getDomainName = (domainId: number) => {
    const domain = domains.find(d => d.id === domainId)
    return domain ? domain.name : `Domain ${domainId}`
  }

  const getProgressBar = (scan: Scan) => {
    if (scan.status === 'running') {
      return (
        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
        </div>
      )
    }
    if (scan.status === 'completed') {
      return (
        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
          <div className="bg-green-600 h-2 rounded-full" style={{width: '100%'}}></div>
        </div>
      )
    }
    return null
  }

  const handleShowProgress = (scanId: number) => {
    setSelectedScanId(scanId)
  }

  const handleCloseProgress = () => {
    setSelectedScanId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Сканирования</h1>
          <p className="text-gray-400 mt-2">Управление и мониторинг сканирований безопасности</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Кнопки экспорта */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExport('pdf')}
              className="btn btn-secondary flex items-center space-x-2"
              title="Экспорт в PDF"
            >
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="btn btn-secondary flex items-center space-x-2"
              title="Экспорт в Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="btn btn-secondary flex items-center space-x-2"
              title="Экспорт в CSV"
            >
              <File className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
          <button
            onClick={fetchData}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Панель запуска сканирования - только для менеджеров и админов */}
      {(userRole === 'manager' || userRole === 'admin') && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Запустить сканирование</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Выберите домены для сканирования
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {domains.map((domain) => (
                <label key={domain.id} className="flex items-center space-x-3 p-3 bg-dark-700 rounded-lg cursor-pointer hover:bg-dark-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedDomains.includes(domain.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDomains([...selectedDomains, domain.id])
                      } else {
                        setSelectedDomains(selectedDomains.filter(id => id !== domain.id))
                      }
                    }}
                    className="w-4 h-4 text-primary-600 bg-dark-800 border-dark-500 rounded focus:ring-primary-500"
                  />
                  <span className="text-white font-medium">{domain.name}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleStartScan}
              disabled={selectedDomains.length === 0 || startingScan}
              className="btn btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startingScan ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>
                {startingScan ? 'Запуск...' : `Запустить сканирование (${selectedDomains.length})`}
              </span>
            </button>
            
            {selectedDomains.length > 0 && (
              <button
                onClick={() => setSelectedDomains([])}
                className="btn btn-secondary"
              >
                Очистить выбор
              </button>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Список сканирований */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">История сканирований</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Автообновление каждые 5 сек</span>
          </div>
        </div>
        
        {scans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Сканирования не найдены</p>
            <p className="text-gray-500 text-sm">Запустите первое сканирование выше</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scans.map((scan) => (
              <div key={scan.id} className="p-4 bg-dark-700 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-white">{getDomainName(scan.domain_id)}</h3>
                    <span className={`badge ${getStatusBadge(scan.status)}`}>
                      {getStatusText(scan.status)}
                    </span>
                    {scan.status === 'running' && (
                      <span className="text-blue-400 text-sm animate-pulse">
                        🔄 В процессе...
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleShowProgress(scan.id)}
                      className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors"
                      title="Показать прогресс"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    
                    {scan.status === 'completed' && (
                      <button
                        onClick={() => handleViewReport(scan.id)}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                        title="Просмотреть отчет"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    
                    {/* Кнопка удаления - только для менеджеров и админов, только для завершенных сканирований */}
                    {(userRole === 'manager' || userRole === 'admin') && scan.status !== 'running' && (
                      <button
                        onClick={() => handleDeleteScan(scan.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Удалить сканирование"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Запущено</p>
                    <p className="text-white">
                      {formatDistanceToNow(new Date(scan.started_at), { 
                        addSuffix: true, 
                        locale: ru 
                      })}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-400">Субдомены</p>
                    <p className="text-white">
                      {scan.active_subdomains} / {scan.total_subdomains}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-400">Уязвимости</p>
                    <p className="text-white">{scan.total_vulnerabilities}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-400">Критические</p>
                    <p className="text-red-400">{scan.critical_vulns}</p>
                  </div>
                </div>
                
                {/* Прогресс-бар для активных сканирований */}
                {getProgressBar(scan)}
                
                {scan.error_message && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">{scan.error_message}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно с детальным прогрессом */}
      {selectedScanId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Детальный прогресс сканирования</h2>
                <button
                  onClick={handleCloseProgress}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <ScanProgress 
                scanId={selectedScanId}
                domainName={getDomainName(scans.find(s => s.id === selectedScanId)?.domain_id || 0)}
                onStatusChange={(status) => {
                  // Обновляем статус в списке сканирований
                  setScans(prev => prev.map(scan => 
                    scan.id === selectedScanId ? { ...scan, status } : scan
                  ))
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно с просмотром отчета */}
      {viewingReportId && (
        <ReportViewer
          scanId={viewingReportId}
          domainName={getDomainName(scans.find(s => s.id === viewingReportId)?.domain_id || 0)}
          onClose={handleCloseReport}
        />
      )}
    </div>
  )
}
