import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  Home,
  Apple,
  Pill,
  Activity,
  Thermometer,
  FileDown,
  Settings as SettingsIcon,
  Droplet,
  ClipboardList
} from 'lucide-react'

const Navigation = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/food', icon: Apple, label: 'Food Log' },
    { path: '/medications', icon: Pill, label: 'Medications' },
    { path: '/seizures', icon: Activity, label: 'Seizures' },
    { path: '/sickness', icon: Thermometer, label: 'Sickness' },
    { path: '/health-events', icon: ClipboardList, label: 'Health Events' },
    { path: '/garmin', icon: Droplet, label: 'Garmin Data' },
    { path: '/export', icon: FileDown, label: 'Export' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ]

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-800">Health Tracker</h1>
          </div>
          <div className="hidden md:flex space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-2 px-1 rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
