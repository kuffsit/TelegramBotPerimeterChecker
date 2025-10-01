import { useEffect, useState } from 'react'
import { RefreshCw, Download, CheckCircle, AlertTriangle, Settings, Clock } from 'lucide-react'
import { api } from '../services/api'

interface ScannerVersion {
  current_version: string | null
  latest_version: string | null
  update_available: boolean
  last_checked: string | null
}

interface UpdateStatus {
  scanner_versions: {
    subfinder: ScannerVersion
    nmap: ScannerVersion
    nuclei: ScannerVersion
  }
  last_checked: string | null
  updates_available: boolean
}

// interface UpdateResult {
//   success: boolean
//   message: string
//   new_version?: string
//   skipped?: boolean
// }

export default function Updates() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false)
  const [checkInterval, setCheckInterval] = useState(24)

  useEffect(() => {
    fetchUpdateStatus()
  }, [])

  const fetchUpdateStatus = async () => {
    try {
      const response = await api.get('/api/updates/status')
      setUpdateStatus(response.data)
    } catch (error) {
      console.error('Ошибка загрузки статуса обновлений:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkUpdates = async () => {
    try {
      setLoading(true)
      await api.post('/api/updates/check')
      await fetchUpdateStatus()
    } catch (error) {
      console.error('Ошибка проверки обновлений:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateScanner = async (scannerName: string) => {
    try {
      setUpdating(scannerName)
      const response = await api.post(`/api/updates/${scannerName}`)
      
      if (response.data.success) {
        await fetchUpdateStatus()
      }
      
      return response.data
    } catch (error) {
      console.error(`Ошибка обновления ${scannerName}:`, error)
      return { success: false, message: 'Ошибка обновления' }
    } finally {
      setUpdating(null)
    }
  }

  const updateAllScanners = async () => {
    try {
      setUpdating('all')
      const response = await api.post('/api/updates/all')
      await fetchUpdateStatus()
      return response.data
    } catch (error) {
      console.error('Ошибка обновления всех сканеров:', error)
      return { success: false, message: 'Ошибка обновления' }
    } finally {
      setUpdating(null)
    }
  }

  const configureAutoUpdate = async () => {
    try {
      await api.post('/api/updates/auto-update', {
        enabled: autoUpdateEnabled,
        check_interval_hours: checkInterval
      })
    } catch (error) {
      console.error('Ошибка настройки автоматического обновления:', error)
    }
  }

  const getScannerIcon = (scannerName: string) => {
    switch (scannerName) {
      case 'subfinder':
        return '🔍'
      case 'nmap':
        return '🗺️'
      case 'nuclei':
        return '⚡'
      default:
        return '🔧'
    }
  }

  const getScannerDescription = (scannerName: string) => {
    switch (scannerName) {
      case 'subfinder':
        return 'Инструмент для обнаружения поддоменов'
      case 'nmap':
        return 'Сканер портов и сетевых сервисов'
      case 'nuclei':
        return 'Сканер уязвимостей на основе шаблонов'
      default:
        return 'Сканер безопасности'
    }
  }

  if (loading && !updateStatus) {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Обновления сканеров</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Обновления сканеров</h1>
          <p className="text-gray-400 mt-2">Управление версиями и обновлениями сканеров безопасности</p>
        </div>
        <button
          onClick={checkUpdates}
          disabled={loading}
          className="btn btn-primary flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Проверить обновления</span>
        </button>
      </div>

      {/* Общая информация */}
      {updateStatus && (
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Статус обновлений</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-dark-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {Object.values(updateStatus.scanner_versions).filter(v => !v.update_available).length}
                  </p>
                  <p className="text-gray-400 text-sm">Актуальных</p>
                </div>
              </div>
            </div>

            <div className="bg-dark-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {Object.values(updateStatus.scanner_versions).filter(v => v.update_available).length}
                  </p>
                  <p className="text-gray-400 text-sm">Требуют обновления</p>
                </div>
              </div>
            </div>

            <div className="bg-dark-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Clock className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-sm font-bold text-white">
                    {updateStatus.last_checked 
                      ? new Date(updateStatus.last_checked).toLocaleString('ru-RU')
                      : 'Никогда'
                    }
                  </p>
                  <p className="text-gray-400 text-sm">Последняя проверка</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Список сканеров */}
      {updateStatus && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Сканеры</h2>
          
          <div className="space-y-4">
            {Object.entries(updateStatus.scanner_versions).map(([scannerName, version]) => (
              <div key={scannerName} className="p-4 bg-dark-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{getScannerIcon(scannerName)}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-white capitalize">{scannerName}</h3>
                      <p className="text-gray-400 text-sm">{getScannerDescription(scannerName)}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400 text-sm">Текущая версия:</span>
                          <span className="text-white font-mono text-sm">
                            {version.current_version || 'Не установлена'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400 text-sm">Последняя версия:</span>
                          <span className="text-white font-mono text-sm">
                            {version.latest_version || 'Неизвестно'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {version.update_available ? (
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        <span className="text-yellow-400 text-sm">Обновление доступно</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 text-sm">Актуальна</span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => updateScanner(scannerName)}
                      disabled={!version.update_available || updating === scannerName}
                      className={`btn ${
                        version.update_available 
                          ? 'btn-primary' 
                          : 'btn-secondary'
                      } flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {updating === scannerName ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>
                        {updating === scannerName 
                          ? 'Обновление...' 
                          : version.update_available 
                            ? 'Обновить' 
                            : 'Актуальна'
                        }
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Массовое обновление */}
      {updateStatus?.updates_available && (
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Download className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-semibold text-white">Массовое обновление</h2>
          </div>
          
          <p className="text-gray-400 mb-4">
            Обновить все сканеры, для которых доступны новые версии
          </p>
          
          <button
            onClick={updateAllScanners}
            disabled={updating === 'all'}
            className="btn btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating === 'all' ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {updating === 'all' ? 'Обновление...' : 'Обновить все'}
            </span>
          </button>
        </div>
      )}

      {/* Настройки автоматического обновления */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Автоматическое обновление</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="autoUpdate"
              checked={autoUpdateEnabled}
              onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
              className="w-4 h-4 text-primary-600 bg-dark-800 border-dark-500 rounded"
            />
            <label htmlFor="autoUpdate" className="text-gray-300">
              Включить автоматическое обновление
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Интервал проверки (часы)
            </label>
            <input
              type="number"
              value={checkInterval}
              onChange={(e) => setCheckInterval(parseInt(e.target.value))}
              min="1"
              max="168"
              className="input w-32"
            />
          </div>
          
          <button
            onClick={configureAutoUpdate}
            className="btn btn-secondary"
          >
            Сохранить настройки
          </button>
        </div>
      </div>

      {/* Информационное сообщение */}
      <div className="card p-6 bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-blue-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Важная информация</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Обновление сканеров может занять несколько минут</li>
              <li>• Во время обновления сканирования могут быть недоступны</li>
              <li>• Рекомендуется обновлять сканеры в нерабочее время</li>
              <li>• После обновления Nuclei автоматически обновляются шаблоны</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
