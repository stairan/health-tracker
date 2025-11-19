import { useQuery } from '@tanstack/react-query'
import { getTodaySummary, syncGarminData } from '../api/client'
import { format } from 'date-fns'
import { Activity, Heart, Footprints, Moon, Battery, TrendingUp, RefreshCw } from 'lucide-react'
import { useState } from 'react'

const StatCard = ({ icon: Icon, title, value, unit, color = 'primary' }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value !== null && value !== undefined ? value : '-'}
            {value !== null && value !== undefined && unit && (
              <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
            )}
          </p>
        </div>
        <Icon className={`w-10 h-10 text-${color}-500`} />
      </div>
    </div>
  )
}

const Dashboard = () => {
  const [syncing, setSyncing] = useState(false)

  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['todaySummary'],
    queryFn: async () => {
      const response = await getTodaySummary()
      return response.data
    },
  })

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncGarminData()
      await refetch()
    } catch (error) {
      console.error('Sync failed:', error)
      alert('Failed to sync Garmin data. Please check your credentials in Settings.')
    } finally {
      setSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading dashboard data. Please try again.</p>
      </div>
    )
  }

  const garmin = summary?.garmin_data
  const today = format(new Date(), 'EEEE, MMMM d, yyyy')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Today's Health Summary</h2>
          <p className="text-gray-600 mt-1">{today}</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing...' : 'Sync Garmin'}</span>
        </button>
      </div>

      {/* Garmin Stats */}
      {garmin ? (
        <>
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Activity & Fitness</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Footprints}
                title="Steps"
                value={garmin.steps?.toLocaleString()}
                color="primary"
              />
              <StatCard
                icon={Heart}
                title="Resting Heart Rate"
                value={garmin.resting_heart_rate}
                unit="bpm"
                color="red"
              />
              <StatCard
                icon={TrendingUp}
                title="Active Calories"
                value={garmin.calories_active}
                unit="kcal"
                color="orange"
              />
              <StatCard
                icon={Activity}
                title="Floors Climbed"
                value={garmin.floors_climbed}
                color="green"
              />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Sleep & Recovery</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Moon}
                title="Sleep Duration"
                value={garmin.sleep_duration_seconds ? (garmin.sleep_duration_seconds / 3600).toFixed(1) : null}
                unit="hours"
                color="indigo"
              />
              <StatCard
                icon={Battery}
                title="Body Battery"
                value={garmin.body_battery_highest}
                color="yellow"
              />
              <StatCard
                icon={Activity}
                title="Avg Stress Level"
                value={garmin.avg_stress_level}
                color="purple"
              />
              <StatCard
                icon={Heart}
                title="Sleep Score"
                value={garmin.sleep_score}
                color="blue"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No Garmin data available for today. Click "Sync Garmin" to fetch your latest data.
          </p>
        </div>
      )}

      {/* Health Entries Summary */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Daily Log Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Meals Logged</p>
            <p className="text-2xl font-bold text-gray-900">{summary?.food_entries?.length || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Medications Taken</p>
            <p className="text-2xl font-bold text-gray-900">{summary?.medication_count || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Water Intake</p>
            <p className="text-2xl font-bold text-gray-900">
              {summary?.total_water_ml ? (summary.total_water_ml / 1000).toFixed(1) : 0}
              <span className="text-sm font-normal text-gray-500 ml-1">L</span>
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Seizures</p>
            <p className="text-2xl font-bold text-gray-900">{summary?.seizures?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      {summary?.activities && summary.activities.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Today's Activities</h3>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-gray-200">
              {summary.activities.map((activity) => (
                <div key={activity.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{activity.activity_name || activity.activity_type}</p>
                    <p className="text-sm text-gray-600">
                      {activity.duration_seconds ? `${(activity.duration_seconds / 60).toFixed(0)} min` : '-'}
                      {activity.distance_meters && ` • ${(activity.distance_meters / 1000).toFixed(2)} km`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{activity.calories} kcal</p>
                    {activity.avg_heart_rate && (
                      <p className="text-sm text-gray-600">{activity.avg_heart_rate} bpm avg</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
