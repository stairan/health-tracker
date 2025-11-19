import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO, subDays } from 'date-fns'
import { Calendar, Activity, Heart, Battery, Moon, TrendingUp, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { getGarminData, syncGarminData } from '../api/client'

const GarminData = () => {
  const queryClient = useQueryClient()
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [syncDate, setSyncDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [syncForce, setSyncForce] = useState(false)
  const [syncMessage, setSyncMessage] = useState(null)

  // Fetch Garmin data for date range
  const { data: garminData = [], isLoading } = useQuery({
    queryKey: ['garminData', startDate, endDate],
    queryFn: () => getGarminData(startDate, endDate).then(res => res.data),
  })

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: ({ date, force }) => syncGarminData(date, force),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['garminData'])
      setSyncMessage({ type: 'success', text: response.data.message || 'Data synced successfully!' })
      setTimeout(() => setSyncMessage(null), 5000)
    },
    onError: (error) => {
      setSyncMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to sync data. Please check your Garmin credentials.'
      })
      setTimeout(() => setSyncMessage(null), 5000)
    },
  })

  const handleManualSync = () => {
    setSyncMessage(null)
    syncMutation.mutate({ date: syncDate, force: syncForce })
  }

  // Calculate summary statistics
  const summary = garminData.length > 0 ? {
    avgSteps: Math.round(garminData.reduce((sum, d) => sum + (d.steps || 0), 0) / garminData.length),
    avgSleepHours: (garminData.reduce((sum, d) => sum + (d.sleep_duration_seconds || 0), 0) / garminData.length / 3600).toFixed(1),
    avgRestingHR: Math.round(garminData.reduce((sum, d) => sum + (d.resting_heart_rate || 0), 0) / garminData.length),
    avgBodyBattery: Math.round(garminData.reduce((sum, d) => sum + (d.body_battery_highest || 0), 0) / garminData.length),
  } : { avgSteps: 0, avgSleepHours: 0, avgRestingHR: 0, avgBodyBattery: 0 }

  // Format data for charts
  const chartData = garminData.map(d => ({
    date: format(parseISO(d.date), 'MMM dd'),
    steps: d.steps || 0,
    sleepHours: d.sleep_duration_seconds ? (d.sleep_duration_seconds / 3600).toFixed(1) : 0,
    deepSleep: d.deep_sleep_seconds ? (d.deep_sleep_seconds / 60).toFixed(0) : 0,
    lightSleep: d.light_sleep_seconds ? (d.light_sleep_seconds / 60).toFixed(0) : 0,
    remSleep: d.rem_sleep_seconds ? (d.rem_sleep_seconds / 60).toFixed(0) : 0,
    awake: d.awake_seconds ? (d.awake_seconds / 60).toFixed(0) : 0,
    restingHR: d.resting_heart_rate || 0,
    avgHR: d.avg_heart_rate || 0,
    maxHR: d.max_heart_rate || 0,
    bodyBatteryHigh: d.body_battery_highest || 0,
    bodyBatteryLow: d.body_battery_lowest || 0,
    moderateMin: d.moderate_intensity_minutes || 0,
    vigorousMin: d.vigorous_intensity_minutes || 0,
    calories: d.calories_total || 0,
    distance: d.distance_meters ? (d.distance_meters / 1000).toFixed(1) : 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Garmin Data Analytics</h2>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md"
            />
          </div>
          <button
            onClick={() => {
              setStartDate(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
              setEndDate(format(new Date(), 'yyyy-MM-dd'))
            }}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => {
              setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
              setEndDate(format(new Date(), 'yyyy-MM-dd'))
            }}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Manual Sync Section */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-start gap-4">
          <RefreshCw className="w-5 h-5 text-blue-600 mt-1" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Manual Sync</h3>
            <p className="text-sm text-gray-600 mb-3">
              Sync Garmin data for a specific date. Use this to fill in missing historical data.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date to sync:</label>
                <input
                  type="date"
                  value={syncDate}
                  onChange={(e) => setSyncDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="force-sync"
                  checked={syncForce}
                  onChange={(e) => setSyncForce(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="force-sync" className="ml-2 text-sm text-gray-700">
                  Force resync (overwrite existing data)
                </label>
              </div>
              <button
                onClick={handleManualSync}
                disabled={syncMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {syncMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Sync Data
                  </>
                )}
              </button>
            </div>

            {/* Sync Message */}
            {syncMessage && (
              <div className={`mt-3 p-3 rounded-md flex items-start gap-2 ${
                syncMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {syncMessage.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-sm">{syncMessage.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading Garmin data...</p>
        </div>
      ) : garminData.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No Garmin data available for the selected date range.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Steps</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.avgSteps.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Moon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Sleep</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.avgSleepHours}h</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-full">
                  <Heart className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Resting HR</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.avgRestingHR} bpm</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <Battery className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Body Battery</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.avgBodyBattery}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Steps Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Activity className="w-5 h-5 text-blue-600" />
              Daily Steps
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="steps" stroke="#3b82f6" strokeWidth={2} name="Steps" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Sleep Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Moon className="w-5 h-5 text-purple-600" />
              Sleep Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="deepSleep" stackId="a" fill="#8b5cf6" name="Deep Sleep" />
                <Bar dataKey="lightSleep" stackId="a" fill="#a78bfa" name="Light Sleep" />
                <Bar dataKey="remSleep" stackId="a" fill="#c4b5fd" name="REM Sleep" />
                <Bar dataKey="awake" stackId="a" fill="#fca5a5" name="Awake" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Heart Rate Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Heart className="w-5 h-5 text-red-600" />
              Heart Rate
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'BPM', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="restingHR" stroke="#ef4444" strokeWidth={2} name="Resting HR" />
                <Line type="monotone" dataKey="avgHR" stroke="#f97316" strokeWidth={2} name="Avg HR" />
                <Line type="monotone" dataKey="maxHR" stroke="#dc2626" strokeWidth={2} name="Max HR" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Body Battery Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Battery className="w-5 h-5 text-green-600" />
              Body Battery
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="bodyBatteryHigh" stroke="#22c55e" fill="#86efac" name="Highest" />
                <Area type="monotone" dataKey="bodyBatteryLow" stroke="#16a34a" fill="#4ade80" name="Lowest" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Intensity Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              Intensity Minutes
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="moderateMin" fill="#fb923c" name="Moderate" />
                <Bar dataKey="vigorousMin" fill="#ea580c" name="Vigorous" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Additional Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Calories Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Daily Calories</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="calories" stroke="#f59e0b" strokeWidth={2} name="Calories" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Distance Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Distance (km)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="distance" stroke="#06b6d4" strokeWidth={2} name="Distance" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default GarminData
