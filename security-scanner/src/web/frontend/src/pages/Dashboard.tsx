import { useEffect, useState } from 'react'
import { 
  Globe, 
  Search, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  TrendingUp
} from 'lucide-react'
import { api } from '../services/api'
import StatCard from '../components/StatCard'
import RecentScans from '../components/RecentScans'
import VulnerabilityChart from '../components/VulnerabilityChart'
import ScanActivityChart from '../components/ScanActivityChart'

interface DashboardStats {
  total_domains: number
  active_domains: number
  total_scans: number
  active_scans: number
  recent_vulnerabilities: number
  last_scan: {
    id: number
    domain: string
    started_at: string
    status: string
  } | null
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/stats/dashboard')
      setStats(response.data)
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Не удалось загрузить статистику</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-white">Дашборд</h1>
        <p className="text-gray-400 mt-2">Обзор системы сканирования безопасности</p>
      </div>

      {/* Статистические карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Всего доменов"
          value={stats.total_domains}
          icon={Globe}
          color="blue"
        />
        <StatCard
          title="Активных доменов"
          value={stats.active_domains}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Всего сканирований"
          value={stats.total_scans}
          icon={Search}
          color="purple"
        />
        <StatCard
          title="Уязвимостей за месяц"
          value={stats.recent_vulnerabilities}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Активные сканирования */}
      {stats.active_scans > 0 && (
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">Активные сканирования</h2>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-yellow-400">
              В данный момент выполняется {stats.active_scans} сканирований
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Последние сканирования */}
        <RecentScans />

        {/* График уязвимостей */}
        <VulnerabilityChart />
      </div>

      {/* График активности сканирований */}
      <ScanActivityChart />

      {/* Последнее сканирование */}
      {stats.last_scan && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Последнее сканирование</h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Домен:</span>
              <span className="text-white font-medium">{stats.last_scan.domain}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Статус:</span>
              <span className={`badge ${
                stats.last_scan.status === 'completed' ? 'badge-success' :
                stats.last_scan.status === 'failed' ? 'badge-danger' :
                'badge-warning'
              }`}>
                {stats.last_scan.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Время запуска:</span>
              <span className="text-white">
                {new Date(stats.last_scan.started_at).toLocaleString('ru-RU')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
