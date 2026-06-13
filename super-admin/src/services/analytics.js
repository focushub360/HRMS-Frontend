import api from './api';

export const analyticsService = {
  getOverview: async (params = {}) => {
    const res = await api.get('/super-admin/analytics/overview', { params });
    const payload = res?.data?.data ?? res?.data ?? null;
    return { data: { data: payload } };
  },

  getTenantsGrowth: async (params = {}) => {
    const res = await api.get('/super-admin/analytics/tenants-growth', { params });
    const payload = res?.data?.data ?? res?.data ?? null;
    return { data: { data: payload } };
  },

  getTopCompanies: async (params = {}) => {
    const res = await api.get('/super-admin/analytics/top-companies', { params });
    const payload = res?.data?.data ?? res?.data ?? null;
    return { data: { data: payload } };
  },

  getDailyActiveUsers: async (params = {}) => {
    const res = await api.get('/super-admin/analytics/daily-active-users', { params });
    const payload = res?.data?.data ?? res?.data ?? null;
    return { data: { data: payload } };
  },

  getAttendanceRates: async (params = {}) => {
    const res = await api.get('/super-admin/analytics/attendance-rates', { params });
    const payload = res?.data?.data ?? res?.data ?? null;
    return { data: { data: payload } };
  },

  getDashboardAnalytics: async () => {
    const assembleFromPieces = async () => {
      const endpointsFns = [
        { key: 'overview', fn: () => analyticsService.getOverview() },
        { key: 'growth', fn: () => analyticsService.getTenantsGrowth() },
        { key: 'topCompanies', fn: () => analyticsService.getTopCompanies() },
        { key: 'dailyActive', fn: () => analyticsService.getDailyActiveUsers() },
        { key: 'attendanceRates', fn: () => analyticsService.getAttendanceRates() }
      ];

      const settled = await Promise.allSettled(endpointsFns.map(e => e.fn()));

      const defaults = {
        overview: { totalTenants: 0, activeTenants: 0, inactiveTenants: 0, planStats: [], industryStats: [], sizeStats: [] },
        growth: [],
        topCompanies: [],
        dailyActive: [],
        attendanceRates: []
      };

      const makeData = (s, defaultsItem) => {
        if (!s) return defaultsItem;
        if (s.status === 'fulfilled') return s.value?.data?.data ?? defaultsItem;
        return defaultsItem;
      };

      const overview = makeData(settled[0], defaults.overview);
      const growth = makeData(settled[1], defaults.growth);
      const topCompanies = makeData(settled[2], defaults.topCompanies);
      const dailyActive = makeData(settled[3], defaults.dailyActive);
      const attendanceRates = makeData(settled[4], defaults.attendanceRates);

      let successCount = 0;
      settled.forEach((s) => { if (s.status === 'fulfilled') successCount++; });

      if (successCount === 0) {
        throw new Error('Analytics endpoints not available on the configured backend (404).');
      }

      return { data: { data: { overview, growth, topCompanies, dailyActive, attendanceRates } } };
    };

    try {
      const res = await api.get('/super-admin/analytics/dashboard');
      const payload = res?.data?.data ?? res?.data ?? null;

      const hasOverview = payload && Object.keys(payload.overview || {}).length > 0;
      const hasGrowth = Array.isArray(payload?.growth) && payload.growth.length > 0;
      const hasTop = Array.isArray(payload?.topCompanies) && payload.topCompanies.length > 0;
      const hasDaily = Array.isArray(payload?.dailyActive) && payload.dailyActive.length > 0;
      const hasAttendance = Array.isArray(payload?.attendanceRates) && payload.attendanceRates.length > 0;

      if (hasOverview || hasGrowth || hasTop || hasDaily || hasAttendance) {
        return { data: { data: payload } };
      }

      console.warn('Combined /analytics/dashboard returned empty payload — falling back to individual endpoints.');
      return await assembleFromPieces();
    } catch (err) {
      if (err?.response?.status === 404) {
        return await assembleFromPieces();
      }
      throw err;
    }
  },

  getAnalyticsStatus: async () => {
    const endpoints = [
      { key: 'ping', path: '/super-admin/analytics/ping', public: true },
      { key: 'overview', path: '/super-admin/analytics/overview' },
      { key: 'growth', path: '/super-admin/analytics/tenants-growth' },
      { key: 'topCompanies', path: '/super-admin/analytics/top-companies' },
      { key: 'dailyActive', path: '/super-admin/analytics/daily-active-users' },
      { key: 'attendanceRates', path: '/super-admin/analytics/attendance-rates' },
      { key: 'dashboard', path: '/super-admin/analytics/dashboard' }
    ];

    const results = await Promise.allSettled(endpoints.map(ep => api.get(ep.path).then(r => ({ ep, res: r })).catch(e => ({ ep, err: e }))));

    return results.map((r) => {
      if (r.status === 'fulfilled') {
        const obj = r.value;
        return {
          path: obj.ep.path,
          ok: true,
          status: obj.res.status,
          message: obj.res.statusText || 'OK'
        };
      }
      const obj = r.value || r.reason || {};
      const ep = obj.ep || (r.reason && r.reason.config && { path: r.reason.config.url }) || { path: 'unknown' };
      const status = r.reason?.response?.status ?? null;
      const message = r.reason?.response?.statusText || r.reason?.message || 'Network/Error';
      return {
        path: ep.path || (ep.url || 'unknown'),
        ok: false,
        status,
        message
      };
    });
  }
};

export const getMockAnalytics = async () => {
  const payload = {
    overview: {
      totalTenants: 42,
      activeTenants: 33,
      inactiveTenants: 9,
      planStats: [
        { _id: 'free', count: 18 },
        { _id: 'pro', count: 16 },
        { _id: 'enterprise', count: 8 }
      ],
      industryStats: [
        { _id: 'Retail', count: 12 },
        { _id: 'Tech', count: 15 },
        { _id: 'Health', count: 8 }
      ],
      sizeStats: [
        { _id: '1-10', count: 10 },
        { _id: '11-50', count: 20 },
        { _id: '51-200', count: 12 }
      ]
    },
    growth: Array.from({ length: 12 }).map((_, i) => ({
      period: `M-${11 - i}`,
      cumulativeTenants: 5 + i * 3,
      newTenants: 3 + (i % 4)
    })),
    topCompanies: [
      { companyName: 'Acme Corp', employeeCount: 240 },
      { companyName: 'Beta LLC', employeeCount: 120 },
      { companyName: 'Gamma Ltd', employeeCount: 80 }
    ],
    dailyActive: Array.from({ length: 14 }).map((_, i) => ({
      date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      activeEmployees: 50 + i * 2,
      activeTenants: 20 + Math.floor(i / 2)
    })),
    attendanceRates: [
      { companyName: 'Acme Corp', attendanceRate: 96 },
      { companyName: 'Beta LLC', attendanceRate: 89 },
      { companyName: 'Gamma Ltd', attendanceRate: 92 }
    ]
  };

  return Promise.resolve({ data: { data: payload } });
}
