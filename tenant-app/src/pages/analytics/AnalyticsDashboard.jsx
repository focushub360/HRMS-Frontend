import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// Chart Components (we'll create these next)
import AttendanceRateChart from '../../components/charts/AttendanceRateChart';
import ProjectPerformanceChart from '../../components/charts/ProjectPerformanceChart';
import DepartmentEmployeeChart from '../../components/charts/DepartmentEmployeeChart';

// Material-UI Icons
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BusinessIcon from '@mui/icons-material/Business';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import RefreshIcon from '@mui/icons-material/Refresh';

// Analytics Service
import api from '../../services/api';

// Analytics Service (use axios instance so tenant/auth headers are attached)
const analyticsService = {
  getDashboard: async () => {
    const resp = await api.get('/dashboard/analytics');
    return resp.data;
  }
};

const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Real-time refresh on permission updates
  useEffect(() => {
    const handlePermissionsUpdate = () => {
      if (!refreshing) {
        setRefreshing(true);
        loadAnalyticsData();
      }
    };

    window.addEventListener('permissions-updated', handlePermissionsUpdate);
    return () => {
      window.removeEventListener('permissions-updated', handlePermissionsUpdate);
    };
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setError('');
      const response = await analyticsService.getDashboard();
      
      if (response.success) {
        setAnalyticsData(response.data);
      } else {
        setError(response.message || 'Failed to load analytics data');
      }
    } catch (err) {
      console.error('Analytics load error:', err);
      setError('Failed to connect to analytics service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalyticsData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Analytics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} loading={refreshing}>
            <RefreshIcon className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const { quickStats, attendance, projects, departments } = analyticsData;

  // Ensure we have an array of projects to compute deadline-aware summaries.
  const projectsList = Array.isArray(projects) ? projects : (projects && projects.projectPerformance) || [];

  const toNumberSafe = (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v.replace(/[^0-9.-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const isProjectCompleted = (proj) => {
    const s = String(proj.status || proj.state || proj.stage || '').toLowerCase();
    if (!s) {
      const cr = toNumberSafe(proj.completionRate ?? proj.completion ?? 0);
      return cr >= 100;
    }
    return s.includes('complete') || s.includes('done');
  };

  const parseDueDate = (proj) => {
    const candidates = [proj.dueDate, proj.endDate, proj.deadline, proj.dueAt, proj.due_at];
    for (const c of candidates) {
      if (!c) continue;
      const d = new Date(c);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  };

  const computePerformanceSummary = (list = []) => {
    const out = { good: 0, warning: 0, critical: 0, completed: 0 };
    const now = Date.now();
    const WARNING_DAYS = 7;
    for (const p of list) {
      try {
        if (isProjectCompleted(p)) {
          out.completed += 1;
          continue;
        }
        const due = parseDueDate(p);
        if (!due) {
          out.good += 1;
          continue;
        }
        const diffMs = due.getTime() - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0) out.critical += 1; // past due
        else if (diffDays <= WARNING_DAYS) out.warning += 1; // near due
        else out.good += 1;
      } catch {
        out.good += 1;
      }
    }
    return out;
  };

  const quickSummaryComputed = computePerformanceSummary(projectsList);
  const quickStatsDisplay = {
    ...quickStats,
    onTrackProjects: quickSummaryComputed.good ?? quickStats.onTrackProjects,
    completedProjects: quickSummaryComputed.completed ?? 0,
    needsAttention: quickSummaryComputed.warning ?? 0,
    atRiskProjects: quickSummaryComputed.critical ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive insights into your organization's performance
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          loading={refreshing}
          className="whitespace-nowrap"
        >
          <RefreshIcon className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
          <div className="flex items-center">
            <div className="p-3 bg-blue-500 rounded-lg text-white">
              <PeopleIcon className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-300">Total Employees</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {quickStats.totalEmployees}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
          <div className="flex items-center">
            <div className="p-3 bg-green-500 rounded-lg text-white">
              <TrendingUpIcon className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600 dark:text-green-300">Avg Attendance</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {quickStats.avgAttendance}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
          <div className="flex items-center">
            <div className="p-3 bg-purple-500 rounded-lg text-white">
              <AssignmentIcon className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600 dark:text-purple-300">Total Projects</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {quickStats.totalProjects}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800">
          <div className="flex items-center">
            <div className="p-3 bg-orange-500 rounded-lg text-white">
              <BusinessIcon className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-orange-600 dark:text-orange-300">On Track Projects</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {quickStatsDisplay.onTrackProjects}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
          <div className="flex items-center">
            <div className="p-3 bg-blue-500 rounded-lg text-white">
              <AssignmentIcon className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-300">Completed Projects</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {quickStatsDisplay.completedProjects}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-500 rounded-lg text-white">
              <PendingActionsIcon className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-300">Pending Permissions</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {quickStats.pendingPermissions || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="flex flex-col gap-10">
        {/* Attendance Rate Chart */}
        <Card>
          <Card.Header>
            <Card.Title>Employee Attendance Rate</Card.Title>
            <p className="text-sm text-gray-500 mt-1">
              Monthly attendance trends and performance
            </p>
          </Card.Header>
          <Card.Content>
            <AttendanceRateChart data={attendance} />
          </Card.Content>
        </Card>

        {/* Department Employee Chart */}
        <Card>
          <Card.Header>
            <Card.Title>Department-wise Distribution</Card.Title>
            <p className="text-sm text-gray-500 mt-1">
              Employee count and performance by department
            </p>
          </Card.Header>
          <Card.Content>
            <DepartmentEmployeeChart data={departments} />
          </Card.Content>
        </Card>

        {/* Project Performance Chart - Full Width */}
        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title>Project Task Performance</Card.Title>
            <p className="text-sm text-gray-500 mt-1">
              Project completion rates and health status
            </p>
          </Card.Header>
          <Card.Content>
            <ProjectPerformanceChart data={projects} />
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;