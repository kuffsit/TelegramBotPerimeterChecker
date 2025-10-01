import { useEffect, useState } from 'react'
import { Download, FileText, AlertCircle } from 'lucide-react'
import { api } from '../services/api'

interface ReportData {
  scan_id: number
  status: string
  report: string
  html_content?: string
  report_path?: string
}

interface ReportViewerProps {
  scanId: number
  domainName: string
  onClose: () => void
}

export default function ReportViewer({ scanId, domainName, onClose }: ReportViewerProps) {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReport()
  }, [scanId])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/scans/${scanId}/report`)
      setReport(response.data)
    } catch (error: any) {
      console.error('Ошибка загрузки отчета:', error)
      setError(error.response?.data?.detail || 'Ошибка загрузки отчета')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await api.get(`/api/scans/${scanId}/download`, {
        responseType: 'blob'
      })
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `scan_report_${domainName}_${new Date().toISOString().slice(0, 10)}.html`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Ошибка скачивания отчета:', error)
      alert('Ошибка скачивания отчета')
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Отчет сканирования</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-800 rounded-lg max-w-2xl w-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Ошибка загрузки отчета</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Отчет сканирования</h2>
              <p className="text-gray-400">{domainName}</p>
            </div>
            <div className="flex items-center space-x-3">
              {report?.html_content && (
                <button
                  onClick={handleDownload}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Скачать</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          {!report?.html_content ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Отчет еще не готов</p>
                <p className="text-gray-500 text-sm mt-2">
                  Статус: {report?.status || 'Неизвестно'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg overflow-hidden" style={{ height: 'calc(90vh - 200px)' }}>
              <iframe
                srcDoc={report.html_content}
                className="w-full h-full border-0"
                title="Отчет сканирования"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
