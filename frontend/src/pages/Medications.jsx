import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays, subDays } from 'date-fns'
import { Plus, Trash2, Edit, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  getMedicationSchedules,
  createMedicationSchedule,
  updateMedicationSchedule,
  deleteMedicationSchedule
} from '../api/client'

const Medications = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('single') // 'single' or 'scheduled'
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Single medication form
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    timeOfDay: format(new Date(), 'HH:mm'),
    medication_name: '',
    dosage: '',
    quantity: '',
    unit: 'pills',
    notes: '',
  })

  // Scheduled medication form
  const [scheduleFormData, setScheduleFormData] = useState({
    medication_name: '',
    dosage: '',
    quantity: '',
    unit: 'pills',
    schedule_times: ['08:00'],
    is_active: true,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    notes: '',
  })

  // Fetch single medications
  const { data: medications, isLoading: medsLoading } = useQuery({
    queryKey: ['medications', selectedDate],
    queryFn: async () => {
      const response = await getMedications(selectedDate, selectedDate)
      return response.data
    },
  })

  // Fetch scheduled medications
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['medicationSchedules'],
    queryFn: async () => {
      const response = await getMedicationSchedules(true)
      return response.data
    },
  })

  // Mutations for single medications
  const createMutation = useMutation({
    mutationFn: createMedication,
    onSuccess: () => {
      queryClient.invalidateQueries(['medications'])
      queryClient.invalidateQueries(['todaySummary'])
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateMedication(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['medications'])
      queryClient.invalidateQueries(['todaySummary'])
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMedication,
    onSuccess: () => {
      queryClient.invalidateQueries(['medications'])
      queryClient.invalidateQueries(['todaySummary'])
    },
  })

  // Mutations for scheduled medications
  const createScheduleMutation = useMutation({
    mutationFn: createMedicationSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries(['medicationSchedules'])
      resetScheduleForm()
    },
  })

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, data }) => updateMedicationSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['medicationSchedules'])
      resetScheduleForm()
    },
  })

  const deleteScheduleMutation = useMutation({
    mutationFn: deleteMedicationSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries(['medicationSchedules'])
    },
  })

  const resetForm = () => {
    setShowForm(false)
    setEditingEntry(null)
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      timeOfDay: format(new Date(), 'HH:mm'),
      medication_name: '',
      dosage: '',
      quantity: '',
      unit: 'pills',
      notes: '',
    })
  }

  const resetScheduleForm = () => {
    setShowForm(false)
    setEditingEntry(null)
    setScheduleFormData({
      medication_name: '',
      dosage: '',
      quantity: '',
      unit: 'pills',
      schedule_times: ['08:00'],
      is_active: true,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      notes: '',
    })
  }

  const handleEdit = (entry) => {
    setEditingEntry(entry)
    // Extract time from the datetime field
    const timeOnly = entry.time.includes('T') ? entry.time.split('T')[1].substring(0, 5) : '08:00'
    setFormData({
      date: entry.date,
      timeOfDay: timeOnly,
      medication_name: entry.medication_name,
      dosage: entry.dosage || '',
      quantity: entry.quantity || '',
      unit: entry.unit || 'pills',
      notes: entry.notes || '',
    })
    setShowForm(true)
  }

  const handleEditSchedule = (schedule) => {
    setEditingEntry(schedule)
    setScheduleFormData({
      medication_name: schedule.medication_name,
      dosage: schedule.dosage || '',
      quantity: schedule.quantity || '',
      unit: schedule.unit || 'pills',
      schedule_times: schedule.schedule_times || ['08:00'],
      is_active: schedule.is_active,
      start_date: schedule.start_date,
      end_date: schedule.end_date || '',
      notes: schedule.notes || '',
    })
    setShowForm(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this medication entry?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleDeleteSchedule = (id) => {
    if (window.confirm('Are you sure you want to delete this medication schedule?')) {
      deleteScheduleMutation.mutate(id)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Combine date and timeOfDay into a full datetime
    const datetime = `${formData.date}T${formData.timeOfDay}`
    const data = {
      date: formData.date,
      time: datetime,
      medication_name: formData.medication_name,
      dosage: formData.dosage || null,
      quantity: formData.quantity ? parseFloat(formData.quantity) : null,
      unit: formData.unit,
      notes: formData.notes || null,
    }

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleScheduleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...scheduleFormData,
      quantity: scheduleFormData.quantity ? parseFloat(scheduleFormData.quantity) : null,
      end_date: scheduleFormData.end_date || null,
    }

    if (editingEntry) {
      updateScheduleMutation.mutate({ id: editingEntry.id, data })
    } else {
      createScheduleMutation.mutate(data)
    }
  }

  const addScheduleTime = () => {
    setScheduleFormData({
      ...scheduleFormData,
      schedule_times: [...scheduleFormData.schedule_times, '12:00']
    })
  }

  const removeScheduleTime = (index) => {
    setScheduleFormData({
      ...scheduleFormData,
      schedule_times: scheduleFormData.schedule_times.filter((_, i) => i !== index)
    })
  }

  const updateScheduleTime = (index, value) => {
    const newTimes = [...scheduleFormData.schedule_times]
    newTimes[index] = value
    setScheduleFormData({ ...scheduleFormData, schedule_times: newTimes })
  }

  const goToPreviousDay = () => {
    setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))
  }

  const goToNextDay = () => {
    setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))
  }

  const goToToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Medications</h2>
        <button
          onClick={() => {
            resetForm()
            resetScheduleForm()
            setShowForm(!showForm)
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-5 h-5" />
          <span>{activeTab === 'single' ? 'Add Medication' : 'Add Schedule'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => { setActiveTab('single'); setShowForm(false); }}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'single'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Single Doses</span>
            </div>
          </button>
          <button
            onClick={() => { setActiveTab('scheduled'); setShowForm(false); }}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'scheduled'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Regular Medications</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Date Navigation for single medications */}
      {activeTab === 'single' && (
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
      )}

      {/* Single medication form */}
      {showForm && activeTab === 'single' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingEntry ? 'Edit Medication' : 'New Medication'}
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
                type="time"
                value={formData.timeOfDay}
                onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name *</label>
              <input
                type="text"
                value={formData.medication_name}
                onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
                placeholder="e.g., Aspirin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
              <input
                type="text"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 500mg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                step="0.5"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="pills">Pills</option>
                <option value="tablets">Tablets</option>
                <option value="capsules">Capsules</option>
                <option value="mg">mg</option>
                <option value="ml">ml</option>
                <option value="drops">Drops</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
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
                ? 'Update'
                : 'Save'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Scheduled medication form */}
      {showForm && activeTab === 'scheduled' && (
        <form onSubmit={handleScheduleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingEntry ? 'Edit Medication Schedule' : 'New Medication Schedule'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name *</label>
              <input
                type="text"
                value={scheduleFormData.medication_name}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, medication_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
                placeholder="e.g., Blood Pressure Medication"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
              <input
                type="text"
                value={scheduleFormData.dosage}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, dosage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 10mg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                step="0.5"
                value={scheduleFormData.quantity}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={scheduleFormData.unit}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="pills">Pills</option>
                <option value="tablets">Tablets</option>
                <option value="capsules">Capsules</option>
                <option value="mg">mg</option>
                <option value="ml">ml</option>
                <option value="drops">Drops</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={scheduleFormData.start_date}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
              <input
                type="date"
                value={scheduleFormData.end_date}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule Times *
            </label>
            <div className="space-y-2">
              {scheduleFormData.schedule_times.map((time, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => updateScheduleTime(index, e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  {scheduleFormData.schedule_times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeScheduleTime(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addScheduleTime}
                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
              >
                + Add another time
              </button>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleFormData.is_active}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={scheduleFormData.notes}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows="2"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={createScheduleMutation.isLoading || updateScheduleMutation.isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {createScheduleMutation.isLoading || updateScheduleMutation.isLoading
                ? 'Saving...'
                : editingEntry
                ? 'Update'
                : 'Save'}
            </button>
            <button
              type="button"
              onClick={resetScheduleForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Single medications list */}
      {activeTab === 'single' && (
        medsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : medications && medications.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-gray-200">
              {medications.map((med) => (
                <div key={med.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{med.medication_name}</h3>
                        <span className="text-sm text-gray-600">
                          {format(new Date(med.time), 'h:mm a')}
                        </span>
                      </div>
                      {med.dosage && (
                        <p className="text-sm text-gray-600">Dosage: {med.dosage}</p>
                      )}
                      {med.quantity && (
                        <p className="text-sm text-gray-600">
                          Quantity: {med.quantity} {med.unit}
                        </p>
                      )}
                      {med.notes && <p className="text-sm text-gray-600 mt-1">{med.notes}</p>}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(med)}
                        className="text-blue-600 hover:text-blue-800 p-2"
                        title="Edit medication"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(med.id)}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Delete medication"
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
            <p className="text-gray-600">No medications for this date. Click "Add Medication" to log a dose.</p>
          </div>
        )
      )}

      {/* Scheduled medications list */}
      {activeTab === 'scheduled' && (
        schedulesLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : schedules && schedules.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-gray-200">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{schedule.medication_name}</h3>
                        {!schedule.is_active && (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      {schedule.dosage && (
                        <p className="text-sm text-gray-600">Dosage: {schedule.dosage}</p>
                      )}
                      {schedule.quantity && (
                        <p className="text-sm text-gray-600">
                          Quantity: {schedule.quantity} {schedule.unit}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Times:</strong> {schedule.schedule_times.join(', ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>From:</strong> {format(new Date(schedule.start_date), 'MMM d, yyyy')}
                        {schedule.end_date && ` to ${format(new Date(schedule.end_date), 'MMM d, yyyy')}`}
                      </p>
                      {schedule.notes && <p className="text-sm text-gray-600 mt-1">{schedule.notes}</p>}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditSchedule(schedule)}
                        className="text-blue-600 hover:text-blue-800 p-2"
                        title="Edit schedule"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Delete schedule"
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
            <p className="text-gray-600">No regular medications scheduled. Click "Add Schedule" to create one.</p>
            <p className="text-sm text-gray-500 mt-2">
              Scheduled medications will automatically create entries daily at 00:30.
            </p>
          </div>
        )
      )}
    </div>
  )
}

export default Medications
