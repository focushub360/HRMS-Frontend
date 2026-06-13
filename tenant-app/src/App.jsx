import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import TenantApp from './TenantApp';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import MobileBlock from './components/MobileBlock';
import isMobileDevice from './utils/isMobile';
import Login from './pages/auth/Login';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import EmployeeDashboard from './pages/dashboard/EmployeeDashboard';
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeForm from './pages/employees/EmployeeForm';
import Profile from './pages/employees/Profile';
import Attendance from './pages/attendance/Attendance';
import AttendanceReport from './pages/attendance/AttendanceReport';
import LeaveApplication from './pages/leaves/LeaveApplication';
import LeaveList from './pages/leaves/LeaveList';
import LeaveManagement from './pages/leaves/LeaveManagement';
import PayrollList from './pages/payroll/PayrollList';
import PayrollReport from './pages/payroll/PayrollReport';
import Settings from './pages/settings/Settings';
import ShiftManagement from './pages/settings/ShiftManagement';
import LocationManagement from './pages/settings/LocationManagement';
import EmployeeView from './pages/employees/EmployeeView';
import PermissionManagement from './pages/attendance/PermissionManagement';
import MyPermissions from './pages/attendance/MyPermissions';
import PermissionHistory from './pages/attendance/PermissionHistory';
import TeamManagement from './pages/team-management/TeamManagement';
// Company selector disabled: tenant must be provided via path /hrm/:tenantId
// import CompanySelector from './pages/auth/CompanySelector';
// Project Management Pages
import ProjectsListPage from './pages/projects/ProjectList';
import ProjectForm from './pages/projects/ProjectForm';
import ProjectDetails from './pages/projects/ProjectDetails';
import TaskBoard from './pages/projects/TaskBoard';
import TaskForm from './pages/projects/TaskForm';
import TaskProgress from './pages/projects/TaskProgress';
import MyDailyWork from './pages/projects/MyDailyWork';
import TeamLeaves from './pages/team-management/TeamLeaves';
import TeamPermissions from './pages/team-management/TeamPermissions';
// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // Enforce tenant URL usage: require `localStorage.tenant` to be set
  let tenantId = null;
  try {
    tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenant') : null;
  } catch (e) {
    tenantId = null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!tenantId) {
    // Inform user to use path-based tenant login
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h2 className="text-xl font-semibold mb-2">Tenant Required</h2>
        <p className="text-sm text-gray-600">Please open the application using a tenant URL like <code>/{'{tenantId}'}</code> or <code>/hrm/{'{tenantId}'}</code> to login.</p>
      </div>
    );
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Path-based tenant entrypoints: /hrm/:tenantId/* and /:tenantId/* - set tenant then redirect into app */}
      <Route path="/hrm/:tenantId/*" element={<TenantApp />} />
      <Route path="/:tenantId/*" element={<TenantApp />} />

      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
{/* 
            <Route 
        path="/select-company" 
        element={
          <PublicRoute>
            <CompanySelector />
          </PublicRoute>
        } 
      /> */}


      {/* Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {user?.role === 'admin' ? (
              <AdminDashboard />
            ) : user?.role === 'team-lead' ? (
              <EmployeeDashboard />
            ) : (
              <EmployeeDashboard />
            )}
          </ProtectedRoute>
        }
      />

      {/* Team Management Route */}

      <Route
        path="/team-management"
        element={
          <ProtectedRoute allowedRoles={['admin', 'team-lead']}>
            <TeamManagement />
          </ProtectedRoute>
        }
      >
        <Route path="leaves" element={<TeamLeaves />} />
        <Route path="permissions" element={<TeamPermissions />} />
      </Route>


      {/* Analytics route for admin */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={[ 'admin' ]}>
            <AnalyticsDashboard />
          </ProtectedRoute>
        }
      />
  

      {/* Employee Routes */}
      <Route
        path="/employees"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EmployeeList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/add"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EmployeeForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/edit/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EmployeeForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EmployeeView />
          </ProtectedRoute>
        }
      />

      {/* Profile Route */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Attendance Routes */}
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance/report"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AttendanceReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance/summary"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AttendanceReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance/my-permissions"
        element={
          <ProtectedRoute>
            <MyPermissions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/permissions/history"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PermissionHistory />
          </ProtectedRoute>
        }
      />

  {/* Project Management Routes */}
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/create"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ProjectForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/edit/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ProjectForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <ProtectedRoute>
            <ProjectDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/board"
        element={
          <ProtectedRoute>
            <TaskBoard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/create"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <TaskForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/edit/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <TaskForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/progress"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <TaskProgress />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/daily"
        element={
          <ProtectedRoute>
            <MyDailyWork />
          </ProtectedRoute>
        }
      />

      {/* Leave Routes */}
      <Route
        path="/leaves"
        element={
          <ProtectedRoute allowedRoles={['admin', 'employee', 'team-lead']}>
            {user?.role === 'admin' ? <LeaveManagement /> : <LeaveList />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaves/apply"
        element={
          <ProtectedRoute allowedRoles={['employee', 'team-lead']}>
            <LeaveApplication />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaves/pending"
        element={
          <ProtectedRoute allowedRoles={['admin' , 'team-lead']}>
            <LeaveManagement />
          </ProtectedRoute>
        }
      />

      {/* Payroll Routes */}
      <Route
        path="/payroll"
        element={
          <ProtectedRoute>
            {user?.role === 'admin' ? <PayrollReport /> : <PayrollList />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/generate"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PayrollReport />
          </ProtectedRoute>
        }
      />

      {/* Settings Route */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* Shift Management Route - Admin only */}
      <Route
        path="/settings/shifts"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ShiftManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/locations"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <LocationManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance/permissions"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PermissionManagement />
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
      <ThemeProvider>
        <AuthProvider>
          <InnerApp />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

// InnerApp applies the mobile-blocking logic after auth state is known.
const InnerApp = () => {
  const { isAuthenticated, loading, user } = useAuth();

  const isMobile = typeof window !== 'undefined' && isMobileDevice();

  // Allow mobile access to public/login flows while auth is loading or not authenticated.
  if (isMobile && (loading || !isAuthenticated)) {
    return <AppRoutes />;
  }

  // If on mobile and authenticated, enforce mobileAllowed (admins always allowed)
  if (isMobile && isAuthenticated) {
    const allowed = user?.role === 'admin' || user?.mobileAllowed === true;
    if (!allowed) {
      return <MobileBlock />;
    }
  }

  // Default: render app routes
  return <AppRoutes />;
};

export default App;
