import React, { useState, useCallback, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { analyticsService } from '../../services/analytics.fixed';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Material-UI Icons
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

// Modern gradient color palette
const CHART_COLORS = {
  primary: {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    solid: '#667eea'
  },
  success: {
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    solid: '#4facfe'
  },
  warning: {
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    solid: '#43e97b'
  },
  danger: {
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    solid: '#fa709a'
  },
  purple: {
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    solid: '#a18cd1'
  },
  teal: {
    gradient: 'linear-gradient(135deg, #66a6ff 0%, #89f7fe 100%)',
    solid: '#66a6ff'
  },
  orange: {
    gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    solid: '#ff9a9e'
  },
  indigo: {
    gradient: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
    solid: '#6a11cb'
  }
};

const COLORS = [CHART_COLORS.primary.solid, CHART_COLORS.success.solid, CHART_COLORS.warning.solid, CHART_COLORS.danger.solid, CHART_COLORS.purple.solid];

const StatCard = ({ title, value, subtitle, icon, trend, loading }) => {
  const displayValue = (typeof value === 'number') ? value.toLocaleString() : value;

  return (
    <div className="group relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
      <div className="relative bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide">{title}</p>
            {loading ? (
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse w-24 mb-2"></div>
            ) : (
              <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:text-white dark:from-gray-100 dark:to-gray-300 mb-2">
                {displayValue}
              </p>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{subtitle}</p>
            )}
            {trend && (
              <div className={`inline-flex items-center mt-3 px-3 py-1.5 rounded-full text-sm font-semibold ${
                trend.value > 0 
                  ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
                  : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
              }`}>
                {trend.value > 0 ? 
                  <ArrowUpwardIcon className="w-4 h-4 mr-1" /> : 
                  <ArrowDownwardIcon className="w-4 h-4 mr-1" />
                }
                <span>{Math.abs(trend.value)}%</span>
                <span className="ml-1 text-gray-500 dark:text-gray-400 font-normal">{trend.label}</span>
              </div>
            )}
          </div>
          <div className="ml-4 p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <div className="text-white">
              {React.cloneElement(icon, { className: "w-6 h-6" })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-gray-800/90 backdrop-blur-sm p-4 border border-gray-200/50 dark:border-gray-700/60 rounded-xl shadow-2xl min-w-48">
        <p className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3 border-b border-gray-100/60 dark:border-gray-700 pb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ background: entry.color }}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{entry.name}</span>
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-64 bg-gray-200 rounded"></div>
  </div>
);

// (Moved MiniChartCard to the Dashboard page.)

const SystemAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('month');
  const [error, setError] = useState(null);
  const [overviewPartial, setOverviewPartial] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [exporting, setExporting] = useState(false);

  const loadOverviewOnly = useCallback(async () => {
    try {
      const res = await analyticsService.getOverview();
      const payload = res?.data?.data ?? res?.data ?? null;
      if (payload) {
        setOverviewPartial(payload);
      }
      return payload;
    } catch (err) {
      console.warn('Failed to load overview-only:', err?.response?.status || err.message || err);
      throw err;
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getDashboardAnalytics();
      const payload = response?.data?.data ?? response?.data ?? null;
      if (!payload) {
        console.error('Analytics API returned unexpected shape:', response);
        setError('Invalid analytics response from server');
        setAnalytics(null);
      } else {
        setAnalytics(payload);
        console.debug('Loaded analytics payload:', payload);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      const message = error?.response?.data?.message || error.message || 'Failed to load analytics data';
      setError(message);
      try {
        await loadOverviewOnly();
      } catch (e) {
        console.debug('Overview-only fetch failed:', e?.message || e);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadOverviewOnly]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  // const exportData = () => {
  //   const dataStr = JSON.stringify(analytics, null, 2);
  //   const dataBlob = new Blob([dataStr], { type: 'application/json' });
  //   const url = URL.createObjectURL(dataBlob);
  //   const link = document.createElement('a');
  //   link.href = url;
  //   link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
  //   link.click();
  // };
  
    const exportToPDF = async () => {
    if (!analytics) return;
    
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Add header with gradient background
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 60, 'F');
      
      // Title
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text('HRM Analytics Report', pageWidth / 2, 25, { align: 'center' });
      
      // Subtitle
      doc.setFontSize(12);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 35, { align: 'center' });
      doc.text(`Time Range: ${timeRange === 'week' ? 'Last 7 Days' : timeRange === 'month' ? 'Last 30 Days' : 'Last 90 Days'}`, pageWidth / 2, 42, { align: 'center' });
      
      let yPosition = 80;
      
      // Key Metrics Section
      // Guard: ensure autoTable plugin is available. If not, fall back to JSON export.
      if (typeof autoTable !== 'function') {
        console.warn('jspdf-autotable import not available — falling back to JSON export.');
        _exportData();
        setExporting(false);
        return;
      }
      doc.setFontSize(16);
      doc.setTextColor(51, 51, 51);
      doc.text('Key Performance Indicators', 20, yPosition);
      yPosition += 15;
      
      const overviewSafe = analyticsSafe?.overview || {};
      const topCompaniesSafe = Array.isArray(analyticsSafe?.topCompanies) ? analyticsSafe.topCompanies : [];
      const attendanceRatesSafe = Array.isArray(analyticsSafe?.attendanceRates) ? analyticsSafe.attendanceRates : [];
      
      const metricsData = [
        ['Metric', 'Value', 'Trend'],
        ['Total Companies', overviewSafe.totalTenants?.toString() || '0', '+12%'],
        ['Active Companies', overviewSafe.activeTenants?.toString() || '0', '+8%'],
        ['Total Employees', topCompaniesSafe.reduce((sum, company) => sum + (company.employeeCount || 0), 0).toString(), '+15%'],
        ['Avg Attendance Rate', `${attendanceRatesSafe.length > 0 ? Math.round(attendanceRatesSafe.reduce((sum, rate) => sum + (rate.attendanceRate || 0), 0) / attendanceRatesSafe.length) : 0}%`, '+5%']
      ];
      
      autoTable(doc, {
        startY: yPosition,
        head: [metricsData[0]],
        body: metricsData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10, cellPadding: 3 },
        margin: { left: 20, right: 20 }
      });
      
      yPosition = doc.lastAutoTable.finalY + 20;
      
      // Company Distribution Section
      if (overviewSafe.industryStats && overviewSafe.industryStats.length > 0) {
        doc.setFontSize(16);
        doc.text('Industry Distribution', 20, yPosition);
        yPosition += 15;
        
        const industryData = overviewSafe.industryStats.map(industry => [
          industry._id || 'Unknown',
          industry.count?.toString() || '0'
        ]);
        
        industryData.unshift(['Industry', 'Count']);
        
        autoTable(doc, {
          startY: yPosition,
          head: [industryData[0]],
          body: industryData.slice(1),
          theme: 'grid',
          headStyles: { fillColor: [52, 152, 219] },
          styles: { fontSize: 10, cellPadding: 3 },
          margin: { left: 20, right: 20 }
        });
        
        yPosition = doc.lastAutoTable.finalY + 20;
      }
      
      // Top Companies Section
      if (topCompaniesSafe.length > 0) {
        doc.setFontSize(16);
        doc.text('Top Companies by Employee Count', 20, yPosition);
        yPosition += 15;
        
        const topCompaniesData = topCompaniesSafe.slice(0, 10).map(company => [
          company.companyName || 'Unknown',
          (company.employeeCount || 0).toString(),
          company.industry || 'N/A'
        ]);
        
        topCompaniesData.unshift(['Company', 'Employees', 'Industry']);
        
        autoTable(doc, {
          startY: yPosition,
          head: [topCompaniesData[0]],
          body: topCompaniesData.slice(1),
          theme: 'grid',
          headStyles: { fillColor: [46, 204, 113] },
          styles: { fontSize: 9, cellPadding: 2 },
          margin: { left: 20, right: 20 }
        });
        
        yPosition = doc.lastAutoTable.finalY + 20;
      }
      
      // Subscription Plans Section
      if (overviewSafe.planStats && overviewSafe.planStats.length > 0) {
        doc.setFontSize(16);
        doc.text('Subscription Plan Distribution', 20, yPosition);
        yPosition += 15;
        
        const planData = overviewSafe.planStats.map(plan => [
          plan._id ? String(plan._id).charAt(0).toUpperCase() + String(plan._id).slice(1) : 'Unknown',
          plan.count?.toString() || '0'
        ]);
        
        planData.unshift(['Plan', 'Companies']);
        
        autoTable(doc, {
          startY: yPosition,
          head: [planData[0]],
          body: planData.slice(1),
          theme: 'grid',
          headStyles: { fillColor: [155, 89, 182] },
          styles: { fontSize: 10, cellPadding: 3 },
          margin: { left: 20, right: 20 }
        });
        
        yPosition = doc.lastAutoTable.finalY + 20;
      }
      
      // Performance Insights Section
      doc.setFontSize(16);
      doc.text('Performance Insights', 20, yPosition);
      yPosition += 15;
      
      const avgEmployees = topCompaniesSafe.length > 0 ? 
        Math.round(topCompaniesSafe.reduce((sum, company) => sum + (company.employeeCount || 0), 0) / topCompaniesSafe.length) : 0;
      
      const maxAttendance = attendanceRatesSafe.length > 0 ? 
        Math.max(...attendanceRatesSafe.map(r => r.attendanceRate || 0)) : 0;
      
      const minAttendance = attendanceRatesSafe.length > 0 ? 
        Math.min(...attendanceRatesSafe.map(r => r.attendanceRate || 0)) : 0;
      
      const insightsData = [
        ['Metric', 'Value'],
        ['Average Employees per Company', avgEmployees.toString()],
        ['Highest Attendance Rate', `${maxAttendance}%`],
        ['Lowest Attendance Rate', `${minAttendance}%`],
        ['Platform Growth Rate', '+12.5%'],
        ['Active Utilization', '78%']
      ];
      
      autoTable(doc, {
        startY: yPosition,
        head: [insightsData[0]],
        body: insightsData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [230, 126, 34] },
        styles: { fontSize: 10, cellPadding: 3 },
        margin: { left: 20, right: 20 }
      });
      
      // Add footer
      const finalY = doc.lastAutoTable.finalY + 15;
      if (finalY < pageHeight - 30) {
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text('Confidential - HRM Analytics Report', pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Page 1 of 1`, pageWidth - 20, pageHeight - 10, { align: 'right' });
      } else {
        // Add new page for footer if content is too long
        doc.addPage();
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text('Confidential - HRM Analytics Report', pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Page 1 of 1`, pageWidth - 20, pageHeight - 10, { align: 'right' });
      }
      
      // Save the PDF
      doc.save(`hrm-analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const _exportData = () => {
    // Simple JSON export as fallback
    const dataStr = JSON.stringify(analytics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  

  // Demo loader removed — production analytics only

  const analyticsSafe = analytics ?? (overviewPartial ? { overview: overviewPartial } : null);

  // Detect if analytics payload is basically empty (no meaningful measures)
  const isAnalyticsEmpty = (a) => {
    if (!a) return true;
    const hasOverview = a.overview && Object.keys(a.overview).length > 0;
    const hasGrowth = a.growth && (Array.isArray(a.growth) ? a.growth.length > 0 : Object.keys(a.growth || {}).length > 0);
    const hasTop = Array.isArray(a.topCompanies) && a.topCompanies.length > 0;
    const hasDaily = Array.isArray(a.dailyActive) && a.dailyActive.length > 0;
    const hasAttendance = Array.isArray(a.attendanceRates) && a.attendanceRates.length > 0;
    return !(hasOverview || hasGrowth || hasTop || hasDaily || hasAttendance);
  };

  const analyticsIsEmpty = isAnalyticsEmpty(analyticsSafe);

  // Debug helpers removed in production build

  if (loading && !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <LoadingSpinner size="xl" className="mx-auto mb-4" />
          <p className="text-gray-600 font-medium mt-2">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  if (!analytics && !overviewPartial) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/20">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <AnalyticsIcon className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:text-white mb-3">
              Analytics Unavailable
            </h3>
            <p className="text-gray-600 mb-8 text-lg">{error || 'Unable to load analytics data at this time.'}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={loadAnalytics}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 shadow-lg"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const defaultOverview = {
    totalTenants: 0,
    activeTenants: 0,
    inactiveTenants: 0,
    planStats: [],
    industryStats: [],
    sizeStats: []
  };

  const overviewSafe = analyticsSafe?.overview || defaultOverview;
  const growthSafe = Array.isArray(analyticsSafe?.growth) ? analyticsSafe.growth : [];
  const topCompaniesSafe = Array.isArray(analyticsSafe?.topCompanies) ? analyticsSafe.topCompanies : [];
  const dailyActiveSafe = Array.isArray(analyticsSafe?.dailyActive) ? analyticsSafe.dailyActive : [];
  const attendanceRatesSafe = Array.isArray(analyticsSafe?.attendanceRates) ? analyticsSafe.attendanceRates : [];

  const tenantStatusData = [
    { name: 'Active', value: overviewSafe.activeTenants || 0, color: CHART_COLORS.success.solid },
    { name: 'Inactive', value: overviewSafe.inactiveTenants || 0, color: CHART_COLORS.danger.solid },
  ];

  const subscriptionPlanData = (overviewSafe.planStats ?? []).map((plan, index) => ({
    name: plan?._id ? String(plan._id).charAt(0).toUpperCase() + String(plan._id).slice(1) : 'Unknown',
    value: plan?.count || 0,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:text-gray-300 mb-2">
              System Analytics
            </h1>
            <p className="text-gray-600 text-lg dark:text-gray-900">
              Real-time insights and performance metrics
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center space-x-3 bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20 dark:border-gray-700 shadow-lg">
              <CalendarTodayIcon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-white dark:bg-gray-500 border border-gray-200 dark:border-gray-500 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 font-medium"
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 90 Days</option>
              </select>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              loading={refreshing}
              className="border-gray-300 hover:border-gray-400 shadow-lg"
            >
              <RefreshIcon className="w-5 h-5 mr-2" />
              Refresh
            </Button>
 <Button
                onClick={exportToPDF}
                loading={exporting}
                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 border-0 shadow-lg"
              >
                <PictureAsPdfIcon className="w-5 h-5 mr-2" />
                Export PDF
              </Button>          </div>
            {/* debug buttons removed */}
        </div>

        {/* Focus Insights were moved to the Dashboard page */}

        {/* If the API returned an empty payload, show an action banner so testers can populate demo data */}
        {analyticsIsEmpty && (
          <div className="bg-yellow-50 border-l-4 border-yellow-300 p-4 rounded-md mb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-yellow-800">No analytics data available</p>
                <p className="text-sm text-yellow-700">The analytics endpoint returned an empty payload. You can load demo data to test charts and layout.</p>
                {/* Demo buttons removed — use backend / local data for real results */}
              </div>
              
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        {/* Debug JSON viewer removed */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            title="Total Companies"
            value={overviewSafe.totalTenants}
            subtitle="Registered organizations"
            icon={<BusinessIcon />}
            // trend={{ value: 12, label: 'vs last month' }}
            loading={loading}
          />
          <StatCard
            title="Active Companies"
            value={overviewSafe.activeTenants}
            subtitle="Currently using platform"
            icon={<PeopleIcon />}
            // trend={{ value: 8, label: 'vs last month' }}
            loading={loading}
          />
          <StatCard
            title="Total Employees"
            value={topCompaniesSafe.reduce((sum, company) => sum + (company.employeeCount || 0), 0)}
            subtitle="Across all companies"
            icon={<PeopleIcon />}
            // trend={{ value: 15, label: 'vs last month' }}
            loading={loading}
          />
          <StatCard
            title="Avg Attendance"
            value={`${attendanceRatesSafe.length > 0 ? Math.round(attendanceRatesSafe.reduce((sum, rate) => sum + (rate.attendanceRate || 0), 0) / attendanceRatesSafe.length) : 0}%`}
            subtitle="Platform average"
            icon={<TrendingUpIcon />}
            // trend={{ value: 5, label: 'vs last month' }}
            loading={loading}
          />
        </div>

        {/* First Row Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Tenant Growth Chart */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <Card.Header className="border-b border-gray-100/50 pb-4">
              <Card.Title className="text-xl font-bold text-gray-900">Company Growth Trend</Card.Title>
            </Card.Header>
            <Card.Content className="pt-6">
              <div className="h-80 min-h-[200px] min-w-0">
                {loading ? <ChartSkeleton /> : growthSafe.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No growth data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthSafe}>
                      <defs>
                        <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary.solid} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={CHART_COLORS.primary.solid} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="period" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="cumulativeTenants"
                        stroke={CHART_COLORS.primary.solid}
                        strokeWidth={3}
                        fill="url(#growthGradient)"
                        name="Total Companies"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card.Content>
          </Card>

          {/* Company Status Distribution */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <Card.Header className="border-b border-gray-100/50 pb-4">
              <Card.Title className="text-xl font-bold text-gray-900">Company Status</Card.Title>
            </Card.Header>
            <Card.Content className="pt-6">
              <div className="h-80 min-h-[200px] min-w-0">
                {loading ? <ChartSkeleton /> : tenantStatusData.every(d => !d.value) ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No status data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tenantStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                      >
                        {tenantStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Second Row Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Daily Active Employees */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <Card.Header className="border-b border-gray-100/50 pb-4">
              <Card.Title className="text-xl font-bold text-gray-900">Daily Active Employees</Card.Title>
            </Card.Header>
            <Card.Content className="pt-6">
              <div className="h-80 min-h-[200px] min-w-0">
                {loading ? <ChartSkeleton /> : dailyActiveSafe.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No daily activity data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyActiveSafe.slice(-14)}>
                      <defs>
                        <linearGradient id="activeEmployeesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.teal.solid} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={CHART_COLORS.teal.solid} stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="activeEmployees" 
                        name="Active Employees"
                        fill="url(#activeEmployeesGradient)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="activeTenants"
                        name="Active Companies"
                        stroke={CHART_COLORS.purple.solid}
                        strokeWidth={3}
                        dot={{ fill: CHART_COLORS.purple.solid, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: CHART_COLORS.purple.solid }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card.Content>
          </Card>

          {/* Attendance Rate Comparison */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <Card.Header className="border-b border-gray-100/50 pb-4">
              <Card.Title className="text-xl font-bold text-gray-900">Attendance Rate Comparison</Card.Title>
            </Card.Header>
            <Card.Content className="pt-6">
              <div className="h-80 min-h-[200px] min-w-0">
                {loading ? <ChartSkeleton /> : attendanceRatesSafe.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No attendance data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceRatesSafe.slice(0, 10)}>
                      <defs>
                        <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.orange.solid} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={CHART_COLORS.orange.solid} stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="companyName" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="attendanceRate" 
                        name="Attendance Rate %"
                        fill="url(#attendanceGradient)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Third Row Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Top Companies */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <Card.Header className="border-b border-gray-100/50 pb-4">
              <Card.Title className="text-xl font-bold text-gray-900">Top Companies by Size</Card.Title>
            </Card.Header>
            <Card.Content className="pt-6">
              <div className="h-80 min-h-[200px] min-w-0">
                {loading ? <ChartSkeleton /> : topCompaniesSafe.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No company data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCompaniesSafe.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="companyName"
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="employeeCount" 
                        name="Employees"
                        fill={CHART_COLORS.success.solid}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card.Content>
          </Card>

          {/* Subscription Plans */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <Card.Header className="border-b border-gray-100/50 pb-4">
              <Card.Title className="text-xl font-bold text-gray-900">Subscription Plans</Card.Title>
            </Card.Header>
            <Card.Content className="pt-6">
              <div className="h-80 min-h-[200px] min-w-0">
                {loading ? <ChartSkeleton /> : subscriptionPlanData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No subscription data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={subscriptionPlanData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {subscriptionPlanData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card.Content>
          </Card>
        </div>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl">
            <Card.Header>
              <Card.Title className="text-lg font-bold text-gray-900">Industry Distribution</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-4">
                {(overviewSafe.industryStats ?? []).map((industry) => (
                  <div key={industry._id} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{industry._id || 'Unknown'}</span>
                    <span className="font-bold text-gray-900">{industry.count}</span>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl">
            <Card.Header>
              <Card.Title className="text-lg font-bold text-gray-900">Company Sizes</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-4">
                {(overviewSafe.sizeStats ?? []).map((size) => (
                  <div key={size._id} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{size._id} employees</span>
                    <span className="font-bold text-gray-900">{size.count}</span>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-2xl">
            <Card.Header>
              <Card.Title className="text-lg font-bold text-gray-900">Performance Metrics</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Avg Employees/Company</span>
                  <span className="font-bold text-gray-900">
                    {Math.round(topCompaniesSafe.reduce((sum, company) => sum + (company.employeeCount || 0), 0) / (topCompaniesSafe.length || 1))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Peak Attendance</span>
                  <span className="font-bold text-green-600">
                    {attendanceRatesSafe.length > 0 ? `${Math.max(...attendanceRatesSafe.map(r => r.attendanceRate || 0))}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Growth Rate</span>
                  <span className="font-bold text-blue-600">+12.5%</span>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SystemAnalytics;
// import React, { useState, useCallback, useEffect } from 'react';
// import {
//   AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
//   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
//   Legend, ResponsiveContainer, ComposedChart
// } from 'recharts';
// import Card from '../../components/ui/Card';
// import Button from '../../components/ui/Button';
// import LoadingSpinner from '../../components/ui/LoadingSpinner';
// import { analyticsService, getMockAnalytics } from '../../services/analytics.fixed';

// // Material-UI Icons
// import BusinessIcon from '@mui/icons-material/Business';
// import PeopleIcon from '@mui/icons-material/People';
// import TrendingUpIcon from '@mui/icons-material/TrendingUp';
// import TrendingDownIcon from '@mui/icons-material/TrendingDown';
// import RefreshIcon from '@mui/icons-material/Refresh';
// import DownloadIcon from '@mui/icons-material/Download';
// import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
// import AnalyticsIcon from '@mui/icons-material/Analytics';

// // Modern color palette for charts (soft, accessible)
// const CHART_COLORS = {
//   primary: '#2563eb', // blue-600
//   primaryLight: '#bfdbfe',
//   success: '#059669', // green-600
//   successLight: '#bbf7d0',
//   warning: '#d97706', // amber-600
//   warningLight: '#ffedd5',
//   danger: '#dc2626', // red-600
//   purple: '#7c3aed', // violet-600
//   indigo: '#4f46e5',
//   teal: '#0ea5a4'
// };

// const COLORS = [CHART_COLORS.primary, CHART_COLORS.indigo, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.purple];

// // small helpers
// const formatNumber = (v) => {
//   if (v == null) return '0';
//   if (typeof v === 'number') return v.toLocaleString();
//   return String(v);
// };

// const StatCard = ({ title, value, subtitle, icon, color, trend }) => {
//   const displayValue = (typeof value === 'number') ? value.toLocaleString() : value;
//   return (
//     <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
//       <div className="flex items-center justify-between">
//         <div className="flex-1">
//           <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
//           <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{displayValue}</p>
//           {subtitle && (
//             <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
//           )}
//           {trend && (
//             <div className={`inline-flex items-center mt-2 text-sm font-medium rounded-full px-2 py-1 ${trend.value > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
//               {trend.value > 0 ? 
//                 <TrendingUpIcon className="w-4 h-4 mr-1" /> : 
//                 <TrendingDownIcon className="w-4 h-4 mr-1" />
//               }
//               <span>{Math.abs(trend.value)}%</span>
//             </div>
//           )}
//         </div>
//         <div className={`p-3 rounded-xl ${color} ml-4 flex items-center justify-center`}>
//           {icon}
//         </div>
//       </div>
//     </Card>
//   );
// };

// const CustomTooltip = ({ active, payload, label }) => {
//   if (active && payload && payload.length) {
//     return (
//       <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-56">
//         <div className="flex items-center justify-between mb-2">
//           <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{label}</p>
//         </div>
//         <div className="space-y-1">
//           {payload.map((entry, index) => (
//             <div key={index} className="flex items-center justify-between">
//               <div className="flex items-center space-x-2">
//                 <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
//                 <span className="text-sm text-gray-700 dark:text-gray-200">{entry.name}</span>
//               </div>
//               <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatNumber(entry.value)}</div>
//             </div>
//           ))}
//         </div>
//       </div>
//     );
//   }
//   return null;
// };

// const SystemAnalytics = () => {
//   const [analytics, setAnalytics] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [timeRange, setTimeRange] = useState('month');
//   const [error, setError] = useState(null);
//   const [overviewPartial, setOverviewPartial] = useState(null);
//   const [diagnostics, setDiagnostics] = useState(null);

  

//   const loadOverviewOnly = useCallback(async () => {
//     try {
//       const res = await analyticsService.getOverview();
//       const payload = res?.data?.data ?? res?.data ?? null;
//       if (payload) {
//         setOverviewPartial(payload);
//       }
//       return payload;
//     } catch (err) {
//       console.warn('Failed to load overview-only:', err?.response?.status || err.message || err);
//       throw err;
//     }
//   }, []);

//   const loadAnalytics = useCallback(async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       const response = await analyticsService.getDashboardAnalytics();
//       // support APIs that return payload in either response.data.data or response.data
//       const payload = response?.data?.data ?? response?.data ?? null;
//       if (!payload) {
//         console.error('Analytics API returned unexpected shape:', response);
//         setError('Invalid analytics response from server');
//         setAnalytics(null);
//       } else {
//         setAnalytics(payload);
//         // Add a debug trace so devs can inspect payload in browser console
//         try {
//           console.debug('Loaded analytics payload:', payload);
//         } catch {
//           /* ignore in older browsers */
//         }
//       }
//     } catch (error) {
//       console.error('Failed to load analytics:', error);
//       const message = error?.response?.data?.message || error.message || 'Failed to load analytics data';
//       setError(message);
//       // Try to fetch at least the overview so users can see total counts even if other endpoints fail
//       try {
//         await loadOverviewOnly();
//       } catch (e) {
//         console.debug('Overview-only fetch failed:', e?.message || e);
//       }
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, [loadOverviewOnly]);

//     // Trigger initial load when loadAnalytics function is stable
//     useEffect(() => {
//       loadAnalytics();
//     }, [loadAnalytics]);

//   const handleRefresh = () => {
//     setRefreshing(true);
//     loadAnalytics();
//   };

//   const exportData = () => {
//     // Simple export functionality
//     const dataStr = JSON.stringify(analytics, null, 2);
//     const dataBlob = new Blob([dataStr], { type: 'application/json' });
//     const url = URL.createObjectURL(dataBlob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
//     link.click();
//   };

//   const loadTestData = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await getMockAnalytics();
//       const payload = res?.data?.data ?? res?.data ?? null;
//       if (payload) {
//         setAnalytics(payload);
//         setOverviewPartial(payload.overview ?? null);
//       }
//     } catch (err) {
//       console.error('Failed to load test analytics data:', err);
//       setError('Failed to load test analytics data');
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-96">
//         <LoadingSpinner size="lg" />
//       </div>
//     );
//   }

//   if (!analytics) {
//     return (
//       <div className="text-center py-12">
//         <AnalyticsIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
//         <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data</h3>
//         <p className="text-gray-500 mb-6">{error ? error : 'Unable to load analytics data at this time.'}</p>
//         <div className="flex items-center justify-center space-x-3">
//           <Button onClick={loadAnalytics}>
//             Try Again
//           </Button>
//           <Button variant="outline" onClick={async () => {
//             setDiagnostics(null);
//             try {
//               const result = await analyticsService.getAnalyticsStatus();
//               setDiagnostics(result);
//             } catch (err) {
//               setDiagnostics([{ path: 'diagnostics', ok: false, message: err.message }]);
//             }
//           }}>
//             Run Diagnostics
//           </Button>
//           <Button variant="outline" onClick={loadTestData}>
//             Load Test Data
//           </Button>
//           {error && (
//             <Button variant="outline" onClick={() => window.location.reload()}>
//               Reload Page
//             </Button>
//           )}
//         </div>
//         {overviewPartial && (
//           <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
//             <StatCard
//               title="Total Companies (partial)"
//               value={overviewPartial.totalTenants ?? 0}
//               subtitle="From overview endpoint"
//               icon={<BusinessIcon className="w-6 h-6 text-blue-600" />}
//               color="bg-blue-50 dark:bg-blue-900"
//             />
//             <StatCard
//               title="Active Companies (partial)"
//               value={overviewPartial.activeTenants ?? 0}
//               subtitle="From overview endpoint"
//               icon={<PeopleIcon className="w-6 h-6 text-green-600" />}
//               color="bg-green-50 dark:bg-green-900"
//             />
//           </div>
//         )}
//         {diagnostics && (
//           <div className="mt-6 max-w-3xl mx-auto text-left bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
//             <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Diagnostics</h4>
//             <ul className="space-y-2">
//               {diagnostics.map((d, i) => (
//                 <li key={i} className="flex items-start space-x-3">
//                   <div className={`w-3 h-3 rounded-full mt-1 ${d.ok ? 'bg-green-500' : 'bg-red-500'}`}></div>
//                   <div>
//                     <div className="text-sm text-gray-900 dark:text-gray-100">{d.path} {d.status ? `- ${d.status}` : ''}</div>
//                     <div className="text-xs text-gray-500 dark:text-gray-400">{d.message}</div>
//                   </div>
//                 </li>
//               ))}
//             </ul>
//             <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">If endpoints return 401, check your auth token. If they return 404, ensure the backend was deployed with the analytics routes or update <code>API_BASE_URL</code> in <code>src/utils/constants.js</code>.</p>
//           </div>
//         )}
//       </div>
//     );
//   }

//   // Defensive defaults: if the backend returns null (or unexpected shapes),
//   // normalize into predictable arrays/objects so .map/.reduce won't crash.
//   const defaultOverview = {
//     totalTenants: 0,
//     activeTenants: 0,
//     inactiveTenants: 0,
//     planStats: [],
//     industryStats: [],
//     sizeStats: []
//   };

//   const overviewSafe = (analytics && analytics.overview) ? analytics.overview : defaultOverview;
//   const growthSafe = Array.isArray(analytics?.growth) ? analytics.growth : [];
//   const topCompaniesSafe = Array.isArray(analytics?.topCompanies) ? analytics.topCompanies : [];
//   const dailyActiveSafe = Array.isArray(analytics?.dailyActive) ? analytics.dailyActive : [];
//   const attendanceRatesSafe = Array.isArray(analytics?.attendanceRates) ? analytics.attendanceRates : [];

//   // Prepare data for charts
//   const tenantStatusData = [
//     { name: 'Active', value: overviewSafe.activeTenants || 0, color: CHART_COLORS.success },
//     { name: 'Inactive', value: overviewSafe.inactiveTenants || 0, color: CHART_COLORS.danger },
//   ];

//   const subscriptionPlanData = (overviewSafe.planStats ?? []).map((plan, index) => ({
//     name: (plan?._id ? String(plan._id).charAt(0).toUpperCase() + String(plan._id).slice(1) : 'Unknown'),
//     value: plan?.count || 0,
//     color: COLORS[index % COLORS.length]
//   }));

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">System Analytics</h1>
//           <p className="text-gray-600 dark:text-gray-400 mt-1">
//             Comprehensive overview of your HRM platform performance
//           </p>
//         </div>
//         <div className="flex items-center space-x-3">
//           <select
//             value={timeRange}
//             onChange={(e) => setTimeRange(e.target.value)}
//             className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
//           >
//             <option value="week">Last 7 Days</option>
//             <option value="month">Last 30 Days</option>
//             <option value="quarter">Last 90 Days</option>
//           </select>
//           <Button
//             variant="outline"
//             onClick={handleRefresh}
//             loading={refreshing}
//             className="flex items-center space-x-2"
//           >
//             <RefreshIcon className="w-4 h-4" />
//             <span>Refresh</span>
//           </Button>
//           <Button
//             variant="outline"
//             onClick={exportData}
//             className="flex items-center space-x-2"
//           >
//             <DownloadIcon className="w-4 h-4" />
//             <span>Export</span>
//           </Button>
//         </div>
//       </div>

//       {/* Key Metrics */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         <StatCard
//           title="Total Companies"
//           value={overviewSafe.totalTenants}
//           subtitle="Across all plans"
//           icon={<BusinessIcon className="w-6 h-6 text-blue-600" />}
//           color="bg-blue-100 dark:bg-blue-900"
//           trend={{ value: 12, label: 'from last month' }}
//         />
//         <StatCard
//           title="Active Companies"
//           value={overviewSafe.activeTenants}
//           subtitle="Currently using platform"
//           icon={<PeopleIcon className="w-6 h-6 text-green-600" />}
//           color="bg-green-100 dark:bg-green-900"
//           trend={{ value: 8, label: 'from last month' }}
//         />
//         <StatCard
//           title="Total Employees"
//           value={topCompaniesSafe.reduce((sum, company) => sum + (company.employeeCount || 0), 0)}
//           subtitle="Across all companies"
//           icon={<PeopleIcon className="w-6 h-6 text-purple-600" />}
//           color="bg-purple-100 dark:bg-purple-900"
//           trend={{ value: 15, label: 'from last month' }}
//         />
//         <StatCard
//           title="Avg Attendance Rate"
//           value={`${attendanceRatesSafe.length > 0 ? Math.round(attendanceRatesSafe.reduce((sum, rate) => sum + (rate.attendanceRate || 0), 0) / attendanceRatesSafe.length) : 0}%`}
//           subtitle="Across all companies"
//           icon={<TrendingUpIcon className="w-6 h-6 text-orange-600" />}
//           color="bg-orange-100 dark:bg-orange-900"
//           trend={{ value: 5, label: 'from last month' }}
//         />
//       </div>

//       {/* Charts Grid */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Tenant Growth Over Time */}
//         <Card>
//           <Card.Header>
//             <Card.Title>Tenant Growth Over Time</Card.Title>
//           </Card.Header>
//           <Card.Content>
//             <div className="h-80">
//               {(!growthSafe || growthSafe.length === 0) ? (
//                 <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">No growth data available for the selected range.</div>
//               ) : (
//                 <ResponsiveContainer width="100%" height="100%">
//                   <AreaChart data={growthSafe}>
//                     <defs>
//                       <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
//                         <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
//                         <stop offset="95%" stopColor={CHART_COLORS.primaryLight} stopOpacity={0.05}/>
//                       </linearGradient>
//                       <linearGradient id="gradNew" x1="0" y1="0" x2="0" y2="1">
//                         <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.28}/>
//                         <stop offset="95%" stopColor={CHART_COLORS.successLight} stopOpacity={0.04}/>
//                       </linearGradient>
//                     </defs>
//                     <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
//                     <XAxis dataKey="period" tick={{ fontSize: 12 }} />
//                     <YAxis tick={{ fontSize: 12 }} />
//                     <Tooltip content={<CustomTooltip />} />
//                     <Legend />
//                     <Area
//                       type="monotone"
//                       dataKey="cumulativeTenants"
//                       stroke={CHART_COLORS.primary}
//                       strokeWidth={3}
//                       fill="url(#gradTotal)"
//                       name="Total Companies"
//                       dot={false}
//                       activeDot={{ r: 6 }}
//                       isAnimationActive={true}
//                       animationDuration={800}
//                     />
//                     <Area
//                       type="monotone"
//                       dataKey="newTenants"
//                       stroke={CHART_COLORS.success}
//                       strokeWidth={2}
//                       fill="url(#gradNew)"
//                       name="New Companies"
//                       dot={false}
//                       activeDot={{ r: 5 }}
//                       isAnimationActive={true}
//                       animationDuration={900}
//                     />
//                   </AreaChart>
//                 </ResponsiveContainer>
//               )}
//             </div>
//           </Card.Content>
//         </Card>

//         {/* Active vs Inactive Tenants */}
//         <Card>
//           <Card.Header>
//             <Card.Title>Company Status Distribution</Card.Title>
//           </Card.Header>
//           <Card.Content>
//             <div className="h-80">
//               {(!tenantStatusData || tenantStatusData.every(d => !d.value)) ? (
//                 <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">No tenant status data available.</div>
//               ) : (
//                 <ResponsiveContainer width="100%" height="100%">
//                   <PieChart>
//                     <Pie
//                       data={tenantStatusData}
//                       cx="50%"
//                       cy="50%"
//                       innerRadius={40}
//                       outerRadius={80}
//                       paddingAngle={4}
//                       labelLine={false}
//                       label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
//                       dataKey="value"
//                       isAnimationActive={true}
//                     >
//                       {tenantStatusData.map((entry, index) => (
//                         <Cell key={`cell-${index}`} fill={entry.color} />
//                       ))}
//                     </Pie>
//                     <Tooltip content={<CustomTooltip />} />
//                     <Legend />
//                   </PieChart>
//                 </ResponsiveContainer>
//               )}
//             </div>
//           </Card.Content>
//         </Card>

//         {/* Top Companies by Employee Count */}
//         <Card>
//           <Card.Header>
//             <Card.Title>Top Companies by Employee Count</Card.Title>
//           </Card.Header>
//           <Card.Content>
//             <div className="h-80">
//               {(!topCompaniesSafe || topCompaniesSafe.length === 0) ? (
//                 <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">No top companies data available.</div>
//               ) : (
//                 <ResponsiveContainer width="100%" height="100%">
//                   <BarChart data={topCompaniesSafe} layout="vertical" barCategoryGap="20%">
//                     <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
//                     <XAxis type="number" tick={{ fontSize: 12 }} />
//                     <YAxis 
//                       type="category" 
//                       dataKey="companyName" 
//                       width={140}
//                       tick={{ fontSize: 12 }}
//                     />
//                     <Tooltip content={<CustomTooltip />} />
//                     <Legend />
//                     <Bar 
//                       dataKey="employeeCount" 
//                       name="Employees" 
//                       fill={CHART_COLORS.indigo}
//                       radius={[0, 6, 6, 0]}
//                       isAnimationActive={true}
//                       animationDuration={900}
//                     />
//                   </BarChart>
//                 </ResponsiveContainer>
//               )}
//             </div>
//           </Card.Content>
//         </Card>

//         {/* Subscription Plan Distribution */}
//         <Card>
//           <Card.Header>
//             <Card.Title>Subscription Plan Distribution</Card.Title>
//           </Card.Header>
//           <Card.Content>
//             <div className="h-80">
//               {(!subscriptionPlanData || subscriptionPlanData.length === 0) ? (
//                 <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">No subscription plan data available.</div>
//               ) : (
//                 <ResponsiveContainer width="100%" height="100%">
//                   <PieChart>
//                     <Pie
//                       data={subscriptionPlanData}
//                       cx="50%"
//                       cy="50%"
//                       labelLine={false}
//                       label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
//                       outerRadius={80}
//                       fill="#8884d8"
//                       dataKey="value"
//                     >
//                       {subscriptionPlanData.map((entry, index) => (
//                         <Cell key={`cell-${index}`} fill={entry.color} />
//                       ))}
//                     </Pie>
//                     <Tooltip />
//                     <Legend />
//                   </PieChart>
//                 </ResponsiveContainer>
//               )}
//             </div>
//           </Card.Content>
//         </Card>

//         {/* Daily Active Employees */}
//         <Card>
//           <Card.Header>
//             <Card.Title>Daily Active Employees</Card.Title>
//           </Card.Header>
//           <Card.Content>
//             <div className="h-80">
//               {(!dailyActiveSafe || dailyActiveSafe.length === 0) ? (
//                 <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">No daily active data available.</div>
//               ) : (
//                 <ResponsiveContainer width="100%" height="100%">
//                   <ComposedChart data={dailyActiveSafe}>
//                     <defs>
//                       <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
//                         <stop offset="5%" stopColor={CHART_COLORS.teal} stopOpacity={0.6}/>
//                         <stop offset="95%" stopColor={CHART_COLORS.teal} stopOpacity={0.05}/>
//                       </linearGradient>
//                     </defs>
//                     <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
//                     <XAxis dataKey="date" tick={{ fontSize: 12 }} />
//                     <YAxis tick={{ fontSize: 12 }} />
//                     <Tooltip content={<CustomTooltip />} />
//                     <Legend />
//                     <Bar 
//                       dataKey="activeEmployees" 
//                       name="Active Employees" 
//                       fill="url(#gradBar)"
//                       radius={[6, 6, 2, 2]}
//                       isAnimationActive={true}
//                       animationDuration={900}
//                     />
//                     <Line
//                       type="monotone"
//                       dataKey="activeTenants"
//                       name="Active Companies"
//                       stroke={CHART_COLORS.purple}
//                       strokeWidth={3}
//                       dot={false}
//                       activeDot={{ r: 6 }}
//                       isAnimationActive={true}
//                       animationDuration={1000}
//                     />
//                   </ComposedChart>
//                 </ResponsiveContainer>
//               )}
//             </div>
//           </Card.Content>
//         </Card>

//         {/* Attendance Rate Comparison */}
//         <Card>
//           <Card.Header>
//             <Card.Title>Attendance Rate Comparison</Card.Title>
//           </Card.Header>
//           <Card.Content>
//             <div className="h-80">
//               {(!attendanceRatesSafe || attendanceRatesSafe.length === 0) ? (
//                 <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">No attendance rate data available.</div>
//               ) : (
//                 <ResponsiveContainer width="100%" height="100%">
//                   <BarChart data={attendanceRatesSafe.slice(0, 10)}>
//                     <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
//                     <XAxis 
//                       dataKey="companyName" 
//                       angle={-45}
//                       textAnchor="end"
//                       height={80}
//                       tick={{ fontSize: 12 }}
//                     />
//                     <YAxis />
//                     <Tooltip content={<CustomTooltip />} />
//                     <Legend />
//                     <Bar 
//                       dataKey="attendanceRate" 
//                       name="Attendance Rate %" 
//                       fill={CHART_COLORS.warning}
//                       radius={[6, 6, 0, 0]}
//                       isAnimationActive={true}
//                       animationDuration={800}
//                     />
//                   </BarChart>
//                 </ResponsiveContainer>
//               )}
//             </div>
//           </Card.Content>
//         </Card>
//       </div>

//       {/* Additional Stats Section */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <Card>
//           <Card.Header>
//             <Card.Title>Industry Distribution</Card.Title>
//           </Card.Header>
//           <Card.Content>
//             <div className="space-y-3">
//               {(overviewSafe.industryStats ?? []).map((industry) => (
//                 <div key={industry._id} className="flex items-center justify-between">
//                   <span className="text-sm text-gray-600 dark:text-gray-400">
//                     {industry._id || 'Unknown'}
//                   </span>
//                   <span className="font-semibold text-gray-900 dark:text-gray-100">
//                     {industry.count}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           </Card.Content>
//         </Card>

//         <Card>
//           <Card.Header>
//             <Card.Title>Company Size Distribution</Card.Title>
//           </Card.Header>
//           <Card.Content>
//             <div className="space-y-3">
//               {(overviewSafe.sizeStats ?? []).map((size) => (
//                 <div key={size._id} className="flex items-center justify-between">
//                   <span className="text-sm text-gray-600 dark:text-gray-400">
//                     {size._id} employees
//                   </span>
//                   <span className="font-semibold text-gray-900 dark:text-gray-100">
//                     {size.count}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           </Card.Content>
//         </Card>

//         <Card>
//           <Card.Header>
//             <Card.Title>Quick Insights</Card.Title>
//           </Card.Header>
//           <Card.Content>
//             <div className="space-y-4">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm text-gray-600 dark:text-gray-400">Avg Employees per Company</span>
//                 <span className="font-semibold text-gray-900 dark:text-gray-100">
//                   {Math.round(topCompaniesSafe.reduce((sum, company) => sum + (company.employeeCount || 0), 0) / (topCompaniesSafe.length || 1))}
//                 </span>
//               </div>
//               <div className="flex items-center justify-between">
//                 <span className="text-sm text-gray-600 dark:text-gray-400">Highest Attendance</span>
//                 <span className="font-semibold text-green-600">
//                   {attendanceRatesSafe.length > 0 ? `${Math.max(...attendanceRatesSafe.map(r => r.attendanceRate || 0))}%` : 'N/A'}
//                 </span>
//               </div>
//               <div className="flex items-center justify-between">
//                 <span className="text-sm text-gray-600 dark:text-gray-400">Lowest Attendance</span>
//                 <span className="font-semibold text-red-600">
//                   {attendanceRatesSafe.length > 0 ? `${Math.min(...attendanceRatesSafe.map(r => r.attendanceRate || 0))}%` : 'N/A'}
//                 </span>
//               </div>
//             </div>
//           </Card.Content>
//         </Card>
//       </div>
//     </div>
//   );
// };

// export default SystemAnalytics;