import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

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