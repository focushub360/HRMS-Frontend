import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import TenantList from './pages/tenants/TenantList';
import TenantForm from './pages/tenants/TenantForm';
import TenantView from './pages/tenants/TenantView';
import SubscriptionManagement from './pages/subscriptions/SubscriptionManagement';
import SystemAnalytics from './pages/analytics/SystemAnalytics';
import Settings from './pages/settings/Settings';
import Profile from './pages/profile/Profile';
import ManageLocations from './pages/locations/ManageLocations';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'super-admin') {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (isAuthenticated && user?.role === 'super-admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />

      {/* Protected Super Admin Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/tenants" 
        element={
          <ProtectedRoute>
            <TenantList />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/tenants/add" 
        element={
          <ProtectedRoute>
            <TenantForm />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/tenants/:id" 
        element={
          <ProtectedRoute>
            <TenantView />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/tenants/edit/:id" 
        element={
          <ProtectedRoute>
            <TenantForm />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/subscriptions" 
        element={
          <ProtectedRoute>
            <SubscriptionManagement />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/analytics" 
        element={
          <ProtectedRoute>
            <SystemAnalytics />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/locations" 
        element={
          <ProtectedRoute>
            <ManageLocations />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } 
      />


      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;