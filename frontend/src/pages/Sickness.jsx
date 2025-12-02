import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO, startOfYear, endOfYear, startOfMonth, endOfMonth, subYears } from 'date-fns'
import { Plus, Trash2, Edit, Calendar, Thermometer, Filter } from 'lucide-react'
import { createSicknessEntry, getSicknessEntries, updateSicknessEntry, deleteSicknessEntry } from '../api/client'

const Sickness = () => {
  const queryClient = useQueryClient()
  const [filterMode, setFilterMode] = useState('recent') // 'recent', 'year', 'month', 'day'
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'))
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    symptoms: '',
    severity: 'moderate',
    has_fever: false,
    temperature_celsius: '',
    temperature_time: '',
    notes: '',
  })

  // Calculate date range based on filter mode
  const getDateRange = () => {
    switch (filterMode) {
      case 'recent':
        // Get last 10 years worth to ensure we get 20+ sickness entries
        const tenYearsAgo = format(subYears(new Date(), 10), 'yyyy-MM-dd')
        const today = format(new Date(), 'yyyy-MM-dd')
        return { start: tenYearsAgo, end: today }

      case 'year':
        const yearStart = format(startOfYear(new Date(`${selectedYear}-01-01`)), 'yyyy-MM-dd')
        const yearEnd = format(endOfYear(new Date(`${selectedYear}-01-01`)), 'yyyy-MM-dd')
        return { start: yearStart, end: yearEnd }

      case 'month':
        const monthStart = format(startOfMonth(new Date(`${selectedMonth}-01`)), 'yyyy-MM-dd')
        const monthEnd = format(endOfMonth(new Date(`${selectedMonth}-01`)), 'yyyy-MM-dd')
        return { start: monthStart, end: monthEnd }

      case 'day':
        return { start: selectedDate, end: selectedDate }

      default:
        return { start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }
    }
  }

  // Fetch sickness entries based on filter mode
  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ['sickness', filterMode, selectedYear, selectedMonth, selectedDate],
    queryFn: () => {
      const { start, end } = getDateRange()
      return getSicknessEntries(start, end).then(res => res.data)
    },
  })

  // For 'recent' mode, limit to last 20 entries
  const entries = filterMode === 'recent'
    ? allEntries.slice(0, 20)
    : allEntries

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createSicknessEntry,
    onSuccess: () => {
      queryClient.invalidateQueries(['sickness'])
      resetForm()
      setShowForm(false)
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateSicknessEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['sickness'])
      resetForm()
      setEditingEntry(null)
      setShowForm(false)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteSicknessEntry,
    onSuccess: () => {
      queryClient.invalidateQueries(['sickness'])
    },
  })

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      symptoms: '',
      severity: 'moderate',
      has_fever: false,
      temperature_celsius: '',
      temperature_time: '',
      notes: '',
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const data = {
      date: formData.date,
      symptoms: formData.symptoms,
      severity: formData.severity || null,
      has_fever: formData.has_fever,
      temperature_celsius: formData.temperature_celsius ? parseFloat(formData.temperature_celsius) : null,
      temperature_time: formData.temperature_time || null,
      notes: formData.notes || null,
    }

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (entry) => {
    setFormData({
      date: entry.date,
      symptoms: entry.symptoms || '',
      severity: entry.severity || 'moderate',
      has_fever: entry.has_fever || false,
      temperature_celsius: entry.temperature_celsius || '',
      temperature_time: entry.temperature_time ? format(parseISO(entry.temperature_time), "yyyy-MM-dd'T'HH:mm") : '',
      notes: entry.notes || '',
    })
    setEditingEntry(entry)
    setShowForm(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this sickness entry?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCancel = () => {
    resetForm()
    setEditingEntry(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Sickness Log</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'Add Sickness Entry'}
        </button>
      </div>

      {/* Filter Selector */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filter sickness entries by:</span>
        </div>

        {/* Filter Mode Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterMode('recent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterMode === 'recent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 20 Entries
          </button>
          <button
            onClick={() => setFilterMode('year')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterMode === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Year
          </button>
          <button
            onClick={() => setFilterMode('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterMode === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setFilterMode('day')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterMode === 'day'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Specific Day
          </button>
        </div>

        {/* Conditional Date Selectors */}
        {filterMode === 'year' && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Select year:</label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              min="2000"
              max={format(new Date(), 'yyyy')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {filterMode === 'month' && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Select month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {filterMode === 'day' && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Select date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {filterMode === 'recent' && (
          <p className="text-sm text-gray-500">
            Showing the most recent 20 sickness entries
          </p>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingEntry ? 'Edit Sickness Entry' : 'Add New Sickness Entry'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Not specified</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </div>
            </div>

            {/* Symptoms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Symptoms *
              </label>
              <textarea
                value={formData.symptoms}
                onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                placeholder="Describe your symptoms (e.g., headache, cough, nausea, fatigue)"
                rows={3}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Fever Section */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-red-500" />
                <h4 className="font-medium text-gray-900">Fever Tracking</h4>
              </div>

              {/* Has Fever Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has_fever"
                  checked={formData.has_fever}
                  onChange={(e) => setFormData({ ...formData, has_fever: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="has_fever" className="text-sm font-medium text-gray-700">
                  I have a fever
                </label>
              </div>

              {formData.has_fever && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  {/* Temperature */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperature (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.temperature_celsius}
                      onChange={(e) => setFormData({ ...formData, temperature_celsius: e.target.value })}
                      placeholder="e.g., 38.5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Temperature Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Measured
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.temperature_time}
                      onChange={(e) => setFormData({ ...formData, temperature_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any other relevant information (medications taken, doctor visit, etc.)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingEntry ? 'Update Entry' : 'Add Entry'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Entries List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">
            Sickness Entries on {format(parseISO(selectedDate), 'MMMM d, yyyy')}
          </h3>

          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-gray-500">No sickness entries recorded for this date.</p>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-gray-900">
                          {format(parseISO(entry.date), 'MMM d, yyyy')}
                        </span>
                        {entry.severity && (
                          <span className={`px-2 py-1 rounded text-sm ${
                            entry.severity === 'severe' ? 'bg-red-100 text-red-800' :
                            entry.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {entry.severity}
                          </span>
                        )}
                        {entry.has_fever && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-sm">
                            <Thermometer className="w-3 h-3" />
                            Fever
                            {entry.temperature_celsius && ` (${entry.temperature_celsius}°C)`}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-sm text-gray-700">
                        <p><strong>Symptoms:</strong> {entry.symptoms}</p>

                        {entry.has_fever && entry.temperature_time && (
                          <p className="text-xs text-gray-600">
                            <strong>Temperature measured:</strong>{' '}
                            {format(parseISO(entry.temperature_time), 'MMM d, yyyy HH:mm')}
                          </p>
                        )}

                        {entry.notes && (
                          <p><strong>Notes:</strong> {entry.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sickness
