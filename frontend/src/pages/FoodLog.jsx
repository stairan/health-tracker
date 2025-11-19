import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays, subDays } from 'date-fns'
import { Plus, Trash2, Edit, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { getFoodEntries, createFoodEntry, updateFoodEntry, deleteFoodEntry } from '../api/client'

const FoodLog = () => {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
    meal_type: 'breakfast',
    description: '',
    is_drink: false,
    calories: '',
    volume_ml: '',
    notes: '',
  })

  const { data: entries, isLoading } = useQuery({
    queryKey: ['foodEntries', selectedDate],
    queryFn: async () => {
      const response = await getFoodEntries(selectedDate, selectedDate)
      return response.data
    },
  })

  // Fetch recent unique food entries (last 30 days) for quick add
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: recentEntries = [] } = useQuery({
    queryKey: ['recentFoodEntries'],
    queryFn: async () => {
      const response = await getFoodEntries(thirtyDaysAgo, today)
      // Get unique entries based on description
      const seen = new Map()
      response.data.forEach(entry => {
        const key = entry.description.toLowerCase()
        if (!seen.has(key)) {
          seen.set(key, entry)
        }
      })
      return Array.from(seen.values()).slice(0, 10) // Show max 10 recent items
    },
  })

  const createMutation = useMutation({
    mutationFn: createFoodEntry,
    onSuccess: () => {
      queryClient.invalidateQueries(['foodEntries'])
      queryClient.invalidateQueries(['todaySummary'])
      queryClient.invalidateQueries(['recentFoodEntries'])
      setShowForm(false)
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
        meal_type: 'breakfast',
        description: '',
        is_drink: false,
        calories: '',
        volume_ml: '',
        notes: '',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateFoodEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['foodEntries'])
      queryClient.invalidateQueries(['todaySummary'])
      setShowForm(false)
      setEditingEntry(null)
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
        meal_type: 'breakfast',
        description: '',
        is_drink: false,
        calories: '',
        volume_ml: '',
        notes: '',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFoodEntry,
    onSuccess: () => {
      queryClient.invalidateQueries(['foodEntries'])
      queryClient.invalidateQueries(['todaySummary'])
    },
  })

  const handleEdit = (entry) => {
    setEditingEntry(entry)
    setFormData({
      date: entry.date,
      time: entry.time,
      meal_type: entry.meal_type,
      description: entry.description,
      is_drink: entry.is_drink,
      calories: entry.calories || '',
      volume_ml: entry.volume_ml || '',
      notes: entry.notes || '',
    })
    setShowForm(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this food entry?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Extract time portion from datetime-local field
    const timePortion = formData.time.split('T')[1] || '12:00'
    // Combine the date field with the time portion to create proper datetime
    const combinedDateTime = `${formData.date}T${timePortion}`

    if (editingEntry) {
      // For updates, only send fields that might have changed
      // Note: date is included in the time field, so we don't send it separately
      const updateData = {
        time: combinedDateTime,
        meal_type: formData.meal_type,
        description: formData.description,
        is_drink: formData.is_drink,
        calories: formData.calories ? parseInt(formData.calories) : null,
        volume_ml: formData.volume_ml ? parseInt(formData.volume_ml) : null,
        notes: formData.notes || null,
      }
      updateMutation.mutate({ id: editingEntry.id, data: updateData })
    } else {
      // For new entries, include both date and time
      const createData = {
        date: formData.date,
        time: combinedDateTime,
        meal_type: formData.meal_type,
        description: formData.description,
        is_drink: formData.is_drink,
        calories: formData.calories ? parseInt(formData.calories) : null,
        volume_ml: formData.volume_ml ? parseInt(formData.volume_ml) : null,
        notes: formData.notes || null,
      }
      createMutation.mutate(createData)
    }
  }

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'other']

  const goToPreviousDay = () => {
    setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))
  }

  const goToNextDay = () => {
    setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))
  }

  const goToToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
  }

  const quickAddFood = (entry) => {
    setFormData({
      date: selectedDate,
      time: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
      meal_type: entry.meal_type,
      description: entry.description,
      is_drink: entry.is_drink,
      calories: entry.calories || '',
      volume_ml: entry.volume_ml || '',
      notes: entry.notes || '',
    })
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Food & Drink Log</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-5 h-5" />
          <span>Add Entry</span>
        </button>
      </div>

      {/* Date Navigation */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousDay}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            title="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={goToNextDay}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            title="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 whitespace-nowrap"
          >
            Today
          </button>
        </div>
      </div>

      {/* Quick Add - Recent Foods */}
      {!showForm && recentEntries.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-700">Quick Add - Recent Foods</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => quickAddFood(entry)}
                className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm flex items-center gap-2"
              >
                <span>{entry.description}</span>
                {entry.calories && <span className="text-xs text-blue-600">({entry.calories} kcal)</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingEntry ? 'Edit Food/Drink Entry' : 'New Food/Drink Entry'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="datetime-local"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meal Type</label>
              <select
                value={formData.meal_type}
                onChange={(e) => setFormData({ ...formData, meal_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              >
                {mealTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_drink}
                  onChange={(e) => setFormData({ ...formData, is_drink: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Is this a drink?</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows="3"
              required
              placeholder="Describe what you ate or drank..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calories (optional)</label>
              <input
                type="number"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="0"
              />
            </div>

            {formData.is_drink && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Volume (ml)</label>
                <input
                  type="number"
                  value={formData.volume_ml}
                  onChange={(e) => setFormData({ ...formData, volume_ml: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows="2"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={createMutation.isLoading || updateMutation.isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {createMutation.isLoading || updateMutation.isLoading
                ? 'Saving...'
                : editingEntry
                ? 'Update Entry'
                : 'Save Entry'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingEntry(null)
                setFormData({
                  date: format(new Date(), 'yyyy-MM-dd'),
                  time: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
                  meal_type: 'breakfast',
                  description: '',
                  is_drink: false,
                  calories: '',
                  volume_ml: '',
                  notes: '',
                })
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : entries && entries.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {entries.map((entry) => (
              <div key={entry.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
                        {entry.meal_type}
                      </span>
                      {entry.is_drink && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Drink
                        </span>
                      )}
                      <span className="text-sm text-gray-600">
                        {format(new Date(entry.time), 'h:mm a')}
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium">{entry.description}</p>
                    {entry.notes && <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>}
                    <div className="flex space-x-4 mt-2 text-sm text-gray-600">
                      {entry.calories && <span>{entry.calories} kcal</span>}
                      {entry.volume_ml && <span>{entry.volume_ml} ml</span>}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="text-blue-600 hover:text-blue-800 p-2"
                      title="Edit entry"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Delete entry"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">No food entries for this date. Click "Add Entry" to log your meals.</p>
        </div>
      )}
    </div>
  )
}

export default FoodLog
