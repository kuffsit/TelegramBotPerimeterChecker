import { useEffect, useState } from 'react'
import { MapPin, Globe, AlertTriangle, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { MapContainer, TileLayer, Popup, CircleMarker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { api } from '../services/api'
import 'leaflet/dist/leaflet.css'

// Исправляем иконки для Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface GeolocationData {
  subdomain: string
  ip: string
  country: string
  country_code: string
  region: string
  city: string
  latitude: number
  longitude: number
  timezone: string
  isp: string
  org: string
  as: string
  vulnerabilities: number
  query_time: string
}

interface GeolocationResponse {
  geolocations: GeolocationData[]
  countries_stats: { [key: string]: { count: number; vulnerabilities: number; critical_vulns: number; latitude: number; longitude: number } }
  cities_stats: { [key: string]: { country: string; city: string; count: number; vulnerabilities: number; critical_vulns: number; latitude: number; longitude: number } }
  total_subdomains: number
  total_countries: number
  total_cities: number
}

export default function GeolocationMap() {
  const [geolocationData, setGeolocationData] = useState<GeolocationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<string>('Все')
  const [showVulnerabilities, setShowVulnerabilities] = useState(true)
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0])
  const [mapZoom, setMapZoom] = useState(2)

  useEffect(() => {
    fetchGeolocationData()
  }, [])

  const fetchGeolocationData = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/geolocation')
      setGeolocationData(response.data)
      
      // Если есть данные, центрируем карту на первом маркере
      if (response.data.geolocations.length > 0) {
        const firstLocation = response.data.geolocations[0]
        setMapCenter([firstLocation.latitude, firstLocation.longitude])
        setMapZoom(3)
      }
    } catch (error) {
      console.error('Ошибка загрузки геолокационных данных:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMarkerColor = (vulnerabilities: number) => {
    if (vulnerabilities === 0) return '#22c55e' // зеленый
    if (vulnerabilities <= 2) return '#f59e0b' // желтый
    if (vulnerabilities <= 5) return '#f97316' // оранжевый
    return '#ef4444' // красный
  }

  const getMarkerSize = (vulnerabilities: number) => {
    if (vulnerabilities === 0) return 6
    if (vulnerabilities <= 2) return 8
    if (vulnerabilities <= 5) return 10
    return 12
  }

  const filteredGeolocations = geolocationData?.geolocations.filter(geo => 
    selectedCountry === 'Все' || geo.country === selectedCountry
  ) || []

  const countries = geolocationData ? ['Все', ...Object.keys(geolocationData.countries_stats)] : ['Все']

  if (loading) {
    return (
      <div className="card p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-400">Загрузка карты геолокации...</p>
      </div>
    )
  }

  if (!geolocationData || geolocationData.geolocations.length === 0) {
    return (
      <div className="card p-6 text-center">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Геолокационные данные не найдены</h3>
        <p className="text-gray-400 mb-4">Запустите сканирование для получения геолокационных данных</p>
        <button
          onClick={fetchGeolocationData}
          className="btn btn-primary flex items-center space-x-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Обновить</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и статистика */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Карта геолокации поддоменов</h2>
          <p className="text-gray-400 mt-1">
            {geolocationData.total_subdomains} поддоменов в {geolocationData.total_countries} странах
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowVulnerabilities(!showVulnerabilities)}
            className={`btn ${showVulnerabilities ? 'btn-secondary' : 'btn-outline'} flex items-center space-x-2`}
          >
            {showVulnerabilities ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{showVulnerabilities ? 'Скрыть уязвимости' : 'Показать уязвимости'}</span>
          </button>
          <button
            onClick={fetchGeolocationData}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="card p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">Страна:</span>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="form-select bg-dark-800 border border-dark-600 text-white rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-400">
            Показано: {filteredGeolocations.length} из {geolocationData.geolocations.length}
          </div>
        </div>
      </div>

      {/* Карта */}
      <div className="card p-0 overflow-hidden">
        <div className="h-96 w-full">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {filteredGeolocations.map((geo, index) => (
              <CircleMarker
                key={`${geo.ip}-${index}`}
                center={[geo.latitude, geo.longitude]}
                radius={getMarkerSize(geo.vulnerabilities)}
                pathOptions={{
                  color: getMarkerColor(geo.vulnerabilities),
                  fillColor: getMarkerColor(geo.vulnerabilities),
                  fillOpacity: 0.7,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[250px]">
                    <h3 className="font-semibold text-gray-900 mb-2">{geo.subdomain}</h3>
                    <div className="space-y-1 text-sm">
                      <div><strong>IP:</strong> {geo.ip}</div>
                      <div><strong>Страна:</strong> {geo.country}</div>
                      <div><strong>Город:</strong> {geo.city}</div>
                      <div><strong>Регион:</strong> {geo.region}</div>
                      <div><strong>Провайдер:</strong> {geo.isp}</div>
                      {showVulnerabilities && (
                        <div className="flex items-center space-x-2 mt-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="text-red-600 font-medium">
                            {geo.vulnerabilities} уязвимостей
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <div className="text-center">
                    <div className="font-semibold">{geo.subdomain}</div>
                    <div className="text-sm">{geo.city}, {geo.country}</div>
                    {showVulnerabilities && (
                      <div className="text-sm text-red-600">
                        {geo.vulnerabilities} уязвимостей
                      </div>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Легенда */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Легенда</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-300">Без уязвимостей</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-300">1-2 уязвимости</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-300">3-5 уязвимостей</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-300">6+ уязвимостей</span>
          </div>
        </div>
      </div>

      {/* Статистика по странам */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Статистика по странам</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(geolocationData.countries_stats)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 12)
            .map(([country, stats]) => (
              <div key={country} className="bg-dark-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white">{country}</h4>
                  <span className="text-sm text-gray-400">{stats.count} поддоменов</span>
                </div>
                <div className="space-y-1 text-sm text-gray-300">
                  <div>Уязвимости: {stats.vulnerabilities}</div>
                  <div>Критические: {stats.critical_vulns}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}