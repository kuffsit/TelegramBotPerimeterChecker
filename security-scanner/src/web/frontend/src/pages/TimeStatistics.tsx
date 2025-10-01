import TimeStatistics from '../components/TimeStatistics'

export default function TimeStatisticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Статистика по времени</h1>
        <p className="text-gray-400 mt-2">Анализ пиков активности и длительности сканирований</p>
      </div>
      
      <TimeStatistics />
    </div>
  )
}
