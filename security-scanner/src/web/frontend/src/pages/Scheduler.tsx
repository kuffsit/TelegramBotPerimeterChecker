import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Play, Pause, Clock, Calendar } from 'lucide-react'
import { api } from '../services/api'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Schedule {
  id: number
  name: string
  description: string | null
  domain_ids: number[]
  cron_expression: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_run: string | null
  next_run: string | null
  created_by: number
}

interface Domain {
  id: number
  name: string
  is_active: boolean
}

export default function Scheduler() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  
  // Получаем информацию о пользователе
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const userRole = user.role || 'auditor'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [schedulesResponse, domainsResponse] = await Promise.all([
        api.get('/api/schedules'),
        api.get('/api/domains')
      ])
      setSchedules(schedulesResponse.data)
      setDomains(domainsResponse.data)
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSchedule = async (scheduleData: any) => {
    try {
      await api.post('/api/schedules', scheduleData)
      await fetchData()
      setShowAddModal(false)
    } catch (error) {
      console.error('Ошибка создания расписания:', error)
    }
  }

  const handleUpdateSchedule = async (scheduleId: number, scheduleData: any) => {
    try {
      await api.put(`/api/schedules/${scheduleId}`, scheduleData)
      await fetchData()
      setEditingSchedule(null)
    } catch (error) {
      console.error('Ошибка обновления расписания:', error)
    }
  }

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!confirm('Вы уверены, что хотите удалить это расписание?')) {
      return
    }
    
    try {
      await api.delete(`/api/schedules/${scheduleId}`)
      await fetchData()
    } catch (error) {
      console.error('Ошибка удаления расписания:', error)
    }
  }

  const handleToggleActive = async (schedule: Schedule) => {
    try {
      await api.put(`/api/schedules/${schedule.id}`, {
        is_active: !schedule.is_active
      })
      await fetchData()
    } catch (error) {
      console.error('Ошибка изменения статуса расписания:', error)
    }
  }

  const getDomainNames = (domainIds: number[]) => {
    return domainIds.map(id => {
      const domain = domains.find(d => d.id === id)
      return domain ? domain.name : `ID: ${id}`
    }).join(', ')
  }

  const formatCronExpression = (cron: string) => {
    // Простое форматирование cron выражений
    const parts = cron.split(' ')
    if (parts.length === 5) {
      const [minute, hour] = parts
      return `Каждый день в ${hour}:${minute}`
    }
    return cron
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Планировщик</h1>
          <p className="text-gray-400 mt-2">Автоматические сканирования по расписанию</p>
        </div>
        {/* Показываем кнопку только менеджерам и админам */}
        {(userRole === 'manager' || userRole === 'admin') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Создать расписание</span>
          </button>
        )}
      </div>

      {/* Список расписаний */}
      <div className="card p-6">
        {schedules.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">Расписания не найдены</p>
            {(userRole === 'manager' || userRole === 'admin') && (
              <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                Создать первое расписание
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map(schedule => (
              <div key={schedule.id} className="p-4 bg-dark-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-white">{schedule.name}</h3>
                      <span className={`badge ${schedule.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {schedule.is_active ? 'Активно' : 'Неактивно'}
                      </span>
                    </div>
                    {schedule.description && (
                      <p className="text-gray-400 mt-1">{schedule.description}</p>
                    )}
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-300">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {formatCronExpression(schedule.cron_expression)}
                      </p>
                      <p className="text-sm text-gray-300">
                        Домены: {getDomainNames(schedule.domain_ids)}
                      </p>
                      {schedule.last_run && (
                        <p className="text-sm text-gray-500">
                          Последний запуск: {formatDistanceToNow(new Date(schedule.last_run), { addSuffix: true, locale: ru })}
                        </p>
                      )}
                      {schedule.next_run && (
                        <p className="text-sm text-gray-500">
                          Следующий запуск: {formatDistanceToNow(new Date(schedule.next_run), { addSuffix: true, locale: ru })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Кнопка активации/деактивации - только для менеджеров и админов */}
                    {(userRole === 'manager' || userRole === 'admin') && (
                      <button
                        onClick={() => handleToggleActive(schedule)}
                        className={`p-2 rounded-lg transition-colors ${
                          schedule.is_active 
                            ? 'text-yellow-400 hover:bg-yellow-500/20' 
                            : 'text-green-400 hover:bg-green-500/20'
                        }`}
                        title={schedule.is_active ? 'Деактивировать' : 'Активировать'}
                      >
                        {schedule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    )}
                    
                    {/* Кнопка редактирования - только для менеджеров и админов */}
                    {(userRole === 'manager' || userRole === 'admin') && (
                      <button
                        onClick={() => setEditingSchedule(schedule)}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    
                    {/* Кнопка удаления - только для админов */}
                    {userRole === 'admin' && (
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddScheduleModal 
          onClose={() => setShowAddModal(false)} 
          onSave={handleAddSchedule}
          domains={domains}
        />
      )}
      {editingSchedule && (
        <EditScheduleModal 
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)} 
          onSave={handleUpdateSchedule}
          domains={domains}
        />
      )}
    </div>
  )
}

// Компонент модального окна для создания расписания
function AddScheduleModal({ onClose, onSave, domains }: { 
  onClose: () => void
  onSave: (data: any) => void
  domains: Domain[]
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    domain_ids: [] as number[],
    cron_expression: '0 9 * * *', // По умолчанию каждый день в 9:00
    is_active: true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleDomainChange = (domainId: number, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        domain_ids: [...prev.domain_ids, domainId]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        domain_ids: prev.domain_ids.filter(id => id !== domainId)
      }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-white mb-4">Создать расписание</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Название
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Домены для сканирования
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {domains.map(domain => (
                <label key={domain.id} className="flex items-center space-x-2 p-2 bg-dark-700 rounded cursor-pointer hover:bg-dark-600">
                  <input
                    type="checkbox"
                    checked={formData.domain_ids.includes(domain.id)}
                    onChange={(e) => handleDomainChange(domain.id, e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-dark-800 border-dark-500 rounded"
                  />
                  <span className="text-white text-sm">{domain.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Расписание (Cron выражение)
            </label>
            <input
              type="text"
              value={formData.cron_expression}
              onChange={(e) => setFormData(prev => ({ ...prev, cron_expression: e.target.value }))}
              className="input"
              placeholder="0 9 * * * (каждый день в 9:00)"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Формат: минута час день месяц день_недели
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 text-primary-600 bg-dark-800 border-dark-500 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-300">
              Активно
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1">
              Создать
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Компонент модального окна для редактирования расписания
function EditScheduleModal({ schedule, onClose, onSave, domains }: { 
  schedule: Schedule
  onClose: () => void
  onSave: (id: number, data: any) => void
  domains: Domain[]
}) {
  const [formData, setFormData] = useState({
    name: schedule.name,
    description: schedule.description || '',
    domain_ids: schedule.domain_ids,
    cron_expression: schedule.cron_expression,
    is_active: schedule.is_active
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(schedule.id, formData)
  }

  const handleDomainChange = (domainId: number, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        domain_ids: [...prev.domain_ids, domainId]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        domain_ids: prev.domain_ids.filter(id => id !== domainId)
      }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-white mb-4">Редактировать расписание</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Название
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Домены для сканирования
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {domains.map(domain => (
                <label key={domain.id} className="flex items-center space-x-2 p-2 bg-dark-700 rounded cursor-pointer hover:bg-dark-600">
                  <input
                    type="checkbox"
                    checked={formData.domain_ids.includes(domain.id)}
                    onChange={(e) => handleDomainChange(domain.id, e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-dark-800 border-dark-500 rounded"
                  />
                  <span className="text-white text-sm">{domain.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Расписание (Cron выражение)
            </label>
            <input
              type="text"
              value={formData.cron_expression}
              onChange={(e) => setFormData(prev => ({ ...prev, cron_expression: e.target.value }))}
              className="input"
              placeholder="0 9 * * * (каждый день в 9:00)"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Формат: минута час день месяц день_недели
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 text-primary-600 bg-dark-800 border-dark-500 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-300">
              Активно
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1">
              Сохранить
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
