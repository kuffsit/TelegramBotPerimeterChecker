import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Key, Plus, Edit, Trash2, Copy, Check } from 'lucide-react';
import { api } from '../services/api';

interface ApiKey {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used: string | null;
  expires_at: string | null;
  user_id: number;
}

interface ApiKeyWithKey extends ApiKey {
  key: string;
}

interface CreateApiKeyData {
  name: string;
  expires_at?: string;
}

export default function ApiKeys() {
  const { t } = useTranslation();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [newKey, setNewKey] = useState<ApiKeyWithKey | null>(null);
  const [copiedKey, setCopiedKey] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateApiKeyData>({
    name: '',
    expires_at: ''
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await api.get('/api/api-keys');
      setApiKeys(response.data);
    } catch (error) {
      console.error('Ошибка загрузки API ключей:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        expires_at: formData.expires_at || null
      };
      
      const response = await api.post('/api/api-keys', data);
      setNewKey(response.data);
      setShowCreateModal(false);
      setFormData({ name: '', expires_at: '' });
      fetchApiKeys();
    } catch (error) {
      console.error('Ошибка создания API ключа:', error);
    }
  };

  const handleUpdateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey) return;
    
    try {
      await api.put(`/api/api-keys/${editingKey.id}`, {
        name: formData.name,
        is_active: editingKey.is_active,
        expires_at: formData.expires_at || null
      });
      
      setShowEditModal(false);
      setEditingKey(null);
      setFormData({ name: '', expires_at: '' });
      fetchApiKeys();
    } catch (error) {
      console.error('Ошибка обновления API ключа:', error);
    }
  };

  const handleDeleteApiKey = async (id: number) => {
    if (!confirm(t('api_keys.confirm_delete'))) return;
    
    try {
      await api.delete(`/api/api-keys/${id}`);
      fetchApiKeys();
    } catch (error) {
      console.error('Ошибка удаления API ключа:', error);
    }
  };

  const handleCopyKey = async (key: string, id: number) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Ошибка копирования:', error);
    }
  };

  const openEditModal = (apiKey: ApiKey) => {
    setEditingKey(apiKey);
    setFormData({
      name: apiKey.name,
      expires_at: apiKey.expires_at ? apiKey.expires_at.split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const getStatusText = (apiKey: ApiKey) => {
    if (!apiKey.is_active) return t('api_keys.inactive');
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return t('api_keys.expired');
    }
    return t('api_keys.active');
  };

  const getStatusColor = (apiKey: ApiKey) => {
    if (!apiKey.is_active) return 'text-red-500';
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return 'text-orange-500';
    }
    return 'text-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">{t('api_keys.title')}</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('api_keys.add_api_key')}</span>
        </button>
      </div>

      {/* Новый API ключ */}
      {newKey && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-400 mb-4">
            {t('api_keys.new_api_key')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('api_keys.api_key_name')}
              </label>
              <div className="text-white">{newKey.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <div className="flex items-center space-x-2">
                <code className="bg-gray-800 text-green-400 px-3 py-2 rounded flex-1 font-mono text-sm">
                  {newKey.key}
                </code>
                <button
                  onClick={() => handleCopyKey(newKey.key, newKey.id)}
                  className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors"
                >
                  {copiedKey === newKey.id ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-3">
              <p className="text-yellow-400 text-sm">
                {t('api_keys.save_key_warning')}
              </p>
            </div>
            <div className="bg-gray-800 rounded p-3">
              <p className="text-gray-300 text-sm mb-2">{t('api_keys.usage_example')}</p>
              <code className="text-green-400 text-sm">
                {t('api_keys.curl_example').replace('YOUR_KEY', newKey.key)}
              </code>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {/* Список API ключей */}
      <div className="bg-dark-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  {t('api_keys.api_key_name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  {t('api_keys.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  {t('api_keys.created_at')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  {t('api_keys.last_used')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  {t('api_keys.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {apiKeys.map((apiKey) => (
                <tr key={apiKey.id} className="hover:bg-dark-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Key className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-white">{apiKey.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusColor(apiKey)}>
                      {getStatusText(apiKey)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                    {new Date(apiKey.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                    {apiKey.last_used 
                      ? new Date(apiKey.last_used).toLocaleDateString('ru-RU')
                      : t('api_keys.never_used')
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(apiKey)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteApiKey(apiKey.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно создания */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              {t('api_keys.add_api_key')}
            </h2>
            <form onSubmit={handleCreateApiKey} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('api_keys.api_key_name')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('api_keys.api_key_name_placeholder')}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('api_keys.expires_at')}
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                />
                <p className="text-gray-400 text-xs mt-1">
                  {t('api_keys.expires_at_placeholder')}
                </p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {t('common.add')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования */}
      {showEditModal && editingKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">
              {t('api_keys.edit')}
            </h2>
            <form onSubmit={handleUpdateApiKey} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('api_keys.api_key_name')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('api_keys.expires_at')}
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingKey.is_active}
                  onChange={(e) => setEditingKey({ ...editingKey, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 bg-dark-700 border-gray-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-300">
                  {t('api_keys.active')}
                </label>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
