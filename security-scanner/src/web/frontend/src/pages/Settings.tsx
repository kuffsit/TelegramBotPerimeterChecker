import { useEffect, useState } from 'react'
import { Save, RefreshCw, Shield, Bell, Globe, Wrench } from 'lucide-react'
import { api } from '../services/api'

interface Settings {
  telegram_enabled: boolean
  ports: string
  severity_levels: string
  subfinder_path: string
  nmap_path: string
  nuclei_path: string
}

export default function Settings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    ports: '',
    severity_levels: '',
    telegram_token: '',
    chat_id: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings')
      setSettings(response.data)
      setFormData({
        ports: response.data.ports,
        severity_levels: response.data.severity_levels,
        telegram_token: '',
        chat_id: ''
      })
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/api/settings', formData)
      await fetchSettings()
      alert('Настройки сохранены')
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error)
      alert('Ошибка сохранения настроек')
    } finally {
      setSaving(false)
    }
  }

  const handleTestTelegram = async () => {
    if (!formData.telegram_token || !formData.chat_id) {
      alert('Введите токен и Chat ID для тестирования')
      return
    }

    setSaving(true)
    try {
      const response = await api.post('/api/settings/test-telegram', formData)
      alert(response.data.message)
    } catch (error: any) {
      console.error('Ошибка тестирования Telegram:', error)
      alert(error.response?.data?.detail || 'Ошибка тестирования Telegram')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Не удалось загрузить настройки</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Настройки</h1>
          <p className="text-gray-400 mt-2">Конфигурация сканера безопасности</p>
        </div>
        <button
          onClick={fetchSettings}
          className="btn btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Обновить</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Настройки сканирования */}
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-white">Настройки сканирования</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Порты для сканирования
              </label>
              <input
                type="text"
                value={formData.ports}
                onChange={(e) => setFormData({ ...formData, ports: e.target.value })}
                className="input w-full"
                placeholder="22,23,25,53,80,110,443,445,3306,3389,5900,8080,8443,9090"
              />
              <p className="text-gray-500 text-xs mt-1">
                Список портов через запятую
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Уровни критичности уязвимостей
              </label>
              <select
                value={formData.severity_levels}
                onChange={(e) => setFormData({ ...formData, severity_levels: e.target.value })}
                className="input w-full"
              >
                <option value="medium,high,critical">Средние, Высокие, Критические</option>
                <option value="high,critical">Высокие, Критические</option>
                <option value="critical">Только критические</option>
                <option value="low,medium,high,critical">Все уровни</option>
              </select>
            </div>
          </div>
        </div>

        {/* Настройки Telegram */}
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Bell className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Telegram уведомления</h2>
            <span className={`badge ${settings.telegram_enabled ? 'badge-success' : 'badge-danger'}`}>
              {settings.telegram_enabled ? 'Включено' : 'Отключено'}
            </span>
          </div>
          
          {/* Инструкции */}
          <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-6">
            <h4 className="text-blue-300 font-medium mb-2">📋 Как получить токен и Chat ID:</h4>
            <ol className="text-blue-200 text-sm space-y-1 list-decimal list-inside">
              <li>Найдите <strong>@BotFather</strong> в Telegram и создайте бота командой <code>/newbot</code></li>
              <li>Скопируйте токен бота (формат: <code>123456789:ABC...</code>)</li>
              <li>Найдите <strong>@userinfobot</strong> и получите ваш Chat ID</li>
              <li>Введите данные ниже и нажмите "Сохранить"</li>
            </ol>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Токен бота
              </label>
              <input
                type="password"
                value={formData.telegram_token}
                onChange={(e) => setFormData({ ...formData, telegram_token: e.target.value })}
                className="input w-full"
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Chat ID
              </label>
              <input
                type="text"
                value={formData.chat_id}
                onChange={(e) => setFormData({ ...formData, chat_id: e.target.value })}
                className="input w-full"
                placeholder="123456789"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleTestTelegram}
                disabled={saving || !formData.telegram_token || !formData.chat_id}
                className="btn btn-secondary flex items-center space-x-2 disabled:opacity-50"
              >
                <span>🧪 Тест</span>
              </button>
            </div>
          </div>
        </div>

        {/* Информация о путях */}
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Wrench className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">Пути к инструментам</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subfinder
              </label>
              <div className="input w-full bg-dark-800 text-gray-400">
                {settings.subfinder_path}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nmap
              </label>
              <div className="input w-full bg-dark-800 text-gray-400">
                {settings.nmap_path}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nuclei
              </label>
              <div className="input w-full bg-dark-800 text-gray-400">
                {settings.nuclei_path}
              </div>
            </div>
          </div>
        </div>

        {/* Информация о системе */}
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Globe className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-semibold text-white">Информация о системе</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Версия API:</span>
              <span className="text-white">2.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">База данных:</span>
              <span className="text-white">SQLite</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Статус:</span>
              <span className="badge badge-success">Активен</span>
            </div>
          </div>
        </div>
      </div>

      {/* Кнопка сохранения */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary flex items-center space-x-2 disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'Сохранение...' : 'Сохранить настройки'}</span>
        </button>
      </div>
    </div>
  )
}
