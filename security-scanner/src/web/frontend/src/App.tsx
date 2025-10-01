import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Domains from './pages/Domains'
import Scans from './pages/Scans'
import Scheduler from './pages/Scheduler'
import ScanComparison from './pages/ScanComparison'
import TimeStatistics from './pages/TimeStatistics'
import Geolocation from './pages/Geolocation'
import Updates from './pages/Updates'
import Users from './pages/Users'
import Settings from './pages/Settings'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/domains" element={
          <ProtectedRoute>
            <Layout>
              <Domains />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/scans" element={
          <ProtectedRoute>
            <Layout>
              <Scans />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/scheduler" element={
          <ProtectedRoute>
            <Layout>
              <Scheduler />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/comparison" element={
          <ProtectedRoute>
            <Layout>
              <ScanComparison />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/time-stats" element={
          <ProtectedRoute>
            <Layout>
              <TimeStatistics />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/geolocation" element={
          <ProtectedRoute>
            <Layout>
              <Geolocation />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/updates" element={
          <ProtectedRoute>
            <Layout>
              <Updates />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute>
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
