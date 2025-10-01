import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Play, Pause } from 'lucide-react'
import { api } from '../services/api'

interface Domain {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function Domains() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null)
  
  // Получаем информацию о пользователе
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const userRole = user.role || 'auditor'

  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    try {
      const response = await api.get('/api/domains')
      setDomains(response.data)
    } catch (error) {
      console.error('Ошибка загрузки доменов:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDomain = async (domainData: { name: string; description?: string }) => {
    try {
      await api.post('/api/domains', domainData)
      await fetchDomains()
      setShowAddModal(false)
    } catch (error) {
      console.error('Ошибка добавления домена:', error)
    }
  }

  const handleUpdateDomain = async (id: number, domainData: Partial<Domain>) => {
    try {
      await api.put(`/api/domains/${id}`, domainData)
      await fetchDomains()
      setEditingDomain(null)
    } catch (error) {
      console.error('Ошибка обновления домена:', error)
    }
  }

  const handleDeleteDomain = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот домен?')) return
    
    try {
      await api.delete(`/api/domains/${id}`)
      await fetchDomains()
    } catch (error) {
      console.error('Ошибка удаления домена:', error)
    }
  }

  const handleToggleActive = async (domain: Domain) => {
    await handleUpdateDomain(domain.id, { is_active: !domain.is_active })
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
          <h1 className="text-3xl font-bold text-white">Домены</h1>
          <p className="text-gray-400 mt-2">Управление доменами для сканирования</p>
        </div>
        {/* Показываем кнопку только менеджерам и админам */}
        {(userRole === 'manager' || userRole === 'admin') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить домен</span>
          </button>
        )}
      </div>

      {/* Список доменов */}
      <div className="card p-6">
        {domains.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Домены не найдены</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              Добавить первый домен
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {domains.map((domain) => (
              <div key={domain.id} className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-white">{domain.name}</h3>
                    <span className={`badge ${domain.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {domain.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  {domain.description && (
                    <p className="text-gray-400 mt-1">{domain.description}</p>
                  )}
                  <p className="text-gray-500 text-sm mt-2">
                    Добавлен: {new Date(domain.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleActive(domain)}
                    className={`p-2 rounded-lg transition-colors ${
                      domain.is_active 
                        ? 'text-yellow-400 hover:bg-yellow-500/20' 
                        : 'text-green-400 hover:bg-green-500/20'
                    }`}
                    title={domain.is_active ? 'Деактивировать' : 'Активировать'}
                  >
                    {domain.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  
                  {/* Кнопка редактирования - только для менеджеров и админов */}
                  {(userRole === 'manager' || userRole === 'admin') && (
                    <button
                      onClick={() => setEditingDomain(domain)}
                      className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                      title="Редактировать"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Кнопка удаления - только для админов */}
                  {userRole === 'admin' && (
                    <button
                      onClick={() => handleDeleteDomain(domain.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно добавления домена */}
      {showAddModal && (
        <AddDomainModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddDomain}
        />
      )}

      {/* Модальное окно редактирования домена */}
      {editingDomain && (
        <EditDomainModal
          domain={editingDomain}
          onClose={() => setEditingDomain(null)}
          onSave={(data) => handleUpdateDomain(editingDomain.id, data)}
        />
      )}
    </div>
  )
}

// Компонент модального окна добавления домена
function AddDomainModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void }) {
  const [formData, setFormData] = useState({ name: '', description: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name.trim()) {
      onSave(formData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-700 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-white mb-4">Добавить домен</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Имя домена *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
              placeholder="example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full h-20 resize-none"
              placeholder="Описание домена (необязательно)"
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1">
              Добавить
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

// Компонент модального окна редактирования домена
function EditDomainModal({ domain, onClose, onSave }: { 
  domain: Domain; 
  onClose: () => void; 
  onSave: (data: any) => void 
}) {
  const [formData, setFormData] = useState({
    name: domain.name,
    description: domain.description || '',
    is_active: domain.is_active
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-700 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-white mb-4">Редактировать домен</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Имя домена *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full h-20 resize-none"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary-600 bg-dark-800 border-dark-500 rounded focus:ring-primary-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-300">
              Активен для сканирования
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
