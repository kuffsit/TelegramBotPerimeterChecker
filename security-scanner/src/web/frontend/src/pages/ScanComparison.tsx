import ScanComparison from '../components/ScanComparison'

export default function ScanComparisonPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Сравнение сканирований</h1>
        <p className="text-gray-400 mt-2">Анализ изменений между сканированиями</p>
      </div>
      
      <ScanComparison />
    </div>
  )
}
