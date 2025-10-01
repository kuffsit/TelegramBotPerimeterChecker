import GeolocationMap from '../components/GeolocationMap'

export default function GeolocationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Геолокация сервисов</h1>
        <p className="text-gray-400 mt-2">Карта найденных сервисов и их расположение</p>
      </div>
      
      <GeolocationMap />
    </div>
  )
}
