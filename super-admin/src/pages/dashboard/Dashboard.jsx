import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
// import Card from '@shared/components/ui/Card';
// import Button from '@shared/components/ui/Button';
import { tenantService } from '../../services/auth';
import { analyticsService } from '../../services/analytics.fixed';

const CHART_COLORS = {
  primary: { solid: '#667eea' },
  teal: { solid: '#66a6ff' },
  purple: { solid: '#a18cd1' }
};

const MiniChartCard = ({ title, subtitle, children, onClick }) => (
  <div
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={(e) => {
      if (!onClick) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
    onClick={onClick}
    className={`bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl p-4 border border-white/20 dark:border-gray-700 shadow-md ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}`}>
    <div className="flex items-center justify-between mb-3">
      <div>
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
    </div>
    <div className="w-full h-20 min-h-[72px] min-w-0">
      {children}
    </div>
  </div>
);

const TenantGrowthModal = ({ isOpen, onClose, data = [] }) => {
  const growthData = (data || []).slice(-24); // show up to last 24 points
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tenant Growth" size="lg">
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={growthData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="modalGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.primary.solid} stopOpacity={0.35}/>
                <stop offset="95%" stopColor={CHART_COLORS.primary.solid} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="period" tick={{ fill: isDark ? '#d1d5db' : '#6b7280' }} />
            <YAxis allowDecimals={false} label={{ value: 'Tenants', angle: -90, position: 'insideLeft', offset: 0 }} tick={{ fill: isDark ? '#d1d5db' : '#6b7280' }} />
            <Tooltip
              contentStyle={isDark ? { backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.06)', color: '#fff' } : {}}
              labelStyle={isDark ? { color: '#e5e7eb' } : {}}
              itemStyle={isDark ? { color: '#fff' } : {}}
              cursor={isDark ? { stroke: 'rgba(255,255,255,0.06)' } : undefined}
            />
            <Legend verticalAlign="top" wrapperStyle={isDark ? { color: '#e5e7eb' } : {}} />
            <Area type="monotone" dataKey="cumulativeTenants" name="Cumulative" stroke={CHART_COLORS.primary.solid} fill="url(#modalGrowth)" strokeWidth={2} />
            <Line type="monotone" dataKey="newTenants" name="New" stroke={CHART_COLORS.teal.solid} strokeWidth={2} dot={{ r: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Modal>
  );
};

// Material-UI Icons
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import PaymentIcon from '@mui/icons-material/Payment';
import AddIcon from '@mui/icons-material/Add';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse rounded-lg bg-linear-to-r from-slate-200 via-slate-100 to-slate-200 ${className}`} />
);

const DashboardLoading = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="space-y-3 w-full sm:w-auto">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-full sm:w-48" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, idx) => (
        <Card key={idx} className="border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(2)].map((_, idx) => (
        <Card key={idx} className="border border-gray-200">
          <Card.Header className="border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
          </Card.Header>
          <Card.Content className="space-y-4">
            {[...Array(3)].map((__ , innerIdx) => (
              <div key={innerIdx} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-3 w-20 ml-auto" />
                </div>
              </div>
            ))}
          </Card.Content>
        </Card>
      ))}
    </div>
  </div>
);

const StatCard = ({ title, value, change, icon, color, onClick }) => (
  <Card 
    className="relative overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-200"
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={(event) => {
      if (!onClick) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    }}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center">
  <div className={`shrink-0 p-3 rounded-xl ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      {change !== undefined && (
        <div className={`flex items-center text-sm font-medium ${
          change > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {change > 0 ? <TrendingUpIcon className="w-4 h-4 mr-1" /> : <TrendingDownIcon className="w-4 h-4 mr-1" />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentTenants, setRecentTenants] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showTenantGrowthModal, setShowTenantGrowthModal] = useState(false);
  const navigate = useNavigate();
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const loadDashboardData = useCallback(async ({ showSkeleton = false } = {}) => {
    try {
      if (showSkeleton) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const [statsData, tenantsData] = await Promise.all([
        tenantService.getStats(),
        tenantService.getAll(1, 5)
      ]);

      setStats(statsData);
      setRecentTenants(tenantsData.tenants || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      if (showSkeleton) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  const computePortalDisplay = (t) => {
    if (!t) return '';
    try {
      if (t.portalUrl) return String(t.portalUrl).replace(/\/+$/,'');
      const tenantName = String(t.subdomain || t.name || '').trim();
      if (!tenantName) return '';
      return `https://hrm.focusengineeringapp.com/${encodeURIComponent(tenantName)}`;
    } catch {
      return t.portalUrl || (t.subdomain ? `https://hrm.focusengineeringapp.com/${encodeURIComponent(t.subdomain)}` : '');
    }
  };

  const computeHostDisplay = (t) => {
    const urlStr = computePortalDisplay(t) || (t && (t.portalUrl || t.subdomain || t.name));
    if (!urlStr) return '';
    try {
      const u = new URL(String(urlStr));
      return u.host;
    } catch {
      const s = String(urlStr).trim();
      const m = s.match(/^(?:https?:\/\/)?([^/]+)/i);
      return m ? m[1] : s;
    }
  };

  useEffect(() => {
    loadDashboardData({ showSkeleton: true });
    // load lightweight analytics for dashboard mini-charts
    (async () => {
      try {
        const res = await analyticsService.getDashboardAnalytics();
        const payload = res?.data?.data ?? res?.data ?? null;
        setAnalytics(payload);
      } catch (err) {
        // non-fatal for dashboard; analytics page has full handling
        console.debug('Failed to load dashboard analytics (mini-charts):', err?.message || err);
      }
    })();
  }, [loadDashboardData]);

  const handleRefresh = useCallback(() => {
    if (refreshing) {
      return;
    }
    loadDashboardData();
  }, [loadDashboardData, refreshing]);

  if (loading) {
    return <DashboardLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your HRM SaaS platform</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center space-x-2"
          >
            <AutorenewIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
          <Button 
            as="a" 
            href="/tenants/add"
            className="flex items-center space-x-2 bg-blue-500"
          >
            <AddIcon className="w-5 h-5" />
            <span>Add New Company</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      {/* Focus Insights: compact charts for quick admin view */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MiniChartCard title="Tenant Growth" subtitle="New vs cumulative (last 12)" onClick={() => setShowTenantGrowthModal(true)}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={(analytics?.growth ?? []).slice(-12)}>
              <defs>
                <linearGradient id="dashMiniGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary.solid} stopOpacity={0.35}/>
                  <stop offset="95%" stopColor={CHART_COLORS.primary.solid} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="period" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={isDark ? { backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.06)', color: '#fff' } : {}}
                labelStyle={isDark ? { color: '#e5e7eb' } : {}}
                itemStyle={isDark ? { color: '#fff' } : {}}
                cursor={isDark ? { stroke: 'rgba(255,255,255,0.06)' } : undefined}
              />
              <Area type="monotone" dataKey="cumulativeTenants" stroke={CHART_COLORS.primary.solid} fill="url(#dashMiniGrowth)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </MiniChartCard>

        <MiniChartCard title="Daily Active" subtitle="Active employees (last 14)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={(analytics?.dailyActive ?? []).slice(-14)}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={isDark ? { backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.06)', color: '#fff' } : {}}
                labelStyle={isDark ? { color: '#e5e7eb' } : {}}
                itemStyle={isDark ? { color: '#fff' } : {}}
                cursor={isDark ? { stroke: 'rgba(255,255,255,0.06)' } : undefined}
              />
              <Line type="monotone" dataKey="activeEmployees" stroke={CHART_COLORS.teal.solid} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </MiniChartCard>
        
        <MiniChartCard title="Top Companies" subtitle="By employee count (top 5)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(analytics?.topCompanies ?? []).slice(0,5)} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="companyName" hide />
              <Tooltip
                contentStyle={isDark ? { backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.06)', color: '#fff' } : {}}
                labelStyle={isDark ? { color: '#e5e7eb' } : {}}
                itemStyle={isDark ? { color: '#fff' } : {}}
                cursor={isDark ? { stroke: 'rgba(255,255,255,0.06)' } : undefined}
              />
              <Bar dataKey="employeeCount" fill={CHART_COLORS.purple.solid} radius={[4,4,4,4]} />
            </BarChart>
          </ResponsiveContainer>
        </MiniChartCard>
      </div>
      {/* Tenant Growth Modal (full view) */}
      <TenantGrowthModal
        isOpen={showTenantGrowthModal}
        onClose={() => setShowTenantGrowthModal(false)}
        data={analytics?.growth ?? []}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Companies"
          value={stats?.totalTenants || 0}
          change={12}
          icon={<BusinessIcon className="w-6 h-6" />}
          color="bg-blue-100 text-blue-600"
          onClick={() => navigate('/tenants')}
        />
        <StatCard
          title="Active Companies"
          value={stats?.activeTenants || 0}
          change={8}
          icon={<CheckCircleIcon className="w-6 h-6" />}
          color="bg-green-100 text-green-600"
          onClick={() => navigate('/tenants')}
        />
        <StatCard
          title="Trial Companies"
          value={stats?.trialTenants || 0}
          change={-2}
          icon={<AutorenewIcon className="w-6 h-6" />}
          color="bg-yellow-100 text-yellow-600"
          onClick={() => navigate('/subscriptions')}
        />
        <StatCard
          title="Paid Companies"
          value={stats?.paidTenants || 0}
          change={15}
          icon={<PaymentIcon className="w-6 h-6" />}
          color="bg-purple-100 text-purple-600"
          onClick={() => navigate('/subscriptions')}
        />
      </div>

      {/* Recent Companies & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Companies */}
        <Card className="border border-gray-200 dark:border-gray-700">
          <Card.Header className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <Card.Title className="text-lg font-semibold text-gray-900">Recent Companies</Card.Title>
              <Button 
                as="a" 
                href="/tenants" 
                variant="ghost" 
                size="sm"
                className="flex items-center space-x-1 text-gray-600 hover:text-blue-600"
              >
                <span>View All</span>
                <ArrowForwardIcon className="w-4 h-4" />
              </Button>
            </div>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentTenants.map((tenant) => (
                <div 
                  key={tenant._id} 
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 cursor-pointer"
                  onClick={() => window.location.href = `/tenants/${tenant._id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center dark:bg-blue-900">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-200">
                        {tenant.companyName?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{tenant.companyName}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <a
                          href={computePortalDisplay(tenant) || '#'}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => { e.stopPropagation(); }}
                          className="font-mono text-xs text-blue-600 dark:text-blue-400 truncate block max-w-[220px] hover:underline"
                        >
                          {computeHostDisplay(tenant) || tenant.subdomain || '—'}
                        </a>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tenant.subscription?.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : tenant.subscription?.status === 'trial'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                    }`}>
                      {tenant.subscription?.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1 capitalize">
                      {tenant.subscription?.plan?.replace('_', ' ') || 'No plan'}
                    </p>
                  </div>
                </div>
              ))}
              {recentTenants.length === 0 && (
                <div className="text-center py-12">
                  <BusinessIcon className="w-16 h-16 text-gray-300 dark:text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No companies yet</p>
                  <Button as="a" href="/tenants/add" className="flex items-center space-x-2 mx-auto">
                    <AddIcon className="w-4 h-4" />
                    <span>Add Your First Company</span>
                  </Button>
                </div>
              )}
            </div>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-gray-200">
          <Card.Header className="border-b border-gray-200 bg-gray-50">
            <Card.Title className="text-lg font-semibold text-gray-900 ">Quick Actions</Card.Title>
          </Card.Header>
          <Card.Content className="p-4">
            <div className="space-y-3">
              <Button 
                as="a" 
                href="/tenants/add" 
                className="w-full justify-start text-left h-auto py-4 px-4 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 border border-gray-200 rounded-xl"
              >
                <div className="flex items-center space-x-4">
                  <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <AddIcon className="w-5 h-5 text-blue-300" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">Add New Company</p>
                    <p className="text-sm text-gray-600">Create a new tenant account</p>
                  </div>
                </div>
              </Button>
              
              <Button 
                as="a" 
                href="/subscriptions" 
                variant="outline"
                className="w-full justify-start text-left h-auto py-4 px-4 hover:bg-gray-50 transition-all duration-200 border border-gray-200 rounded-xl"
              >
                <div className="flex items-center space-x-4">
                  <div className="shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <PaymentIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">Manage Subscriptions</p>
                    <p className="text-sm text-gray-600">View and update billing</p>
                  </div>
                </div>
              </Button>
              
              <Button 
                as="a" 
                href="/analytics" 
                variant="outline"
                className="w-full justify-start text-left h-auto py-4 px-4 hover:bg-gray-50 transition-all duration-200 border border-gray-200 rounded-xl"
              >
                <div className="flex items-center space-x-4">
                  <div className="shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <AnalyticsIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">View Analytics</p>
                    <p className="text-sm text-gray-600">System performance metrics</p>
                  </div>
                </div>
              </Button>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;