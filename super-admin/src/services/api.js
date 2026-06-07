import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

// Choose a baseURL at runtime to avoid mixed-content errors when the page
// is served over HTTPS but the configured API_BASE_URL uses HTTP.
let runtimeBase = API_BASE_URL;
if (typeof window !== 'undefined') {
  try {
    const pageProto = window.location.protocol || 'http:';
    if (pageProto === 'https:' && String(API_BASE_URL).startsWith('http://')) {
      // Mixed-content will be blocked by browsers. Use a relative `/api` path
      // as a safer fallback during local development or proxied setups.
      console.warn('API_BASE_URL uses http while page is https — falling back to relative /api to avoid mixed-content.');
      runtimeBase = '/api';
    }
  } catch (e) {
    // ignore and fall back to configured constant
    runtimeBase = API_BASE_URL;
  }
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: runtimeBase,
  headers: {
    'Content-Type': 'application/json',
  },
  // Increase default timeout to handle slower responses (e.g., cold starts)
  // 30s is generous but avoids spuriously failing long-running requests
  timeout: 30000,
});

// Helpful debug: log requests (remove or lower verbosity in production)
api.interceptors.request.use((config) => {
  try {
    // Only log in development to avoid noisy console in production
    if (process.env.NODE_ENV !== 'production') {
      console.debug('API Request:', config.method?.toUpperCase(), config.baseURL + (config.url || ''), config);
    }
  } catch (e) {
    // ignore logging errors
  }
  return config;
}, (err) => Promise.reject(err));

// Request interceptor to add auth token and tenant context
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const tenantSubdomain = localStorage.getItem('tenantSubdomain');
    const tenant = localStorage.getItem('tenant');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (tenantSubdomain) {
      config.headers['X-Tenant-Subdomain'] = tenantSubdomain;
    }
    if (tenant) {
      config.headers['x-tenant'] = tenant;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth tokens and user but keep tenant context so login is tenant-scoped
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const tenant = localStorage.getItem('tenant') || localStorage.getItem('tenantSubdomain');
      if (tenant) {
        window.location.href = `/hrm/${encodeURIComponent(tenant)}`;
        return Promise.reject(error);
      }

      // Redirect to appropriate login page if no tenant available
      const isSuperAdmin = window.location.pathname.includes('/super-admin');
      if (isSuperAdmin) {
        window.location.href = '/super-admin/login';
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;