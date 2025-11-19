import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import FoodLog from './pages/FoodLog'
import Medications from './pages/Medications'
import Seizures from './pages/Seizures'
import Sickness from './pages/Sickness'
import GarminData from './pages/GarminData'
import Export from './pages/Export'
import Settings from './pages/Settings'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="food" element={<FoodLog />} />
        <Route path="medications" element={<Medications />} />
        <Route path="seizures" element={<Seizures />} />
        <Route path="sickness" element={<Sickness />} />
        <Route path="garmin" element={<GarminData />} />
        <Route path="export" element={<Export />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
