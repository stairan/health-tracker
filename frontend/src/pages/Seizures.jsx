import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Plus, Trash2, Edit, Calendar, Clock } from 'lucide-react'
import { createSeizure, getSeizures, updateSeizure, deleteSeizure } from '../api/client'

const Seizures = () => {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showForm, setShowForm] = useState(false)
  const [editingSeizure, setEditingSeizure] = useState(null)
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    timeOfDay: format(new Date(), 'HH:mm'),
    seizure_type: '',
    duration_seconds: '',
    severity: 'moderate',
    triggers: '',
    warning_signs: '',
    post_seizure_state: '',
    location: '',
    activity_before: '',
    notes: '',
  })

  // Fetch seizures for selected date
  const { data: seizures = [], isLoading } = useQuery({
    queryKey: ['seizures', selectedDate],
    queryFn: () => getSeizures(selectedDate, selectedDate).then(res => res.data),
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createSeizure,
    onSuccess: () => {
      queryClient.invalidateQueries(['seizures'])
      resetForm()
      setShowForm(false)
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateSeizure(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['seizures'])
      resetForm()
      setEditingSeizure(null)
      setShowForm(false)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteSeizure,
    onSuccess: () => {
      queryClient.invalidateQueries(['seizures'])
    },
  })

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      timeOfDay: format(new Date(), 'HH:mm'),
      seizure_type: '',
      duration_seconds: '',
      severity: 'moderate',
      triggers: '',
      warning_signs: '',
      post_seizure_state: '',
      location: '',
      activity_before: '',
      notes: '',
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Combine date and time
    const datetime = `${formData.date}T${formData.timeOfDay}`

    const data = {
      date: formData.date,
      time: datetime,
      seizure_type: formData.seizure_type || null,
      duration_seconds: formData.duration_seconds ? parseInt(formData.duration_seconds) : null,
      severity: formData.severity || null,
      triggers: formData.triggers || null,
      warning_signs: formData.warning_signs || null,
      post_seizure_state: formData.post_seizure_state || null,
      location: formData.location || null,
      activity_before: formData.activity_before || null,
      notes: formData.notes || null,
    }

    if (editingSeizure) {
      updateMutation.mutate({ id: editingSeizure.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (seizure) => {
    const datetime = parseISO(seizure.time)
    setFormData({
      date: format(datetime, 'yyyy-MM-dd'),
      timeOfDay: format(datetime, 'HH:mm'),
      seizure_type: seizure.seizure_type || '',
      duration_seconds: seizure.duration_seconds || '',
      severity: seizure.severity || 'moderate',
      triggers: seizure.triggers || '',
      warning_signs: seizure.warning_signs || '',
      post_seizure_state: seizure.post_seizure_state || '',
      location: seizure.location || '',
      activity_before: seizure.activity_before || '',
      notes: seizure.notes || '',
    })
    setEditingSeizure(seizure)
    setShowForm(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this seizure entry?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCancel = () => {
    resetForm()
    setEditingSeizure(null)
    setShowForm(false)
  }

  const formatDuration = (seconds) => {
    if (!seconds) return 'Not recorded'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Seizure Log</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'Add Seizure'}
        </button>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Calendar className="w-4 h-4" />
          View seizures for date:
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="ml-2 px-3 py-1 border border-gray-300 rounded-md"
          />
        </label>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingSeizure ? 'Edit Seizure Entry' : 'Add New Seizure Entry'}
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

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time *
                </label>
                <input
                  type="time"
                  value={formData.timeOfDay}
                  onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Seizure Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seizure Type
                </label>
                <input
                  type="text"
                  value={formData.seizure_type}
                  onChange={(e) => setFormData({ ...formData, seizure_type: e.target.value })}
                  placeholder="e.g., focal, generalized, absence, tonic-clonic"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={formData.duration_seconds}
                  onChange={(e) => setFormData({ ...formData, duration_seconds: e.target.value })}
                  placeholder="Duration in seconds"
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

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Where did it happen?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Triggers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Potential Triggers
              </label>
              <textarea
                value={formData.triggers}
                onChange={(e) => setFormData({ ...formData, triggers: e.target.value })}
                placeholder="What might have triggered the seizure?"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Warning Signs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warning Signs (Aura)
              </label>
              <textarea
                value={formData.warning_signs}
                onChange={(e) => setFormData({ ...formData, warning_signs: e.target.value })}
                placeholder="Any warning signs before the seizure?"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Activity Before */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity Before Seizure
              </label>
              <textarea
                value={formData.activity_before}
                onChange={(e) => setFormData({ ...formData, activity_before: e.target.value })}
                placeholder="What were you doing before the seizure?"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Post-Seizure State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Post-Seizure State
              </label>
              <textarea
                value={formData.post_seizure_state}
                onChange={(e) => setFormData({ ...formData, post_seizure_state: e.target.value })}
                placeholder="How did you feel after the seizure?"
                rows={2}
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
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingSeizure ? 'Update Seizure' : 'Add Seizure'}
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

      {/* Seizure List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">
            Seizures on {format(parseISO(selectedDate), 'MMMM d, yyyy')}
          </h3>

          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : seizures.length === 0 ? (
            <p className="text-gray-500">No seizures recorded for this date.</p>
          ) : (
            <div className="space-y-4">
              {seizures.map((seizure) => (
                <div
                  key={seizure.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {format(parseISO(seizure.time), 'HH:mm')}
                        </div>
                        {seizure.seizure_type && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                            {seizure.seizure_type}
                          </span>
                        )}
                        {seizure.severity && (
                          <span className={`px-2 py-1 rounded text-sm ${
                            seizure.severity === 'severe' ? 'bg-red-100 text-red-800' :
                            seizure.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {seizure.severity}
                          </span>
                        )}
                        <span className="text-sm text-gray-600">
                          Duration: {formatDuration(seizure.duration_seconds)}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-700">
                        {seizure.location && (
                          <p><strong>Location:</strong> {seizure.location}</p>
                        )}
                        {seizure.triggers && (
                          <p><strong>Triggers:</strong> {seizure.triggers}</p>
                        )}
                        {seizure.warning_signs && (
                          <p><strong>Warning Signs:</strong> {seizure.warning_signs}</p>
                        )}
                        {seizure.activity_before && (
                          <p><strong>Activity Before:</strong> {seizure.activity_before}</p>
                        )}
                        {seizure.post_seizure_state && (
                          <p><strong>Post-Seizure:</strong> {seizure.post_seizure_state}</p>
                        )}
                        {seizure.notes && (
                          <p><strong>Notes:</strong> {seizure.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(seizure)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(seizure.id)}
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

export default Seizures
