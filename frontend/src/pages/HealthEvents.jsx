import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO, startOfYear, endOfYear, startOfMonth, endOfMonth, subYears } from 'date-fns'
import { Plus, Trash2, Edit, Clock, Filter, MapPin, User, CalendarCheck } from 'lucide-react'
import { createHealthEvent, getHealthEvents, updateHealthEvent, deleteHealthEvent } from '../api/client'

const EVENT_TYPES = [
  { value: 'surgery', label: 'Surgery', color: 'bg-red-100 text-red-800' },
  { value: 'hospitalization', label: 'Hospitalization', color: 'bg-orange-100 text-orange-800' },
  { value: 'doctor_visit', label: 'Doctor Visit', color: 'bg-blue-100 text-blue-800' },
  { value: 'vaccination', label: 'Vaccination', color: 'bg-green-100 text-green-800' },
  { value: 'diagnosis', label: 'Diagnosis', color: 'bg-purple-100 text-purple-800' },
  { value: 'procedure', label: 'Procedure', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'test_result', label: 'Test Result', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' },
]

const getEventTypeInfo = (eventType) => {
  return EVENT_TYPES.find(et => et.value === eventType) || EVENT_TYPES[EVENT_TYPES.length - 1]
}

const HealthEvents = () => {
  const queryClient = useQueryClient()
  const [filterMode, setFilterMode] = useState('recent')
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'))
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedEventType, setSelectedEventType] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    hasTime: false,
    timeOfDay: format(new Date(), 'HH:mm'),
    event_type: 'doctor_visit',
    title: '',
    description: '',
    location: '',
    provider: '',
    follow_up_date: '',
    outcome: '',
    notes: '',
  })

  const getDateRange = () => {
    switch (filterMode) {
      case 'recent':
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

  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ['healthEvents', filterMode, selectedYear, selectedMonth, selectedDate, selectedEventType],
    queryFn: () => {
      const { start, end } = getDateRange()
      return getHealthEvents(start, end, selectedEventType || null).then(res => res.data)
    },
  })

  const events = filterMode === 'recent' ? allEvents.slice(0, 20) : allEvents

  const createMutation = useMutation({
    mutationFn: createHealthEvent,
    onSuccess: () => {
      queryClient.invalidateQueries(['healthEvents'])
      resetForm()
      setShowForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateHealthEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['healthEvents'])
      resetForm()
      setEditingEvent(null)
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteHealthEvent,
    onSuccess: () => {
      queryClient.invalidateQueries(['healthEvents'])
    },
  })

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      hasTime: false,
      timeOfDay: format(new Date(), 'HH:mm'),
      event_type: 'doctor_visit',
      title: '',
      description: '',
      location: '',
      provider: '',
      follow_up_date: '',
      outcome: '',
      notes: '',
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const data = {
      date: formData.date,
      time: formData.hasTime ? `${formData.date}T${formData.timeOfDay}` : null,
      event_type: formData.event_type,
      title: formData.title,
      description: formData.description || null,
      location: formData.location || null,
      provider: formData.provider || null,
      follow_up_date: formData.follow_up_date || null,
      outcome: formData.outcome || null,
      notes: formData.notes || null,
    }

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (event) => {
    const hasTime = !!event.time
    setFormData({
      date: event.date,
      hasTime,
      timeOfDay: hasTime ? format(parseISO(event.time), 'HH:mm') : format(new Date(), 'HH:mm'),
      event_type: event.event_type || 'other',
      title: event.title || '',
      description: event.description || '',
      location: event.location || '',
      provider: event.provider || '',
      follow_up_date: event.follow_up_date || '',
      outcome: event.outcome || '',
      notes: event.notes || '',
    })
    setEditingEvent(event)
    setShowForm(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this health event?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCancel = () => {
    resetForm()
    setEditingEvent(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Health Events</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'Add Event'}
        </button>
      </div>

      {/* Filter Selector */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filter events by:</span>
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
            Recent Events
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
        <div className="flex flex-wrap items-center gap-4">
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

          {/* Event Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Event type:</label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {EVENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {filterMode === 'recent' && (
          <p className="text-sm text-gray-500">
            Showing the most recent 20 health events
          </p>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingEvent ? 'Edit Health Event' : 'Add New Health Event'}
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

              {/* Time (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <input
                    type="checkbox"
                    checked={formData.hasTime}
                    onChange={(e) => setFormData({ ...formData, hasTime: e.target.checked })}
                    className="mr-2"
                  />
                  Include specific time
                </label>
                {formData.hasTime && (
                  <input
                    type="time"
                    value={formData.timeOfDay}
                    onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                )}
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type *
                </label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Annual Checkup, Appendectomy, Flu Shot"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Hospital or clinic name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider
                </label>
                <input
                  type="text"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  placeholder="Doctor or healthcare provider"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Follow-up Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Outcome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outcome
                </label>
                <input
                  type="text"
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  placeholder="Result or outcome of the event"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the event"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any other relevant information..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingEvent ? 'Update Event' : 'Add Event'}
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

      {/* Events List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">
            Health Events
          </h3>

          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : events.length === 0 ? (
            <p className="text-gray-500">No health events recorded for this period.</p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => {
                const eventTypeInfo = getEventTypeInfo(event.event_type)
                return (
                  <div
                    key={event.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm text-gray-600">
                            {format(parseISO(event.date), 'MMM d, yyyy')}
                          </span>
                          {event.time && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              {format(parseISO(event.time), 'HH:mm')}
                            </div>
                          )}
                          <span className={`px-2 py-1 rounded text-sm ${eventTypeInfo.color}`}>
                            {eventTypeInfo.label}
                          </span>
                        </div>

                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          {event.title}
                        </h4>

                        <div className="space-y-1 text-sm text-gray-700">
                          {event.description && (
                            <p>{event.description}</p>
                          )}
                          {event.location && (
                            <p className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <strong>Location:</strong> {event.location}
                            </p>
                          )}
                          {event.provider && (
                            <p className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <strong>Provider:</strong> {event.provider}
                            </p>
                          )}
                          {event.outcome && (
                            <p><strong>Outcome:</strong> {event.outcome}</p>
                          )}
                          {event.follow_up_date && (
                            <p className="flex items-center gap-1">
                              <CalendarCheck className="w-4 h-4" />
                              <strong>Follow-up:</strong> {format(parseISO(event.follow_up_date), 'MMM d, yyyy')}
                            </p>
                          )}
                          {event.notes && (
                            <p><strong>Notes:</strong> {event.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(event)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HealthEvents
