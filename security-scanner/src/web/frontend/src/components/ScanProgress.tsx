import { useEffect, useState } from 'react'
import { Play, Pause, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { api } from '../services/api'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface ScanProgressData {
  scan_id: number
  status: string
  progress_percentage: number
  current_step: string
  total_subdomains: number
  checked_subdomains: number
  current_subdomain?: string
  started_at: string
  estimated_completion?: string
}

interface ScanProgressProps {
  scanId: number
  domainName: string
  onStatusChange?: (status: string) => void
}

export default function ScanProgress({ scanId, domainName, onStatusChange }: ScanProgressProps) {
  const [progress, setProgress] = useState<ScanProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [stopping, setStopping] = useState(false)

  useEffect(() => {
    fetchProgress()
    
    // Обновляем прогресс каждые 3 секунды
    const interval = setInterval(() => {
      fetchProgress()
    }, 3000)
    
    return () => clearInterval(interval)
  }, [scanId])

  const fetchProgress = async () => {
    try {
      const response = await api.get(`/api/scans/${scanId}/progress`)
      setProgress(response.data)
      if (onStatusChange) {
        onStatusChange(response.data.status)
      }
    } catch (error) {
      console.error('Ошибка загрузки прогресса:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    if (!confirm('Вы уверены, что хотите остановить сканирование?')) {
      return
    }

    setStopping(true)
    try {
      await api.post(`/api/scans/${scanId}/stop`)
      await fetchProgress() // Обновляем статус
    } catch (error) {
      console.error('Ошибка остановки сканирования:', error)
      alert('Ошибка остановки сканирования')
    } finally {
      setStopping(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-5 h-5 text-blue-400 animate-pulse" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'stopped':
        return <Pause className="w-5 h-5 text-yellow-400" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-blue-400'
      case 'completed':
        return 'text-green-400'
      case 'failed':
        return 'text-red-400'
      case 'stopped':
        return 'text-yellow-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return 'Выполняется'
      case 'completed':
        return 'Завершено'
      case 'failed':
        return 'Ошибка'
      case 'stopped':
        return 'Остановлено'
      case 'pending':
        return 'Ожидание'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="card p-6">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">Не удалось загрузить прогресс сканирования</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {getStatusIcon(progress.status)}
          <div>
            <h3 className="text-lg font-semibold text-white">{domainName}</h3>
            <p className={`text-sm ${getStatusColor(progress.status)}`}>
              {getStatusText(progress.status)}
            </p>
          </div>
        </div>
        
        {progress.status === 'running' && (
          <button
            onClick={handleStop}
            disabled={stopping}
            className="btn btn-danger flex items-center space-x-2 disabled:opacity-50"
          >
            {stopping ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Pause className="w-4 h-4" />
            )}
            <span>{stopping ? 'Остановка...' : 'Остановить'}</span>
          </button>
        )}
      </div>

      {/* Прогресс-бар */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Прогресс</span>
          <span className="text-sm text-white font-medium">{progress.progress_percentage}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress.progress_percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Детальная информация */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-dark-700 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Текущий этап</h4>
          <p className="text-white">{progress.current_step}</p>
        </div>
        
        <div className="bg-dark-700 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Субдомены</h4>
          <p className="text-white">
            {progress.checked_subdomains} / {progress.total_subdomains}
          </p>
        </div>
        
        <div className="bg-dark-700 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Запущено</h4>
          <p className="text-white">
            {formatDistanceToNow(new Date(progress.started_at), { 
              addSuffix: true, 
              locale: ru 
            })}
          </p>
        </div>
        
        {progress.current_subdomain && (
          <div className="bg-dark-700 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Текущий субдомен</h4>
            <p className="text-white truncate">{progress.current_subdomain}</p>
          </div>
        )}
      </div>

      {/* Статистика */}
      {progress.status === 'completed' && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h4 className="text-green-400 font-medium">Сканирование завершено</h4>
          </div>
          <p className="text-green-200 text-sm">
            Проверено {progress.total_subdomains} субдоменов
          </p>
        </div>
      )}

      {progress.status === 'stopped' && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Pause className="w-5 h-5 text-yellow-400" />
            <h4 className="text-yellow-400 font-medium">Сканирование остановлено</h4>
          </div>
          <p className="text-yellow-200 text-sm">
            Остановлено пользователем
          </p>
        </div>
      )}
    </div>
  )
}
