import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Globe, 
  Search, 
  Settings, 
  Shield,
  Users,
  Calendar,
  GitCompare,
  Clock,
  MapPin,
  Download
} from 'lucide-react'
import clsx from 'clsx'

const navigation = [
  { name: 'Дашборд', href: '/', icon: LayoutDashboard, roles: ['auditor', 'manager', 'admin'] },
  { name: 'Домены', href: '/domains', icon: Globe, roles: ['auditor', 'manager', 'admin'] },
  { name: 'Сканирования', href: '/scans', icon: Search, roles: ['auditor', 'manager', 'admin'] },
  { name: 'Сравнение', href: '/comparison', icon: GitCompare, roles: ['auditor', 'manager', 'admin'] },
  { name: 'Статистика по времени', href: '/time-stats', icon: Clock, roles: ['auditor', 'manager', 'admin'] },
  { name: 'Геолокация', href: '/geolocation', icon: MapPin, roles: ['auditor', 'manager', 'admin'] },
  { name: 'Планировщик', href: '/scheduler', icon: Calendar, roles: ['manager', 'admin'] },
  { name: 'Обновления', href: '/updates', icon: Download, roles: ['admin'] },
  { name: 'Пользователи', href: '/users', icon: Users, roles: ['admin'] },
  { name: 'Настройки', href: '/settings', icon: Settings, roles: ['admin'] },
]

export default function Sidebar() {
  const location = useLocation()
  
  // Получаем информацию о пользователе
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const userRole = user.role || 'auditor'

  // Отладочная информация
  console.log('Sidebar - User:', user)
  console.log('Sidebar - User Role:', userRole)
  console.log('Sidebar - Navigation:', navigation)

  // Фильтруем навигацию по ролям
  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  )
  
  console.log('Sidebar - Filtered Navigation:', filteredNavigation)

  return (
    <div className="w-64 bg-dark-800 border-r border-dark-700 min-h-screen">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Security Scanner</h1>
            <p className="text-sm text-gray-400">v2.0.0</p>
          </div>
        </div>
      </div>

      <nav className="px-4 pb-4">
        <ul className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={clsx(
                    'flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-700">
        <div className="text-xs text-gray-500 text-center">
          <p>Powered by FastAPI & React</p>
          <p>© 2024 Security Scanner</p>
        </div>
      </div>
    </div>
  )
}
