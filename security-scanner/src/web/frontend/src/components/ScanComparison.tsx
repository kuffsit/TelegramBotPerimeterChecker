import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { GitCompare, TrendingUp, TrendingDown, Minus } from 'lucide-react'
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

interface Domain {
  id: number
  name: string
  is_active: boolean
}

interface ComparisonData {
  scan1: Scan
  scan2: Scan
  domain: Domain
  changes: {
    subdomains: number
    vulnerabilities: number
    critical: number
    high: number
    medium: number
    low: number
  }
}

export default function ScanComparison() {
  const [scans, setScans] = useState<Scan[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [selectedDomain, setSelectedDomain] = useState<number | null>(null)
  const [selectedScan1, setSelectedScan1] = useState<number | null>(null)
  const [selectedScan2, setSelectedScan2] = useState<number | null>(null)
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [scansResponse, domainsResponse] = await Promise.all([
        api.get('/api/scans'),
        api.get('/api/domains')
      ])
      setScans(scansResponse.data)
      setDomains(domainsResponse.data)
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompare = () => {
    if (!selectedScan1 || !selectedScan2 || selectedScan1 === selectedScan2) {
      return
    }

    const scan1 = scans.find(s => s.id === selectedScan1)
    const scan2 = scans.find(s => s.id === selectedScan2)
    const domain = domains.find(d => d.id === scan1?.domain_id)

    if (!scan1 || !scan2 || !domain) {
      return
    }

    const changes = {
      subdomains: scan2.total_subdomains - scan1.total_subdomains,
      vulnerabilities: scan2.total_vulnerabilities - scan1.total_vulnerabilities,
      critical: scan2.critical_vulns - scan1.critical_vulns,
      high: scan2.high_vulns - scan1.high_vulns,
      medium: scan2.medium_vulns - scan1.medium_vulns,
      low: scan2.low_vulns - scan1.low_vulns
    }

    setComparisonData({
      scan1,
      scan2,
      domain,
      changes
    })
  }

  const getDomainScans = (domainId: number) => {
    return scans
      .filter(scan => scan.domain_id === domainId && scan.status === 'completed')
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-red-400" />
    if (change < 0) return <TrendingDown className="w-4 h-4 text-green-400" />
    return <Minus className="w-4 h-4 text-gray-400" />
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-red-400'
    if (change < 0) return 'text-green-400'
    return 'text-gray-400'
  }

  if (loading) {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Сравнение сканирований</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Выбор сканирований для сравнения */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <GitCompare className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Сравнение сканирований</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Выбор домена */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Домен
            </label>
            <select
              value={selectedDomain || ''}
              onChange={(e) => {
                const domainId = parseInt(e.target.value)
                setSelectedDomain(domainId)
                setSelectedScan1(null)
                setSelectedScan2(null)
                setComparisonData(null)
              }}
              className="input"
            >
              <option value="">Выберите домен</option>
              {domains.map(domain => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </select>
          </div>

          {/* Выбор первого сканирования */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Первое сканирование
            </label>
            <select
              value={selectedScan1 || ''}
              onChange={(e) => {
                setSelectedScan1(parseInt(e.target.value))
                setComparisonData(null)
              }}
              className="input"
              disabled={!selectedDomain}
            >
              <option value="">Выберите сканирование</option>
              {selectedDomain && getDomainScans(selectedDomain).map(scan => (
                <option key={scan.id} value={scan.id}>
                  {new Date(scan.started_at).toLocaleDateString('ru-RU')} - {scan.total_vulnerabilities} уязвимостей
                </option>
              ))}
            </select>
          </div>

          {/* Выбор второго сканирования */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Второе сканирование
            </label>
            <select
              value={selectedScan2 || ''}
              onChange={(e) => {
                setSelectedScan2(parseInt(e.target.value))
                setComparisonData(null)
              }}
              className="input"
              disabled={!selectedDomain}
            >
              <option value="">Выберите сканирование</option>
              {selectedDomain && getDomainScans(selectedDomain)
                .filter(scan => scan.id !== selectedScan1)
                .map(scan => (
                <option key={scan.id} value={scan.id}>
                  {new Date(scan.started_at).toLocaleDateString('ru-RU')} - {scan.total_vulnerabilities} уязвимостей
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleCompare}
            disabled={!selectedScan1 || !selectedScan2 || selectedScan1 === selectedScan2}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Сравнить сканирования
          </button>
        </div>
      </div>

      {/* Результаты сравнения */}
      {comparisonData && (
        <div className="space-y-6">
          {/* Общая информация */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Информация о сканированиях</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-300">Первое сканирование</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Дата:</span>
                    <span className="text-white">{new Date(comparisonData.scan1.started_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Поддомены:</span>
                    <span className="text-white">{comparisonData.scan1.total_subdomains}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Уязвимости:</span>
                    <span className="text-white">{comparisonData.scan1.total_vulnerabilities}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-300">Второе сканирование</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Дата:</span>
                    <span className="text-white">{new Date(comparisonData.scan2.started_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Поддомены:</span>
                    <span className="text-white">{comparisonData.scan2.total_subdomains}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Уязвимости:</span>
                    <span className="text-white">{comparisonData.scan2.total_vulnerabilities}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Изменения */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Изменения</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Поддомены</span>
                  {getChangeIcon(comparisonData.changes.subdomains)}
                </div>
                <div className={`text-lg font-semibold ${getChangeColor(comparisonData.changes.subdomains)}`}>
                  {comparisonData.changes.subdomains > 0 ? '+' : ''}{comparisonData.changes.subdomains}
                </div>
              </div>

              <div className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Всего уязвимостей</span>
                  {getChangeIcon(comparisonData.changes.vulnerabilities)}
                </div>
                <div className={`text-lg font-semibold ${getChangeColor(comparisonData.changes.vulnerabilities)}`}>
                  {comparisonData.changes.vulnerabilities > 0 ? '+' : ''}{comparisonData.changes.vulnerabilities}
                </div>
              </div>

              <div className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Критические</span>
                  {getChangeIcon(comparisonData.changes.critical)}
                </div>
                <div className={`text-lg font-semibold ${getChangeColor(comparisonData.changes.critical)}`}>
                  {comparisonData.changes.critical > 0 ? '+' : ''}{comparisonData.changes.critical}
                </div>
              </div>

              <div className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Высокие</span>
                  {getChangeIcon(comparisonData.changes.high)}
                </div>
                <div className={`text-lg font-semibold ${getChangeColor(comparisonData.changes.high)}`}>
                  {comparisonData.changes.high > 0 ? '+' : ''}{comparisonData.changes.high}
                </div>
              </div>

              <div className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Средние</span>
                  {getChangeIcon(comparisonData.changes.medium)}
                </div>
                <div className={`text-lg font-semibold ${getChangeColor(comparisonData.changes.medium)}`}>
                  {comparisonData.changes.medium > 0 ? '+' : ''}{comparisonData.changes.medium}
                </div>
              </div>

              <div className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Низкие</span>
                  {getChangeIcon(comparisonData.changes.low)}
                </div>
                <div className={`text-lg font-semibold ${getChangeColor(comparisonData.changes.low)}`}>
                  {comparisonData.changes.low > 0 ? '+' : ''}{comparisonData.changes.low}
                </div>
              </div>
            </div>
          </div>

          {/* График сравнения */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">График сравнения</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  {
                    name: 'Первое сканирование',
                    subdomains: comparisonData.scan1.total_subdomains,
                    vulnerabilities: comparisonData.scan1.total_vulnerabilities,
                    critical: comparisonData.scan1.critical_vulns,
                    high: comparisonData.scan1.high_vulns,
                    medium: comparisonData.scan1.medium_vulns,
                    low: comparisonData.scan1.low_vulns
                  },
                  {
                    name: 'Второе сканирование',
                    subdomains: comparisonData.scan2.total_subdomains,
                    vulnerabilities: comparisonData.scan2.total_vulnerabilities,
                    critical: comparisonData.scan2.critical_vulns,
                    high: comparisonData.scan2.high_vulns,
                    medium: comparisonData.scan2.medium_vulns,
                    low: comparisonData.scan2.low_vulns
                  }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a2e', 
                      border: '1px solid #2a2a3e',
                      borderRadius: '8px',
                      color: '#e0e0e0'
                    }}
                  />
                  <Bar dataKey="subdomains" fill="#3b82f6" name="Поддомены" />
                  <Bar dataKey="vulnerabilities" fill="#ef4444" name="Уязвимости" />
                  <Bar dataKey="critical" fill="#dc2626" name="Критические" />
                  <Bar dataKey="high" fill="#ea580c" name="Высокие" />
                  <Bar dataKey="medium" fill="#d97706" name="Средние" />
                  <Bar dataKey="low" fill="#16a34a" name="Низкие" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
