import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays, subDays } from 'date-fns'
import { Plus, Trash2, Edit, ChevronLeft, ChevronRight, Search, Star, Book } from 'lucide-react'
import { getFoodEntries, createFoodEntry, updateFoodEntry, deleteFoodEntry, getFoodDatabase, toggleFoodFavorite } from '../api/client'

const FoodLog = () => {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [foodSearch, setFoodSearch] = useState('')
  const [showFoodDatabase, setShowFoodDatabase] = useState(true)
  const [selectedFoodId, setSelectedFoodId] = useState(null)

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
    meal_type: 'breakfast',
    description: '',
    is_drink: false,
    calories: '',
    volume_ml: '',
    notes: '',
    save_to_database: true,
  })

  const { data: entries, isLoading } = useQuery({
    queryKey: ['foodEntries', selectedDate],
    queryFn: async () => {
      const response = await getFoodEntries(selectedDate, selectedDate)
      return response.data
    },
  })

  // Fetch food database
  const { data: foodDatabase = [] } = useQuery({
    queryKey: ['foodDatabase', foodSearch],
    queryFn: async () => {
      const response = await getFoodDatabase(foodSearch || null, null, false, 'frequent')
      return response.data
    },
  })

  // Get favorites from food database
  const favoriteFoods = foodDatabase.filter(food => food.is_favorite)
  const frequentFoods = foodDatabase.filter(food => !food.is_favorite).slice(0, 10)

  const createMutation = useMutation({
    mutationFn: createFoodEntry,
    onSuccess: () => {
      queryClient.invalidateQueries(['foodEntries'])
      queryClient.invalidateQueries(['todaySummary'])
      queryClient.invalidateQueries(['foodDatabase'])
      setShowForm(false)
      setSelectedFoodId(null)
      setFoodSearch('')
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
        meal_type: 'breakfast',
        description: '',
        is_drink: false,
        calories: '',
        volume_ml: '',
        notes: '',
        save_to_database: true,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateFoodEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['foodEntries'])
      queryClient.invalidateQueries(['todaySummary'])
      queryClient.invalidateQueries(['foodDatabase'])
      setShowForm(false)
      setEditingEntry(null)
      setSelectedFoodId(null)
      setFoodSearch('')
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
        meal_type: 'breakfast',
        description: '',
        is_drink: false,
        calories: '',
        volume_ml: '',
        notes: '',
        save_to_database: true,
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

  const toggleFavoriteMutation = useMutation({
    mutationFn: toggleFoodFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries(['foodDatabase'])
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
        food_database_id: selectedFoodId,
        save_to_database: formData.save_to_database && !selectedFoodId,  // Only save if not from database
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

  const selectFoodFromDatabase = (foodItem) => {
    setSelectedFoodId(foodItem.id)
    setFormData({
      date: selectedDate,
      time: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
      meal_type: 'breakfast',  // User can change this
      description: foodItem.name,
      is_drink: foodItem.is_drink,
      calories: foodItem.calories || '',
      volume_ml: foodItem.volume_ml || '',
      notes: '',
      save_to_database: false,  // Already in database
    })
    setShowForm(true)
    setShowFoodDatabase(false)
  }

  const handleToggleFavorite = (e, foodId) => {
    e.stopPropagation()  // Prevent selecting the food when clicking star
    toggleFavoriteMutation.mutate(foodId)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Food & Drink Log</h2>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setShowFoodDatabase(false)
            setSelectedFoodId(null)
          }}
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

      {/* Food Database - Quick Add */}
      {!showForm && showFoodDatabase && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Book className="w-5 h-5 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-700">My Food Database</h3>
            </div>
            <button
              onClick={() => setShowFoodDatabase(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Hide
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search foods..."
              value={foodSearch}
              onChange={(e) => setFoodSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Favorites */}
          {favoriteFoods.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-medium text-gray-600 uppercase">Favorites</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {favoriteFoods.map((food) => (
                  <div key={food.id} className="relative group">
                    <button
                      onClick={() => selectFoodFromDatabase(food)}
                      className="px-3 py-2 pr-8 bg-yellow-50 text-yellow-800 rounded-lg hover:bg-yellow-100 text-sm flex items-center gap-2 border border-yellow-200"
                    >
                      <span>{food.name}</span>
                      {food.calories && <span className="text-xs text-yellow-600">({food.calories} kcal)</span>}
                    </button>
                    <button
                      onClick={(e) => handleToggleFavorite(e, food.id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-yellow-200 transition-colors"
                      title="Remove from favorites"
                    >
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frequent/All Foods */}
          {frequentFoods.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-600 uppercase block mb-2">
                {foodSearch ? 'Search Results' : 'Most Used'}
              </span>
              <div className="flex flex-wrap gap-2">
                {frequentFoods.map((food) => (
                  <div key={food.id} className="relative group">
                    <button
                      onClick={() => selectFoodFromDatabase(food)}
                      className="px-3 py-2 pr-8 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm flex items-center gap-2"
                    >
                      <span>{food.name}</span>
                      {food.calories && <span className="text-xs text-blue-600">({food.calories} kcal)</span>}
                      <span className="text-xs text-gray-500">×{food.times_logged}</span>
                    </button>
                    <button
                      onClick={(e) => handleToggleFavorite(e, food.id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-blue-200 transition-colors"
                      title={food.is_favorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star className={`w-4 h-4 ${food.is_favorite ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {foodDatabase.length === 0 && !foodSearch && (
            <p className="text-sm text-gray-500 text-center py-4">
              Your food database is empty. Add foods by logging them below!
            </p>
          )}

          {foodDatabase.length === 0 && foodSearch && (
            <p className="text-sm text-gray-500 text-center py-4">
              No foods found matching "{foodSearch}"
            </p>
          )}
        </div>
      )}

      {/* Show Database Button */}
      {!showForm && !showFoodDatabase && (
        <button
          onClick={() => setShowFoodDatabase(true)}
          className="w-full bg-white rounded-lg shadow p-3 text-center text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <Book className="w-4 h-4" />
          Show Food Database
        </button>
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
                setSelectedFoodId(null)
                setFoodSearch('')
                setShowFoodDatabase(true)
                setFormData({
                  date: format(new Date(), 'yyyy-MM-dd'),
                  time: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
                  meal_type: 'breakfast',
                  description: '',
                  is_drink: false,
                  calories: '',
                  volume_ml: '',
                  notes: '',
                  save_to_database: true,
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
