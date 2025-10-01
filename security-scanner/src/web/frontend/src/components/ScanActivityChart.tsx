import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Activity, TrendingUp } from 'lucide-react'
import { api } from '../services/api'

interface ScanActivityData {
  date: string
  scans: number
  vulnerabilities: number
  domains: number
}

interface ScanTrendData {
  date: string
  total_scans: number
  completed_scans: number
  failed_scans: number
}

export default function ScanActivityChart() {
  const [activityData, setActivityData] = useState<ScanActivityData[]>([])
  const [trendData, setTrendData] = useState<ScanTrendData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChartData()
  }, [])

  const fetchChartData = async () => {
    try {
      const [scansResponse] = await Promise.all([
        api.get('/api/scans')
      ])
      
      const scans = scansResponse.data
      
      // Группируем сканирования по дням за последние 7 дней
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return date.toISOString().split('T')[0]
      }).reverse()

      const activityData = last7Days.map(date => {
        const dayScans = scans.filter((scan: any) => 
          scan.started_at.startsWith(date)
        )
        return {
          date: new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
          scans: dayScans.length,
          vulnerabilities: dayScans.reduce((sum: number, scan: any) => sum + scan.total_vulnerabilities, 0),
          domains: new Set(dayScans.map((scan: any) => scan.domain_id)).size
        }
      })

      // Данные для тренда за последние 30 дней
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        return date.toISOString().split('T')[0]
      }).reverse()

      const trendData = last30Days.map(date => {
        const dayScans = scans.filter((scan: any) => 
          scan.started_at.startsWith(date)
        )
        return {
          date: new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
          total_scans: dayScans.length,
          completed_scans: dayScans.filter((scan: any) => scan.status === 'completed').length,
          failed_scans: dayScans.filter((scan: any) => scan.status === 'failed').length
        }
      })

      setActivityData(activityData)
      setTrendData(trendData)
    } catch (error) {
      console.error('Ошибка загрузки данных для графиков:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Активность сканирований</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* График активности за 7 дней */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Activity className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Активность за 7 дней</h2>
        </div>
        
        {activityData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a2e', 
                    border: '1px solid #2a2a3e',
                    borderRadius: '8px',
                    color: '#e0e0e0'
                  }}
                  formatter={(value: number, name: string) => [
                    value, 
                    name === 'scans' ? 'Сканирования' : 
                    name === 'vulnerabilities' ? 'Уязвимости' : 'Домены'
                  ]}
                />
                <Bar dataKey="scans" fill="#3b82f6" name="scans" />
                <Bar dataKey="vulnerabilities" fill="#ef4444" name="vulnerabilities" />
                <Bar dataKey="domains" fill="#22c55e" name="domains" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>Нет данных об активности</p>
          </div>
        )}
      </div>

      {/* График трендов за 30 дней */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <TrendingUp className="w-6 h-6 text-green-400" />
          <h2 className="text-xl font-semibold text-white">Тренды за 30 дней</h2>
        </div>
        
        {trendData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a2e', 
                    border: '1px solid #2a2a3e',
                    borderRadius: '8px',
                    color: '#e0e0e0'
                  }}
                  formatter={(value: number, name: string) => [
                    value, 
                    name === 'total_scans' ? 'Всего сканирований' : 
                    name === 'completed_scans' ? 'Завершенных' : 'Неудачных'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_scans" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="total_scans"
                />
                <Line 
                  type="monotone" 
                  dataKey="completed_scans" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="completed_scans"
                />
                <Line 
                  type="monotone" 
                  dataKey="failed_scans" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="failed_scans"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>Нет данных о трендах</p>
          </div>
        )}
      </div>
    </div>
  )
}
