import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts'
import { Clock, TrendingUp, Activity, Zap } from 'lucide-react'
import { api } from '../services/api'

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
}

interface TimeStats {
  hourlyActivity: Array<{
    hour: number
    scans: number
    vulnerabilities: number
  }>
  dailyActivity: Array<{
    day: string
    scans: number
    avgDuration: number
    vulnerabilities: number
  }>
  weeklyTrends: Array<{
    week: string
    totalScans: number
    completedScans: number
    failedScans: number
    avgDuration: number
  }>
  peakHours: Array<{
    hour: number
    count: number
  }>
  durationStats: {
    avg: number
    min: number
    max: number
    median: number
  }
}

export default function TimeStatistics() {
  const [scans, setScans] = useState<Scan[]>([])
  const [timeStats, setTimeStats] = useState<TimeStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await api.get('/api/scans')
      const scansData = response.data
      setScans(scansData)
      
      // Вычисляем статистику по времени
      const stats = calculateTimeStatistics(scansData)
      setTimeStats(stats)
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTimeStatistics = (scansData: Scan[]): TimeStats => {
    // Статистика по часам
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      scans: 0,
      vulnerabilities: 0
    }))

    scans.forEach(scan => {
      const hour = new Date(scan.started_at).getHours()
      hourlyActivity[hour].scans++
      hourlyActivity[hour].vulnerabilities += scan.total_vulnerabilities
    })

    // Статистика по дням недели
    const dailyActivity = Array.from({ length: 7 }, (_, day) => ({
      day: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][day],
      scans: 0,
      avgDuration: 0,
      vulnerabilities: 0
    }))

    const dailyDurations: { [key: number]: number[] } = {}
    scansData.forEach(scan => {
      const day = new Date(scan.started_at).getDay()
      const adjustedDay = day === 0 ? 6 : day - 1 // Воскресенье = 6
      dailyActivity[adjustedDay].scans++
      dailyActivity[adjustedDay].vulnerabilities += scan.total_vulnerabilities

      if (scan.completed_at) {
        const duration = new Date(scan.completed_at).getTime() - new Date(scan.started_at).getTime()
        if (!dailyDurations[adjustedDay]) dailyDurations[adjustedDay] = []
        dailyDurations[adjustedDay].push(duration)
      }
    })

    // Вычисляем среднюю длительность
    Object.keys(dailyDurations).forEach(day => {
      const dayNum = parseInt(day)
      const durations = dailyDurations[dayNum]
      dailyActivity[dayNum].avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length / 1000 / 60 // в минутах
    })

    // Статистика по неделям (последние 8 недель)
    const weeklyTrends = Array.from({ length: 8 }, (_, week) => {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (week * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const weekScans = scansData.filter(scan => {
        const scanDate = new Date(scan.started_at)
        return scanDate >= weekStart && scanDate <= weekEnd
      })

      const completedScans = weekScans.filter(scan => scan.status === 'completed')
      const failedScans = weekScans.filter(scan => scan.status === 'failed')

      const durations = completedScans
        .filter(scan => scan.completed_at)
        .map(scan => new Date(scan.completed_at!).getTime() - new Date(scan.started_at).getTime())

      const avgDuration = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length / 1000 / 60 
        : 0

      return {
        week: `Неделя ${8 - week}`,
        totalScans: weekScans.length,
        completedScans: completedScans.length,
        failedScans: failedScans.length,
        avgDuration
      }
    }).reverse()

    // Пиковые часы
    const peakHours = hourlyActivity
      .map((item, index) => ({ hour: index, count: item.scans }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Статистика длительности
    const durations = scansData
      .filter(scan => scan.completed_at)
      .map(scan => new Date(scan.completed_at!).getTime() - new Date(scan.started_at).getTime())
      .sort((a, b) => a - b)

    const durationStats = {
      avg: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length / 1000 / 60 : 0,
      min: durations.length > 0 ? durations[0] / 1000 / 60 : 0,
      max: durations.length > 0 ? durations[durations.length - 1] / 1000 / 60 : 0,
      median: durations.length > 0 ? durations[Math.floor(durations.length / 2)] / 1000 / 60 : 0
    }

    return {
      hourlyActivity,
      dailyActivity,
      weeklyTrends,
      peakHours,
      durationStats
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Статистика по времени</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (!timeStats) {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Статистика по времени</h2>
        <div className="text-center py-8">
          <p className="text-gray-400">Не удалось загрузить статистику</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{timeStats.durationStats.avg.toFixed(1)}</p>
              <p className="text-gray-400 text-sm">Средняя длительность (мин)</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center space-x-3">
            <Zap className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">{timeStats.durationStats.min.toFixed(1)}</p>
              <p className="text-gray-400 text-sm">Минимальная (мин)</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-white">{timeStats.durationStats.max.toFixed(1)}</p>
              <p className="text-gray-400 text-sm">Максимальная (мин)</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center space-x-3">
            <Activity className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">{timeStats.durationStats.median.toFixed(1)}</p>
              <p className="text-gray-400 text-sm">Медианная (мин)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Активность по часам */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Clock className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Активность по часам</h2>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeStats.hourlyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="hour" 
                stroke="#9ca3af"
                fontSize={12}
                tickFormatter={(value) => `${value}:00`}
              />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1a2e', 
                  border: '1px solid #2a2a3e',
                  borderRadius: '8px',
                  color: '#e0e0e0'
                }}
                labelFormatter={(value) => `Час: ${value}:00`}
              />
              <Area 
                type="monotone" 
                dataKey="scans" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.3}
                name="Сканирования"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Активность по дням недели */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Activity className="w-6 h-6 text-green-400" />
          <h2 className="text-xl font-semibold text-white">Активность по дням недели</h2>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeStats.dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1a2e', 
                  border: '1px solid #2a2a3e',
                  borderRadius: '8px',
                  color: '#e0e0e0'
                }}
              />
              <Bar dataKey="scans" fill="#22c55e" name="Сканирования" />
              <Bar dataKey="avgDuration" fill="#3b82f6" name="Средняя длительность (мин)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Тренды по неделям */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <TrendingUp className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Тренды по неделям</h2>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeStats.weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="week" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1a2e', 
                  border: '1px solid #2a2a3e',
                  borderRadius: '8px',
                  color: '#e0e0e0'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="totalScans" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Всего сканирований"
              />
              <Line 
                type="monotone" 
                dataKey="completedScans" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Завершенных"
              />
              <Line 
                type="monotone" 
                dataKey="failedScans" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Неудачных"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Пиковые часы */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Zap className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-semibold text-white">Пиковые часы активности</h2>
        </div>
        <div className="space-y-3">
          {timeStats.peakHours.map((item, index) => (
            <div key={item.hour} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <span className="text-yellow-400 font-bold text-sm">#{index + 1}</span>
                </div>
                <div>
                  <p className="text-white font-medium">{item.hour}:00 - {item.hour + 1}:00</p>
                  <p className="text-gray-400 text-sm">Пиковый час</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-400">{item.count}</p>
                <p className="text-gray-400 text-sm">сканирований</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
