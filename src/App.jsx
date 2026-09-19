import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Dashboard from './pages/Dashboard'
import WardMap from './pages/WardMap'
import FlagDetail from './pages/FlagDetail'
import About from './pages/About'
import { FlagsProvider } from './state/FlagsContext'

export default function App() {
  return (
    <FlagsProvider>
      <div className="min-h-screen bg-canvas">
        <Nav />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<WardMap />} />
          <Route path="/flags/:id" element={<FlagDetail />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </FlagsProvider>
  )
}
