import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUser, updateUser, checkGarminConfigured } from '../api/client'
import { Save, CheckCircle, XCircle } from 'lucide-react'

const Settings = () => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    email: '',
    garmin_username: '',
    garmin_password: '',
  })

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await getUser()
      setFormData({
        email: response.data.email || '',
        garmin_username: response.data.garmin_username || '',
        garmin_password: '',
      })
      return response.data
    },
  })

  const { data: garminStatus } = useQuery({
    queryKey: ['garminConfigured'],
    queryFn: async () => {
      const response = await checkGarminConfigured()
      return response.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['user'])
      queryClient.invalidateQueries(['garminConfigured'])
      alert('Settings saved successfully!')
      setFormData({ ...formData, garmin_password: '' })
    },
    onError: () => {
      alert('Failed to save settings. Please try again.')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...formData }
    if (!data.garmin_password) {
      delete data.garmin_password
    }
    updateMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Settings</h2>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Garmin Connect Configuration</h3>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Garmin Status</p>
            <p className="text-sm text-gray-600">
              {garminStatus?.configured ? `Connected as ${garminStatus.username}` : 'Not configured'}
            </p>
          </div>
          {garminStatus?.configured ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : (
            <XCircle className="w-6 h-6 text-red-500" />
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Garmin Connect Username/Email
            </label>
            <input
              type="text"
              value={formData.garmin_username}
              onChange={(e) => setFormData({ ...formData, garmin_username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="garmin@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Garmin Connect Password
            </label>
            <input
              type="password"
              value={formData.garmin_password}
              onChange={(e) => setFormData({ ...formData, garmin_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder={garminStatus?.configured ? 'Leave blank to keep current' : 'Enter password'}
            />
            <p className="text-xs text-gray-500 mt-1">
              Your password is encrypted before storage. Leave blank to keep existing password.
            </p>
          </div>

          <button
            type="submit"
            disabled={updateMutation.isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{updateMutation.isLoading ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </form>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">About Garmin Sync</h4>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>Data is automatically synced daily at 12:30 AM</li>
          <li>You can manually trigger a sync from the Dashboard</li>
          <li>Yesterday's data is synced (today's data may be incomplete)</li>
          <li>Synced data includes: steps, heart rate, sleep, stress, body battery, and activities</li>
        </ul>
      </div>
    </div>
  )
}

export default Settings
