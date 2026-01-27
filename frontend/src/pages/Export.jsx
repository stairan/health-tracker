import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { exportData, getAIAnalysisPrompt } from '../api/client'
import { format } from 'date-fns'
import { FileDown, Brain } from 'lucide-react'

const Export = () => {
  const [startDate, setStartDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [exportFormat, setExportFormat] = useState('json')
  const [aiPrompt, setAiPrompt] = useState(null)

  const exportMutation = useMutation({
    mutationFn: (data) => exportData(data),
    onSuccess: (response) => {
      alert(`Data exported successfully! File: ${response.data.file_path}`)
    },
    onError: (error) => {
      const message = error.response?.data?.detail || error.message || 'Unknown error'
      alert(`Export failed: ${message}`)
    },
  })

  const promptMutation = useMutation({
    mutationFn: () => getAIAnalysisPrompt(startDate, endDate),
    onSuccess: (response) => {
      setAiPrompt(response.data)
    },
  })

  const handleExport = () => {
    exportMutation.mutate({
      start_date: startDate,
      end_date: endDate,
      format: exportFormat,
      include_garmin: true,
      include_food: true,
      include_medications: true,
      include_sickness: true,
      include_seizures: true,
      include_notes: true,
      include_water: true,
      include_health_events: true,
    })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Export Data for AI Analysis</h2>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Export Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="json">JSON (Best for AI)</option>
              <option value="csv">CSV (Spreadsheets)</option>
              <option value="parquet">Parquet (Data Analysis)</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            disabled={exportMutation.isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <FileDown className="w-5 h-5" />
            <span>{exportMutation.isLoading ? 'Exporting...' : 'Export Data'}</span>
          </button>

          <button
            onClick={() => promptMutation.mutate()}
            disabled={promptMutation.isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <Brain className="w-5 h-5" />
            <span>{promptMutation.isLoading ? 'Generating...' : 'Generate AI Prompt'}</span>
          </button>
        </div>
      </div>

      {aiPrompt && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">AI Analysis Prompt</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{aiPrompt.prompt}</pre>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Instructions:</strong> {aiPrompt.instructions}
            </p>
          </div>
          {aiPrompt.summary && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Data Summary:</h4>
              <pre className="text-sm text-gray-700 bg-gray-50 rounded p-4">
                {JSON.stringify(aiPrompt.summary, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">How to use:</h4>
        <ol className="list-decimal list-inside text-sm text-yellow-800 space-y-1">
          <li>Select your date range and export format</li>
          <li>Click "Export Data" to download your health data</li>
          <li>Click "Generate AI Prompt" to get a pre-formatted analysis prompt</li>
          <li>Provide both the exported data and prompt to an AI (like Claude or ChatGPT)</li>
          <li>The AI will analyze patterns, correlations, and provide health insights</li>
        </ol>
      </div>
    </div>
  )
}

export default Export
