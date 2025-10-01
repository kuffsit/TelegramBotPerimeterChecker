import { Bell, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Header() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="bg-dark-800 border-b border-dark-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('app.title')}</h2>
          <p className="text-gray-400">{t('app.description')}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm">
              <p className="text-white font-medium">{user.username || t('common.user')}</p>
              <p className="text-gray-400">{user.email || 'user@example.com'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white ml-4"
            >
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
