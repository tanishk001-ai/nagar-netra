import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Dashboard from './pages/Dashboard'
import WardMap from './pages/WardMap'
import FlagDetail from './pages/FlagDetail'
import Description from './pages/Description'
import About from './pages/About'
import { FlagsProvider } from './state/FlagsContext'

export default function App() {
  return (
    <FlagsProvider>
      <div className="flex min-h-screen flex-col bg-canvas">
        <Nav />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/map" element={<WardMap />} />
            <Route path="/flags/:id" element={<FlagDetail />} />
            <Route path="/description" element={<Description />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </FlagsProvider>
  )
}
